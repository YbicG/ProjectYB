import { create } from 'zustand'
import type { ProjectInfo, ProjectType, ProjectStatus, ProjectConfig } from '../types/project'

interface ProjectFilters {
  type?: ProjectType[]
  category?: string[]
  tags?: string[]
  status?: ProjectStatus[]
}

interface ProjectState {
  projects: ProjectInfo[]
  selectedProjectId: string | null
  searchQuery: string
  activeFilters: ProjectFilters
  isScanning: boolean
  scanProjects: () => Promise<void>
  setSearchQuery: (query: string) => void
  setFilter: (key: keyof ProjectFilters, values: any[]) => void
  getFilteredProjects: () => ProjectInfo[]
  selectProject: (id: string | null) => void
  updateProjectConfig: (id: string, config: Partial<ProjectConfig>) => void
  addManualProject: (folderPath: string) => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  selectedProjectId: null,
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
      
      const rootPaths = await window.api.store.get('scanPaths') as string[] | undefined
      const mode = await window.api.store.get('scanMode') as 'git' | 'all' | undefined
      
      const scannedProjects = await window.api.projects.scan({ rootPaths, mode })
      
      // Also get manual projects to append them
      const manualPaths = await window.api.store.get('manualProjects') as string[] | undefined
      const allProjects = [...(scannedProjects || [])]
      
      if (manualPaths && manualPaths.length > 0) {
        for (const mPath of manualPaths) {
          const mProj = await window.api.projects.addManual(mPath)
          if (mProj && !allProjects.some(p => p.id === mProj.id)) {
            allProjects.push(mProj)
          }
        }
      }
      
      set({ projects: allProjects, isScanning: false })
    } catch (error) {
      console.error('Failed to scan projects', error)
      set({ isScanning: false })
    }
  },
  addManualProject: async (folderPath: string) => {
    try {
      if (!window.api?.projects) return
      const project = await window.api.projects.addManual(folderPath)
      if (project) {
        set((state) => {
          const exists = state.projects.some(p => p.id === project.id)
          if (exists) {
            return { projects: state.projects.map(p => p.id === project.id ? project : p) }
          }
          return { projects: [...state.projects, project] }
        })
      }
    } catch (error) {
      console.error('Failed to add manual project', error)
    }
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilter: (key, values) => set((state) => ({
    activeFilters: { ...state.activeFilters, [key]: values }
  })),
  getFilteredProjects: () => {
    const { projects, searchQuery, activeFilters } = get()
    let filtered = projects

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query))
    }

    if (activeFilters.type && activeFilters.type.length > 0) {
      filtered = filtered.filter(p => activeFilters.type!.includes(p.type))
    }
    
    if (activeFilters.category && activeFilters.category.length > 0) {
      filtered = filtered.filter(p => activeFilters.category!.includes(p.category))
    }

    if (activeFilters.tags && activeFilters.tags.length > 0) {
      filtered = filtered.filter(p => p.tags.some(t => activeFilters.tags!.includes(t)))
    }
    
    if (activeFilters.status && activeFilters.status.length > 0) {
      filtered = filtered.filter(p => activeFilters.status!.includes(p.status))
    }

    return filtered
  },
  selectProject: (id) => set({ selectedProjectId: id }),
  updateProjectConfig: (id, config) => {
    // In a real app, you'd likely persist this
    console.log(`Updated config for project ${id}:`, config)
  }
}))
