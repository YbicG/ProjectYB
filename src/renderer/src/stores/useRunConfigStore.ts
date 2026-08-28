import { create } from 'zustand'
import { generateId } from '../lib/utils'

export type ExecutionMode = 'sequential' | 'parallel'

export interface CommandEntry {
  id: string
  name?: string
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
  /** Multi-command list */
  commands: CommandEntry[]
  /** Execution mode for multi-command configurations */
  executionMode?: ExecutionMode
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

import { useProjectStore } from './useProjectStore'

const STORE_KEY = 'runConfigs'

export const useRunConfigStore = create<RunConfigState>((set, get) => ({
  configs: [],
  loaded: false,

  load: async () => {
    try {
      // 1. Load global cached configs
      const saved = (await window.api?.store?.get(STORE_KEY)) as RunConfig[] | undefined
      let merged: RunConfig[] = Array.isArray(saved) ? [...saved] : []

      // 2. Discover services from all scanned project folders (.ybicg/services.json)
      const projects = useProjectStore.getState().projects || []
      for (const p of projects) {
        try {
          const projectServices = await window.api?.projects?.readServices(p.path)
          if (Array.isArray(projectServices) && projectServices.length > 0) {
            for (const svc of projectServices) {
              const formatted: RunConfig = {
                id: svc.id || generateId(),
                projectId: p.id,
                projectName: p.name,
                projectPath: p.path,
                name: svc.name || 'Service',
                commands: Array.isArray(svc.commands)
                  ? svc.commands
                  : svc.command
                    ? [{ id: '1', name: svc.name, command: svc.command }]
                    : [],
                executionMode: svc.executionMode || 'sequential',
                cwd: svc.cwd || p.path,
                env: svc.env,
                autoRestart: svc.autoRestart,
                createdAt: svc.createdAt || Date.now()
              }

              const existingIdx = merged.findIndex((c) => c.id === formatted.id || (c.projectId === p.id && c.name === formatted.name))
              if (existingIdx >= 0) {
                merged[existingIdx] = { ...merged[existingIdx], ...formatted }
              } else {
                merged.push(formatted)
              }
            }
          }
        } catch {}
      }

      set({ configs: merged, loaded: true })
      await window.api?.store?.set(STORE_KEY, merged)
    } catch {
      set({ loaded: true })
    }
  },

  addConfig: async (config) => {
    const project = useProjectStore.getState().projects.find((p) => p.id === config.projectId || p.path === config.projectPath)
    const effectivePath = config.projectPath || project?.path || ''

    const newConfig: RunConfig = {
      ...config,
      projectPath: effectivePath,
      id: generateId(),
      createdAt: Date.now()
    }
    const configs = [...get().configs, newConfig]
    set({ configs })

    // Save to global store
    await window.api?.store?.set(STORE_KEY, configs)

    // Save to .ybicg/services.json inside project folder
    if (effectivePath) {
      const projectConfigs = configs.filter((c) => c.projectPath === effectivePath || c.projectId === config.projectId)
      try {
        await window.api?.projects?.writeServices(effectivePath, projectConfigs)
      } catch (err) {
        console.warn('Failed writing to .ybicg/services.json:', err)
      }
    }

    return newConfig
  },

  updateConfig: async (id, updates) => {
    const target = get().configs.find((c) => c.id === id)
    const configs = get().configs.map((c) => (c.id === id ? { ...c, ...updates } : c))
    set({ configs })

    await window.api?.store?.set(STORE_KEY, configs)

    const projectPath = updates.projectPath || target?.projectPath
    if (projectPath) {
      const projectConfigs = configs.filter((c) => c.projectPath === projectPath || (target && c.projectId === target.projectId))
      try {
        await window.api?.projects?.writeServices(projectPath, projectConfigs)
      } catch (err) {
        console.warn('Failed updating .ybicg/services.json:', err)
      }
    }
  },

  deleteConfig: async (id) => {
    const target = get().configs.find((c) => c.id === id)
    const configs = get().configs.filter((c) => c.id !== id)
    set({ configs })

    await window.api?.store?.set(STORE_KEY, configs)

    if (target?.projectPath) {
      const projectConfigs = configs.filter((c) => c.projectPath === target.projectPath || c.projectId === target.projectId)
      try {
        await window.api?.projects?.writeServices(target.projectPath, projectConfigs)
      } catch (err) {
        console.warn('Failed updating .ybicg/services.json after deletion:', err)
      }
    }
  },

  getProjectConfigs: (projectId) => get().configs.filter((c) => c.projectId === projectId)
}))
