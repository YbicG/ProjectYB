import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  Server,
  Terminal as TerminalIcon,
  Edit2,
  RotateCw,
  Trash2,
  Eraser,
  PanelRight,
  PanelBottom,
  Columns,
  LayoutGrid,
  List
} from 'lucide-react';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { StatusDot } from '../shared/StatusDot';
import { cn } from '@renderer/lib/utils';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '../ui/context-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

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
    setFilter,
    layout,
    setLayout
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
  const displayedTerminals =
    filter === 'user' ? userTerminals : filter === 'service' ? serviceTerminals : terminals;

  return (
    <div className="h-12 px-2.5 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between gap-2 select-none shrink-0">
      {/* ── Left: Quick Terminal Controls (New & Split) ── */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          variant="outline"
          onClick={() => createTerminal({ name: 'Terminal', cwd: 'D:\\Code' })}
          className="h-8 px-2.5 text-xs bg-zinc-900/80 border-zinc-800 text-zinc-200 hover:border-violet-500/40 hover:text-violet-300 gap-1.5 font-medium shadow-sm"
          title="New Terminal (Ctrl+T)"
        >
          <Plus className="w-3.5 h-3.5 text-violet-400" />
          <span className="hidden sm:inline">New Tab</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
          onClick={() => {
            createTerminal({ name: 'Terminal', cwd: 'D:\\Code' });
            setLayout('grid');
          }}
          title="Split Terminal Horizontal"
        >
          <PanelRight className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
          onClick={() => {
            createTerminal({ name: 'Terminal', cwd: 'D:\\Code' });
            setLayout('grid');
          }}
          title="Split Terminal Vertical"
        >
          <PanelBottom className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1 bg-zinc-800" />
      </div>

      {/* ── Center: Scrollable Spacious Tabs ── */}
      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0 py-1">
        {displayedTerminals.map((term) => {
          const isActive = activeTerminalId === term.id;
          return (
            <ContextMenu key={term.id}>
              <ContextMenuTrigger asChild>
                <div
                  onClick={() => setActiveTerminal(term.id)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(term.id, term.name);
                  }}
                  className={cn(
                    'group flex items-center gap-2 h-8 px-3 rounded-lg text-xs font-mono cursor-pointer transition-all shrink-0 min-w-[140px] max-w-[220px] border shadow-sm',
                    isActive
                      ? 'bg-zinc-850 text-zinc-100 font-semibold border-zinc-700 ring-1 ring-violet-500/40 shadow-violet-950/20'
                      : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-zinc-800/80'
                  )}
                >
                  {term.isService ? (
                    <Server className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  ) : (
                    <TerminalIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}

                  <span
                    className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      term.status === 'running'
                        ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]'
                        : 'bg-zinc-500'
                    )}
                  />

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
                      className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded text-xs font-mono w-full outline-none ring-1 ring-violet-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate flex-1 font-mono text-xs">{term.name}</span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTerminal(term.id);
                    }}
                    className={cn(
                      'p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-rose-400 transition-all shrink-0',
                      isActive && 'opacity-70'
                    )}
                    title="Close terminal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="bg-zinc-950 border-zinc-800 text-xs">
                <ContextMenuItem onClick={() => handleStartRename(term.id, term.name)}>
                  <Edit2 className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                  Rename Tab
                </ContextMenuItem>
                <ContextMenuItem onClick={() => window.api?.terminal?.write(term.id, '\x0c')}>
                  <Eraser className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                  Clear Console
                </ContextMenuItem>
                <ContextMenuItem onClick={() => restartTerminal(term.id)}>
                  <RotateCw className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                  Restart Process
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => removeTerminal(term.id)}
                  className="text-rose-400 hover:text-rose-300"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Close Terminal
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      {/* ── Right: Clear, Restart, and Layout Modes ── */}
      <div className="flex items-center gap-1 shrink-0">
        {activeTerminalId && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              onClick={() => window.api?.terminal?.write(activeTerminalId, '\x0c')}
              title="Clear Console"
            >
              <Eraser className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
              onClick={() => restartTerminal(activeTerminalId)}
              title="Restart Terminal"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30"
              onClick={() => removeTerminal(activeTerminalId)}
              title="Kill Terminal (Ctrl+W)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            <Separator orientation="vertical" className="h-5 mx-1 bg-zinc-800" />
          </>
        )}

        {/* Layout Switcher (Tabs, Grid, List) */}
        <div className="flex items-center bg-zinc-900/90 rounded-lg p-0.5 border border-zinc-800">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 rounded-md',
              layout === 'tabs'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
            onClick={() => setLayout('tabs')}
            title="Tabs Layout"
          >
            <Columns className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 rounded-md',
              layout === 'grid'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
            onClick={() => setLayout('grid')}
            title="Split Grid Layout"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-7 w-7 rounded-md',
              layout === 'list'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
            onClick={() => setLayout('list')}
            title="Sidebar List Layout"
          >
            <List className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
