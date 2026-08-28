import React, { useEffect } from 'react';
import { Layers, Plus, Play, Square, Globe, Edit2, Trash2, Check, Sparkles } from 'lucide-react';
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
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { WorkspaceEditorDialog } from './WorkspaceEditorDialog';
import { cn } from '@renderer/lib/utils';

export const WorkspaceSelector: React.FC = () => {
  const {
    workspaces,
    activeWorkspaceId,
    loadWorkspaces,
    setActiveWorkspace,
    openEditor,
    bootWorkspace,
    stopWorkspace,
    deleteWorkspace,
    isWorkspaceRunning
  } = useWorkspaceStore();

  const { projects } = useProjectStore();

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const isRunning = activeWorkspace ? isWorkspaceRunning(activeWorkspace.id) : false;

  return (
    <>
      <div className="flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-zinc-800 bg-zinc-950/90 hover:bg-zinc-900 text-xs gap-2 px-2.5 font-normal shadow-sm"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {activeWorkspace ? (
                  <>
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full shrink-0',
                        activeWorkspace.color === 'cyan' && 'bg-cyan-400',
                        activeWorkspace.color === 'emerald' && 'bg-emerald-400',
                        activeWorkspace.color === 'amber' && 'bg-amber-400',
                        activeWorkspace.color === 'rose' && 'bg-rose-400',
                        activeWorkspace.color === 'blue' && 'bg-blue-400',
                        (!activeWorkspace.color || activeWorkspace.color === 'violet') && 'bg-violet-400',
                        isRunning && 'animate-pulse'
                      )}
                    />
                    <span className="font-semibold text-zinc-100 truncate max-w-[120px]">
                      {activeWorkspace.name}
                    </span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-800 text-zinc-400 font-mono">
                      {activeWorkspace.projectIds?.length || 0} proj
                    </Badge>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="font-medium text-zinc-300">All Projects</span>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-800 text-zinc-500 font-mono">
                      {projects.length}
                    </Badge>
                  </>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-72 bg-zinc-950/95 border-zinc-800/90 text-zinc-200 text-xs backdrop-blur-xl shadow-2xl p-1.5">
            <div className="px-2 py-1.5 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Workspaces & Stacks</span>
              <span className="font-mono text-[9px] text-zinc-600">{workspaces.length} active</span>
            </div>

            {/* Option: All Projects */}
            <div
              className={cn(
                'flex items-center justify-between px-2 py-2 rounded-lg cursor-pointer transition-all mb-1',
                activeWorkspaceId === null ? 'bg-violet-600/15 text-violet-200 font-semibold' : 'hover:bg-zinc-900/80 text-zinc-300'
              )}
              onClick={() => setActiveWorkspace(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Globe className="w-4 h-4 text-zinc-400" />
                <span className="text-xs">All Projects</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500 font-mono">{projects.length} projects</span>
                {activeWorkspaceId === null && <Check className="w-3.5 h-3.5 text-violet-400" />}
              </div>
            </div>

            <DropdownMenuSeparator className="bg-zinc-800/80 my-1" />

            {/* Workspace list */}
            {workspaces.length === 0 ? (
              <div className="p-3 text-center text-zinc-500 text-[11px] space-y-1">
                <Layers className="w-5 h-5 opacity-40 mx-auto text-zinc-400" />
                <div>No custom workspaces yet.</div>
                <div className="text-[10px] text-zinc-600">Group projects and launch stacks together.</div>
              </div>
            ) : (
              <div className="space-y-0.5 max-h-56 overflow-y-auto pr-0.5">
                {workspaces.map((ws) => {
                  const wsRunning = isWorkspaceRunning(ws.id);
                  const isSelected = activeWorkspaceId === ws.id;

                  return (
                    <div
                      key={ws.id}
                      className={cn(
                        'flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer group transition-all',
                        isSelected ? 'bg-zinc-900 border border-zinc-800' : 'hover:bg-zinc-900/60'
                      )}
                      onClick={() => setActiveWorkspace(ws.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full shrink-0',
                            ws.color === 'cyan' && 'bg-cyan-500',
                            ws.color === 'emerald' && 'bg-emerald-500',
                            ws.color === 'amber' && 'bg-amber-500',
                            ws.color === 'rose' && 'bg-rose-500',
                            ws.color === 'blue' && 'bg-blue-500',
                            (!ws.color || ws.color === 'violet') && 'bg-violet-500',
                            wsRunning && 'animate-ping'
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-medium text-zinc-100 flex items-center gap-1.5">
                            {ws.name}
                            {wsRunning && (
                              <span className="text-[8px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-mono uppercase">
                                live
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-zinc-500 font-mono truncate">
                            {ws.projectIds?.length || 0} projects • {ws.services?.length || 0} services
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {ws.services?.length > 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-zinc-400 hover:text-emerald-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (wsRunning) {
                                stopWorkspace(ws);
                              } else {
                                bootWorkspace(ws);
                              }
                            }}
                            title={wsRunning ? 'Stop Stack' : 'Boot Stack'}
                          >
                            {wsRunning ? <Square className="w-3 h-3 text-rose-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditor(ws);
                          }}
                          title="Edit workspace"
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-500 hover:text-red-400"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkspace(ws.id);
                          }}
                          title="Delete workspace"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <DropdownMenuSeparator className="bg-zinc-800/80 my-1" />

            <DropdownMenuItem
              className="text-xs text-violet-400 hover:text-violet-300 cursor-pointer gap-2 py-2 rounded-lg focus:bg-violet-950/40"
              onClick={() => openEditor()}
            >
              <Plus className="w-3.5 h-3.5" /> Create New Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 1-Click Launch Active Stack Button */}
        {activeWorkspace && activeWorkspace.services?.length > 0 && (
          <Button
            size="sm"
            className={cn(
              'h-8 text-xs px-2.5 gap-1.5 shadow-md active:scale-95 transition-all font-semibold',
              isRunning
                ? 'bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/30 text-rose-300'
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            )}
            onClick={() => {
              if (isRunning) {
                stopWorkspace(activeWorkspace);
              } else {
                bootWorkspace(activeWorkspace);
              }
            }}
          >
            {isRunning ? (
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
