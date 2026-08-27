import React from 'react';
import { useSystemStore } from '@renderer/stores/useSystemStore';
import { Activity } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export const SystemMonitor: React.FC = () => {
  const { cpu, ram, network } = useSystemStore();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-4 px-3 py-1 bg-zinc-900 rounded-md border border-zinc-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">CPU</span>
              <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500" style={{ width: `${cpu.usage}%` }} />
              </div>
              <span>{cpu.usage.toFixed(1)}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">RAM</span>
              <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500" style={{ width: `${(ram.used / ram.total) * 100}%` }} />
              </div>
              <span>{((ram.used / 1024 / 1024 / 1024)).toFixed(1)}GB</span>
            </div>
            
            <div className="flex items-center gap-2 text-zinc-400">
              <Activity className="w-3 h-3" />
              <span>↓{network.downSpeed} ↑{network.upSpeed}</span>
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
