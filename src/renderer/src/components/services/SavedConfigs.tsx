import React, { useEffect, useState, useMemo } from 'react'
import { Play, Pencil, Trash2, Plus, Terminal, Layers, ChevronDown } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import { useRunConfigStore, type RunConfig, type ExecutionMode } from '@renderer/stores/useRunConfigStore'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useWorkspaceProjects } from '@renderer/hooks/useWorkspaceProjects'
import { RunConfigDialog } from './RunConfigDialog'
import { toast } from 'sonner'

interface SavedConfigsProps {
  /** If set, only show configs for this project */
  projectId?: string
}

export const SavedConfigs: React.FC<SavedConfigsProps> = ({ projectId }) => {
  const { configs, load, addConfig, updateConfig, deleteConfig } = useRunConfigStore()
  const { startService } = useServiceStore()
  const { projects, isWorkspaceScoped } = useWorkspaceProjects()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RunConfig | undefined>()
  const [newForProject, setNewForProject] = useState<{ id: string; name: string; path: string } | null>(null)

  useEffect(() => {
    load()
  }, [])

  const displayed = useMemo(() => {
    if (projectId) {
      return configs.filter((c) => c.projectId === projectId)
    }
    if (isWorkspaceScoped) {
      const allowedIds = new Set(projects.map((p) => p.id))
      return configs.filter((c) => allowedIds.has(c.projectId) || c.projectId === 'workspace')
    }
    return configs
  }, [configs, projectId, isWorkspaceScoped, projects])

  const handleLaunch = async (config: RunConfig, overrideMode?: ExecutionMode) => {
    const cmds = config.commands?.length
      ? config.commands.filter((c) => c.command.trim())
      : config.command
        ? [{ id: '1', name: config.name, command: config.command }]
        : []

    if (!cmds.length) return

    const project = projects.find((p) => p.id === config.projectId)
    const effectiveCwd = config.cwd || project?.path || config.projectPath || 'D:\\Code'
    const mode = overrideMode ?? config.executionMode ?? 'sequential'

    if (mode === 'parallel' && cmds.length > 1) {
      // Spawn a new in-app terminal for each command
      for (let i = 0; i < cmds.length; i++) {
        const cmd = cmds[i]
        const termName = cmd.name ? `${config.name} (${cmd.name})` : `${config.name} #${i + 1}`
        await startService(config.projectId, config.projectName, {
          id: `${config.id}-${cmd.id || i}`,
          name: termName,
          command: cmd.command,
          cwd: effectiveCwd,
          autoRestart: config.autoRestart
        })
      }
      toast.success(`Launched ${cmds.length} commands in separate terminals`)
    } else {
      // Run sequentially in one terminal
      const combined = cmds.map((c) => c.command.trim()).filter(Boolean).join(' && ')
      await startService(config.projectId, config.projectName, {
        id: config.id,
        name: config.name,
        command: combined,
        cwd: effectiveCwd,
        autoRestart: config.autoRestart
      })
      toast.success(`Launched ${config.name} in terminal`)
    }
  }

  const handleEdit = (config: RunConfig) => {
    setEditing(config)
    setNewForProject(null)
    setDialogOpen(true)
  }

  const handleNew = () => {
    setEditing(undefined)
    const proj = projectId ? projects.find((p) => p.id === projectId) : projects[0]
    setNewForProject(proj ? { id: proj.id, name: proj.name, path: proj.path } : null)
    setDialogOpen(true)
  }

  const handleSave = async (data: Omit<RunConfig, 'id' | 'createdAt'>) => {
    if (editing) {
      await updateConfig(editing.id, data)
    } else {
      await addConfig(data)
    }
    setEditing(undefined)
  }

  const dialogProject = editing
    ? { id: editing.projectId, name: editing.projectName, path: editing.projectPath }
    : newForProject

  return (
    <div className="flex flex-col h-full w-full min-h-0 min-w-0 overflow-hidden bg-zinc-950/60">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-zinc-800/80 flex items-center justify-between shrink-0 bg-zinc-950">
        <div className="min-w-0">
          <h3 className="font-semibold text-xs text-zinc-100 uppercase tracking-wider">
            Saved Configs
          </h3>
          <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
            {displayed.length} configuration{displayed.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs text-violet-300 border-violet-500/30 hover:bg-violet-950/40 shrink-0"
          onClick={handleNew}
          disabled={!projectId && projects.length === 0}
        >
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      {/* Content List */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {displayed.length === 0 ? (
          <div className="py-10 text-center space-y-2 text-zinc-500">
            <Terminal className="w-8 h-8 opacity-30 mx-auto" />
            <p className="text-xs font-medium text-zinc-400">No saved configurations</p>
            <p className="text-[10px] text-zinc-600 max-w-xs mx-auto">
              Create run configurations to launch multi-command or parallel background services.
            </p>
          </div>
        ) : (
          displayed.map((config: RunConfig) => {
            const cmdList = config.commands?.length
              ? config.commands.filter((c: any) => c.command.trim())
              : config.command
                ? [{ id: '1', name: '', command: config.command }]
                : []
            const isMulti = cmdList.length > 1
            const mode = config.executionMode ?? 'sequential'

            return (
              <div
                key={config.id}
                className="group p-3 rounded-xl bg-zinc-900/90 border border-zinc-800/90 hover:border-violet-500/30 transition-all space-y-2.5 w-full min-w-0 overflow-hidden shadow-sm"
              >
                {/* Card Title & Badges */}
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-zinc-100 truncate" title={config.name}>
                      {config.name}
                    </p>
                    {!projectId && (
                      <p className="text-[10px] text-zinc-500 font-mono truncate block mt-0.5">
                        {config.projectName}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    <Badge
                      variant="outline"
                      className="bg-emerald-950/40 text-emerald-400 border-emerald-800/50 text-[9px] px-1.5 py-0 font-mono"
                      title="Stored in <project>/.ybicg/services.json"
                    >
                      .ybicg
                    </Badge>
                    {isMulti && (
                      <Badge
                        variant="outline"
                        className={
                          mode === 'parallel'
                            ? 'bg-cyan-950/50 text-cyan-300 border-cyan-800/60 font-mono text-[9px] gap-1 px-1.5 py-0'
                            : 'bg-violet-950/50 text-violet-300 border-violet-800/60 font-mono text-[9px] gap-1 px-1.5 py-0'
                        }
                      >
                        {mode === 'parallel' ? (
                          <>
                            <Layers className="w-2.5 h-2.5 text-cyan-400" />
                            {cmdList.length} Tabs
                          </>
                        ) : (
                          <>
                            <Terminal className="w-2.5 h-2.5 text-violet-400" />
                            {cmdList.length} Steps
                          </>
                        )}
                      </Badge>
                    )}
                    {config.autoRestart && (
                      <Badge
                        variant="outline"
                        className="bg-amber-950/50 text-amber-300 border-amber-800/60 font-mono text-[9px] px-1.5 py-0"
                      >
                        auto-restart
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Commands Preview */}
                <div className="space-y-1 bg-zinc-950/90 p-2 rounded-lg border border-zinc-850 w-full min-w-0 overflow-hidden">
                  {cmdList.map((cmd: any, idx: number) => (
                    <div
                      key={cmd.id || idx}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 min-w-0 w-full overflow-hidden"
                    >
                      {isMulti && (
                        <span className="text-[10px] text-zinc-500 font-sans font-medium w-3.5 shrink-0">
                          {idx + 1}.
                        </span>
                      )}
                      {cmd.name && (
                        <span className="text-violet-400 text-[10px] font-sans font-semibold shrink-0 bg-violet-950/60 px-1 rounded border border-violet-800/40">
                          {cmd.name}
                        </span>
                      )}
                      <span className="text-zinc-400 truncate min-w-0 flex-1 font-mono" title={cmd.command}>
                        {cmd.command}
                      </span>
                    </div>
                  ))}
                </div>

                {config.env && Object.keys(config.env).length > 0 && (
                  <p className="text-[10px] text-zinc-500 font-mono">
                    {Object.keys(config.env).length} env var
                    {Object.keys(config.env).length !== 1 ? 's' : ''} configured
                  </p>
                )}

                {/* Actions Footer */}
                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-800/70 min-w-0">
                  {!isMulti ? (
                    <Button
                      size="sm"
                      className="flex-1 h-7 bg-violet-600 hover:bg-violet-700 text-xs font-medium min-w-0 text-white gap-1"
                      onClick={() => handleLaunch(config)}
                    >
                      <Play className="w-3 h-3 shrink-0" />
                      Launch
                    </Button>
                  ) : (
                    <div className="flex-1 min-w-0 flex">
                      <Button
                        size="sm"
                        className="flex-1 min-w-0 h-7 bg-violet-600 hover:bg-violet-700 text-xs font-medium rounded-r-none text-white px-2 gap-1"
                        onClick={() => handleLaunch(config)}
                        title={`Launch (${mode === 'parallel' ? 'Separate Terminals' : 'Sequential'})`}
                      >
                        <Play className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          Launch ({mode === 'parallel' ? 'Separate' : 'Sequential'})
                        </span>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="h-7 px-1.5 bg-violet-700 hover:bg-violet-800 text-white rounded-l-none border-l border-violet-500/30 shrink-0"
                            title="More launch options"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs"
                        >
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer focus:bg-zinc-800"
                            onClick={() => handleLaunch(config, 'sequential')}
                          >
                            <Terminal className="w-3.5 h-3.5 text-violet-400" />
                            <div>
                              <div className="font-medium">Run sequentially in 1 tab</div>
                              <div className="text-[10px] text-zinc-500">All commands in one terminal</div>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer focus:bg-zinc-800"
                            onClick={() => handleLaunch(config, 'parallel')}
                          >
                            <Layers className="w-3.5 h-3.5 text-cyan-400" />
                            <div>
                              <div className="font-medium">Run each in separate tabs</div>
                              <div className="text-[10px] text-zinc-500">
                                {cmdList.length} separate terminal instances
                              </div>
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 shrink-0"
                    onClick={() => handleEdit(config)}
                    title="Edit Configuration"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 shrink-0"
                    onClick={() => deleteConfig(config.id)}
                    title="Delete Configuration"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {dialogProject && (
        <RunConfigDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          projectId={dialogProject.id}
          projectName={dialogProject.name}
          projectPath={dialogProject.path}
          existing={editing}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
