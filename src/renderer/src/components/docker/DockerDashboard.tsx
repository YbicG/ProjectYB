import React, { useEffect } from 'react';
import {
  Boxes,
  Play,
  Square,
  RotateCw,
  FileText,
  Database,
  RefreshCw,
  ExternalLink,
  Layers,
  Terminal,
  Activity
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { ContainerLogsModal } from './ContainerLogsModal';
import { DatabaseProbeModal } from './DatabaseProbeModal';
import { useDockerStore } from '@renderer/stores/useDockerStore';
import { cn } from '@renderer/lib/utils';

interface DockerDashboardProps {
  projectPath: string;
  projectName: string;
}

export const DockerDashboard: React.FC<DockerDashboardProps> = ({ projectPath, projectName }) => {
  const {
    status,
    services,
    projectHasCompose,
    projectHasDockerfile,
    isLoading,
    isStarting,
    isStopping,
    checkStatus,
    loadProjectDocker,
    composeUp,
    composeStop,
    composeRestart,
    composeDown,
    openLogs,
    setProbeModalOpen
  } = useDockerStore();

  useEffect(() => {
    checkStatus();
    loadProjectDocker(projectPath);
  }, [projectPath]);

  const getStateColor = (state: string) => {
    switch (state) {
      case 'running':
        return 'text-emerald-400 border-emerald-800 bg-emerald-950/40';
      case 'exited':
        return 'text-zinc-500 border-zinc-800 bg-zinc-900';
      case 'restarting':
        return 'text-amber-400 border-amber-800 bg-amber-950/40';
      default:
        return 'text-zinc-400 border-zinc-800 bg-zinc-900';
    }
  };

  if (!status?.available) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 p-8 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <Boxes className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">Docker Not Detected</h4>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            Docker CLI was not found in your PATH. Install Docker Desktop to manage containers and compose services directly from ProjectYB.
          </p>
        </div>
      </Card>
    );
  }

  if (!projectHasCompose && !projectHasDockerfile) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 p-8 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-zinc-200">No Docker Manifest Found</h4>
          <p className="text-xs text-zinc-500 max-w-sm mt-1">
            "{projectName}" does not contain a <code className="text-violet-400">docker-compose.yml</code> or <code className="text-violet-400">Dockerfile</code>.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs border-zinc-800 gap-1.5"
          onClick={() => setProbeModalOpen(true)}
        >
          <Database className="w-3.5 h-3.5 text-cyan-400" /> Test Database Connection
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Top Header Controls ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-600/10 border border-cyan-500/20 text-cyan-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-zinc-100">
                  Docker Compose Orchestration
                </CardTitle>
                <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-800">
                  {status.version}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                {services.length} services discovered in compose stack
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-xs h-7 gap-1.5"
              disabled={isStarting}
              onClick={() => composeUp(projectPath)}
            >
              <Play className="w-3 h-3" /> Start Stack
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-zinc-800 text-zinc-300 hover:text-white gap-1.5"
              disabled={isStopping}
              onClick={() => composeStop(projectPath)}
            >
              <Square className="w-3 h-3" /> Stop Stack
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-zinc-800 text-zinc-300 hover:text-white gap-1.5"
              onClick={() => composeRestart(projectPath)}
            >
              <RotateCw className="w-3 h-3" /> Restart
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-zinc-800 text-cyan-400 hover:text-cyan-300 gap-1.5"
              onClick={() => setProbeModalOpen(true)}
            >
              <Database className="w-3.5 h-3.5" /> DB Probe
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => loadProjectDocker(projectPath)}
              disabled={isLoading}
              title="Refresh Compose Status"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>

        {/* ── Services Grid ── */}
        <CardContent className="p-4">
          {services.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              Compose services are stopped. Click "Start Stack" to launch containers.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((srv) => (
                <div
                  key={srv.id}
                  className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('w-2 h-2 rounded-full', srv.state === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600')} />
                      <span className="text-xs font-bold text-zinc-200">{srv.name}</span>
                    </div>

                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 capitalize', getStateColor(srv.state))}>
                      {srv.state}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
                    <span className="truncate max-w-[200px]" title={srv.image}>
                      {srv.image}
                    </span>
                    {srv.publishers && srv.publishers.length > 0 && (
                      <div className="flex items-center gap-1">
                        {srv.publishers.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => window.open(`http://localhost:${p.publishedPort}`, '_blank')}
                            className="text-cyan-400 hover:text-cyan-300 underline font-mono text-[10px]"
                          >
                            :{p.publishedPort}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-800/60 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-zinc-400 hover:text-zinc-200 gap-1 px-2"
                      onClick={() => openLogs(projectPath, srv.service)}
                    >
                      <Terminal className="w-3 h-3" /> Logs
                    </Button>

                    {srv.state === 'running' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-zinc-400 hover:text-red-400 gap-1 px-2"
                        onClick={() => composeStop(projectPath, srv.service)}
                      >
                        <Square className="w-3 h-3" /> Stop
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[11px] text-emerald-400 hover:text-emerald-300 gap-1 px-2"
                        onClick={() => composeUp(projectPath, srv.service)}
                      >
                        <Play className="w-3 h-3" /> Start
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-400 hover:text-zinc-200"
                      onClick={() => composeRestart(projectPath, srv.service)}
                      title="Restart container"
                    >
                      <RotateCw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ContainerLogsModal projectPath={projectPath} />
      <DatabaseProbeModal />
    </div>
  );
};
