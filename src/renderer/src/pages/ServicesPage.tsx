import React, { useState, useMemo } from 'react'
import { Square, Plus, Server, Radio, Folder, RotateCw, Bookmark } from 'lucide-react'
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
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'

export const ServicesPage: React.FC = () => {
  const [subTab, setSubTab] = useState<'services' | 'configs' | 'ports'>('services')
  const { runningServices, stopService, restartService } = useServiceStore()
  const { addConfig, configs } = useRunConfigStore()
  const { projects } = useProjectStore()
  const { ports } = usePortStore()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')

  const handleStopAll = () => {
    const count = runningServices.length
    if (count === 0) return
    runningServices.forEach(service => stopService(service.id))
    toast.info(`Stopped ${count} running service${count > 1 ? 's' : ''}`)
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

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* Sub-nav header switch */}
      <div className="flex items-center gap-1 px-4 sm:px-6 pt-2 sm:pt-3 pb-0 bg-zinc-950 border-b border-zinc-800 overflow-x-auto no-scrollbar flex-nowrap shrink-0">
        <button
          onClick={() => setSubTab('services')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            subTab === 'services' ? "border-violet-500 text-violet-300 font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Server className="w-4 h-4" />
          Running Services ({runningServices.length})
        </button>

        {/* Dedicated Saved Configs tab */}
        <button
          onClick={() => setSubTab('configs')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            subTab === 'configs' ? "border-violet-500 text-violet-300 font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Bookmark className="w-4 h-4" />
          Saved Configs ({configs.length})
        </button>

        <button
          onClick={() => setSubTab('ports')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
            subTab === 'ports' ? "border-violet-500 text-violet-300 font-semibold" : "border-transparent text-zinc-400 hover:text-zinc-200"
          )}
        >
          <Radio className="w-4 h-4" />
          Active Ports ({ports.length})
        </button>
      </div>

      {subTab === 'ports' && (
        <div className="flex-1 overflow-hidden">
          <PortManager />
        </div>
      )}

      {subTab === 'configs' && (
        <div className="flex-1 overflow-hidden p-4 bg-zinc-950/50">
          <div className="max-w-2xl mx-auto h-full">
            <SavedConfigs />
          </div>
        </div>
      )}

      {subTab === 'services' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Main area — running services grouped by project */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">Services</h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  {runningServices.length} running service{runningServices.length !== 1 ? 's' : ''} across {groupedServices.length} project{groupedServices.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="flex gap-2 sm:gap-3 items-center flex-wrap">
                {/* Quick "Add config" from header */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="h-8 sm:h-9 w-36 sm:w-44 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 text-xs sm:text-sm px-2 sm:px-3 outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Select project…</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 sm:h-9 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    disabled={!dialogProject}
                    onClick={() => setDialogOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1 sm:mr-2" />
                    Add Config
                  </Button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 sm:h-9 text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={handleStopAll}
                  disabled={runningServices.length === 0}
                >
                  <Square className="w-3.5 h-3.5 mr-1 sm:mr-2" />
                  Stop All
                </Button>
              </div>
            </div>

            <div className="flex-1 p-3 sm:p-6 overflow-y-auto bg-zinc-950/50 space-y-4 sm:space-y-6">
              {runningServices.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2 p-8 text-center">
                  <p className="text-sm">No services are currently running.</p>
                  <p className="text-xs text-zinc-600 max-w-sm">
                    Launch a saved config from the panel or run one directly from a project in Dashboard.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {groupedServices.map(group => (
                    <div key={group.projectId} className="p-3 sm:p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3 sm:space-y-4">
                      {/* Project Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 gap-2 flex-wrap">
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

                        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                            onClick={() => {
                              group.services.forEach(s => restartService(s.id))
                              toast.success(`Restarting ${group.services.length} services for ${group.projectName}`)
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
                              toast.info(`Stopped ${group.services.length} services for ${group.projectName}`)
                            }}
                            title="Stop all services in this project"
                          >
                            <Square className="w-3 h-3 mr-1" />
                            Stop All
                          </Button>
                        </div>
                      </div>

                      {/* Services cards grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4">
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

          {/* Right panel — saved configs on desktop widescreen */}
          <div className="hidden xl:flex w-96 2xl:w-[420px] border-l border-zinc-800 flex-col min-h-0 overflow-hidden bg-zinc-950/40 shrink-0">
            <SavedConfigs />
          </div>
        </div>
      )}

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
  )
}
