import React, { useEffect, useState } from 'react'
import {
  GitBranch,
  ArrowUp,
  ArrowDown,
  FileEdit,
  TerminalSquare,
  Code,
  FolderOpen,
  Play,
  RefreshCw,
  Clock,
  Hash
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { useGit } from '../hooks/useGit'
import { useTerminal } from '../hooks/useTerminal'
import type { ProjectInfo } from '../types/project'
import type { GitLogEntry } from '../types/git'
import { cn } from '@renderer/lib/utils'

// ─── Type badge colour map ─────────────────────────────────────────────────

const TYPE_COLOURS: Record<string, string> = {
  node: 'bg-green-500/15 text-green-400 border-green-500/20',
  python: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  rust: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  go: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  dotnet: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  unknown: 'bg-zinc-800 text-zinc-400 border-zinc-700'
}

// ─── Sub-components ────────────────────────────────────────────────────────

const EmptyState: React.FC = () => (
  <div className="flex h-full items-center justify-center text-zinc-500">
    <div className="text-center space-y-3">
      <FolderOpen className="mx-auto h-12 w-12 text-zinc-700" />
      <p className="text-sm font-medium">No project selected</p>
      <p className="text-xs text-zinc-600">Pick a project from the dashboard to see its details.</p>
    </div>
  </div>
)

interface CommitRowProps {
  entry: GitLogEntry
}

const CommitRow: React.FC<CommitRowProps> = ({ entry }) => (
  <div className="flex items-start gap-3 py-2 border-b border-zinc-800/60 last:border-0">
    <div className="shrink-0 mt-0.5">
      <Hash className="h-3.5 w-3.5 text-zinc-600" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm text-zinc-200">{entry.message}</p>
      <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500">
        <span>{entry.author}</span>
        <span>·</span>
        <span className="font-mono text-violet-400">{entry.hashShort}</span>
        <span>·</span>
        <Clock className="h-3 w-3" />
        <span>{entry.date}</span>
      </div>
    </div>
  </div>
)

// ─── Main page ─────────────────────────────────────────────────────────────

interface ProjectDetailPageProps {
  /** Optional override — if omitted the store's selectedProjectId is used */
  projectId?: string
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId: propId }) => {
  const projects = useProjectStore((s) => s.projects)
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)

  const effectiveId = propId ?? selectedProjectId
  const project: ProjectInfo | undefined = projects.find((p) => p.id === effectiveId)

  const { status, isLoading, refresh } = useGit(project?.id ?? null, project?.path ?? null)
  const { createProjectTerminal } = useTerminal()

  const [commits, setCommits] = useState<GitLogEntry[]>([])
  const [commitsLoading, setCommitsLoading] = useState(false)

  // Fetch git status + recent commits whenever the selected project changes
  useEffect(() => {
    if (!project) return
    refresh()

    if (!project.isGitRepo) return
    setCommitsLoading(true)
    window.api?.git
      ?.log(project.path, 5)
      .then((entries: GitLogEntry[]) => setCommits(entries ?? []))
      .catch((err: unknown) => console.error('[ProjectDetailPage] log error', err))
      .finally(() => setCommitsLoading(false))
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Quick actions ──────────────────────────────────────────────────────

  const handleOpenTerminal = async () => {
    if (project) await createProjectTerminal(project)
  }

  const handleOpenVSCode = () => {
    if (project) window.api?.projects?.openInVSCode(project.path)
  }

  const handleOpenFolder = () => {
    if (project) window.api?.projects?.openInExplorer(project.path)
  }

  const handleRunScript = (command: string) => {
    if (!project) return
    // Spawn a terminal in the project directory pre-seeded with the script command
    window.api?.terminal?.spawn({ id: `run-${Date.now()}`, cwd: project.path, cols: 120, rows: 30 })
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (!project) return <EmptyState />

  const typeColour = TYPE_COLOURS[project.type] ?? TYPE_COLOURS.unknown
  const totalChanges = status
    ? status.staged.length + status.unstaged.length + status.untracked.length
    : 0

  return (
    <ScrollArea className="h-full w-full bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-4xl space-y-6 p-6">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight truncate">{project.name}</h1>
              <span
                className={cn(
                  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
                  typeColour
                )}
              >
                {project.type}
              </span>
              {project.tags.map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
            <p className="mt-1 text-sm text-zinc-500 truncate" title={project.path}>
              {project.path}
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleOpenTerminal} className="gap-1.5">
              <TerminalSquare className="h-4 w-4" />
              Terminal
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenVSCode} className="gap-1.5">
              <Code className="h-4 w-4" />
              VSCode
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenFolder} className="gap-1.5">
              <FolderOpen className="h-4 w-4" />
              Folder
            </Button>
          </div>
        </div>

        {/* ── Git status summary ── */}
        {project.isGitRepo && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-violet-400" />
                  Git Status
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={refresh}
                  disabled={isLoading}
                  aria-label="Refresh git status"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {status ? (
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-violet-400" />
                    <span className="font-mono text-violet-300">{status.branch}</span>
                    {status.tracking && (
                      <span className="text-zinc-600">→ {status.tracking}</span>
                    )}
                  </div>
                  {status.ahead > 0 && (
                    <div className="flex items-center gap-1 text-green-400">
                      <ArrowUp className="h-3.5 w-3.5" />
                      {status.ahead} ahead
                    </div>
                  )}
                  {status.behind > 0 && (
                    <div className="flex items-center gap-1 text-yellow-400">
                      <ArrowDown className="h-3.5 w-3.5" />
                      {status.behind} behind
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-zinc-400">
                    <FileEdit className="h-3.5 w-3.5" />
                    {totalChanges} changed {totalChanges === 1 ? 'file' : 'files'}
                  </div>
                  {status.isClean && (
                    <span className="text-green-500 text-xs font-medium">✓ Clean</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">
                  {isLoading ? 'Loading…' : 'No git data available.'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── NPM scripts ── */}
        {project.scripts && Object.keys(project.scripts).length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Scripts</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {Object.entries(project.scripts).map(([name, cmd]) => (
                  <button
                    key={name}
                    onClick={() => handleRunScript(cmd)}
                    title={cmd}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900',
                      'px-3 py-1.5 text-xs font-medium text-zinc-300',
                      'hover:border-violet-500 hover:text-violet-300 transition-colors'
                    )}
                  >
                    <Play className="h-3 w-3" />
                    {name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Recent commits ── */}
        {project.isGitRepo && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-500" />
                Recent Commits
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {commitsLoading ? (
                <p className="text-sm text-zinc-500">Loading commits…</p>
              ) : commits.length > 0 ? (
                <div>
                  {commits.map((c) => (
                    <CommitRow key={c.hash} entry={c} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No commits found.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  )
}
