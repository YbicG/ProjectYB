import React from 'react';
import { Plus, X, Server, Terminal as TerminalIcon } from 'lucide-react';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { StatusDot } from '../shared/StatusDot';
import { cn } from '@renderer/lib/utils';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';

export const TerminalTabs: React.FC = () => {
  const {
    terminals,
    activeTerminalId,
    setActiveTerminal,
    removeTerminal,
    createTerminal,
    renameTerminal,
    filter,
    setFilter
  } = useTerminalStore();

  const handleDoubleClick = (id: string, currentName: string) => {
    const newName = prompt('Rename terminal:', currentName);
    if (newName && newName.trim()) {
      renameTerminal(id, newName.trim());
    }
  };

  const userTerminals = terminals.filter(t => !t.isService);
  const serviceTerminals = terminals.filter(t => t.isService);

  const displayedTerminals = filter === 'user'
    ? userTerminals
    : filter === 'service'
      ? serviceTerminals
      : terminals;

  return (
    <div className="flex items-center h-10 bg-zinc-950 border-b border-zinc-800">
      {/* Filter Mode Switcher */}
      <div className="flex items-center gap-0.5 px-2 border-r border-zinc-800 shrink-0">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-2 py-1 text-xs rounded transition-colors",
            filter === 'all'
              ? "bg-zinc-800 text-zinc-100 font-medium"
              : "text-zinc-500 hover:text-zinc-300"
          )}
          title="Show all terminals"
        >
          All ({terminals.length})
        </button>
        <button
          onClick={() => setFilter('user')}
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
            filter === 'user'
              ? "bg-zinc-800 text-zinc-100 font-medium"
              : "text-zinc-500 hover:text-zinc-300"
          )}
          title="Show user-created shells only"
        >
          <TerminalIcon className="w-3 h-3 text-cyan-400" />
          Shells ({userTerminals.length})
        </button>
        <button
          onClick={() => setFilter('service')}
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
            filter === 'service'
              ? "bg-zinc-800 text-zinc-100 font-medium"
              : "text-zinc-500 hover:text-zinc-300"
          )}
          title="Show background service logs only"
        >
          <Server className="w-3 h-3 text-violet-400" />
          Services ({serviceTerminals.length})
        </button>
      </div>

      {/* Terminal Tabs List */}
      <ScrollArea className="flex-1 whitespace-nowrap h-full">
        <div className="flex h-full w-max">
          {displayedTerminals.map(term => (
            <div
              key={term.id}
              onClick={() => setActiveTerminal(term.id)}
              onDoubleClick={() => handleDoubleClick(term.id, term.name)}
              className={cn(
                "group flex items-center gap-2 px-3 h-full border-r border-zinc-800 text-xs cursor-pointer select-none min-w-[130px] max-w-[220px] transition-colors",
                activeTerminalId === term.id 
                  ? "bg-zinc-900 text-zinc-50 font-medium ring-1 ring-inset ring-violet-500/30" 
                  : "bg-zinc-950 text-zinc-400 hover:bg-zinc-900/50"
              )}
            >
              {term.isService ? (
                <Server className="w-3 h-3 text-violet-400 shrink-0" />
              ) : (
                <TerminalIcon className="w-3 h-3 text-cyan-400 shrink-0" />
              )}
              <StatusDot status={term.status} size="sm" />
              <span className="truncate flex-1 font-mono text-[11px]">{term.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeTerminal(term.id);
                }}
                className={cn(
                  "p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-red-400 transition-all",
                  activeTerminalId === term.id && "opacity-100"
                )}
                title="Close terminal"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {displayedTerminals.length === 0 && (
            <div className="flex items-center px-4 text-xs text-zinc-600 italic h-full">
              No {filter === 'user' ? 'user shells' : filter === 'service' ? 'service terminals' : 'terminals'} open
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      <button
        onClick={() => createTerminal({ name: 'Local Shell', cwd: 'D:\\Code', isService: false })}
        className="h-full px-3.5 border-l border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors gap-1 text-xs"
        title="Open new shell terminal"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="text-[11px] font-medium hidden sm:inline">New Shell</span>
      </button>
    </div>
  );
};
