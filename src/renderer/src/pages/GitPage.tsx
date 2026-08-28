import React, { useEffect, useState } from 'react'
import {
  FileEdit,
  History,
  GitBranch as GitBranchIcon,
  Github,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  GitMerge
} from 'lucide-react'
import { GitStatus } from '../components/git/GitStatus'
import { GitDiff } from '../components/git/GitDiff'
import { GitCommit } from '../components/git/GitCommit'
import { GitHistory } from '../components/git/GitHistory'
import { GitBranches } from '../components/git/GitBranches'
import { GitStash } from '../components/git/GitStash'
import { GitHubPanel } from '../components/git/GitHubPanel'
import { GitConflictResolverModal } from '../components/git/GitConflictResolverModal'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { useWorkspaceProjects } from '@renderer/hooks/useWorkspaceProjects'
import { useGitStore, GitSubTab } from '@renderer/stores/useGitStore'
import { toast } from 'sonner'
import { cn } from '@renderer/lib/utils'

export const GitPage: React.FC = () => {
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const { selectProject: selectProjectStore } = useProjectStore()
  const { projects, activeWorkspace, isWorkspaceScoped } = useWorkspaceProjects()
  const {
    selectedProjectId,
    selectProject,
    fetchStatus,
    statuses,
    activeSubTab,
    setActiveSubTab,
    push,
    pull,
    isLoading
  } = useGitStore()

  const project = projects.find((p) => p.id === selectedProjectId) || projects[0]
  const status = project ? statuses.get(project.id) : undefined

  useEffect(() => {
    if (projects.length > 0) {
      const isCurrentInList = projects.some((p) => p.id === selectedProjectId)
      if (!selectedProjectId || !isCurrentInList) {
        const first = projects[0]
        selectProject(first.id)
        selectProjectStore(first.id)
        fetchStatus(first.id, first.path)
      } else if (project) {
        fetchStatus(project.id, project.path)
      }
    }
  }, [projects, selectedProjectId])

  const handleSelectChange = (projectId: string) => {
    selectProject(projectId)
    selectProjectStore(projectId)
    const p = projects.find((proj) => proj.id === projectId)
    if (p) {
      fetchStatus(p.id, p.path)
    }
  }

  const handleRefresh = () => {
    if (project) {
      fetchStatus(project.id, project.path)
    }
  }

  const handlePush = () => {
    if (project) push(project.id, project.path)
  }

  const handlePull = () => {
    if (project) pull(project.id, project.path)
  }

  const handleInitRepo = async () => {
    if (!project) return
    try {
      await window.api.git.init(project.path)
      await fetchStatus(project.id, project.path)
      toast.success(`Initialized git repository in ${project.name}`)
    } catch (err: any) {
      toast.error(`Failed to init git repository: ${err.message}`)
    }
  }

  const subTabs: Array<{ id: GitSubTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'changes', label: 'Changes & Diff', icon: FileEdit },
    { id: 'history', label: 'Commit History', icon: History },
    { id: 'branches', label: 'Branches & Stashes', icon: GitBranchIcon },
    { id: 'github', label: 'GitHub', icon: Github }
  ]

  const totalChanges = status
    ? status.staged.length + status.unstaged.length + status.untracked.length
    : 0

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* ── Top Header ── */}
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">Git Source Control</h1>
              {status ? (
                <Badge variant="outline" className="font-mono text-xs gap-1 border-violet-500/40 text-violet-300">
                  <GitBranchIcon className="w-3 h-3 text-violet-400" />
                  {status.branch}
                </Badge>
              ) : project ? (
                <Badge variant="secondary" className="font-mono text-xs gap-1 bg-amber-950/40 text-amber-400 border border-amber-800/50">
                  Not a git repo
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-zinc-500">
              {project ? project.path : 'Select a project to manage git'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {status && (
            <div className="flex items-center gap-1.5 mr-2">
              {status.ahead > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 gap-1 border-zinc-700 text-emerald-400 hover:text-emerald-300"
                  onClick={handlePush}
                  disabled={isLoading}
                  title="Push commits to upstream"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Push ({status.ahead})
                </Button>
              )}
              {status.behind > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 gap-1 border-zinc-700 text-amber-400 hover:text-amber-300"
                  onClick={handlePull}
                  disabled={isLoading}
                  title="Pull commits from upstream"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  Pull ({status.behind})
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2 gap-1 border-amber-700/60 text-amber-400 hover:text-amber-300 bg-amber-950/20"
                onClick={() => setConflictModalOpen(true)}
                title="Open Visual 3-Way Git Merge Conflict Resolver"
              >
                <GitMerge className="w-3.5 h-3.5" />
                Resolve Conflicts
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRefresh}
                title="Refresh Git Status"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              </Button>
            </div>
          )}

          {isWorkspaceScoped && activeWorkspace && (
            <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-300">
              📁 {activeWorkspace.name}
            </Badge>
          )}

          <select
            value={selectedProjectId || ''}
            onChange={(e) => handleSelectChange(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500 w-56 font-medium"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex items-center gap-1 px-6 border-b border-zinc-800/80 bg-zinc-950/80">
        {subTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeSubTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium transition-colors hover:text-zinc-200',
                isActive ? 'text-violet-300 font-semibold' : 'text-zinc-400'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === 'changes' && totalChanges > 0 && (
                <span className="bg-violet-950 text-violet-300 border border-violet-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {totalChanges}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-md" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Tab Views ── */}
      <div className="flex-1 overflow-hidden">
        {project && !status && !isLoading && activeSubTab !== 'github' ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-violet-950/50 border border-violet-800/50 flex items-center justify-center text-violet-400">
              <GitBranchIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-zinc-100">Not a Git Repository</h2>
              <p className="text-xs text-zinc-400">
                "{project.name}" has not been initialized with Git yet.
              </p>
            </div>
            <Button
              onClick={handleInitRepo}
              className="bg-violet-600 hover:bg-violet-700 text-xs gap-2"
            >
              <GitBranchIcon className="w-4 h-4" />
              Initialize Git Repository
            </Button>
          </div>
        ) : (
          <>
            {activeSubTab === 'changes' && (
              <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">
                <GitStatus />
                <div className="flex-1 flex flex-col p-2.5 sm:p-4 gap-2.5 sm:gap-4 overflow-hidden bg-zinc-950/40 min-h-0">
                  <div className="flex-1 min-h-0">
                    <GitDiff />
                  </div>
                  <div className="shrink-0">
                    <GitCommit />
                  </div>
                </div>
              </div>
            )}

            {activeSubTab === 'history' && (
              <div className="h-full p-4 overflow-hidden">
                <GitHistory />
              </div>
            )}

            {activeSubTab === 'branches' && (
              <div className="h-full p-4 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mx-auto">
                  <GitBranches />
                  <GitStash />
                </div>
              </div>
            )}

            {activeSubTab === 'github' && (
              <div className="h-full p-4 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                  <GitHubPanel />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <GitConflictResolverModal
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
      />
    </div>
  )
}
