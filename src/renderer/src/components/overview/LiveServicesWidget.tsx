import React, { useState, useEffect } from 'react';
import { Server, RotateCw, Square, TerminalSquare, Radio } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { StatusDot } from '../shared/StatusDot';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';

const formatUptime = (startTime?: number) => {
  if (!startTime) return '0s';
  const sec = Math.floor((Date.now() - startTime) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
};

export const LiveServicesWidget: React.FC = () => {
  const { runningServices, stopService, restartService } = useServiceStore();
  const { setActiveTerminal } = useTerminalStore();
  const { setActiveTab } = useAppStore();
  const [, setTick] = useState(0);

  // Tick every second to update uptime clocks
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleJumpToTerminal = (terminalId?: string) => {
    if (terminalId) {
      setActiveTerminal(terminalId);
      setActiveTab('terminals');
    }
  };

  return (
    <Card className="bg-zinc-950/80 border-zinc-800/90 flex flex-col h-full overflow-hidden backdrop-blur-sm">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <CardTitle className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">
            Live Running Services
          </CardTitle>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/40 text-emerald-400">
          {runningServices.length} ACTIVE
        </Badge>
      </CardHeader>

      <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5">
        {runningServices.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-600 space-y-1">
            <Server className="w-8 h-8 opacity-40 mb-1" />
            <p className="text-xs">No active services running</p>
            <p className="text-[10px]">Start npm scripts or saved configs from Services tab</p>
          </div>
        ) : (
          runningServices.map((service) => (
            <div
              key={service.id}
              className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <StatusDot status="running" size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-100 truncate">{service.name}</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-zinc-950 font-mono text-zinc-400">
                      {service.projectName}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 mt-1">
                    <span className="text-zinc-500">Uptime: <span className="text-zinc-300">{formatUptime(service.startedAt)}</span></span>
                    <span>CPU: <span className="text-zinc-200">{service.cpuUsage ?? 0}%</span></span>
                    <span>RAM: <span className="text-zinc-200">{service.memoryUsage ?? 0}MB</span></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
                  onClick={() => restartService(service.id)}
                  title="Restart service"
                >
                  <RotateCw className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => stopService(service.id)}
                  title="Stop service"
                >
                  <Square className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
                  onClick={() => handleJumpToTerminal((service as any).terminalId)}
                  title="View terminal output"
                >
                  <TerminalSquare className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
