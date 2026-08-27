import React, { useEffect } from 'react';
import { Layers, Plus, Play, Square, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { useWorkspaceStore } from '@renderer/stores/useWorkspaceStore';
import { WorkspaceEditorDialog } from './WorkspaceEditorDialog';
import { cn } from '@renderer/lib/utils';

export const WorkspaceSelector: React.FC = () => {
  const {
    stacks,
    activeStackId,
    bootState,
    loadStacks,
    setActiveStack,
    openEditor,
    bootStack,
    stopStack,
    deleteStack
  } = useWorkspaceStore();

  useEffect(() => {
    loadStacks();
  }, []);

  const activeStack = stacks.find((s) => s.id === activeStackId);

  return (
    <>
      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-xs gap-2 px-2.5 font-normal"
            >
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-violet-400" />
                <span className="font-semibold text-zinc-200">
                  {activeStack ? activeStack.name : 'Workspaces'}
                </span>
                {activeStack && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-800 text-zinc-400">
                    {activeStack.services.length} services
                  </Badge>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-64 bg-zinc-950 border-zinc-800 text-zinc-200 text-xs">
            <div className="p-2 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">
              Workspace Stacks
            </div>

            {stacks.length === 0 ? (
              <div className="p-3 text-center text-zinc-500 text-[11px]">
                No workspace stacks created yet.
              </div>
            ) : (
              stacks.map((stack) => (
                <div
                  key={stack.id}
                  className="flex items-center justify-between p-1.5 hover:bg-zinc-900 rounded cursor-pointer group"
                >
                  <div
                    className="flex items-center gap-2 min-w-0 flex-1"
                    onClick={() => setActiveStack(stack.id)}
                  >
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        stack.color === 'cyan' && 'bg-cyan-500',
                        stack.color === 'emerald' && 'bg-emerald-500',
                        stack.color === 'amber' && 'bg-amber-500',
                        stack.color === 'rose' && 'bg-rose-500',
                        stack.color === 'blue' && 'bg-blue-500',
                        (!stack.color || stack.color === 'violet') && 'bg-violet-500'
                      )}
                    />
                    <span className="truncate font-medium text-xs text-zinc-200">{stack.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({stack.services.length})</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditor(stack);
                      }}
                      title="Edit stack"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-zinc-500 hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStack(stack.id);
                      }}
                      title="Delete stack"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            <DropdownMenuSeparator className="bg-zinc-800" />

            <DropdownMenuItem
              className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer gap-2"
              onClick={() => openEditor()}
            >
              <Plus className="w-3.5 h-3.5" /> Create New Workspace Stack
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 1-Click Launch Active Stack Button */}
        {activeStack && (
          <Button
            size="sm"
            className="h-8 bg-violet-600 hover:bg-violet-700 text-xs px-2.5 gap-1.5"
            disabled={bootState === 'booting'}
            onClick={() => {
              if (bootState === 'running') {
                stopStack(activeStack);
              } else {
                bootStack(activeStack);
              }
            }}
          >
            {bootState === 'running' ? (
              <>
                <Square className="w-3 h-3" /> Stop Stack
              </>
            ) : (
              <>
                <Play className="w-3 h-3" /> Boot Stack
              </>
            )}
          </Button>
        )}
      </div>

      <WorkspaceEditorDialog />
    </>
  );
};
