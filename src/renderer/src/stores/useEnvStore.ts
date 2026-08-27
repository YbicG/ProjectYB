import { create } from 'zustand'
import type { EnvEntry, EnvFileInfo, EnvComparisonResult } from '../types/env'
import { toast } from 'sonner'

interface EnvState {
  envFiles: EnvFileInfo[]
  activeFilePath: string | null
  activeEntries: EnvEntry[]
  rawContent: string
  isLoading: boolean
  isSaving: boolean
  revealedKeys: string[] // keys that are unmasked
  revealAll: boolean

  // Comparison
  comparisonResult: EnvComparisonResult | null
  isComparing: boolean

  // Actions
  loadEnvFiles: (projectPath: string) => Promise<void>
  loadEnvFile: (filePath: string) => Promise<void>
  saveEnvFile: (filePath: string, entries: EnvEntry[], rawContent?: string) => Promise<boolean>
  generateExample: (sourceFilePath: string) => Promise<string | null>
  compareEnvs: (fileA: string, fileB: string) => Promise<void>
  syncMissingKeys: (sourceFilePath: string, targetFilePath: string, keys: string[]) => Promise<boolean>
  
  // Inline editing
  toggleSecretReveal: (key: string) => void
  setRevealAll: (reveal: boolean) => void
  updateEntry: (index: number, updated: Partial<EnvEntry>) => void
  addEntry: (entry: EnvEntry) => void
  deleteEntry: (index: number) => void
  setRawContent: (raw: string) => void
  setActiveFilePath: (path: string | null) => void
  clearComparison: () => void
}

export const useEnvStore = create<EnvState>((set, get) => ({
  envFiles: [],
  activeFilePath: null,
  activeEntries: [],
  rawContent: '',
  isLoading: false,
  isSaving: false,
  revealedKeys: [],
  revealAll: false,

  comparisonResult: null,
  isComparing: false,

  loadEnvFiles: async (projectPath: string) => {
    set({ isLoading: true, envFiles: [] })
    try {
      if (!window.api?.env) return
      const files = await window.api.env.listFiles(projectPath)
      set({ envFiles: files, isLoading: false })
      if (files.length > 0) {
        // Auto-select .env if exists, otherwise first file
        const defaultFile = files.find((f) => f.name === '.env') || files[0]
        await get().loadEnvFile(defaultFile.path)
      } else {
        const defaultPath = `${projectPath}/.env`
        set({ activeFilePath: defaultPath, activeEntries: [], rawContent: '', revealedKeys: [] })
      }
    } catch (err: any) {
      console.error('Failed to load env files:', err)
      set({ isLoading: false })
      toast.error(`Failed to load .env files: ${err.message}`)
    }
  },

  loadEnvFile: async (filePath: string) => {
    set({ isLoading: true, activeFilePath: filePath })
    try {
      if (!window.api?.env) return
      const res = await window.api.env.read(filePath)
      set({
        activeEntries: res.entries,
        rawContent: res.raw,
        isLoading: false,
        revealedKeys: []
      })
    } catch (err: any) {
      console.error('Failed to read env file:', err)
      set({ isLoading: false })
      toast.error(`Could not open ${filePath}: ${err.message}`)
    }
  },

  saveEnvFile: async (filePath: string, entries: EnvEntry[], rawContent?: string) => {
    set({ isSaving: true })
    try {
      if (!window.api?.env) return false
      await window.api.env.write(filePath, entries, rawContent)
      set({ isSaving: false })
      toast.success(`Saved ${filePath.split(/[\\/]/).pop()}`)
      // Reload active content
      await get().loadEnvFile(filePath)
      return true
    } catch (err: any) {
      console.error('Failed to save env file:', err)
      set({ isSaving: false })
      toast.error(`Failed to save: ${err.message}`)
      return false
    }
  },

  generateExample: async (sourceFilePath: string) => {
    try {
      if (!window.api?.env) return null
      const res = await window.api.env.generateExample(sourceFilePath)
      toast.success(`Generated .env.example`)
      return res.targetPath
    } catch (err: any) {
      console.error('Failed to generate .env.example:', err)
      toast.error(`Generation failed: ${err.message}`)
      return null
    }
  },

  compareEnvs: async (fileA: string, fileB: string) => {
    set({ isComparing: true })
    try {
      if (!window.api?.env) return
      const result = await window.api.env.compare(fileA, fileB)
      set({ comparisonResult: result, isComparing: false })
    } catch (err: any) {
      console.error('Failed to compare envs:', err)
      set({ isComparing: false })
      toast.error(`Comparison failed: ${err.message}`)
    }
  },

  syncMissingKeys: async (sourceFilePath: string, targetFilePath: string, keys: string[]) => {
    try {
      if (!window.api?.env) return false
      const res = await window.api.env.syncKeys(sourceFilePath, targetFilePath, keys)
      toast.success(`Synced ${res.addedCount} missing variable(s)`)
      // Refresh comparison
      await get().compareEnvs(sourceFilePath, targetFilePath)
      return true
    } catch (err: any) {
      console.error('Failed to sync keys:', err)
      toast.error(`Sync failed: ${err.message}`)
      return false
    }
  },

  toggleSecretReveal: (key: string) => {
    set((state) => {
      const exists = state.revealedKeys.includes(key)
      return {
        revealedKeys: exists
          ? state.revealedKeys.filter((k) => k !== key)
          : [...state.revealedKeys, key]
      }
    })
  },

  setRevealAll: (reveal: boolean) => {
    set({ revealAll: reveal })
  },

  updateEntry: (index: number, updated: Partial<EnvEntry>) => {
    set((state) => {
      const newEntries = [...state.activeEntries]
      newEntries[index] = { ...newEntries[index], ...updated }
      return { activeEntries: newEntries }
    })
  },

  addEntry: (entry: EnvEntry) => {
    set((state) => ({
      activeEntries: [...state.activeEntries, entry]
    }))
  },

  deleteEntry: (index: number) => {
    set((state) => {
      const newEntries = [...state.activeEntries]
      newEntries.splice(index, 1)
      return { activeEntries: newEntries }
    })
  },

  setRawContent: (raw: string) => {
    set({ rawContent: raw })
  },

  setActiveFilePath: (path: string | null) => {
    set({ activeFilePath: path })
  },

  clearComparison: () => {
    set({ comparisonResult: null })
  }
}))
