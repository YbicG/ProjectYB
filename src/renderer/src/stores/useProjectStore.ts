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
      if (!window.api?.projects) {
        console.warn('window.api.projects not available — running outside Electron?')
        set({ projects: [], isScanning: false })
        return
      }
      const projects = await window.api.projects.scan()
      set({ projects: projects || [], isScanning: false })
    } catch (error) {
      console.error('Failed to scan projects', error)
      set({ isScanning: false })
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
