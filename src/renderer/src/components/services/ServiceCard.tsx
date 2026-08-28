import React, { useState, useEffect } from 'react';
import { Play, Square, RotateCw, TerminalSquare, ExternalLink, Maximize2, Terminal } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { StatusDot } from '../shared/StatusDot';
import { TerminalView } from '../terminal/TerminalView';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import type { RunningService } from '@renderer/types/service';

interface ServiceCardProps {
  service: RunningService;
}

function formatUptime(startedAt?: number): string {
  if (!startedAt) return '0s';
  const sec = Math.floor((Date.now() - startedAt) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hr = Math.floor(min / 60);
  return `${hr}h ${min % 60}m`;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const { stopService, restartService } = useServiceStore();
  const { setActiveTerminal, setFilter } = useTerminalStore();
  const { setActiveTab } = useAppStore();
  const [logsOpen, setLogsOpen] = useState(false);
  const [uptime, setUptime] = useState(formatUptime(service.startedAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(formatUptime(service.startedAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [service.startedAt]);

  const handleStop = () => stopService(service.id);
  const handleRestart = () => restartService(service.id);
  
  const handleGoToTerminal = () => {
    if (service.terminalId) {
      setFilter('service');
      setActiveTerminal(service.terminalId);
      setActiveTab('terminals');
      setLogsOpen(false);
    }
  };

  return (
    <>
      <Card className="hover:border-zinc-700 transition-colors bg-zinc-900/90 border-zinc-800 flex flex-col justify-between">
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <StatusDot status={service.status === 'crashed' ? 'error' : service.status === 'restarting' ? 'starting' : service.status} />
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-zinc-100 truncate">{service.name}</h4>
                <p className="text-[11px] text-zinc-400 truncate">
                  {service.projectName}
                </p>
              </div>
            </div>
            {service.port && (
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[11px] bg-zinc-950 border-zinc-800 text-cyan-400 hover:text-cyan-300 shrink-0 px-2"
                onClick={() => window.open(`http://localhost:${service.port}`, '_blank')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                :{service.port}
              </Button>
            )}
          </div>

          <div className="bg-zinc-950 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-300 border border-zinc-800/80 truncate">
            <span className="text-zinc-500 mr-1.5">$</span>
            {service.command}
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
            <span title="Process Uptime">Up: {uptime}</span>
            <span>CPU: {service.cpuUsage ?? 0}%</span>
            <span>RAM: {service.memoryUsage ?? 0}MB</span>
          </div>

          <div className="flex gap-2 mt-1 pt-1 border-t border-zinc-800/60">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 bg-zinc-950 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 text-xs font-medium gap-1.5"
              onClick={() => setLogsOpen(true)}
              title="View live terminal output"
            >
              <Terminal className="w-3.5 h-3.5 text-violet-400" />
              Logs
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
              onClick={handleRestart}
              title="Restart Service"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 px-2.5 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs"
              onClick={handleStop}
              title="Stop Service"
            >
              <Square className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Terminal Log Modal */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-4xl h-[80vh] flex flex-col p-4">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-800 space-y-0">
            <div className="flex items-center gap-2">
              <StatusDot status={service.status === 'crashed' ? 'error' : service.status === 'restarting' ? 'starting' : service.status} />
              <DialogTitle className="text-sm font-semibold text-zinc-100 font-mono">
                {service.projectName} &gt; {service.name}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 mr-6 gap-1"
              onClick={handleGoToTerminal}
              title="Open full terminal page"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Full Terminal
            </Button>
          </DialogHeader>

          <div className="flex-1 w-full h-full min-h-0 bg-zinc-950 rounded border border-zinc-800 overflow-hidden relative mt-2">
            {service.terminalId ? (
              <TerminalView terminalId={service.terminalId} cwd="" />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                No active terminal session attached.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
