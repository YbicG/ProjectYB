import React, { useEffect } from 'react';
import { Container, Radio, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useDockerStore } from '@renderer/stores/useDockerStore';
import { usePortStore } from '@renderer/stores/usePortStore';
import { useAppStore } from '@renderer/stores/useAppStore';

export const DockerRadarWidget: React.FC = () => {
  const { status, services, checkStatus } = useDockerStore();
  const { ports, fetchPorts, isLoading: portsLoading } = usePortStore();
  const { setActiveTab } = useAppStore();

  useEffect(() => {
    checkStatus();
    fetchPorts();
  }, []);

  const isDockerRunning = Boolean(status?.running);
  const safeServices = Array.isArray(services) ? services : [];
  const safePorts = Array.isArray(ports) ? ports : [];
  const runningServicesCount = safeServices.filter((s) => s.state === 'running').length;

  return (
    <Card className="bg-zinc-950/80 border-zinc-800/90 flex flex-col h-full overflow-hidden backdrop-blur-sm">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-cyan-400" />
          <CardTitle className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">
            Network Ports & Docker
          </CardTitle>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
            onClick={() => {
              checkStatus();
              fetchPorts();
            }}
            title="Refresh ports & Docker status"
          >
            <RefreshCw className={`w-3 h-3 ${portsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 flex-1 overflow-y-auto space-y-3">
        {/* ── Active Listening Ports Matrix ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Listening Local Ports</span>
            <span className="text-[10px] font-mono text-cyan-400">{safePorts.length} Open</span>
          </div>

          {safePorts.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">No listening ports detected</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {safePorts.slice(0, 9).map((p) => (
                <div
                  key={`${p.port}-${p.pid}`}
                  className="p-2 rounded bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between hover:border-cyan-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-300">:{p.port}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono truncate mt-0.5">{p.process || `PID ${p.pid}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Docker Daemon & Containers Status ── */}
        <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Container className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">Docker Daemon</span>
            </div>

            {isDockerRunning ? (
              <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400">
                Daemon Active {status?.version ? `(${status.version})` : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-400">
                Daemon Inactive
              </Badge>
            )}
          </div>

          {safeServices.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">
              {isDockerRunning ? 'No Docker Compose services loaded' : 'Start Docker Desktop to see container telemetry'}
            </p>
          ) : (
            <div className="space-y-1.5">
              {safeServices.slice(0, 4).map((s) => (
                <div
                  key={s.name}
                  className="p-2 rounded bg-zinc-900/60 border border-zinc-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        s.state === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                      }`}
                    />
                    <span className="font-semibold text-zinc-200 truncate">{s.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">{s.image || s.state}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
