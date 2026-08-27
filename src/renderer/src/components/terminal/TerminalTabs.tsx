import React from 'react';
import { Plus, X } from 'lucide-react';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { StatusDot } from '../shared/StatusDot';
import { cn } from '@renderer/lib/utils';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

export const TerminalTabs: React.FC = () => {
  const { terminals, activeTerminalId, setActiveTerminal, removeTerminal, createTerminal } = useTerminalStore();

  const handleDoubleClick = (id: string, currentName: string) => {
    const newName = prompt('Rename terminal:', currentName);
    if (newName) {
      updateTerminal(id, { name: newName });
    }
  };

  return (
    <div className="flex items-center h-10 bg-zinc-950 border-b border-zinc-800">
      <ScrollArea className="flex-1 whitespace-nowrap h-full">
        <div className="flex h-full w-max">
          {terminals.map(term => (
            <div
              key={term.id}
              onClick={() => setActiveTerminal(term.id)}
              onDoubleClick={() => handleDoubleClick(term.id, term.name)}
              className={cn(
                "group flex items-center gap-2 px-4 h-full border-r border-zinc-800 text-sm cursor-pointer select-none min-w-[120px] max-w-[200px] transition-colors",
                activeTerminalId === term.id 
                  ? "bg-zinc-900 text-zinc-50 font-medium" 
                  : "bg-zinc-950 text-zinc-400 hover:bg-zinc-900/50"
              )}
            >
              <StatusDot status={term.status} size="sm" />
              <span className="truncate flex-1">{term.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTerminal(term.id);
                }}
                className={cn(
                  "p-1 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-zinc-50 transition-all",
                  activeTerminalId === term.id && "opacity-100"
                )}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
      <button
        onClick={() => createTerminal({ name: 'Local', cwd: '.' })}
        className="h-full px-4 border-l border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
