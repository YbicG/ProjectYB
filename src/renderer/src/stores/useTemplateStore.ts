import { create } from 'zustand'
import type { ProjectTemplate, ScaffoldOptions, ScaffoldResult } from '../types/template'
import { toast } from 'sonner'
import { useNotificationStore } from './useNotificationStore'

interface TemplateState {
  templates: ProjectTemplate[]
  selectedTemplateId: string | null
  selectedCategory: string
  isLoading: boolean
  isScaffolding: boolean
  scaffoldLogs: string[]
  lastResult: ScaffoldResult | null
  dialogOpen: boolean

  // Actions
  loadTemplates: () => Promise<void>
  setSelectedTemplateId: (id: string | null) => void
  setSelectedCategory: (category: string) => void
  setDialogOpen: (open: boolean) => void
  appendLog: (line: string) => void
  clearLogs: () => void
  scaffold: (options: ScaffoldOptions) => Promise<ScaffoldResult | null>
}

export const useTemplateStore = create<TemplateState>((set, get) => ({
  templates: [],
  selectedTemplateId: 'vite-react-ts',
  selectedCategory: 'all',
  isLoading: false,
  isScaffolding: false,
  scaffoldLogs: [],
  lastResult: null,
  dialogOpen: false,

  loadTemplates: async () => {
    set({ isLoading: true })
    try {
      if (!window.api?.templates) return
      const list = await window.api.templates.list()
      set({ templates: list, isLoading: false })
    } catch (err: any) {
      console.error('Failed to load templates:', err)
      set({ isLoading: false })
      toast.error(`Failed to load templates: ${err.message}`)
    }
  },

  setSelectedTemplateId: (id) => set({ selectedTemplateId: id }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setDialogOpen: (open) => set({ dialogOpen: open }),
  appendLog: (line) => set((state) => ({ scaffoldLogs: [...state.scaffoldLogs, line] })),
  clearLogs: () => set({ scaffoldLogs: [], lastResult: null }),

  scaffold: async (options: ScaffoldOptions) => {
    set({ isScaffolding: true, scaffoldLogs: [`Starting scaffolding for "${options.projectName}"...`] })
    try {
      if (!window.api?.templates) return null
      const result = await window.api.templates.scaffold(options)
      set({ isScaffolding: false, lastResult: result })

      if (result.success) {
        useNotificationStore.getState().notify({
          title: 'Project Scaffolding Complete',
          message: `Created "${options.projectName}" at ${result.projectPath}`,
          type: 'success',
          category: 'projects',
          actionTab: 'dashboard'
        })
      } else {
        useNotificationStore.getState().notify({
          title: 'Scaffolding Failed',
          message: result.error || 'Failed to scaffold project',
          type: 'error',
          category: 'projects'
        })
      }
      return result
    } catch (err: any) {
      console.error('Scaffolding error:', err)
      const failRes: ScaffoldResult = {
        success: false,
        projectPath: '',
        error: err.message,
        logs: get().scaffoldLogs
      }
      set({ isScaffolding: false, lastResult: failRes })
      useNotificationStore.getState().notify({
        title: 'Scaffolding Error',
        message: err.message || 'Scaffolding error',
        type: 'error',
        category: 'projects'
      })
      return failRes
    }
  }
}))
