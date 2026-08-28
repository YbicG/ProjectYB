import { create } from 'zustand'
import type { ProjectInfo, ProjectType, ProjectStatus, ProjectConfig } from '../types/project'
import { useNotificationStore } from './useNotificationStore'

interface ProjectFilters {
  type?: ProjectType[]
  category?: string[]
  tags?: string[]
  status?: ProjectStatus[]
}

interface ProjectState {
  projects: ProjectInfo[]
  selectedProjectId: string | null
  pinnedProjectIds: string[]
  searchQuery: string
  activeFilters: ProjectFilters
  isScanning: boolean
  scanProjects: () => Promise<void>
  togglePinProject: (id: string) => Promise<void>
  setSearchQuery: (query: string) => void
  setFilter: (key: keyof ProjectFilters, values: any[]) => void
  getFilteredProjects: () => ProjectInfo[]
  selectProject: (id: string | null) => void
  renameProject: (folderPath: string, newName: string) => Promise<void>
  saveProjectConfig: (folderPath: string, config: Partial<ProjectConfig>, overwrite?: boolean) => Promise<void>
  loadProjectConfig: (folderPath: string) => Promise<{ config: ProjectConfig | null; filePath: string | null }>
  addManualProject: (folderPath: string) => Promise<void>
  ignoreProject: (folderPath: string) => Promise<void>
  unignoreProject: (folderPath: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
  pinnedProjectIds: [],
  searchQuery: '',
  activeFilters: {},
  isScanning: false,

  scanProjects: async () => {
    set({ isScanning: true })
    try {
      if (!window.api?.projects || !window.api?.store) {
        console.warn('window.api missing — running outside Electron?')
        set({ projects: [], isScanning: false })
        return
      }

      const rootPaths = (await window.api.store.get('scanPaths')) as string[] | undefined
      const mode = (await window.api.store.get('scanMode')) as 'git' | 'all' | undefined

      const scannedProjects = await window.api.projects.scan({ rootPaths, mode })

      // Also get manual projects to append them
      const manualPaths = (await window.api.store.get('manualProjects')) as string[] | undefined
      let allProjects = [...(scannedProjects || [])]

      if (manualPaths && manualPaths.length > 0) {
        for (const mPath of manualPaths) {
          const mProj = await window.api.projects.addManual(mPath)
          if (mProj && !allProjects.some((p) => p.id === mProj.id)) {
            allProjects.push(mProj)
          }
        }
      }

      // Filter out ignored projects from store
      const ignoredProjects = ((await window.api.store.get('ignoredProjects')) as string[] | undefined) || []
      if (ignoredProjects && ignoredProjects.length > 0) {
        allProjects = allProjects.filter(
          (p) => !ignoredProjects.includes(p.path) && !ignoredProjects.includes(p.id)
        )
      }

      // Load pinned project IDs
      const savedPinned = ((await window.api.store.get('pinnedProjects')) as string[] | undefined) || []

      set({ projects: allProjects, pinnedProjectIds: savedPinned, isScanning: false })
    } catch (error) {
      console.error('Failed to scan projects', error)
      set({ isScanning: false })
    }
  },

  togglePinProject: async (id: string) => {
    const { pinnedProjectIds } = get()
    const isPinned = pinnedProjectIds.includes(id)
    const nextPinned = isPinned ? pinnedProjectIds.filter((p) => p !== id) : [...pinnedProjectIds, id]

    set({ pinnedProjectIds: nextPinned })
    try {
      if (window.api?.store) {
        await window.api.store.set('pinnedProjects', nextPinned)
      }
    } catch (err) {
      console.error('Failed to save pinned projects:', err)
    }
  },

  renameProject: async (folderPath: string, newName: string) => {
    try {
      if (!window.api?.projects) return
      await window.api.projects.saveConfig(folderPath, { name: newName.trim() })
      set((state) => ({
        projects: state.projects.map((p) =>
          p.path === folderPath || p.id === folderPath ? { ...p, name: newName.trim() } : p
        )
      }))
    } catch (error) {
      console.error('Failed to rename project:', error)
      throw error
    }
  },

  saveProjectConfig: async (folderPath: string, config: Partial<ProjectConfig>, overwrite = false) => {
    try {
      if (!window.api?.projects) return
      await window.api.projects.saveConfig(folderPath, config, overwrite)
      await get().scanProjects()
    } catch (error) {
      console.error('Failed to save project config:', error)
      throw error
    }
  },

  loadProjectConfig: async (folderPath: string) => {
    try {
      if (!window.api?.projects) return { config: null, filePath: null }
      return await window.api.projects.getConfig(folderPath)
    } catch (error) {
      console.error('Failed to load project config:', error)
      return { config: null, filePath: null }
    }
  },

  addManualProject: async (folderPath: string) => {
    try {
      if (!window.api?.projects) return
      const project = await window.api.projects.addManual(folderPath)
      if (project) {
        set((state) => {
          const exists = state.projects.some((p) => p.id === project.id)
          if (exists) {
            return { projects: state.projects.map((p) => (p.id === project.id ? project : p)) }
          }
          return { projects: [...state.projects, project] }
        })
        useNotificationStore.getState().notify({
          title: 'Project Added',
          message: `Added "${project.name}" (${project.type}) to workspace`,
          type: 'success',
          category: 'projects',
          actionTab: 'dashboard'
        })
      }
    } catch (error) {
      console.error('Failed to add manual project', error)
    }
  },

  ignoreProject: async (folderPath: string) => {
    try {
      if (window.api?.projects) {
        await window.api.projects.ignore(folderPath)
      }
      if (window.api?.store) {
        const ignoredList =
          ((await window.api.store.get('ignoredProjects')) as string[] | undefined) || []
        if (!ignoredList.includes(folderPath)) {
          await window.api.store.set('ignoredProjects', [...ignoredList, folderPath])
        }
      }
      set((state) => ({
        projects: state.projects.filter((p) => p.path !== folderPath && p.id !== folderPath)
      }))
    } catch (error) {
      console.error('Failed to ignore project', error)
      throw error
    }
  },

  unignoreProject: async (folderPath: string) => {
    try {
      if (window.api?.projects) {
        await window.api.projects.unignore(folderPath)
      }
      if (window.api?.store) {
        const ignoredList =
          ((await window.api.store.get('ignoredProjects')) as string[] | undefined) || []
        const updated = ignoredList.filter((p) => p !== folderPath)
        await window.api.store.set('ignoredProjects', updated)
      }
      await get().scanProjects()
    } catch (error) {
      console.error('Failed to unignore project', error)
      throw error
    }
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setFilter: (key, values) =>
    set((state) => ({
      activeFilters: { ...state.activeFilters, [key]: values }
    })),

  getFilteredProjects: () => {
    const { projects, searchQuery, activeFilters } = get()
    let filtered = projects

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((p) => p.name.toLowerCase().includes(query))
    }

    if (activeFilters.type && activeFilters.type.length > 0) {
      filtered = filtered.filter((p) => activeFilters.type!.includes(p.type))
    }

    if (activeFilters.category && activeFilters.category.length > 0) {
      filtered = filtered.filter((p) => activeFilters.category!.includes(p.category))
    }

    if (activeFilters.tags && activeFilters.tags.length > 0) {
      filtered = filtered.filter((p) => p.tags.some((t) => activeFilters.tags!.includes(t)))
    }

    if (activeFilters.status && activeFilters.status.length > 0) {
      filtered = filtered.filter((p) => activeFilters.status!.includes(p.status))
    }

    return filtered
  },

  selectProject: (id) => set({ selectedProjectId: id })
}))
