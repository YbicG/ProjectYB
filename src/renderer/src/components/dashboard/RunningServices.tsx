import React from 'react';
import { Play, Square, RotateCw, TerminalSquare } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { StatusDot } from '../shared/StatusDot';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { ScrollArea } from '../ui/scroll-area';

export const RunningServices: React.FC = () => {
  const { runningServices } = useServiceStore();

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-l border-zinc-800 w-80">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="font-semibold text-sm">Running Services</h3>
        <Badge variant="secondary">{runningServices.length}</Badge>
      </div>
      
      <ScrollArea className="flex-1">
        {runningServices.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            No services running
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {runningServices.map(service => (
              <div key={service.id} className="group p-3 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors relative">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusDot status="running" size="sm" />
                    <div>
                      <div className="text-sm font-medium leading-none">{service.name}</div>
                      <div className="text-xs text-zinc-500 mt-1">{service.projectName}</div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 mb-2">
                  <span>CPU: {service.cpu || '0'}%</span>
                  <span>RAM: {service.ram || '0'}MB</span>
                </div>
                
                <div className="flex gap-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 p-0.5 rounded shadow-sm">
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Restart">
                    <RotateCw className="w-3 h-3 text-zinc-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-500/20 hover:text-red-500" title="Stop">
                    <Square className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Terminal">
                    <TerminalSquare className="w-3 h-3 text-zinc-400" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
