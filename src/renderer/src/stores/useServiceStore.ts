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
  updateServiceStats: (id: string, stats: ProcessStats) => void
  updateAllServiceStats: (statsMap: Record<string, { cpu: number; memory: number }>) => void
  addProfile: (profile: StartupProfile) => void
  removeProfile: (id: string) => void
  startProfile: (profileId: string) => Promise<void>
  getServicesByProject: (projectId: string) => RunningService[]
  saveState: () => void
  restoreState: () => void
}

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
    
    if (window.api?.services) {
      await window.api.services.forceKill({
        pid: service?.pid,
        port: port,
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
    const { profiles } = get()
    const profile = profiles.find(p => p.id === profileId)
    
    if (profile) {
      console.log('Starting profile:', profile.name)
      // Implementation depends on having full service configs available
    }
  },
  
  getServicesByProject: (projectId) => get().services.filter(s => s.projectId === projectId),
  
  saveState: () => {
    // In real app, persist to store
    console.log('Saving service state')
  },
  
  restoreState: () => {
    console.log('Restoring service state')
  }
}))
