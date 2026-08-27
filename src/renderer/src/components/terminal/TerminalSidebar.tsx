import React from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { StatusDot } from '../shared/StatusDot';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@renderer/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

export const TerminalSidebar: React.FC = () => {
  const { terminals, activeTerminalId, setActiveTerminal, createTerminal, removeTerminal, renameTerminal } = useTerminalStore();
  const { projects } = useProjectStore();

  const handleRename = (id: string, currentName: string) => {
    const newName = prompt('Rename terminal:', currentName);
    if (newName && newName.trim()) {
      renameTerminal(id, newName.trim());
    }
  };

  // Group terminals by projectId
  const groups = terminals.reduce<Record<string, typeof terminals>>((acc, term) => {
    const key = term.projectId ?? '__standalone__';
    if (!acc[key]) acc[key] = [];
    acc[key].push(term);
    return acc;
  }, {});

  const getGroupLabel = (key: string): string => {
    if (key === '__standalone__') return 'Standalone';
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
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Open Terminals</h3>
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
                {groups[groupKey].map(term => (
                  <DropdownMenu key={term.id}>
                    <DropdownMenuTrigger asChild>
                      <div
                        onClick={() => setActiveTerminal(term.id)}
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
                    <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800">
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
                        onClick={() => removeTerminal(term.id)}
                        className="cursor-pointer focus:bg-zinc-800 text-red-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                        Kill Terminal
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ))}
              </div>
            </div>
          ))}
          {terminals.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-4">No terminals open</p>
          )}
        </div>
      </ScrollArea>
      
      <div className="p-3 border-t border-zinc-800">
        <Button 
          variant="outline" 
          className="w-full justify-start text-zinc-300"
          onClick={() => createTerminal({ name: 'New Terminal', cwd: 'D:\\Code' })}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Terminal
        </Button>
      </div>
    </div>
  );
};
