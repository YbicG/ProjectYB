import { useCallback, useMemo } from 'react'
import { useGitStore } from '../stores/useGitStore'
import type { GitStatus } from '../types/git'

interface UseGitReturn {
  /** Current git status for the project, or null if not yet fetched */
  status: GitStatus | null
  /** True while any git operation is in-flight */
  isLoading: boolean
  /** Error message from a failed operation, or null */
  error: string | null
  /** Stage all changes and commit with the given message */
  commit: (message: string, stageAll?: boolean) => Promise<void>
  /** Push the current branch to its upstream */
  push: () => Promise<void>
  /** Pull from upstream */
  pull: () => Promise<void>
  /** Re-fetch git status from the main process */
  refresh: () => Promise<void>
}

/**
 * Manages git operations for a single project.
 *
 * @param projectId - The project's unique id (used as the store key)
 * @param projectPath - Absolute filesystem path of the project (passed to git IPC calls)
 */
export function useGit(projectId: string | null, projectPath: string | null): UseGitReturn {
  const statuses = useGitStore((s) => s.statuses)
  const isLoading = useGitStore((s) => s.isLoading)
  const fetchStatus = useGitStore((s) => s.fetchStatus)
  const storeCommit = useGitStore((s) => s.commit)
  const storePush = useGitStore((s) => s.push)
  const storePull = useGitStore((s) => s.pull)

  const status: GitStatus | null = useMemo(
    () => (projectId ? (statuses.get(projectId) ?? null) : null),
    [statuses, projectId]
  )

  const refresh = useCallback(async () => {
    if (!projectId || !projectPath) return
    await fetchStatus(projectId, projectPath)
  }, [projectId, projectPath, fetchStatus])

  const commit = useCallback(
    async (message: string, stageAll = true) => {
      if (!projectId || !projectPath) {
        console.warn('[useGit] commit called without projectId/projectPath')
        return
      }
      await storeCommit(projectId, projectPath, message, stageAll)
    },
    [projectId, projectPath, storeCommit]
  )

  const push = useCallback(async () => {
    if (!projectId || !projectPath) {
      console.warn('[useGit] push called without projectId/projectPath')
      return
    }
    await storePush(projectId, projectPath)
  }, [projectId, projectPath, storePush])

  const pull = useCallback(async () => {
    if (!projectId || !projectPath) {
      console.warn('[useGit] pull called without projectId/projectPath')
      return
    }
    await storePull(projectId, projectPath)
  }, [projectId, projectPath, storePull])

  return {
    status,
    isLoading,
    // The store doesn't surface per-operation errors yet; kept as null for API compatibility
    error: null,
    commit,
    push,
    pull,
    refresh
  }
}
