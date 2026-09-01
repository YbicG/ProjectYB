import React, { useState, useMemo } from 'react'
import {
  FilePlus,
  FileMinus,
  FileEdit,
  HelpCircle,
  GitBranch,
  Plus,
  Minus,
  RotateCcw,
  CheckCheck,
  Search,
  ChevronDown,
  Sparkles,
  Layers
} from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Input } from '../ui/input'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'
import { GitIgnoreWizardModal } from './GitIgnoreWizardModal'

const INITIAL_PAGE_SIZE = 60;

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

  const [searchFilter, setSearchFilter] = useState('')
  const [stagedLimit, setStagedLimit] = useState(INITIAL_PAGE_SIZE)
  const [unstagedLimit, setUnstagedLimit] = useState(INITIAL_PAGE_SIZE)
  const [untrackedLimit, setUntrackedLimit] = useState(INITIAL_PAGE_SIZE)
  const [ignoreWizardOpen, setIgnoreWizardOpen] = useState(false)

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

  // Filtered Lists Memoized for instant typing response
  const filteredStaged = useMemo(() => {
    if (!status?.staged) return [];
    if (!searchFilter.trim()) return status.staged;
    const q = searchFilter.toLowerCase();
    return status.staged.filter((f) => f.path.toLowerCase().includes(q));
  }, [status?.staged, searchFilter]);

  const filteredUnstaged = useMemo(() => {
    if (!status?.unstaged) return [];
    if (!searchFilter.trim()) return status.unstaged;
    const q = searchFilter.toLowerCase();
    return status.unstaged.filter((f) => f.path.toLowerCase().includes(q));
  }, [status?.unstaged, searchFilter]);

  const filteredUntracked = useMemo(() => {
    if (!status?.untracked) return [];
    if (!searchFilter.trim()) return status.untracked;
    const q = searchFilter.toLowerCase();
    return status.untracked.filter((f) => f.toLowerCase().includes(q));
  }, [status?.untracked, searchFilter]);

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
    <div className="flex flex-col h-auto max-h-56 lg:max-h-none lg:h-full bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-800 w-full lg:w-80 shrink-0">
      {/* ── Header ── */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-zinc-200">Changes</h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono bg-zinc-900 border-zinc-700 text-zinc-300">
            {totalChanges.toLocaleString()}
          </Badge>
        </div>

        <div className="flex items-center gap-1">
          {status.untracked.length > 5 && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 gap-1"
              title="Detect junk folders & auto-generate .gitignore rules"
              onClick={() => setIgnoreWizardOpen(true)}
            >
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">.gitignore</span>
            </Button>
          )}

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
      </div>

      {/* ── Real-time Search Filter (High-Performance for 10k+ Files) ── */}
      {totalChanges > 10 && (
        <div className="p-2 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={`Filter ${totalChanges.toLocaleString()} changes...`}
              className="h-7 pl-7 pr-3 text-xs bg-zinc-900/90 border-zinc-800 focus-visible:ring-1 focus-visible:ring-violet-500 font-mono"
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {/* ── Staged Changes ── */}
          {filteredStaged.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Staged Changes
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {filteredStaged.length > stagedLimit
                    ? `${stagedLimit} of ${filteredStaged.length.toLocaleString()}`
                    : filteredStaged.length.toLocaleString()}
                </span>
              </div>
              <div className="space-y-0.5">
                {filteredStaged.slice(0, stagedLimit).map((f) => {
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

                {filteredStaged.length > stagedLimit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStagedLimit((prev) => prev + 100)}
                    className="w-full h-7 text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 mt-1 gap-1"
                  >
                    <ChevronDown className="w-3 h-3" /> Show more staged ({filteredStaged.length - stagedLimit} remaining)
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Unstaged Changes ── */}
          {filteredUnstaged.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Unstaged Changes
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {filteredUnstaged.length > unstagedLimit
                    ? `${unstagedLimit} of ${filteredUnstaged.length.toLocaleString()}`
                    : filteredUnstaged.length.toLocaleString()}
                </span>
              </div>
              <div className="space-y-0.5">
                {filteredUnstaged.slice(0, unstagedLimit).map((f) => {
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

                {filteredUnstaged.length > unstagedLimit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUnstagedLimit((prev) => prev + 100)}
                    className="w-full h-7 text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 mt-1 gap-1"
                  >
                    <ChevronDown className="w-3 h-3" /> Show more unstaged ({filteredUnstaged.length - unstagedLimit} remaining)
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* ── Untracked Files ── */}
          {filteredUntracked.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Untracked Files
                </span>
                <span className="text-xs text-zinc-500 font-mono">
                  {filteredUntracked.length > untrackedLimit
                    ? `${untrackedLimit} of ${filteredUntracked.length.toLocaleString()}`
                    : filteredUntracked.length.toLocaleString()}
                </span>
              </div>
              <div className="space-y-0.5">
                {filteredUntracked.slice(0, untrackedLimit).map((filePath) => {
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

                {filteredUntracked.length > untrackedLimit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUntrackedLimit((prev) => prev + 100)}
                    className="w-full h-7 text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60 mt-1 gap-1"
                  >
                    <ChevronDown className="w-3 h-3" /> Show more untracked ({filteredUntracked.length - untrackedLimit} remaining)
                  </Button>
                )}
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

      {/* Smart .gitignore Rule Builder Dialog */}
      {project && (
        <GitIgnoreWizardModal
          open={ignoreWizardOpen}
          onOpenChange={setIgnoreWizardOpen}
          projectPath={project.path}
          untrackedFiles={status.untracked}
        />
      )}
    </div>
  )
}
