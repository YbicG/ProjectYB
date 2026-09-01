import { create } from 'zustand'
import type { RunningService, StartupProfile, ServiceStatus, ServiceConfig } from '../types/service'
import { generateId } from '../lib/utils'
import { useTerminalStore } from './useTerminalStore'
import { useProjectStore } from './useProjectStore'
import { useNotificationStore } from './useNotificationStore'

interface ProcessStats {
  cpu: number
  memory: number
}

interface ServiceState {
  services: RunningService[]
  runningServices: RunningService[]
  profiles: StartupProfile[]
  startService: (projectId: string, projectName: string, config: ServiceConfig) => Promise<string>
  stopService: (id: string) => void
  forceKillService: (id: string, port?: number) => Promise<void>
  restartService: (id: string) => Promise<void>
  handleServiceExit: (serviceId: string, exitCode: number) => Promise<void>
  setServiceStatus: (id: string, status: ServiceStatus) => void
  updateServiceStats: (id: string, stats: ProcessStats) => void
  updateAllServiceStats: (statsMap: Record<string, { cpu: number; memory: number }>) => void
  addProfile: (profile: StartupProfile) => void
  removeProfile: (id: string) => void
  startProfile: (profileId: string) => Promise<void>
  getServicesByProject: (projectId: string) => RunningService[]
  saveState: () => void
  restoreState: () => void
}

const restartAttempts = new Map<string, number>()

export const useServiceStore = create<ServiceState>((set, get) => ({
  services: [],
  runningServices: [],
  profiles: [],
  
  startService: async (projectId, projectName, config) => {
    const terminalStore = useTerminalStore.getState()
    const projectStore = useProjectStore.getState()
    const id = config.id || generateId()
    
    const project = projectStore.projects.find(p => p.id === projectId)
    const effectiveCwd = config.cwd || project?.path || 'D:\\Code'
    
    const terminalId = await terminalStore.createTerminal({
      name: `${projectName}: ${config.name}`,
      cwd: effectiveCwd,
      projectId,
      projectName,
      serviceId: id,
      isService: true,
      command: config.command
    })
    
    const term = useTerminalStore.getState().terminals.find(t => t.id === terminalId)
    
    const service: RunningService = {
      id,
      name: config.name,
      command: config.command,
      projectId,
      projectName,
      terminalId,
      pid: term?.pid,
      port: config.port,
      status: 'running',
      startedAt: Date.now(),
      autoRestart: config.autoRestart ?? false
    }
    
    set((state) => {
      const filtered = state.services.filter(s => s.id !== id)
      return { 
        services: [...filtered, service],
        runningServices: [...filtered, service]
      }
    })

    useNotificationStore.getState().notify({
      title: 'Service Started',
      message: `Service "${config.name}" (${projectName}) is now running`,
      type: 'success',
      category: 'services',
      actionTab: 'services'
    })
    
    return id
  },
  
  stopService: (id) => {
    const { services } = get()
    const service = services.find(s => s.id === id)
    restartAttempts.delete(id)
    
    if (service) {
      if (service.terminalId) {
        useTerminalStore.getState().killTerminal(service.terminalId)
      }
      set((state) => ({
        services: state.services.filter(s => s.id !== id),
        runningServices: state.services.filter(s => s.id !== id)
      }))

      useNotificationStore.getState().notify({
        title: 'Service Stopped',
        message: `Service "${service.name}" was stopped`,
        type: 'info',
        category: 'services',
        actionTab: 'services'
      })
    }
  },

  forceKillService: async (id, port) => {
    const { services } = get()
    const service = services.find(s => s.id === id)
    restartAttempts.delete(id)
    
    const effectivePort = port || service?.port
    if (window.api?.services) {
      await window.api.services.forceKill({
        pid: service?.pid,
        port: effectivePort,
        terminalId: service?.terminalId
      })
    }
    
    if (service?.terminalId) {
      useTerminalStore.getState().killTerminal(service.terminalId)
    }

    set((state) => ({
      services: state.services.filter(s => s.id !== id),
      runningServices: state.services.filter(s => s.id !== id)
    }))

    useNotificationStore.getState().notify({
      title: 'Service Force-Killed',
      message: `Process tree for "${service?.name || id}" force-terminated and port released`,
      type: 'warning',
      category: 'services',
      actionTab: 'services'
    })
  },
  
  restartService: async (id) => {
    const { services, startService, stopService } = get()
    const service = services.find(s => s.id === id)
    
    if (service) {
      const project = useProjectStore.getState().projects.find(p => p.id === service.projectId)
      stopService(id)
      await new Promise(r => setTimeout(r, 600))
      await startService(service.projectId, service.projectName, {
        id: service.id,
        name: service.name,
        command: service.command,
        cwd: project?.path,
        port: service.port,
        autoRestart: service.autoRestart
      })

      useNotificationStore.getState().notify({
        title: 'Service Restarted',
        message: `Service "${service.name}" restarted successfully`,
        type: 'success',
        category: 'services',
        actionTab: 'services'
      })
    }
  },

  handleServiceExit: async (serviceId: string, exitCode: number) => {
    const { services, restartService } = get()
    const service = services.find(s => s.id === serviceId)
    if (!service) return

    if (exitCode !== 0) {
      const attempts = restartAttempts.get(serviceId) || 0
      if (service.autoRestart && attempts < 5) {
        restartAttempts.set(serviceId, attempts + 1)
        set((state) => ({
          services: state.services.map(s => s.id === serviceId ? { ...s, status: 'restarting' as ServiceStatus } : s),
          runningServices: state.runningServices.map(s => s.id === serviceId ? { ...s, status: 'restarting' as ServiceStatus } : s)
        }))

        useNotificationStore.getState().notify({
          title: 'Service Auto-Restarting',
          message: `Service "${service.name}" crashed (exit code ${exitCode}). Auto-restarting (attempt ${attempts + 1}/5)...`,
          type: 'warning',
          category: 'services',
          actionTab: 'services'
        })

        setTimeout(async () => {
          await restartService(serviceId)
        }, 1500)
      } else {
        set((state) => ({
          services: state.services.map(s => s.id === serviceId ? { ...s, status: 'crashed' as ServiceStatus } : s),
          runningServices: state.runningServices.map(s => s.id === serviceId ? { ...s, status: 'crashed' as ServiceStatus } : s)
        }))

        useNotificationStore.getState().notify({
          title: 'Service Crashed',
          message: `Service "${service.name}" crashed with exit code ${exitCode}`,
          type: 'error',
          category: 'services',
          actionTab: 'services'
        })
      }
    } else {
      restartAttempts.delete(serviceId)
      set((state) => ({
        services: state.services.map(s => s.id === serviceId ? { ...s, status: 'stopped' as ServiceStatus } : s),
        runningServices: state.runningServices.filter(s => s.id !== serviceId)
      }))
    }
  },

  setServiceStatus: (id, status) => set((state) => ({
    services: state.services.map(s => s.id === id ? { ...s, status } : s),
    runningServices: state.runningServices.map(s => s.id === id ? { ...s, status } : s)
  })),
  
  updateServiceStats: (id, stats) => set((state) => {
    const updatedServices = state.services.map(s => s.id === id ? {
      ...s,
      cpuUsage: stats.cpu,
      memoryUsage: stats.memory
    } : s);
    return {
      services: updatedServices,
      runningServices: updatedServices
    };
  }),

  updateAllServiceStats: (statsMap) => set((state) => {
    let hasChanged = false;
    const updatedServices = state.services.map(s => {
      const stat = statsMap[s.terminalId] || (s.pid ? statsMap[s.pid] : undefined);
      if (!stat) return s;
      if (s.cpuUsage !== stat.cpu || s.memoryUsage !== stat.memory) {
        hasChanged = true;
        return {
          ...s,
          cpuUsage: stat.cpu,
          memoryUsage: stat.memory
        };
      }
      return s;
    });
    if (!hasChanged) return state;
    return {
      services: updatedServices,
      runningServices: updatedServices
    };
  }),
  
  addProfile: (profile) => set((state) => ({ profiles: [...state.profiles, profile] })),
  
  removeProfile: (id) => set((state) => ({ profiles: state.profiles.filter(p => p.id !== id) })),
  
  startProfile: async (profileId) => {
    const { profiles, startService } = get()
    const profile = profiles.find(p => p.id === profileId)
    if (!profile) return

    const projects = useProjectStore.getState().projects
    const saved = (await window.api?.store?.get('runConfigs')) as any[] | undefined
    const configs = Array.isArray(saved) ? saved : []

    const targetServiceIds = profile.serviceIds || (profile.serviceConfigs || []).map(sc => sc.serviceId)
    let launchedCount = 0

    for (const sId of targetServiceIds) {
      const cfg = configs.find(c => c.id === sId)
      if (cfg) {
        const project = projects.find(p => p.id === cfg.projectId)
        const effectiveCwd = cfg.cwd || project?.path || cfg.projectPath
        const combinedCmd = cfg.commands?.length
          ? cfg.commands.map((c: any) => c.command).join(' && ')
          : (cfg.command || '')

        if (combinedCmd) {
          await startService(cfg.projectId, cfg.projectName, {
            id: cfg.id,
            name: cfg.name,
            command: combinedCmd,
            cwd: effectiveCwd,
            autoRestart: cfg.autoRestart
          })
          launchedCount++
        }
      }
    }

    useNotificationStore.getState().notify({
      title: 'Profile Launched',
      message: `Started ${launchedCount} services from profile "${profile.name}"`,
      type: 'success',
      category: 'services',
      actionTab: 'services'
    })
  },
  
  getServicesByProject: (projectId) => get().services.filter(s => s.projectId === projectId),
  
  saveState: () => {
    console.log('Saving service state')
  },
  
  restoreState: () => {
    console.log('Restoring service state')
  }
}))
