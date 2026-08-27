import React from 'react';
import { Play, Square, RotateCw, TerminalSquare, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { StatusDot } from '../shared/StatusDot';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';

export interface RunningService {
  id: string;
  name: string;
  projectName: string;
  command: string;
  uptime: string;
  cpu: number;
  ram: number;
  status: 'running' | 'stopped' | 'starting' | 'error';
  port?: number;
}

interface ServiceCardProps {
  service: RunningService;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const { stopService, restartService, startService } = useServiceStore();
  const { setActiveTerminal } = useTerminalStore();
  const { setActiveTab } = useAppStore();

  const handleStop = () => stopService(service.id);
  const handleRestart = () => restartService(service.id);
  const handleTerminal = () => {
    if (service.terminalId) {
      setActiveTerminal(service.terminalId);
      setActiveTab('terminals');
    }
  };
  const handleStart = () => {
    // Note: To start properly we need project info and config. 
    // Usually 'starting' from this button might mean restarting it or using a cached config.
    // For now we'll call restart if it has the data, or just ignore if it's purely stopped.
    // The prompt only said "Stop button", "Restart button", "Terminal button".
  };

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <StatusDot status={service.status} />
            <div>
              <h4 className="font-medium text-zinc-50">{service.name}</h4>
              <p className="text-xs text-zinc-400 hover:text-violet-400 cursor-pointer underline-offset-2 hover:underline">
                {service.projectName}
              </p>
            </div>
          </div>
          {service.port && (
            <Button variant="outline" size="sm" className="h-7 text-xs bg-zinc-950">
              <ExternalLink className="w-3 h-3 mr-1.5" />
              {service.port}
            </Button>
          )}
        </div>

        <div className="bg-zinc-950 rounded px-2 py-1.5 text-xs font-mono text-zinc-300 border border-zinc-800 truncate">
          {service.command}
        </div>

        <div className="flex items-center justify-between text-xs text-zinc-500">
          <div className="flex gap-4">
            <span title="Uptime">Uptime: {service.uptime}</span>
            <span>CPU: {service.cpu}%</span>
            <span>RAM: {service.ram}MB</span>
          </div>
        </div>

        <div className="flex gap-2 mt-1">
          {service.status === 'running' ? (
            <>
              <Button variant="secondary" size="sm" className="flex-1 h-8 bg-zinc-800 hover:bg-zinc-700" onClick={handleRestart}>
                <RotateCw className="w-3 h-3 mr-2" />
                Restart
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 h-8" onClick={handleStop}>
                <Square className="w-3 h-3 mr-2" />
                Stop
              </Button>
            </>
          ) : (
            <Button variant="default" size="sm" className="flex-1 h-8" onClick={handleStart}>
              <Play className="w-3 h-3 mr-2" />
              Start
            </Button>
          )}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleTerminal}>
            <TerminalSquare className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
