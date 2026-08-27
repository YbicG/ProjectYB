import { create } from 'zustand'
import type { GitStatus, GitLogEntry, GitStashEntry, FileDiffInfo } from '../types/git'
import { useNotificationStore } from './useNotificationStore'

export type GitSubTab = 'changes' | 'history' | 'branches' | 'github'

interface GitState {
  statuses: Map<string, GitStatus>
  selectedProjectId: string | null
  activeSubTab: GitSubTab
  isLoading: boolean
  commitMessage: string
  
  // Diff state
  selectedFile: string | null
  activeDiff: FileDiffInfo | null
  isDiffLoading: boolean

  // Commit Diff state (isolated from working tree)
  activeCommitHash: string | null
  activeCommitDiff: string | null
  isCommitDiffLoading: boolean

  // Stashes & History
  stashes: GitStashEntry[]
  commits: GitLogEntry[]
  historySearch: string

  // Navigation & Project selection
  setActiveSubTab: (tab: GitSubTab) => void
  selectProject: (id: string | null) => void
  setCommitMessage: (msg: string) => void
  setHistorySearch: (search: string) => void

  // Actions
  fetchStatus: (projectId: string, path: string) => Promise<void>
  commit: (projectId: string, path: string, message: string, stageAll?: boolean) => Promise<void>
  push: (projectId: string, path: string) => Promise<void>
  pull: (projectId: string, path: string) => Promise<void>

  // Staging & Discarding
  stageAll: (projectId: string, path: string) => Promise<void>
  stageFile: (projectId: string, path: string, file: string) => Promise<void>
  unstageFile: (projectId: string, path: string, file: string) => Promise<void>
  discardChanges: (projectId: string, path: string, file: string) => Promise<void>

  // Diff
  loadDiff: (path: string, file: string, staged?: boolean) => Promise<void>
  loadCommitDiff: (path: string, commitHash: string) => Promise<void>
  clearDiff: () => void

  // Stashes
  loadStashes: (path: string) => Promise<void>
  pushStash: (projectId: string, path: string, message?: string) => Promise<void>
  popStash: (projectId: string, path: string, index?: number) => Promise<void>
  applyStash: (projectId: string, path: string, index?: number) => Promise<void>
  dropStash: (path: string, index?: number) => Promise<void>

  // History & Branch Merge
  loadHistory: (path: string, limit?: number) => Promise<void>
  mergeBranch: (projectId: string, path: string, branchName: string) => Promise<{ success: boolean; error?: string; conflicts?: string[] }>
}

export const useGitStore = create<GitState>((set, get) => ({
  statuses: new Map(),
  selectedProjectId: null,
  activeSubTab: 'changes',
  isLoading: false,
  commitMessage: '',
  
  selectedFile: null,
  activeDiff: null,
  isDiffLoading: false,

  activeCommitHash: null,
  activeCommitDiff: null,
  isCommitDiffLoading: false,

  stashes: [],
  commits: [],
  historySearch: '',

  setActiveSubTab: (activeSubTab) => set({ activeSubTab }),
  selectProject: (id) => set({ selectedProjectId: id, selectedFile: null, activeDiff: null, activeCommitHash: null, activeCommitDiff: null }),
  setCommitMessage: (msg) => set({ commitMessage: msg }),
  setHistorySearch: (historySearch) => set({ historySearch }),

  fetchStatus: async (projectId, path) => {
    set({ isLoading: true })
    try {
      if (!window.api?.git) return
      const isRepo = await window.api.git.isRepo(path)
      if (isRepo) {
        const status = await window.api.git.status(path)
        set((state) => {
          const newStatuses = new Map(state.statuses)
          newStatuses.set(projectId, status)
          return { statuses: newStatuses, isLoading: false }
        })
      } else {
        set((state) => {
          const newStatuses = new Map(state.statuses)
          newStatuses.delete(projectId)
          return { statuses: newStatuses, isLoading: false }
        })
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
      set({ commitMessage: '', isLoading: false })
      await get().fetchStatus(projectId, path)
      useNotificationStore.getState().addNotification('Git', 'Commit successful')
    } catch (error: any) {
      console.error('Failed to commit:', error)
      useNotificationStore.getState().addNotification('Git Error', `Commit failed: ${error.message}`)
      set({ isLoading: false })
      throw error
    }
  },

  push: async (projectId, path) => {
    set({ isLoading: true })
    try {
      await window.api.git.push(path)
      set({ isLoading: false })
      await get().fetchStatus(projectId, path)
      useNotificationStore.getState().addNotification('Git', 'Push successful')
    } catch (error: any) {
      console.error('Failed to push:', error)
      useNotificationStore.getState().addNotification('Git Error', `Push failed: ${error.message}`)
      set({ isLoading: false })
      throw error
    }
  },

  pull: async (projectId, path) => {
    set({ isLoading: true })
    try {
      await window.api.git.pull(path)
      set({ isLoading: false })
      await get().fetchStatus(projectId, path)
      useNotificationStore.getState().addNotification('Git', 'Pull successful')
    } catch (error: any) {
      console.error('Failed to pull:', error)
      useNotificationStore.getState().addNotification('Git Error', `Pull failed: ${error.message}`)
      set({ isLoading: false })
      throw error
    }
  },

  stageAll: async (projectId, path) => {
    try {
      await window.api.git.stageAll(path)
      await get().fetchStatus(projectId, path)
      const current = get().selectedFile
      if (current) get().loadDiff(path, current, true)
    } catch (error: any) {
      console.error('Failed to stage all:', error)
    }
  },

  stageFile: async (projectId, path, file) => {
    try {
      await window.api.git.stageFile(path, file)
      await get().fetchStatus(projectId, path)
      if (get().selectedFile === file) {
        get().loadDiff(path, file, true)
      }
    } catch (error: any) {
      console.error('Failed to stage file:', error)
    }
  },

  unstageFile: async (projectId, path, file) => {
    try {
      await window.api.git.unstageFile(path, file)
      await get().fetchStatus(projectId, path)
      if (get().selectedFile === file) {
        get().loadDiff(path, file, false)
      }
    } catch (error: any) {
      console.error('Failed to unstage file:', error)
    }
  },

  discardChanges: async (projectId, path, file) => {
    try {
      await window.api.git.discardChanges(path, file)
      await get().fetchStatus(projectId, path)
      if (get().selectedFile === file) {
        set({ selectedFile: null, activeDiff: null })
      }
    } catch (error: any) {
      console.error('Failed to discard changes:', error)
    }
  },

  loadDiff: async (path, file, staged = false) => {
    set({ isDiffLoading: true, selectedFile: file })
    try {
      const diffText = await window.api.git.fileDiff(path, file, staged)
      set({
        activeDiff: { file, diffText: diffText || '(No difference or binary file)', isStaged: staged },
        isDiffLoading: false
      })
    } catch (error: any) {
      set({
        activeDiff: { file, diffText: `Error loading diff: ${error.message}`, isStaged: staged },
        isDiffLoading: false
      })
    }
  },

  loadCommitDiff: async (path, commitHash) => {
    set({ isCommitDiffLoading: true, activeCommitHash: commitHash })
    try {
      const diffText = await window.api.git.commitDiff(path, commitHash)
      set({
        activeCommitDiff: diffText || '(No diff available)',
        isCommitDiffLoading: false
      })
    } catch (error: any) {
      set({
        activeCommitDiff: `Error loading commit diff: ${error.message}`,
        isCommitDiffLoading: false
      })
    }
  },

  clearDiff: () => set({ selectedFile: null, activeDiff: null }),

  loadStashes: async (path) => {
    try {
      if (!window.api?.git) return
      const list = await window.api.git.stash(path, 'list')
      set({ stashes: list || [] })
    } catch (error) {
      console.error('Failed to load stashes:', error)
    }
  },

  pushStash: async (projectId, path, message) => {
    try {
      await window.api.git.stash(path, 'push', message)
      await get().loadStashes(path)
      await get().fetchStatus(projectId, path)
      useNotificationStore.getState().addNotification('Git Stash', 'Changes stashed successfully')
    } catch (error: any) {
      console.error('Failed to push stash:', error)
    }
  },

  popStash: async (projectId, path, index = 0) => {
    try {
      await window.api.git.stash(path, 'pop', undefined, index)
      await get().loadStashes(path)
      await get().fetchStatus(projectId, path)
      useNotificationStore.getState().addNotification('Git Stash', 'Stash popped successfully')
    } catch (error: any) {
      console.error('Failed to pop stash:', error)
      useNotificationStore.getState().addNotification('Git Error', `Pop stash failed: ${error.message}`)
    }
  },

  applyStash: async (projectId, path, index = 0) => {
    try {
      await window.api.git.stash(path, 'apply', undefined, index)
      await get().fetchStatus(projectId, path)
      useNotificationStore.getState().addNotification('Git Stash', 'Stash applied successfully')
    } catch (error: any) {
      console.error('Failed to apply stash:', error)
      useNotificationStore.getState().addNotification('Git Error', `Apply stash failed: ${error.message}`)
    }
  },

  dropStash: async (path, index = 0) => {
    try {
      await window.api.git.stash(path, 'drop', undefined, index)
      await get().loadStashes(path)
      useNotificationStore.getState().addNotification('Git Stash', 'Stash deleted')
    } catch (error: any) {
      console.error('Failed to drop stash:', error)
    }
  },

  loadHistory: async (path, limit = 50) => {
    try {
      if (!window.api?.git) return
      const list = await window.api.git.log(path, limit)
      set({ commits: list || [] })
    } catch (error) {
      console.error('Failed to load git history:', error)
    }
  },

  mergeBranch: async (projectId, path, branchName) => {
    try {
      const res = await window.api.git.mergeBranch(path, branchName)
      await get().fetchStatus(projectId, path)
      if (res.success) {
        useNotificationStore.getState().addNotification('Git Merge', `Merged branch ${branchName} successfully`)
      } else {
        useNotificationStore.getState().addNotification('Git Merge Conflict', `Conflicts merging ${branchName}`)
      }
      return res
    } catch (error: any) {
      console.error('Failed to merge branch:', error)
      return { success: false, error: error.message }
    }
  }
}))
