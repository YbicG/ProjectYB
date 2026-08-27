import { create } from 'zustand'
import type { RunningService, StartupProfile, ServiceStatus, ServiceConfig } from '../types/service'
import { generateId } from '../lib/utils'
import { useTerminalStore } from './useTerminalStore'

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
  restartService: (id: string) => Promise<void>
  updateServiceStats: (id: string, stats: ProcessStats) => void
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
    const id = generateId()
    
    const terminalId = await terminalStore.createTerminal({
      name: config.name,
      cwd: config.cwd || '',
      projectId,
      command: config.command
    })
    
    const service: RunningService = {
      id,
      name: config.name,
      command: config.command,
      projectId,
      projectName,
      terminalId,
      status: 'starting',
      startedAt: Date.now(),
      autoRestart: config.autoRestart
    }
    
    set((state) => ({ 
      services: [...state.services, { ...service, status: 'running' }],
      runningServices: [...state.services, { ...service, status: 'running' }]
    }))
    
    return id
  },
  
  stopService: (id) => {
    const { services } = get()
    const service = services.find(s => s.id === id)
    
    if (service) {
      useTerminalStore.getState().killTerminal(service.terminalId)
      set((state) => ({
        services: state.services.filter(s => s.id !== id),
        runningServices: state.services.filter(s => s.id !== id)
      }))
    }
  },
  
  restartService: async (id) => {
    const { services, startService, stopService } = get()
    const service = services.find(s => s.id === id)
    
    if (service) {
      stopService(id)
      await new Promise(r => setTimeout(r, 500))
      await startService(service.projectId, service.projectName, {
        id: generateId(),
        name: service.name,
        command: service.command,
        autoRestart: service.autoRestart
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
