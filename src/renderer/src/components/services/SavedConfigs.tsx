import React, { useEffect, useState } from 'react'
import { Play, Pencil, Trash2, Plus, Terminal } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { useRunConfigStore, type RunConfig } from '@renderer/stores/useRunConfigStore'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { RunConfigDialog } from './RunConfigDialog'

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

  const handleLaunch = async (config: RunConfig) => {
    await startService(config.projectId, config.projectName, {
      id: config.id,
      name: config.name,
      command: config.command,
      cwd: config.cwd,
      autoRestart: config.autoRestart,
    })
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
          <div className="p-3 space-y-2">
            {displayed.map(config => (
              <div
                key={config.id}
                className="group p-3 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{config.name}</p>
                    {!projectId && (
                      <p className="text-[10px] text-zinc-500 truncate">{config.projectName}</p>
                    )}
                  </div>
                  {config.autoRestart && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-700 text-zinc-500 shrink-0">
                      auto-restart
                    </Badge>
                  )}
                </div>

                <code className="block text-[11px] font-mono text-violet-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 truncate mb-2">
                  {config.command}
                </code>

                {config.env && Object.keys(config.env).length > 0 && (
                  <p className="text-[10px] text-zinc-600 mb-2">
                    {Object.keys(config.env).length} env var{Object.keys(config.env).length !== 1 ? 's' : ''}
                  </p>
                )}

                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="flex-1 h-7 bg-violet-600 hover:bg-violet-700 text-xs"
                    onClick={() => handleLaunch(config)}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Launch
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
                    onClick={() => handleEdit(config)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-zinc-500 hover:text-red-400"
                    onClick={() => deleteConfig(config.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
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
