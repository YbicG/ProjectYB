import React from 'react'
import {
  FilePlus,
  FileMinus,
  FileEdit,
  HelpCircle,
  GitBranch,
  Plus,
  Minus,
  RotateCcw,
  CheckCheck
} from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'

export const GitStatus: React.FC = () => {
  const {
    statuses,
    selectedProjectId,
    selectedFile,
    loadDiff,
    stageFile,
    unstageFile,
    stageAll,
    discardChanges
  } = useGitStore()

  const projects = useProjectStore((s) => s.projects)
  const project = projects.find((p) => p.id === selectedProjectId)
  const status = selectedProjectId ? statuses.get(selectedProjectId) : undefined

  const getIcon = (fileStatus: string) => {
    switch (fileStatus) {
      case 'modified':
        return <FileEdit className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      case 'added':
        return <FilePlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      case 'deleted':
        return <FileMinus className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
    }
  }

  const handleSelectFile = (filePath: string, isStaged: boolean) => {
    if (project?.path) {
      loadDiff(project.path, filePath, isStaged)
    }
  }

  const handleToggleStage = async (e: React.MouseEvent, filePath: string, isStaged: boolean) => {
    e.stopPropagation()
    if (!project) return
    if (isStaged) {
      await unstageFile(project.id, project.path, filePath)
      toast.info(`Unstaged ${filePath}`)
    } else {
      await stageFile(project.id, project.path, filePath)
      toast.success(`Staged ${filePath}`)
    }
  }

  const handleDiscard = async (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation()
    if (!project) return
    if (window.confirm(`Discard changes to "${filePath}"?`)) {
      await discardChanges(project.id, project.path, filePath)
      toast.info(`Discarded changes in ${filePath}`)
    }
  }

  const handleStageAll = async () => {
    if (!project) return
    await stageAll(project.id, project.path)
    toast.success('Staged all changes')
  }

  if (!status) {
    return (
      <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 w-80">
        <div className="p-3 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-200">Working Tree</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-sm text-zinc-500">
          <div className="text-center space-y-2 p-4">
            <GitBranch className="w-8 h-8 mx-auto text-zinc-700" />
            <p className="text-xs">Select a project to inspect changes</p>
          </div>
        </div>
      </div>
    )
  }

  const totalChanges = status.staged.length + status.unstaged.length + status.untracked.length

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 w-80 shrink-0">
      {/* ── Header ── */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">Changes</h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {totalChanges}
          </Badge>
        </div>

        {status.unstaged.length + status.untracked.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs px-2 text-violet-400 hover:text-violet-300 hover:bg-violet-950/30 gap-1"
            title="Stage all changes"
            onClick={handleStageAll}
          >
            <CheckCheck className="w-3.5 h-3.5" /> Stage All
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* ── Staged Changes ── */}
          {status.staged.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Staged Changes
                </span>
                <span className="text-xs text-zinc-500 font-mono">{status.staged.length}</span>
              </div>
              <div className="space-y-0.5">
                {status.staged.map((f) => {
                  const isSelected = selectedFile === f.path
                  return (
                    <div
                      key={`staged-${f.path}`}
                      onClick={() => handleSelectFile(f.path, true)}
                      className={cn(
                        'flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-colors cursor-pointer group',
                        isSelected ? 'bg-violet-950/50 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-900'
                      )}
                    >
                      {getIcon(f.status)}
                      <span className="truncate flex-1 font-mono text-[11px]" title={f.path}>
                        {f.path}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-amber-400 opacity-0 group-hover:opacity-100"
                        title="Unstage file"
                        onClick={(e) => handleToggleStage(e, f.path, true)}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Unstaged Changes ── */}
          {status.unstaged.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Unstaged Changes
                </span>
                <span className="text-xs text-zinc-500 font-mono">{status.unstaged.length}</span>
              </div>
              <div className="space-y-0.5">
                {status.unstaged.map((f) => {
                  const isSelected = selectedFile === f.path
                  return (
                    <div
                      key={`unstaged-${f.path}`}
                      onClick={() => handleSelectFile(f.path, false)}
                      className={cn(
                        'flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-colors cursor-pointer group',
                        isSelected ? 'bg-violet-950/50 text-white font-medium' : 'text-zinc-300 hover:bg-zinc-900'
                      )}
                    >
                      {getIcon(f.status)}
                      <span className="truncate flex-1 font-mono text-[11px]" title={f.path}>
                        {f.path}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-rose-400 opacity-0 group-hover:opacity-100"
                        title="Discard changes"
                        onClick={(e) => handleDiscard(e, f.path)}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100"
                        title="Stage file"
                        onClick={(e) => handleToggleStage(e, f.path, false)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Untracked Files ── */}
          {status.untracked.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Untracked Files
                </span>
                <span className="text-xs text-zinc-500 font-mono">{status.untracked.length}</span>
              </div>
              <div className="space-y-0.5">
                {status.untracked.map((filePath) => {
                  const isSelected = selectedFile === filePath
                  return (
                    <div
                      key={`untracked-${filePath}`}
                      onClick={() => handleSelectFile(filePath, false)}
                      className={cn(
                        'flex items-center gap-2 py-1.5 px-2 rounded text-xs transition-colors cursor-pointer group',
                        isSelected ? 'bg-violet-950/50 text-white font-medium' : 'text-zinc-400 hover:bg-zinc-900'
                      )}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate flex-1 font-mono text-[11px]" title={filePath}>
                        {filePath}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-rose-400 opacity-0 group-hover:opacity-100"
                        title="Delete untracked file"
                        onClick={(e) => handleDiscard(e, filePath)}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-emerald-400 opacity-0 group-hover:opacity-100"
                        title="Stage untracked file"
                        onClick={(e) => handleToggleStage(e, filePath, false)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {totalChanges === 0 && (
            <div className="p-8 text-center text-xs text-zinc-500">
              <span className="text-emerald-400 text-sm block mb-1">✓ Working tree clean</span>
              No uncommitted changes.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
