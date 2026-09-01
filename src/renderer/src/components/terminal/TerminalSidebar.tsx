import React from 'react';
import { Plus, Edit2, Trash2, Server, Terminal as TerminalIcon, MoreVertical, Eraser } from 'lucide-react';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { StatusDot } from '../shared/StatusDot';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@renderer/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export const TerminalSidebar: React.FC = () => {
  const {
    terminals,
    activeTerminalId,
    setActiveTerminal,
    createTerminal,
    removeTerminal,
    renameTerminal,
    filter,
    setFilter
  } = useTerminalStore();
  const { projects } = useProjectStore();

  const handleRename = (id: string, currentName: string) => {
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

  // Group terminals by projectId
  const groups = displayedTerminals.reduce<Record<string, typeof terminals>>((acc, term) => {
    const key = term.projectId ?? '__standalone__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(term);
    return acc;
  }, {});

  const getGroupLabel = (key: string): string => {
    if (key === '__standalone__') return 'Standalone Shells';
    const project = projects.find(p => p.id === key);
    return project?.name ?? key;
  };

  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    if (a === '__standalone__') return 1;
    if (b === '__standalone__') return -1;
    return getGroupLabel(a).localeCompare(getGroupLabel(b));
  });

  return (
    <div className="flex flex-col h-full w-64 bg-zinc-950 border-r border-zinc-800">
      <div className="p-3 border-b border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Terminals</h3>
          <span className="text-[10px] text-zinc-500 font-mono">{displayedTerminals.length}</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-md border border-zinc-800">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "flex-1 text-[11px] py-1 rounded transition-colors text-center font-medium",
              filter === 'all' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            All ({terminals.length})
          </button>
          <button
            onClick={() => setFilter('user')}
            className={cn(
              "flex-1 text-[11px] py-1 rounded transition-colors text-center font-medium",
              filter === 'user' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Shells ({userTerminals.length})
          </button>
          <button
            onClick={() => setFilter('service')}
            className={cn(
              "flex-1 text-[11px] py-1 rounded transition-colors text-center font-medium",
              filter === 'service' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            Services ({serviceTerminals.length})
          </button>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {sortedGroupKeys.map(groupKey => (
            <div key={groupKey}>
              <div className="px-2 mb-1">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {getGroupLabel(groupKey)}
                </span>
              </div>
              <div className="space-y-1">
                {groups[groupKey].map((term) => (
                  <div
                    key={term.id}
                    onClick={() => setActiveTerminal(term.id)}
                    className={cn(
                      'group flex items-center justify-between p-2 rounded-md cursor-pointer select-none transition-colors gap-2',
                      activeTerminalId === term.id
                        ? 'bg-zinc-800 text-zinc-50 ring-1 ring-violet-500/40'
                        : 'text-zinc-400 hover:bg-zinc-900'
                    )}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {term.isService ? (
                          <Server className="w-3 h-3 text-violet-400 shrink-0" />
                        ) : (
                          <TerminalIcon className="w-3 h-3 text-cyan-400 shrink-0" />
                        )}
                        <StatusDot status={term.status} size="sm" />
                        <span className="text-xs font-medium truncate font-mono">{term.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 truncate pl-5">
                        {term.cwd}
                      </span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-opacity shrink-0"
                          title="Terminal actions"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 text-xs">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(term.id, term.name);
                          }}
                          className="cursor-pointer focus:bg-zinc-800"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                          Rename Terminal
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            window.api?.terminal?.write(term.id, '\x0c');
                          }}
                          className="cursor-pointer focus:bg-zinc-800"
                        >
                          <Eraser className="w-3.5 h-3.5 mr-2 text-zinc-400" />
                          Clear Console
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            removeTerminal(term.id);
                          }}
                          className="cursor-pointer focus:bg-zinc-800 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" />
                          Close Terminal
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {displayedTerminals.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">No {filter} terminals open</p>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t border-zinc-800">
        <Button 
          variant="outline" 
          className="w-full justify-start text-zinc-300 h-8 text-xs"
          onClick={() => {
            const defaultCwd = useAppStore.getState().scanPaths[0] || 'D:\\Code';
            createTerminal({ name: 'Local Shell', cwd: defaultCwd, isService: false });
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-2" />
          New Shell
        </Button>
      </div>
    </div>
  );
};
