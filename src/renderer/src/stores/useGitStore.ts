import { create } from 'zustand'
import type { GitStatus } from '../types/git'

interface GitState {
  statuses: Map<string, GitStatus>
  selectedProjectId: string | null
  isLoading: boolean
  commitMessage: string
  fetchStatus: (projectId: string, path: string) => Promise<void>
  commit: (projectId: string, path: string, message: string, stageAll?: boolean) => Promise<void>
  push: (projectId: string, path: string) => Promise<void>
  pull: (projectId: string, path: string) => Promise<void>
  setCommitMessage: (msg: string) => void
  selectProject: (id: string | null) => void
}

export const useGitStore = create<GitState>((set, get) => ({
  statuses: new Map(),
  selectedProjectId: null,
  isLoading: false,
  commitMessage: '',
  
  fetchStatus: async (projectId, path) => {
    set({ isLoading: true })
    try {
      const isRepo = await window.api.git.isRepo(path)
      if (isRepo) {
        const status = await window.api.git.status(path)
        set((state) => {
          const newStatuses = new Map(state.statuses)
          newStatuses.set(projectId, status)
          return { statuses: newStatuses, isLoading: false }
        })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      console.error('Failed to fetch git status:', error)
      set({ isLoading: false })
    }
  },
  
  commit: async (projectId, path, message, stageAll) => {
    set({ isLoading: true })
    try {
      await window.api.git.commit(path, message, stageAll)
      set({ commitMessage: '' })
      await get().fetchStatus(projectId, path)
    } catch (error) {
      console.error('Failed to commit:', error)
      set({ isLoading: false })
    }
  },
  
  push: async (projectId, path) => {
    set({ isLoading: true })
    try {
      await window.api.git.push(path)
      await get().fetchStatus(projectId, path)
    } catch (error) {
      console.error('Failed to push:', error)
      set({ isLoading: false })
    }
  },
  
  pull: async (projectId, path) => {
    set({ isLoading: true })
    try {
      await window.api.git.pull(path)
      await get().fetchStatus(projectId, path)
    } catch (error) {
      console.error('Failed to pull:', error)
      set({ isLoading: false })
    }
  },
  
  setCommitMessage: (msg) => set({ commitMessage: msg }),
  selectProject: (id) => set({ selectedProjectId: id })
}))
