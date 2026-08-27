import React, { useEffect, useState } from 'react'
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
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { RunConfigDialog } from './RunConfigDialog'
import { toast } from 'sonner'

interface SavedConfigsProps {
  /** If set, only show configs for this project */
  projectId?: string
}

export const SavedConfigs: React.FC<SavedConfigsProps> = ({ projectId }) => {
  const { configs, load, addConfig, updateConfig, deleteConfig } = useRunConfigStore()
  const { startService } = useServiceStore()
  const { projects } = useProjectStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<RunConfig | undefined>()
  const [newForProject, setNewForProject] = useState<{ id: string; name: string; path: string } | null>(null)

  useEffect(() => { load() }, [])

  const displayed = projectId ? configs.filter(c => c.projectId === projectId) : configs

  const handleLaunch = async (config: RunConfig, overrideMode?: ExecutionMode) => {
    const cmds = config.commands?.length
      ? config.commands.filter(c => c.command.trim())
      : config.command
        ? [{ id: '1', name: config.name, command: config.command }]
        : []

    if (!cmds.length) return

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
          cwd: config.cwd,
          autoRestart: config.autoRestart,
        })
      }
      toast.success(`Launched ${cmds.length} commands in separate terminals`)
    } else {
      // Run sequentially in one terminal
      const combined = cmds.map(c => c.command).join(' ; ')
      await startService(config.projectId, config.projectName, {
        id: config.id,
        name: config.name,
        command: combined,
        cwd: config.cwd,
        autoRestart: config.autoRestart,
      })
      toast.success(`Launched ${config.name} sequentially in 1 terminal`)
    }
  }

  const handleEdit = (config: RunConfig) => {
    setEditing(config)
    setNewForProject(null)
    setDialogOpen(true)
  }

  const handleNew = () => {
    setEditing(undefined)
    // Default to first project if no filter
    const proj = projectId
      ? projects.find(p => p.id === projectId)
      : projects[0]
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
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Saved Configs</h3>
          <p className="text-[10px] text-zinc-500 mt-0.5">{displayed.length} configuration{displayed.length !== 1 ? 's' : ''}</p>
        </div>
        <Button
          variant="ghost" size="sm"
          className="h-7 px-2 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
          onClick={handleNew}
          disabled={!projectId && projects.length === 0}
        >
          <Plus className="w-3 h-3 mr-1" /> New
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {displayed.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <Terminal className="w-8 h-8 text-zinc-700 mx-auto" />
            <div>
              <p className="text-sm text-zinc-500">No saved configurations</p>
              <p className="text-xs text-zinc-600 mt-1">
                Click <span className="text-violet-400">New</span> to add a run config
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {displayed.map(config => {
              const cmdList = config.commands?.length
                ? config.commands.filter(c => c.command.trim())
                : config.command
                  ? [{ id: '1', name: '', command: config.command }]
                  : []
              const isMulti = cmdList.length > 1
              const mode = config.executionMode ?? 'sequential'

              return (
                <div
                  key={config.id}
                  className="group p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">{config.name}</p>
                      {!projectId && (
                        <p className="text-[10px] text-zinc-500 truncate">{config.projectName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
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
                              {cmdList.length} Terminals
                            </>
                          ) : (
                            <>
                              <Terminal className="w-2.5 h-2.5 text-violet-400" />
                              Sequential (1 Tab)
                            </>
                          )}
                        </Badge>
                      )}
                      {config.autoRestart && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-700 text-zinc-400 shrink-0">
                          auto-restart
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Commands Preview */}
                  <div className="space-y-1 bg-zinc-950 p-2 rounded border border-zinc-800/80">
                    {cmdList.map((cmd, idx) => (
                      <div key={cmd.id || idx} className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 truncate">
                        {isMulti && (
                          <span className="text-[10px] text-zinc-500 font-sans font-medium w-4 shrink-0">
                            {idx + 1}.
                          </span>
                        )}
                        {cmd.name && (
                          <span className="text-violet-400 text-[10px] font-sans font-semibold shrink-0 bg-violet-950/60 px-1 rounded border border-violet-800/40">
                            {cmd.name}
                          </span>
                        )}
                        <span className="text-zinc-400 truncate">{cmd.command}</span>
                      </div>
                    ))}
                  </div>

                  {config.env && Object.keys(config.env).length > 0 && (
                    <p className="text-[10px] text-zinc-500">
                      {Object.keys(config.env).length} env var{Object.keys(config.env).length !== 1 ? 's' : ''} configured
                    </p>
                  )}

                  {/* Action Buttons with Multi-Launch Dropdown */}
                  <div className="flex gap-1 pt-1">
                    {!isMulti ? (
                      <Button
                        size="sm"
                        className="flex-1 h-7 bg-violet-600 hover:bg-violet-700 text-xs font-medium"
                        onClick={() => handleLaunch(config)}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Launch
                      </Button>
                    ) : (
                      <div className="flex-1 flex gap-0.5">
                        <Button
                          size="sm"
                          className="flex-1 h-7 bg-violet-600 hover:bg-violet-700 text-xs font-medium rounded-r-none"
                          onClick={() => handleLaunch(config)}
                          title={`Launch (${mode === 'parallel' ? 'Separate Terminals' : 'Sequential'})`}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Launch ({mode === 'parallel' ? 'Separate' : 'Sequential'})
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              className="h-7 px-1.5 bg-violet-700 hover:bg-violet-800 text-white rounded-l-none border-l border-violet-500/30"
                              title="More launch options"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-200 text-xs">
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer focus:bg-zinc-800"
                              onClick={() => handleLaunch(config, 'sequential')}
                            >
                              <Terminal className="w-3.5 h-3.5 text-violet-400" />
                              <div>
                                <div className="font-medium">Run sequentially in 1 terminal</div>
                                <div className="text-[10px] text-zinc-500">All commands in one tab</div>
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 cursor-pointer focus:bg-zinc-800"
                              onClick={() => handleLaunch(config, 'parallel')}
                            >
                              <Layers className="w-3.5 h-3.5 text-cyan-400" />
                              <div>
                                <div className="font-medium">Run each in a new terminal</div>
                                <div className="text-[10px] text-zinc-500">{cmdList.length} separate terminal tabs</div>
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
                      onClick={() => handleEdit(config)}
                      title="Edit Configuration"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-red-400"
                      onClick={() => deleteConfig(config.id)}
                      title="Delete Configuration"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>

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
