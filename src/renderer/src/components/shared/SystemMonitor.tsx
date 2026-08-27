import React from 'react';
import { useSystemStore } from '@renderer/stores/useSystemStore';
import { Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export const SystemMonitor: React.FC = () => {
  const { metrics } = useSystemStore();

  if (!metrics) {
    return (
      <div className="flex items-center gap-4 px-3 py-1 bg-zinc-900 rounded-md border border-zinc-800 text-xs font-mono text-zinc-500">
        <Activity className="w-3 h-3 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  const cpuUsage = metrics.cpu.usage;
  const ramPercent = metrics.memory.percentage;
  const ramUsedGB = (metrics.memory.used / 1024 / 1024 / 1024).toFixed(1);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-4 px-3 py-1 bg-zinc-900 rounded-md border border-zinc-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">CPU</span>
              <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${cpuUsage}%` }} />
              </div>
              <span className="text-zinc-200">{cpuUsage.toFixed(1)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">RAM</span>
              <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${ramPercent}%` }} />
              </div>
              <span className="text-zinc-200">{ramUsedGB}GB</span>
            </div>
            
            <div className="flex items-center gap-2 text-zinc-400">
              <Activity className="w-3 h-3" />
              <span>↓{(metrics.network.rxSec / 1024).toFixed(0)}K ↑{(metrics.network.txSec / 1024).toFixed(0)}K</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>System Performance Metrics</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
