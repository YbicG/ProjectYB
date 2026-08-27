import { create } from 'zustand'
import { generateId } from '../lib/utils'

export interface CommandEntry {
  id: string
  name: string
  command: string
}

export interface RunConfig {
  id: string
  projectId: string
  projectName: string
  projectPath: string
  name: string
  /** Legacy single-command field (kept for backwards compat) */
  command?: string
  /** Multi-command list — each entry spawns its own terminal tab */
  commands: CommandEntry[]
  cwd?: string
  env?: Record<string, string>
  autoRestart?: boolean
  createdAt: number
}

interface RunConfigState {
  configs: RunConfig[]
  loaded: boolean
  load: () => Promise<void>
  addConfig: (config: Omit<RunConfig, 'id' | 'createdAt'>) => Promise<RunConfig>
  updateConfig: (id: string, updates: Partial<RunConfig>) => Promise<void>
  deleteConfig: (id: string) => Promise<void>
  getProjectConfigs: (projectId: string) => RunConfig[]
}

const STORE_KEY = 'runConfigs'

export const useRunConfigStore = create<RunConfigState>((set, get) => ({
  configs: [],
  loaded: false,

  load: async () => {
    if (get().loaded) return
    try {
      const saved = await window.api?.store?.get(STORE_KEY)
      if (Array.isArray(saved)) {
        set({ configs: saved, loaded: true })
      } else {
        set({ loaded: true })
      }
    } catch {
      set({ loaded: true })
    }
  },

  addConfig: async (config) => {
    const newConfig: RunConfig = {
      ...config,
      id: generateId(),
      createdAt: Date.now(),
    }
    const configs = [...get().configs, newConfig]
    set({ configs })
    await window.api?.store?.set(STORE_KEY, configs)
    return newConfig
  },

  updateConfig: async (id, updates) => {
    const configs = get().configs.map(c => c.id === id ? { ...c, ...updates } : c)
    set({ configs })
    await window.api?.store?.set(STORE_KEY, configs)
  },

  deleteConfig: async (id) => {
    const configs = get().configs.filter(c => c.id !== id)
    set({ configs })
    await window.api?.store?.set(STORE_KEY, configs)
  },

  getProjectConfigs: (projectId) => get().configs.filter(c => c.projectId === projectId),
}))
