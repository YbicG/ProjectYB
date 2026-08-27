import React, { useState } from 'react'
import {
  TerminalSquare,
  GitBranch,
  Code,
  FolderOpen,
  Play,
  Clock,
  MonitorPlay,
  ExternalLink,
  Settings,
  EyeOff,
  Folder,
  FileCode,
  Pencil,
  BookOpen,
  Layers,
  Lock,
  Star
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { StatusDot } from '../shared/StatusDot'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { RunConfigDialog } from '../services/RunConfigDialog'
import { ProjectConfigDialog } from './ProjectConfigDialog'
import { EnvManagerDialog } from '../env/EnvManagerDialog'
import { useRunConfigStore } from '@renderer/stores/useRunConfigStore'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { useAppStore } from '@renderer/stores/useAppStore'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useTerminalStore } from '@renderer/stores/useTerminalStore'
import type { ProjectInfo, SubProject } from '@renderer/types/project'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'
import { useGit } from '../../hooks/useGit'

interface ProjectCardProps {
  project: ProjectInfo
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { setActiveTab } = useAppStore()
  const gitSelectProject = useGitStore((s) => s.selectProject)
  const fetchStatus = useGitStore((s) => s.fetchStatus)
  const { createTerminal } = useTerminalStore()
  const { addConfig } = useRunConfigStore()
  const { ignoreProject, selectProject, pinnedProjectIds, togglePinProject } = useProjectStore()
  const isPinned = pinnedProjectIds.includes(project.id)
  const isRunning = useServiceStore((s) => s.runningServices.some((srv) => srv.projectId === project.id))

  const [runConfigDialogOpen, setRunConfigDialogOpen] = useState(false)
  const [projectConfigDialogOpen, setProjectConfigDialogOpen] = useState(false)
  const [envDialogOpen, setEnvDialogOpen] = useState(false)
  const savedConfigs = useRunConfigStore((s) => s.configs).filter((c) => c.projectId === project.id)

  const handleOpenTerminal = async (sub?: SubProject) => {
    const termName = sub ? `${project.name} (${sub.name})` : project.name
    const termCwd = sub ? sub.path : project.path
    await createTerminal({ name: termName, cwd: termCwd, projectId: project.id })
    setActiveTab('terminals')
  }

  const handleOpenExternalTerminal = (targetPath?: string) => {
    if (window.api?.projects) {
      window.api.projects.openTerminal(targetPath || project.path)
    }
  }

  const handleOpenVSCode = () => {
    if (window.api?.projects) {
      window.api.projects.openInVSCode(project.path)
    }
  }

  const handleOpenFolder = () => {
    if (window.api?.projects) {
      window.api.projects.openInExplorer(project.path)
    }
  }

  const handleGitStatus = () => {
    selectProject(project.id)
    gitSelectProject(project.id)
    fetchStatus(project.id, project.path)
    setActiveTab('git')
  }

  const handleOpenDetail = () => {
    selectProject(project.id)
    gitSelectProject(project.id)
    setActiveTab('project-detail')
  }

  const handleIgnoreProject = async () => {
    if (
      window.confirm(
        `Ignore project "${project.name}"?\n\nThis will add "ignore": true to its .projectyb.json and hide it from your dashboard.`
      )
    ) {
      try {
        await ignoreProject(project.path)
        const ignoredList =
          ((await window.api?.store?.get('ignoredProjects')) as string[] | undefined) || []
        if (!ignoredList.includes(project.path)) {
          await window.api?.store?.set('ignoredProjects', [...ignoredList, project.path])
        }
        toast.info(`Ignored "${project.name}". Config updated in .projectyb.json.`)
      } catch (err) {
        toast.error(`Failed to ignore project`)
      }
    }
  }

  const handleQuickRun = async (cmd?: string, sub?: SubProject) => {
    const targetCwd = sub ? sub.path : project.path
    const serviceName = sub ? `${sub.name}` : `${project.name} (dev)`

    if (cmd) {
      await useServiceStore.getState().startService(project.id, project.name, {
        name: serviceName,
        command: cmd,
        cwd: targetCwd
      })
      toast.success(`Started service: ${serviceName}`)
    } else {
      await handleOpenTerminal(sub)
    }
  }

  const hasSubprojects = project.subprojects && project.subprojects.length > 0

  return (
    <Card className="flex flex-col h-full hover:border-zinc-700 transition-colors group bg-zinc-950/70 border-zinc-800">
      <CardHeader className="pb-2 cursor-pointer" onClick={handleOpenDetail}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CardTitle
              className="text-sm font-bold truncate hover:text-violet-400 transition-colors text-zinc-100"
              title={project.name}
            >
              {project.name}
            </CardTitle>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setProjectConfigDialogOpen(true)
              }}
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-zinc-500 hover:text-violet-400 p-0.5 rounded transition-opacity"
              title="Edit project name & config"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                togglePinProject(project.id)
              }}
              className={cn(
                "p-0.5 rounded transition-all",
                isPinned
                  ? "text-amber-400 opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-zinc-500 hover:text-amber-400"
              )}
              title={isPinned ? "Unpin project" : "Pin project to top"}
            >
              <Star className={cn("w-3 h-3", isPinned && "fill-amber-400")} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 border-zinc-700">
              {project.type}
            </Badge>
            <StatusDot status={isRunning ? 'running' : project.status} />
          </div>
        </div>

        {/* ── Subprojects / Subfolders Pills ── */}
        {hasSubprojects && (
          <div className="flex flex-wrap gap-1 mt-2">
            {project.subprojects!.slice(0, 4).map((sub) => {
              const isDocs = sub.type === 'docs' || sub.name.toLowerCase().includes('doc')
              const isApp = sub.name.toLowerCase().startsWith('apps') || sub.name.toLowerCase().startsWith('packages')
              return (
                <Badge
                  key={sub.id || sub.name}
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenTerminal(sub)
                  }}
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 gap-1 cursor-pointer transition-colors font-mono max-w-[130px] truncate",
                    isDocs
                      ? "hover:bg-amber-950/40 hover:border-amber-700 text-zinc-300 hover:text-amber-300"
                      : isApp
                      ? "hover:bg-cyan-950/40 hover:border-cyan-700 text-zinc-300 hover:text-cyan-300"
                      : "hover:bg-violet-950/60 hover:border-violet-700 text-zinc-300 hover:text-violet-300"
                  )}
                  title={`Click to open terminal in ${sub.relativePath}`}
                >
                  {isDocs ? (
                    <BookOpen className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                  ) : isApp ? (
                    <Layers className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                  ) : (
                    <Folder className="w-2.5 h-2.5 text-violet-400 shrink-0" />
                  )}
                  <span className="truncate">{sub.name}</span>
                </Badge>
              )
            })}
            {project.subprojects!.length > 4 && (
              <Badge variant="outline" className="text-[9px] px-1 py-0 text-zinc-500 font-mono">
                +{project.subprojects!.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* ── Project Tags ── */}
        {project.tags && project.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {project.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] px-1.5 py-0 bg-zinc-900/80 text-zinc-400 max-w-[100px] truncate">
                {tag}
              </Badge>
            ))}
            {project.tags.length > 4 && (
              <Badge variant="outline" className="text-[8px] px-1 py-0 text-zinc-500 font-mono">
                +{project.tags.length - 4}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3 text-xs text-zinc-400 space-y-2 cursor-pointer" onClick={handleOpenDetail}>
        <div className="flex items-center justify-between text-zinc-500 text-[11px]">
          <span className="truncate font-medium flex-1 mr-2">{project.category}</span>
          {project.gitBranch && (
            <div 
              className="flex items-center gap-1 text-violet-400 font-mono shrink-0 max-w-[130px] truncate"
              title={project.gitBranch}
            >
              <GitBranch className="w-3 h-3 shrink-0" />
              <span className="truncate">{project.gitBranch}</span>
            </div>
          )}
        </div>

        {project.lastCommit && (
          <div className="bg-zinc-900/50 p-2 rounded text-xs border border-zinc-800/40">
            <div className="truncate text-zinc-300 text-[11px]">{project.lastCommit}</div>
            {project.lastCommitTime && (
              <div className="flex items-center gap-1 text-zinc-500 mt-1 text-[10px]">
                <Clock className="w-2.5 h-2.5" />
                {project.lastCommitTime}
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between border-t border-zinc-800/50 mt-auto px-4 py-2.5 opacity-90 group-hover:opacity-100 transition-opacity bg-zinc-950/40">
        <div className="flex items-center gap-1">
          {/* ── Terminal Actions Dropdown ── */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                title="Terminals & Configs"
              >
                <TerminalSquare className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-zinc-900 border-zinc-800">
              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800 text-xs"
                onClick={() => handleOpenTerminal()}
              >
                <MonitorPlay className="w-3.5 h-3.5 text-violet-400" />
                <div>
                  <div className="font-medium">In-App Terminal</div>
                  <div className="text-[10px] text-zinc-500">Root folder</div>
                </div>
              </DropdownMenuItem>

              {hasSubprojects && (
                <>
                  <DropdownMenuSeparator className="bg-zinc-800" />
                  {project.subprojects!.map((sub) => (
                    <DropdownMenuItem
                      key={sub.id || sub.name}
                      className="gap-2 cursor-pointer focus:bg-zinc-800 text-xs pl-4"
                      onClick={() => handleOpenTerminal(sub)}
                    >
                      <Folder className="w-3 h-3 text-cyan-400" />
                      <div>
                        <div className="font-medium">{sub.name} Terminal</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{sub.relativePath}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800 text-xs"
                onClick={() => handleOpenExternalTerminal()}
              >
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                <div>
                  <div className="font-medium">External Terminal</div>
                  <div className="text-[10px] text-zinc-500">PowerShell</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800 text-xs text-violet-300"
                onClick={() => setProjectConfigDialogOpen(true)}
              >
                <FileCode className="w-3.5 h-3.5 text-violet-400" />
                <div>
                  <div className="font-medium">Edit Config & Name</div>
                  <div className="text-[10px] text-zinc-500">.projectyb.json editor</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800 text-xs text-amber-300"
                onClick={() => setEnvDialogOpen(true)}
              >
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <div className="font-medium">Environment (.env)</div>
                  <div className="text-[10px] text-zinc-500">Vault & secret manager</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800 text-xs"
                onClick={() => setRunConfigDialogOpen(true)}
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <div>
                  <div className="font-medium">Add Run Configuration</div>
                  <div className="text-[10px] text-zinc-500">Save command preset</div>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800 text-xs text-rose-400 hover:text-rose-300"
                onClick={handleIgnoreProject}
              >
                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                <div>
                  <div className="font-medium">Ignore Project</div>
                  <div className="text-[10px] text-zinc-500">Hide from dashboard</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            title="Git Status"
            onClick={handleGitStatus}
          >
            <GitBranch className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            title="Open in VS Code"
            onClick={handleOpenVSCode}
          >
            <Code className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            title="Open Folder"
            onClick={handleOpenFolder}
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* ── Run Button / Dropdown ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant={isRunning ? 'secondary' : 'default'}
              className={cn(
                "h-7 text-xs px-2.5 gap-1",
                isRunning
                  ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40 hover:bg-emerald-900/50"
                  : "bg-violet-600 hover:bg-violet-700 text-white"
              )}
            >
              {isRunning ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isRunning ? 'Running' : 'Run'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 bg-zinc-900 border-zinc-800 text-xs">
            <DropdownMenuItem
              className="cursor-pointer focus:bg-zinc-800 gap-2"
              onClick={() => {
                const devCmd = project.scripts?.dev
                  ? 'pnpm dev'
                  : project.scripts?.start
                    ? 'pnpm start'
                    : null
                handleQuickRun(devCmd || undefined)
              }}
            >
              <Play className="w-3 h-3 text-emerald-400" />
              <div>
                <div className="font-medium">Run Default ({project.name})</div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {project.scripts?.dev || project.scripts?.start || 'Open terminal'}
                </div>
              </div>
            </DropdownMenuItem>

            {/* Saved Configurations for this project */}
            {savedConfigs.length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Run Configs
                </div>
                {savedConfigs.map((cfg) => {
                  const isParallel = cfg.executionMode === 'parallel' && (cfg.commands?.length || 0) > 1
                  const cmds = cfg.commands?.length
                    ? cfg.commands.filter(c => c.command.trim())
                    : cfg.command ? [{ id: '1', command: cfg.command }] : []

                  return (
                    <DropdownMenuItem
                      key={cfg.id}
                      className="cursor-pointer focus:bg-zinc-800 gap-2"
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
                      {isParallel ? <Layers className="w-3 h-3 text-cyan-400" /> : <Play className="w-3 h-3 text-violet-400" />}
                      <div className="min-w-0">
                        <div className="font-medium text-xs text-zinc-200 truncate">{cfg.name}</div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate">
                          {isParallel ? `${cmds.length} separate terminals` : cmds.map(c => c.command).join(' ; ')}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  )
                })}
              </>
            )}

            {hasSubprojects && (
              <>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {project.subprojects!.map((sub) => (
                  <DropdownMenuItem
                    key={sub.id || sub.name}
                    className="cursor-pointer focus:bg-zinc-800 gap-2"
                    onClick={() => {
                      const subCmd = sub.scripts?.dev
                        ? 'pnpm dev'
                        : sub.scripts?.start
                          ? 'pnpm start'
                          : undefined
                      handleQuickRun(subCmd, sub)
                    }}
                  >
                    <Folder className="w-3 h-3 text-cyan-400" />
                    <div>
                      <div className="font-medium">Run {sub.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        {sub.scripts?.dev || sub.scripts?.start || `cd ${sub.relativePath}`}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </>
            )}

            {project.scripts && Object.keys(project.scripts).length > 0 && (
              <>
                <DropdownMenuSeparator className="bg-zinc-800" />
                {Object.entries(project.scripts)
                  .slice(0, 4)
                  .map(([sName, sCmd]) => (
                    <DropdownMenuItem
                      key={sName}
                      className="cursor-pointer focus:bg-zinc-800 gap-2 font-mono text-[11px]"
                      onClick={() => handleQuickRun(sCmd as string)}
                    >
                      <span className="text-violet-300 font-semibold">{sName}</span>
                      <span className="text-zinc-500 truncate text-[10px]">({sCmd as string})</span>
                    </DropdownMenuItem>
                  ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>

      {/* ── Dialogs ── */}
      <RunConfigDialog
        open={runConfigDialogOpen}
        onOpenChange={setRunConfigDialogOpen}
        projectId={project.id}
        projectName={project.name}
        projectPath={project.path}
        onSave={(data) => addConfig(data)}
      />

      <ProjectConfigDialog
        open={projectConfigDialogOpen}
        onOpenChange={setProjectConfigDialogOpen}
        project={project}
      />

      <EnvManagerDialog
        open={envDialogOpen}
        onOpenChange={setEnvDialogOpen}
        projectPath={project.path}
        projectName={project.name}
      />
    </Card>
  )
}
