import React, { useState, useMemo } from 'react'
import { Square, Plus, Server, Radio, Folder, RotateCw } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { ServiceCard } from '../components/services/ServiceCard'
import { SavedConfigs } from '../components/services/SavedConfigs'
import { RunConfigDialog } from '../components/services/RunConfigDialog'
import { PortManager } from '../components/ports/PortManager'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useRunConfigStore, type RunConfig } from '@renderer/stores/useRunConfigStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { usePortStore } from '@renderer/stores/usePortStore'
import type { RunningService } from '@renderer/types/service'

export const ServicesPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'services' | 'ports'>('services')
  const { runningServices, stopService, restartService } = useServiceStore()
  const { addConfig } = useRunConfigStore()
  const { projects } = useProjectStore()
  const { ports } = usePortStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const handleStopAll = () => {
    runningServices.forEach(service => stopService(service.id))
  }

  const handleSaveConfig = async (data: Omit<RunConfig, 'id' | 'createdAt'>) => {
    await addConfig(data)
  }

  // Group running services by project
  const groupedServices = useMemo(() => {
    const map = new Map<string, { projectId: string; projectName: string; projectPath?: string; services: RunningService[] }>()
    
    for (const service of runningServices) {
      const key = service.projectId || service.projectName || 'other'
      if (!map.has(key)) {
        const proj = projects.find(p => p.id === service.projectId || p.name === service.projectName)
        map.set(key, {
          projectId: service.projectId || 'other',
          projectName: service.projectName || proj?.name || 'General Services',
          projectPath: proj?.path,
          services: []
        })
      }
      map.get(key)!.services.push(service)
    }
    
    return Array.from(map.values())
  }, [runningServices, projects])

  const dialogProject = projects.find(p => p.id === selectedProjectId) ?? projects[0]

  if (subTab === 'ports') {
    return (
      <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
        {/* Sub-nav header switch */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-0 bg-zinc-950 border-b border-zinc-800">
          <button
            onClick={() => setSubTab('services')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <Server className="w-4 h-4" />
            Running Services ({runningServices.length})
          </button>
          <button
            onClick={() => setSubTab('ports')}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 border-violet-500 text-violet-300 transition-colors font-semibold"
          >
            <Radio className="w-4 h-4" />
            Active Ports ({ports.length})
          </button>
        </div>

        <PortManager />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Sub-nav header switch */}
      <div className="flex items-center gap-1 px-6 pt-3 pb-0 bg-zinc-950 border-b border-zinc-800">
        <button
          onClick={() => setSubTab('services')}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 border-violet-500 text-violet-300 transition-colors font-semibold"
        >
          <Server className="w-4 h-4" />
          Running Services ({runningServices.length})
        </button>
        <button
          onClick={() => setSubTab('ports')}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <Radio className="w-4 h-4" />
          Active Ports ({ports.length})
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main area — running services grouped by project */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Services</h1>
              <p className="text-sm text-zinc-400 mt-1">
                {runningServices.length} running service{runningServices.length !== 1 ? 's' : ''} across {groupedServices.length} project{groupedServices.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="flex gap-3 items-center">
              {/* Quick "Add config" from header */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  className="h-9 w-44 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 text-sm px-3 outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select project…</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  className="h-9 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  disabled={!dialogProject}
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Config
                </Button>
              </div>

              <Button
                variant="outline"
                className="h-9 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                onClick={handleStopAll}
                disabled={runningServices.length === 0}
              >
                <Square className="w-4 h-4 mr-2" />
                Stop All
              </Button>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-zinc-950/50 space-y-6">
            {runningServices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
                <p className="text-sm">No services are currently running.</p>
                <p className="text-xs text-zinc-600">
                  Launch a saved config from the panel on the right, or run one directly from a project.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedServices.map(group => (
                  <div key={group.projectId} className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4">
                    {/* Project Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                          <Folder className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-zinc-100 truncate">{group.projectName}</h2>
                            <Badge variant="outline" className="text-[10px] bg-zinc-950 border-zinc-800 text-zinc-400">
                              {group.services.length} active
                            </Badge>
                          </div>
                          {group.projectPath && (
                            <p className="text-[10px] font-mono text-zinc-500 truncate mt-0.5">{group.projectPath}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                          onClick={() => {
                            group.services.forEach(s => restartService(s.id))
                          }}
                          title="Restart all services in this project"
                        >
                          <RotateCw className="w-3 h-3 mr-1" />
                          Restart All
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => {
                            group.services.forEach(s => stopService(s.id))
                          }}
                          title="Stop all services in this project"
                        >
                          <Square className="w-3 h-3 mr-1" />
                          Stop All
                        </Button>
                      </div>
                    </div>

                    {/* Services cards grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {group.services.map(service => (
                        <ServiceCard key={service.id} service={service} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — saved configs */}
        <div className="w-96 min-w-[360px] border-l border-zinc-800 flex flex-col overflow-hidden bg-zinc-950/40">
          <SavedConfigs />
        </div>

        {/* Dialog for quick-add from header */}
        {dialogProject && (
          <RunConfigDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            projectId={dialogProject.id}
            projectName={dialogProject.name}
            projectPath={dialogProject.path}
            onSave={handleSaveConfig}
          />
        )}
      </div>
    </div>
  )
}
