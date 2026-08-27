import React from 'react';
import { Plus } from 'lucide-react';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { StatusDot } from '../shared/StatusDot';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@renderer/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export const TerminalSidebar: React.FC = () => {
  const { terminals, activeTerminalId, setActiveTerminal, createTerminal, removeTerminal } = useTerminalStore();

  return (
    <div className="flex flex-col h-full w-64 bg-zinc-950 border-r border-zinc-800">
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Open Terminals</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {terminals.map(term => (
            <DropdownMenu key={term.id}>
              <DropdownMenuTrigger asChild>
                <div
                  onClick={() => setActiveTerminal(term.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    // trigger context menu via Radix is tricky with just onContextMenu, 
                    // using left click for now as workaround or use a generic context menu library
                  }}
                  className={cn(
                    "flex flex-col gap-1 p-2 rounded-md cursor-pointer select-none transition-colors",
                    activeTerminalId === term.id
                      ? "bg-zinc-800 text-zinc-50"
                      : "text-zinc-400 hover:bg-zinc-900"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={term.status} size="sm" />
                    <span className="text-sm font-medium truncate">{term.name}</span>
                  </div>
                  <span className="text-xs font-mono text-zinc-500 truncate pl-4">
                    {term.cwd}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => removeTerminal(term.id)} className="text-red-500">
                  Kill Terminal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t border-zinc-800">
        <Button 
          variant="outline" 
          className="w-full justify-start text-zinc-300"
          onClick={() => createTerminal({ name: 'New Terminal', cwd: '.' })}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Terminal
        </Button>
      </div>
    </div>
  );
};
