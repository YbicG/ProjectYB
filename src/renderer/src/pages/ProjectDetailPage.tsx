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
  Hash,
  ArrowLeft,
  EyeOff,
  FileCode,
  Folder,
  Pencil,
  BookOpen,
  Layers,
  Lock,
  Package,
  Boxes,
  Archive
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { ScrollArea } from '../components/ui/scroll-area'
import { ProjectConfigDialog } from '../components/dashboard/ProjectConfigDialog'
import { EnvManagerDialog } from '../components/env/EnvManagerDialog'
import { ProjectSnapshotDialog } from '../components/dashboard/ProjectSnapshotDialog'
import { DockerDashboard } from '../components/docker/DockerDashboard'
import { MarkdownNotesEditor } from '../components/notes/MarkdownNotesEditor'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { useAppStore } from '@renderer/stores/useAppStore'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useTerminalStore } from '@renderer/stores/useTerminalStore'
import { useRunConfigStore } from '@renderer/stores/useRunConfigStore'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useGit } from '../hooks/useGit'
import { useTerminal } from '../hooks/useTerminal'
import type { ProjectInfo, SubProject } from '../types/project'
import type { GitLogEntry } from '../types/git'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'

// ─── Type badge colour map ─────────────────────────────────────────────────

const TYPE_COLOURS: Record<string, string> = {
  node: 'bg-green-500/15 text-green-400 border-green-500/20',
  python: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  rust: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  go: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  dotnet: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  godot: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  docs: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  git: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  unknown: 'bg-zinc-800 text-zinc-400 border-zinc-700'
}

// ─── Sub-components ────────────────────────────────────────────────────────

const EmptyState: React.FC = () => {
  const { setActiveTab } = useAppStore()
  return (
    <div className="flex h-full items-center justify-center text-zinc-500">
      <div className="text-center space-y-3">
        <FolderOpen className="mx-auto h-12 w-12 text-zinc-700" />
        <p className="text-sm font-medium">No project selected</p>
        <p className="text-xs text-zinc-600">Pick a project from the dashboard to see its details.</p>
        <Button variant="outline" size="sm" onClick={() => setActiveTab('dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    </div>
  )
}

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
  projectId?: string
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({ projectId: propId }) => {
  const projects = useProjectStore((s) => s.projects)
  const selectedProjectId = useProjectStore((s) => s.selectedProjectId)
  const selectProject = useProjectStore((s) => s.selectProject)
  const gitSelectedId = useGitStore((s) => s.selectedProjectId)
  const ignoreProject = useProjectStore((s) => s.ignoreProject)
  const { setActiveTab } = useAppStore()
  const { createTerminal } = useTerminalStore()

  const targetId = propId || selectedProjectId || gitSelectedId
  let project: ProjectInfo | undefined = projects.find(
    (p) =>
      p.id === targetId ||
      p.path === targetId ||
      p.name === targetId ||
      (targetId && p.path.toLowerCase() === targetId.toLowerCase()) ||
      (targetId && p.id.toLowerCase() === targetId.toLowerCase())
  )

  if (!project && projects.length > 0) {
    project = projects[0]
  }

  useEffect(() => {
    if (project && (!selectedProjectId || selectedProjectId !== project.id)) {
      selectProject(project.id)
    }
  }, [project?.id, selectedProjectId])

  const { status, isLoading, refresh } = useGit(project?.id ?? null, project?.path ?? null)
  const { createProjectTerminal } = useTerminal()

  const [commits, setCommits] = useState<GitLogEntry[]>([])
  const [commitsLoading, setCommitsLoading] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [envDialogOpen, setEnvDialogOpen] = useState(false)
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false)
  const savedConfigs = useRunConfigStore((s) => s.configs).filter((c) => c.projectId === project?.id)

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
  }, [project?.id])

  // ── Quick actions ──────────────────────────────────────────────────────

  const handleOpenTerminal = async (sub?: SubProject) => {
    if (!project) return
    const termName = sub ? `${project.name} (${sub.name})` : project.name
    const termCwd = sub ? sub.path : project.path
    await createTerminal({ name: termName, cwd: termCwd, projectId: project.id })
    setActiveTab('terminals')
  }

  const handleOpenVSCode = () => {
    if (project) window.api?.projects?.openInVSCode(project.path)
  }

  const handleOpenFolder = (targetPath?: string) => {
    if (project) window.api?.projects?.openInExplorer(targetPath || project.path)
  }

  const handleRunScript = async (scriptName: string, command: string, cwd?: string) => {
    if (!project) return
    await useServiceStore.getState().startService(project.id, project.name, {
      name: scriptName,
      command,
      cwd: cwd || project.path
    })
    toast.success(`Started service: ${scriptName}`)
  }

  const handleIgnore = async () => {
    if (!project) return
    if (
      window.confirm(
        `Ignore "${project.name}"?\nThis will write "ignore": true in .projectyb.json and return to dashboard.`
      )
    ) {
      await ignoreProject(project.path)
      toast.info(`Ignored ${project.name}`)
      setActiveTab('dashboard')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (!project) return <EmptyState />

  const typeColour = TYPE_COLOURS[project.type] ?? TYPE_COLOURS.unknown
  const totalChanges = status
    ? status.staged.length + status.unstaged.length + status.untracked.length
    : 0

  const hasSubprojects = project.subprojects && project.subprojects.length > 0

  return (
    <ScrollArea className="h-full w-full bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6 p-3 sm:p-6">
        {/* ── Navigation back ── */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('dashboard')}
            className="text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleIgnore}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
          >
            <EyeOff className="h-3.5 w-3.5 mr-1.5" /> Ignore Project
          </Button>
        </div>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{project.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-violet-300"
                onClick={() => setConfigDialogOpen(true)}
                title="Edit project name & configuration"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
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
            <p className="mt-1 text-xs sm:text-sm text-zinc-500 truncate" title={project.path}>
              {project.path}
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                selectProject(project.id)
                setActiveTab('dependencies')
              }}
              className="gap-1.5 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/30"
            >
              <Package className="h-4 w-4" />
              Dependencies
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEnvDialogOpen(true)}
              className="gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-950/30"
            >
              <Lock className="h-4 w-4" />
              Environment
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigDialogOpen(true)}
              className="gap-1.5 border-violet-500/40 text-violet-300 hover:bg-violet-950/30"
            >
              <FileCode className="h-4 w-4" />
              Edit Config
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleOpenTerminal()} className="gap-1.5">
              <TerminalSquare className="h-4 w-4" />
              Terminal
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenVSCode} className="gap-1.5">
              <Code className="h-4 w-4" />
              VSCode
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleOpenFolder()} className="gap-1.5">
              <FolderOpen className="h-4 w-4" />
              Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSnapshotDialogOpen(true)}
              className="gap-1.5 border-violet-500/40 text-violet-300 hover:bg-violet-950/30"
              title="Create clean project .zip archive"
            >
              <Archive className="h-4 w-4" />
              Snapshot
            </Button>
          </div>
        </div>

        {/* ── Subprojects / Subfolders Card ── */}
        {hasSubprojects && (
          <Card className="border-zinc-800 bg-zinc-950">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Folder className="h-4 w-4 text-cyan-400" />
                  Subprojects & Subfolders
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {project.subprojects!.length}
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] text-violet-400"
                  onClick={() => setConfigDialogOpen(true)}
                >
                  Manage
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {project.subprojects!.map((sub) => {
                  const isDocs = sub.type === 'docs' || sub.name.toLowerCase().includes('doc')
                  const isApp = sub.name.toLowerCase().startsWith('apps') || sub.name.toLowerCase().startsWith('packages')
                  return (
                    <div
                      key={sub.id || sub.name}
                      className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          {isDocs ? (
                            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : isApp ? (
                            <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : (
                            <Folder className="w-4 h-4 text-violet-400 shrink-0" />
                          )}
                          <span className="font-semibold text-xs text-zinc-100 truncate">{sub.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                            {sub.type}
                          </Badge>
                        </div>
                        <p className="font-mono text-[10px] text-zinc-500 truncate" title={sub.path}>
                          {sub.relativePath}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2 gap-1 border-zinc-700"
                          onClick={() => handleOpenTerminal(sub)}
                          title={`Open terminal in ${sub.relativePath}`}
                        >
                          <TerminalSquare className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-zinc-400 hover:text-zinc-200"
                          onClick={() => handleOpenFolder(sub.path)}
                          title="Open folder in Explorer"
                        >
                          <FolderOpen className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

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
                    {status.tracking && <span className="text-zinc-600">→ {status.tracking}</span>}
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
                  {status.isClean && <span className="text-green-500 text-xs font-medium">✓ Clean</span>}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">{isLoading ? 'Loading…' : 'No git data available.'}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Saved Run Configurations ── */}
        {savedConfigs.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-950">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Play className="h-4 w-4 text-violet-400" />
                  Run Configurations
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {savedConfigs.length}
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[11px] text-violet-400"
                  onClick={() => setActiveTab('services')}
                >
                  Manage in Services
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedConfigs.map((cfg) => {
                  const isParallel = cfg.executionMode === 'parallel' && (cfg.commands?.length || 0) > 1
                  const cmds = cfg.commands?.length
                    ? cfg.commands.filter(c => c.command.trim())
                    : cfg.command ? [{ id: '1', command: cfg.command }] : []

                  return (
                    <div
                      key={cfg.id}
                      className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-zinc-100 truncate">{cfg.name}</span>
                          {isParallel ? (
                            <Badge variant="outline" className="text-[9px] bg-cyan-950/40 border-cyan-800 text-cyan-300 gap-1 px-1.5 py-0">
                              <Layers className="w-2.5 h-2.5" />
                              {cmds.length} Tabs
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] bg-violet-950/40 border-violet-800 text-violet-300 gap-1 px-1.5 py-0">
                              <TerminalSquare className="w-2.5 h-2.5" />
                              Sequential
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] font-mono text-zinc-500 truncate">
                          {cmds.map(c => c.command).join(' ; ') || 'No command'}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        className="h-7 text-xs px-2.5 bg-violet-600 hover:bg-violet-700 text-white shrink-0 gap-1"
                        onClick={async () => {
                          if (!cmds.length) return
                          const { startService } = useServiceStore.getState()
                          if (isParallel) {
                            for (let i = 0; i < cmds.length; i++) {
                              const cmd = cmds[i]
                              const termName = cmd.name ? `${cfg.name} (${cmd.name})` : `${cfg.name} #${i + 1}`
                              await startService(project.id, project.name, {
                                id: `${cfg.id}-${cmd.id || i}`,
                                name: termName,
                                command: cmd.command,
                                cwd: cfg.cwd || project.path,
                                autoRestart: cfg.autoRestart
                              })
                            }
                            toast.success(`Started ${cmds.length} services for ${cfg.name}`)
                          } else {
                            const combined = cmds.map(c => c.command).join(' ; ')
                            await startService(project.id, project.name, {
                              id: cfg.id,
                              name: cfg.name,
                              command: combined,
                              cwd: cfg.cwd || project.path,
                              autoRestart: cfg.autoRestart
                            })
                            toast.success(`Started ${cfg.name}`)
                          }
                        }}
                      >
                        <Play className="w-3 h-3" />
                        Run
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Docker Orchestration ── */}
        <DockerDashboard projectPath={project.path} projectName={project.name} />

        {/* ── NPM & Custom scripts ── */}
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
                    onClick={() => handleRunScript(name, String(cmd))}
                    title={String(cmd)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900',
                      'px-3 py-1.5 text-xs font-medium text-zinc-300',
                      'hover:border-violet-500 hover:text-violet-300 transition-colors'
                    )}
                  >
                    <Play className="h-3 w-3 text-emerald-400" />
                    {name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Project Notes & Tasks ── */}
        <MarkdownNotesEditor projectPath={project.path} projectName={project.name} />

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

      {/* ── Config Dialog ── */}
      <ProjectConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        project={project}
      />

      {/* ── Environment Manager Dialog ── */}
      <EnvManagerDialog
        open={envDialogOpen}
        onOpenChange={setEnvDialogOpen}
        projectPath={project.path}
        projectName={project.name}
      />

      {/* ── Project Clean Snapshot Dialog ── */}
      <ProjectSnapshotDialog
        open={snapshotDialogOpen}
        onOpenChange={setSnapshotDialogOpen}
        project={project}
      />
    </ScrollArea>
  )
}
