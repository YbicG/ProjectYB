import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Server, Terminal as TerminalIcon, Edit2, RotateCw, Trash2, Eraser } from 'lucide-react';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { StatusDot } from '../shared/StatusDot';
import { cn } from '@renderer/lib/utils';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export const TerminalTabs: React.FC = () => {
  const {
    terminals,
    activeTerminalId,
    setActiveTerminal,
    removeTerminal,
    createTerminal,
    renameTerminal,
    restartTerminal,
    filter,
    setFilter
  } = useTerminalStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      renameTerminal(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const userTerminals = terminals.filter((t) => !t.isService);
  const serviceTerminals = terminals.filter((t) => t.isService);
  const displayedTerminals = filter === 'user' ? userTerminals : filter === 'service' ? serviceTerminals : terminals;

  return (
    <div className="flex items-center h-10 bg-zinc-950 border-b border-zinc-800">
      {/* ── Sub-Filter Controls ── */}
      <div className="flex items-center gap-1 px-2 border-r border-zinc-800 shrink-0">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
            filter === 'all' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          All ({terminals.length})
        </button>
        <button
          onClick={() => setFilter('user')}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
            filter === 'user' ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          User ({userTerminals.length})
        </button>
        <button
          onClick={() => setFilter('service')}
          className={cn(
            'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
            filter === 'service' ? 'bg-violet-950/60 text-violet-300 border border-violet-800/40 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          )}
        >
          Services ({serviceTerminals.length})
        </button>
      </div>

      {/* ── Scrollable Tab Bar ── */}
      <ScrollArea className="flex-1 whitespace-nowrap h-full">
        <div className="flex h-full w-max">
          {displayedTerminals.map((term) => (
            <DropdownMenu key={term.id}>
              <DropdownMenuTrigger asChild>
                <div
                  onClick={() => setActiveTerminal(term.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(term.id, term.name);
                  }}
                  className={cn(
                    'group flex items-center gap-2 px-3 h-full border-r border-zinc-800 text-xs cursor-pointer select-none min-w-[130px] max-w-[220px] transition-colors',
                    activeTerminalId === term.id
                      ? 'bg-zinc-900 text-zinc-50 font-medium ring-1 ring-inset ring-violet-500/30'
                      : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900/50'
                  )}
                >
                  {term.isService ? (
                    <Server className="w-3 h-3 text-violet-400 shrink-0" />
                  ) : (
                    <TerminalIcon className="w-3 h-3 text-cyan-400 shrink-0" />
                  )}
                  <StatusDot status={term.status} size="sm" />

                  {editingId === term.id ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      className="bg-zinc-800 text-zinc-100 px-1 py-0.5 rounded text-[11px] font-mono w-full outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate flex-1 font-mono text-[11px]">{term.name}</span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTerminal(term.id);
                    }}
                    className={cn(
                      'p-0.5 rounded-sm opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-red-400 transition-all shrink-0',
                      activeTerminalId === term.id && 'opacity-100'
                    )}
                    title="Close terminal"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-zinc-950 border-zinc-800 text-xs">
                <DropdownMenuItem onClick={() => handleStartRename(term.id, term.name)}>
                  <Edit2 className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                  Rename Tab
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.api?.terminal?.write(term.id, '\x0c')}>
                  <Eraser className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                  Clear Console
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => restartTerminal(term.id)}>
                  <RotateCw className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                  Restart Process
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => removeTerminal(term.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Close Terminal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      {/* ── New Tab Button ── */}
      <button
        onClick={() => createTerminal({ name: 'Local', cwd: 'D:\\Code' })}
        className="px-3 h-full border-l border-zinc-800 text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 transition-colors shrink-0"
        title="Open new terminal (Ctrl+T)"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
