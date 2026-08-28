import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  Sparkles,
  LayoutGrid,
  Pin,
  Play,
  Square,
  RotateCw,
  FolderOpen,
  Code,
  Terminal,
  Server,
  Plus,
  RefreshCw,
  Cpu,
  Activity,
  GitBranch,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  EyeOff,
  Settings,
  Lock,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '../../ui/dropdown-menu';
import { StatusDot } from '../../shared/StatusDot';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useWorkspaceProjects } from '@renderer/hooks/useWorkspaceProjects';
import { useWorkspaceStore } from '@renderer/stores/useWorkspaceStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useSystemStore } from '@renderer/stores/useSystemStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useTemplateStore } from '@renderer/stores/useTemplateStore';
import { ProjectConfigDialog } from '../../dashboard/ProjectConfigDialog';
import { EnvManagerDialog } from '../../env/EnvManagerDialog';
import { ProjectSnapshotDialog } from '../../dashboard/ProjectSnapshotDialog';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';
import type { ProjectInfo, ProjectType } from '@renderer/types/project';

const PROJECT_TYPE_FILTERS: Array<{ id: ProjectType | 'all'; label: string }> = [
  { id: 'all', label: 'All Repos' },
  { id: 'node', label: 'Node / React' },
  { id: 'python', label: 'Python' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
  { id: 'dotnet', label: '.NET' },
  { id: 'godot', label: 'Godot' }
];

export const ModernBentoDashboard: React.FC = () => {
  const {
    pinnedProjectIds,
    togglePinProject,
    selectProject,
    scanProjects,
    ignoreProject,
    isScanning
  } = useProjectStore();

  const {
    projects,
    allProjects,
    activeWorkspace,
    isWorkspaceScoped,
    setActiveWorkspace
  } = useWorkspaceProjects();

  const { openEditor } = useWorkspaceStore();
  const { runningServices, startService, stopService, restartService } = useServiceStore();
  const { metrics } = useSystemStore();
  const { createTerminal } = useTerminalStore();
  const { setActiveTab } = useAppStore();
  const { setDialogOpen: setTemplateDialogOpen } = useTemplateStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ProjectType | 'all'>('all');
  const [configProject, setConfigProject] = useState<ProjectInfo | null>(null);
  const [envProject, setEnvProject] = useState<ProjectInfo | null>(null);
  const [snapshotProject, setSnapshotProject] = useState<ProjectInfo | null>(null);

  const handleIgnoreProject = async (project: ProjectInfo) => {
    if (
      window.confirm(
        `Ignore project "${project.name}"?\n\nThis will hide it from your dashboard and add it to your Ignored Projects list.`
      )
    ) {
      try {
        await ignoreProject(project.path);
        toast.info(`Ignored "${project.name}".`);
      } catch {
        toast.error(`Failed to ignore project`);
      }
    }
  };

  const deferredSearch = useDeferredValue(searchQuery);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const pName = p.name || '';
      const pCat = p.category || '';
      const matchesSearch =
        !deferredSearch ||
        pName.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        pCat.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        (Array.isArray(p.tags) && p.tags.some((t) => (t || '').toLowerCase().includes(deferredSearch.toLowerCase())));

      const matchesType = selectedType === 'all' || p.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [projects, deferredSearch, selectedType]);

  const pinnedProjects = useMemo(() => {
    return projects.filter((p) => (pinnedProjectIds || []).includes(p.id));
  }, [projects, pinnedProjectIds]);

  const handleOpenTerminal = async (project: ProjectInfo) => {
    await createTerminal({ name: project.name, cwd: project.path, projectId: project.id });
    setActiveTab('terminals');
  };

  const handleOpenVSCode = (path: string) => {
    window.api?.projects?.openInVSCode?.(path);
  };

  const handleOpenFolder = (path: string) => {
    window.api?.projects?.openInExplorer?.(path);
  };

  const cpuUsage = metrics ? Math.round(metrics.cpu.usage) : 0;
  const ramUsage = metrics ? Math.round(metrics.memory.percentage) : 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* ── Active Workspace Scope Banner ── */}
      {activeWorkspace && (
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-violet-950/60 via-zinc-900/80 to-zinc-950/80 border border-violet-500/40 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-violet-400 font-mono">Workspace Scope</span>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              </div>
              <h2 className="text-sm font-black text-white truncate">
                {activeWorkspace.name}
                <span className="text-xs text-zinc-400 font-normal ml-2 font-mono">
                  ({projects.length} of {allProjects.length} repos visible)
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditor(activeWorkspace)}
              className="h-8 text-xs border-violet-500/30 text-violet-300 hover:bg-violet-950/40"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5 text-violet-400" />
              Edit Workspace
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActiveWorkspace(null)}
              className="h-8 text-xs text-zinc-400 hover:text-white"
            >
              Show All Repos
            </Button>
          </div>
        </div>
      )}

      {/* ── Top Bento Row: Quick Telemetry & Pinned Projects Hub ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Bento Tile 1: Telemetry Command Pill (4 cols) */}
        <Card className="lg:col-span-4 bg-zinc-950/80 border-zinc-800/80 backdrop-blur-md flex flex-col justify-between p-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-xs uppercase font-bold tracking-wider text-zinc-300">
                System Pulse
              </span>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-300">
              LIVE HUD
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 my-4">
            {/* CPU Metric Card */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu className="w-3.5 h-3.5 text-violet-400" /> CPU
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Load</span>
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">
                {cpuUsage}%
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  style={{ width: `${Math.min(100, cpuUsage)}%` }}
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    cpuUsage > 80 ? 'bg-rose-500' : 'bg-violet-500'
                  )}
                />
              </div>
            </div>

            {/* RAM Metric Card */}
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-400 text-xs">
                <span className="flex items-center gap-1.5 font-medium">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" /> RAM
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Usage</span>
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-100 mt-2">
                {ramUsage}%
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  style={{ width: `${Math.min(100, ramUsage)}%` }}
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    ramUsage > 85 ? 'bg-rose-500' : 'bg-cyan-500'
                  )}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              {runningServices.length} Active Services
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => scanProjects()}
              disabled={isScanning}
              className="h-6 text-[11px] px-2 text-zinc-400 hover:text-zinc-100 gap-1"
            >
              <RefreshCw className={cn('w-3 h-3', isScanning && 'animate-spin')} />
              Sync
            </Button>
          </div>
        </Card>

        {/* Bento Tile 2: Pinned / Favorite Projects Carousel (8 cols) */}
        <Card className="lg:col-span-8 bg-zinc-950/80 border-zinc-800/80 backdrop-blur-md p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase font-bold tracking-wider text-zinc-300">
                Starred Repositories ({pinnedProjects.length})
              </span>
            </div>
            <span className="text-[11px] text-zinc-500">1-click fast workspace launchers</span>
          </div>

          {pinnedProjects.length === 0 ? (
            <div className="h-32 rounded-xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center p-4 text-zinc-500">
              <Pin className="w-5 h-5 opacity-40 mb-1" />
              <p className="text-xs">No pinned repositories yet</p>
              <p className="text-[10px] text-zinc-600">Click the star/pin icon on any project below to pin it here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {pinnedProjects.slice(0, 6).map((proj) => {
                const isRunning = runningServices.some((s) => s.projectId === proj.id);
                return (
                  <motion.div
                    key={proj.id}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    onClick={() => {
                      selectProject(proj.id);
                      setActiveTab('project-detail');
                    }}
                    className="p-3 rounded-xl bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 cursor-pointer flex flex-col justify-between transition-colors shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={isRunning ? 'running' : 'stopped'} size="sm" />
                          <span className="font-bold text-xs text-zinc-100 truncate group-hover:text-violet-300 transition-colors">
                            {proj.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono truncate block mt-0.5">
                          {proj.category}
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePinProject(proj.id);
                        }}
                        className="text-amber-400 hover:text-zinc-500 p-0.5"
                        title="Unpin project"
                      >
                        <Pin className="w-3.5 h-3.5 fill-amber-400" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-zinc-800/80">
                      <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 uppercase text-zinc-400">
                        {proj.type}
                      </Badge>
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-zinc-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTerminal(proj);
                          }}
                          title="Open Terminal"
                        >
                          <Terminal className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-zinc-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenVSCode(proj.path);
                          }}
                          title="Open in VS Code"
                        >
                          <Code className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-400 hover:text-zinc-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.api?.projects?.openInExplorer?.(proj.path);
                          }}
                          title="Open in Explorer"
                        >
                          <FolderOpen className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Main Projects Explorer Header & Filter Pills ── */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-violet-400" />
              Project Library
              <Badge variant="outline" className="text-xs font-mono border-zinc-800 text-zinc-400 ml-1">
                {filteredProjects.length} Repos
              </Badge>
            </h2>
            <p className="text-xs text-zinc-500">Search, launch, manage configurations and subprojects</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Quick Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter by name, tag, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-zinc-900/90 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:ring-1 focus:ring-violet-500 font-medium"
              />
            </div>

            <Button
              size="sm"
              onClick={() => setTemplateDialogOpen(true)}
              className="bg-violet-600 hover:bg-violet-700 text-xs h-8 gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </Button>
          </div>
        </div>

        {/* Framework Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {PROJECT_TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedType(f.id)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap',
                selectedType === f.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-zinc-900/70 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Projects Bento Grid ── */}
      {projects.length === 0 && isWorkspaceScoped ? (
        <div className="py-16 rounded-3xl border border-dashed border-violet-500/30 bg-violet-950/20 flex flex-col items-center justify-center text-center p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-200">Workspace &quot;{activeWorkspace?.name}&quot; is empty</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm">No repositories have been assigned to this workspace yet.</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => openEditor(activeWorkspace)} className="bg-violet-600 hover:bg-violet-500 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Repos to Workspace
            </Button>
            <Button size="sm" variant="outline" onClick={() => setActiveWorkspace(null)} className="border-zinc-800 text-xs text-zinc-300">
              Show All Repos
            </Button>
          </div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
          <FolderOpen className="w-8 h-8 opacity-40 mb-1" />
          <p className="text-sm font-semibold text-zinc-300">No matching projects found</p>
          <p className="text-xs text-zinc-500 max-w-sm">
            Try adjusting your search filter or add a new directory in Settings &gt; General &gt; Scan Paths.
          </p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5"
        >
          <AnimatePresence>
            {filteredProjects.map((project) => {
              const isRunning = runningServices.some((s) => s.projectId === project.id);
              const isPinned = pinnedProjectIds.includes(project.id);
              const scriptKeys = Object.keys(project.scripts || {});

              return (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ y: -3 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  onClick={() => {
                    selectProject(project.id);
                    setActiveTab('project-detail');
                  }}
                  className="p-4 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 border border-zinc-800/80 hover:border-violet-500/40 cursor-pointer flex flex-col justify-between transition-colors shadow-md group relative overflow-hidden backdrop-blur-sm"
                >
                  <div>
                    {/* Top row: Status, Name, Pin */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusDot status={isRunning ? 'running' : 'stopped'} size="md" />
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm text-zinc-100 group-hover:text-violet-300 transition-colors truncate">
                            {project.name}
                          </h3>
                          <p className="text-[10px] text-zinc-500 font-mono truncate" title={project.path}>
                            {project.path}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinProject(project.id);
                          }}
                          className={cn(
                            'p-1 rounded-md transition-colors',
                            isPinned
                              ? 'text-amber-400 hover:text-zinc-400'
                              : 'text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100'
                          )}
                          title={isPinned ? 'Unpin' : 'Pin to top'}
                        >
                          <Pin className={cn('w-3.5 h-3.5', isPinned && 'fill-amber-400')} />
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-zinc-500 hover:text-zinc-200 rounded-md transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-zinc-900 border-zinc-800 text-zinc-300">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfigProject(project);
                              }}
                            >
                              <Settings className="w-3.5 h-3.5 mr-2 text-violet-400" />
                              Configure Project
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setEnvProject(project);
                              }}
                            >
                              <Lock className="w-3.5 h-3.5 mr-2 text-amber-400" />
                              Manage .env
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSnapshotProject(project);
                              }}
                            >
                              <Archive className="w-3.5 h-3.5 mr-2 text-cyan-400" />
                              Snapshot / Backup
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-zinc-800" />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleIgnoreProject(project);
                              }}
                              className="text-rose-400 focus:text-rose-300 focus:bg-rose-950/40"
                            >
                              <EyeOff className="w-3.5 h-3.5 mr-2" />
                              Ignore Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Middle: Category & Tags */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                      {project.category && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">
                          {project.category}
                        </span>
                      )}
                      <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0 border-zinc-800 text-zinc-400">
                        {project.type}
                      </Badge>
                      {project.isGitRepo && (
                        <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                          <GitBranch className="w-3 h-3 text-violet-400" />
                          git
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: Quick 1-Tap Scripts or Default Actions */}
                  <div className="pt-3 mt-3 border-t border-zinc-900 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
                      {scriptKeys.slice(0, 2).map((scriptName) => {
                        const cmd = project.scripts![scriptName];
                        const isThisRunning = runningServices.some(
                          (s) => s.projectId === project.id && s.name === scriptName
                        );

                        return (
                          <button
                            key={scriptName}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isThisRunning) {
                                const svc = runningServices.find(
                                  (s) => s.projectId === project.id && s.name === scriptName
                                );
                                if (svc) stopService(svc.id);
                              } else {
                                startService(project.id, project.name, {
                                  name: scriptName,
                                  command: cmd,
                                  cwd: project.path,
                                  autoRestart: false,
                                  env: {}
                                });
                              }
                            }}
                            className={cn(
                              'px-2 py-1 rounded-lg text-[10px] font-mono transition-colors flex items-center gap-1 border shrink-0',
                              isThisRunning
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-300'
                            )}
                          >
                            {isThisRunning ? (
                              <Square className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                            ) : (
                              <Play className="w-2.5 h-2.5 fill-current" />
                            )}
                            {scriptName}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTerminal(project);
                        }}
                        title="Open Terminal"
                      >
                        <Terminal className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenVSCode(project.path);
                        }}
                        title="Open VS Code"
                      >
                        <Code className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFolder(project.path);
                        }}
                        title="Open Folder"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Config & Env Modals ── */}
      {configProject && (
        <ProjectConfigDialog
          project={configProject}
          open={Boolean(configProject)}
          onOpenChange={(open) => !open && setConfigProject(null)}
        />
      )}
      {envProject && (
        <EnvManagerDialog
          projectPath={envProject.path}
          projectName={envProject.name}
          open={Boolean(envProject)}
          onOpenChange={(open) => !open && setEnvProject(null)}
        />
      )}
      {snapshotProject && (
        <ProjectSnapshotDialog
          project={snapshotProject}
          open={Boolean(snapshotProject)}
          onOpenChange={(open) => !open && setSnapshotProject(null)}
        />
      )}
    </div>
  );
};
