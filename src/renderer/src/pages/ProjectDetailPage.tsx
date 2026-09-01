import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Terminal,
  Code,
  FolderOpen,
  Play,
  Square,
  RotateCw,
  GitBranch,
  FileCode,
  Lock,
  Package,
  Archive,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Plus,
  EyeOff,
  FileText,
  Boxes,
  Shield,
  Activity
} from 'lucide-react';

import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useWorkspaceProjects } from '@renderer/hooks/useWorkspaceProjects';
import { useGitStore } from '@renderer/stores/useGitStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useThemeStore } from '@renderer/stores/useThemeStore';
import { useRunConfigStore, type RunConfig } from '@renderer/stores/useRunConfigStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { StatusDot } from '../components/shared/StatusDot';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { MarkdownNotesEditor } from '../components/notes/MarkdownNotesEditor';
import { ProjectConfigDialog } from '../components/dashboard/ProjectConfigDialog';
import { EnvManagerDialog } from '../components/env/EnvManagerDialog';
import { EnvProfilerDialog } from '../components/env/EnvProfilerDialog';
import { ProjectSnapshotDialog } from '../components/dashboard/ProjectSnapshotDialog';
import { ProjectCodePeekModal } from '../components/project/ProjectCodePeekModal';
import { RunConfigDialog } from '../components/services/RunConfigDialog';
import { useBenchmarkStore } from '@renderer/stores/useBenchmarkStore';
import { toast } from 'sonner';
import { cn, generateId } from '@renderer/lib/utils';
import type { ProjectInfo, SubProject } from '@renderer/types/project';
import type { GitLogEntry } from '@renderer/types/git';

type WorkbenchTab = 'scripts' | 'subprojects' | 'git' | 'notes' | 'env';

export const ProjectDetailPage: React.FC = () => {
  const { selectedProjectId, selectProject } = useProjectStore();
  const { projects } = useWorkspaceProjects();
  const { runningServices, startService, stopService } = useServiceStore();
  const { createTerminal } = useTerminalStore();
  const { configs: allConfigs, addConfig, updateConfig } = useRunConfigStore();
  const { setActiveTab } = useAppStore();

  const [activeTab, setActiveWorkbenchTab] = useState<WorkbenchTab>('scripts');
  const [commits, setCommits] = useState<GitLogEntry[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // Dialogs
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [envDialogOpen, setEnvDialogOpen] = useState(false);
  const [envProfilerOpen, setEnvProfilerOpen] = useState(false);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [codePeekOpen, setCodePeekOpen] = useState(false);
  const [runConfigDialogOpen, setRunConfigDialogOpen] = useState(false);
  const [editingRunConfig, setEditingRunConfig] = useState<RunConfig | undefined>();
  const [subprojectEnvTarget, setSubprojectEnvTarget] = useState<{ path: string; name: string } | null>(null);
  const [subprojectPeekTarget, setSubprojectPeekTarget] = useState<{ path: string; name: string } | null>(null);

  const handleOpenSubprojectTerminal = async (sub: SubProject) => {
    try {
      await createTerminal({
        name: project ? `${project.name} > ${sub.name}` : sub.name,
        cwd: sub.path,
        projectId: project?.id,
        projectName: project?.name
      });
      useThemeStore.getState().setTerminalDockOpen(true);
      toast.success(`Spawned terminal in ${sub.name}`);
    } catch (err: any) {
      toast.error('Failed to open terminal: ' + err.message);
    }
  };

  const handleOpenSubprojectExplorer = (sub: SubProject) => {
    if (window.api?.projects?.openInExplorer) {
      window.api.projects.openInExplorer(sub.path);
      toast.success(`Opening ${sub.name} in File Explorer...`);
    }
  };

  const handleOpenSubprojectIde = (sub: SubProject) => {
    if (window.api?.projects?.openInVSCode) {
      window.api.projects.openInVSCode(sub.path);
      toast.success(`Opening ${sub.name} in VS Code...`);
    }
  };

  const handleOpenSubprojectPeek = (sub: SubProject) => {
    setSubprojectPeekTarget({ path: sub.path, name: project ? `${project.name} > ${sub.name}` : sub.name });
    setCodePeekOpen(true);
  };

  const handleOpenSubprojectEnv = (sub: SubProject) => {
    setSubprojectEnvTarget({ path: sub.path, name: project ? `${project.name} > ${sub.name}` : sub.name });
    setEnvDialogOpen(true);
  };


  const project = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    useBenchmarkStore.getState().loadBenchmarks();
  }, []);

  useEffect(() => {
    if (!project) return;
    if (project.isGitRepo && window.api?.git?.log) {
      setCommitsLoading(true);
      window.api.git
        .log(project.path, 12)
        .then((entries: GitLogEntry[]) => setCommits(entries || []))
        .catch(() => setCommits([]))
        .finally(() => setCommitsLoading(false));
    } else {
      setCommits([]);
    }
  }, [project?.id, project?.isGitRepo]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-4">
        <FolderOpen className="w-12 h-12 text-zinc-700" />
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-400">No project selected</p>
          <p className="text-xs text-zinc-600">Select a project from the dashboard to open the workbench.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveTab('dashboard')}
          className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const projectConfigs = allConfigs.filter(
    (c) => c.projectId === project.id || c.projectPath === project.path
  );

  const scripts = Object.entries(project.scripts || {});

  const handleLaunchScript = async (scriptName: string, command: string) => {
    try {
      const isDaemon =
        scriptName.includes('dev') ||
        scriptName.includes('start') ||
        scriptName.includes('watch') ||
        scriptName.includes('serve');

      if (isDaemon) {
        await startService(project.id, project.name, {
          id: generateId(),
          name: scriptName,
          command: command,
          cwd: project.path,
          autoRestart: false
        });
        toast.success('Started service: ' + scriptName);
      } else {
        await createTerminal({
          name: project.name + ' [' + scriptName + ']',
          cwd: project.path,
          command: command,
          projectId: project.id,
          projectName: project.name
        });
        toast.success('Spawned terminal for ' + scriptName);
      }
    } catch (err: any) {
      toast.error('Failed to launch ' + scriptName + ': ' + err.message);
    }
  };

  const handleRunSubprojectScript = async (sub: SubProject, scriptName: string, command: string) => {
    try {
      const isDaemon = scriptName.includes('dev') || scriptName.includes('start') || scriptName.includes('serve');
      if (isDaemon) {
        await startService(project.id, project.name, {
          id: generateId(),
          name: sub.name + ':' + scriptName,
          command: command,
          cwd: sub.path,
          autoRestart: false
        });
        toast.success('Started subproject service: ' + sub.name + ' [' + scriptName + ']');
      } else {
        await createTerminal({
          name: sub.name + ' [' + scriptName + ']',
          cwd: sub.path,
          command: command,
          projectId: project.id,
          projectName: project.name
        });
        toast.success('Running ' + scriptName + ' in ' + sub.name);
      }
    } catch (err: any) {
      toast.error('Failed to run: ' + err.message);
    }
  };

  const handleOpenIde = () => {
    if (window.api?.projects?.openInVSCode) {
      window.api.projects.openInVSCode(project.path);
      toast.success('Opening in VS Code...');
    }
  };

  const handleOpenExplorer = () => {
    if (window.api?.projects?.openInExplorer) {
      window.api.projects.openInExplorer(project.path);
      toast.success('Opening in File Explorer...');
    }
  };

  const handleOpenFullGitStudio = () => {
    if (project) {
      selectProject(project.id);
      useGitStore.getState().selectProject(project.id);
      useGitStore.getState().fetchStatus(project.id, project.path);
    }
    setActiveTab('git');
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(project.path);
    setCopiedPath(true);
    toast.success('Path copied to clipboard');
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const tabs = [
    { id: 'scripts', label: 'Scripts & Services', icon: Play, count: scripts.length },
    { id: 'subprojects', label: 'Subprojects & Code', icon: Boxes, count: project.subprojects?.length || 0 },
    { id: 'git', label: 'Git & Activity', icon: GitBranch, count: commits.length },
    { id: 'notes', label: 'Notes & Docs', icon: FileText },
    { id: 'env', label: 'Environment & Secrets', icon: Lock }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* ── Top Header HUD ── */}
      <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTab('dashboard')}
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold tracking-tight text-zinc-100">{project.name}</h1>
              <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 bg-zinc-900 text-zinc-300">
                {project.type || 'node'}
              </Badge>
              {project.isGitRepo && (
                <button
                  type="button"
                  onClick={handleOpenFullGitStudio}
                  title="Open in Git Studio"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-300 flex items-center gap-1 hover:bg-violet-950/40">
                    <GitBranch className="w-2.5 h-2.5" />
                    {project.gitBranch || 'main'}
                  </Badge>
                </button>
              )}
            </div>

            <button
              onClick={handleCopyPath}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mt-0.5 font-mono group"
            >
              <span className="truncate max-w-md">{project.path}</span>
              {copiedPath ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCodePeekOpen(true)}
            className="h-7 text-xs border-violet-500/40 bg-violet-950/20 text-violet-300 hover:bg-violet-900/40 gap-1.5"
            title="Quick in-app code & file viewer"
          >
            <FileCode className="w-3.5 h-3.5 text-violet-400" />
            <span>Code Peek</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenIde}
            className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1.5"
            title="Open in VS Code"
          >
            <Code className="w-3.5 h-3.5" />
            <span>VS Code</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExplorer}
            className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1.5"
            title="Open in Explorer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Explorer</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSnapshotDialogOpen(true)}
            className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1.5"
            title="Create clean ZIP snapshot"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Backup</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigDialogOpen(true)}
            className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300"
          >
            Config
          </Button>
        </div>
      </div>

      {/* ── Segmented Navigation Bar ── */}
      <div className="flex items-center gap-1 px-6 border-b border-zinc-800/80 bg-zinc-950/80 shrink-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveWorkbenchTab(tab.id as WorkbenchTab)}
              className={cn(
                'relative flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium transition-colors hover:text-zinc-200',
                isActive ? 'text-violet-300 font-semibold' : 'text-zinc-400'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="bg-zinc-900 text-zinc-400 border border-zinc-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-md" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Segmented Tab Views ── */}
      <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/60">
        {/* Tab 1: Scripts & Services */}
        {activeTab === 'scripts' && (
          <div className="space-y-6 max-w-6xl">
            {/* Multi-step Run Configurations */}
            {projectConfigs.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-violet-400" /> Multi-Step Configurations
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingRunConfig(undefined);
                      setRunConfigDialogOpen(true);
                    }}
                    className="h-6 text-[11px] text-violet-400 hover:text-violet-300"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Config
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projectConfigs.map((cfg) => (
                    <Card key={cfg.id} className="bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700 transition-all p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-zinc-200 block">{cfg.name}</span>
                          <span className="text-[11px] text-zinc-500">{cfg.commands.length} steps ({cfg.executionMode || 'sequential'})</span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            cfg.commands.forEach((cmd) => {
                              createTerminal({
                                name: cfg.name + ': ' + cmd.name,
                                cwd: project.path,
                                command: cmd.command,
                                projectId: project.id,
                                projectName: project.name
                              });
                            });
                            toast.success('Triggered config: ' + cfg.name);
                          }}
                          className="h-7 text-xs bg-violet-600 hover:bg-violet-700 gap-1 px-2.5"
                        >
                          <Play className="w-3 h-3" /> Run
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Scripts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-emerald-400" /> Project Scripts ({scripts.length})
                </h3>
              </div>

              {scripts.length === 0 ? (
                <div className="text-center py-12 text-zinc-600 text-xs bg-zinc-900/20 rounded-xl border border-zinc-800/60">
                  No scripts detected in package.json or project manifests.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {scripts.map(([name, cmd]) => {
                    const activeService = runningServices.find(
                      (s) => s.projectId === project.id && s.name === name
                    );
                    const isRunning = !!activeService;

                    return (
                      <Card
                        key={name}
                        className={cn(
                          'border transition-all p-3.5 flex flex-col justify-between gap-2',
                          isRunning
                            ? 'bg-emerald-950/15 border-emerald-800/60 shadow-lg shadow-emerald-950/20'
                            : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900'
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-mono text-xs font-bold text-zinc-200 truncate">{name}</span>
                              {useBenchmarkStore.getState().getAverageDuration(project.id, name) && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] h-4 font-mono border-zinc-800 text-zinc-400 bg-zinc-950 px-1 py-0 flex items-center gap-0.5"
                                  title={`Average execution time: ${(useBenchmarkStore.getState().getAverageDuration(project.id, name)! / 1000).toFixed(1)}s`}
                                >
                                  <Clock className="w-2.5 h-2.5 text-zinc-500" />
                                  {(useBenchmarkStore.getState().getAverageDuration(project.id, name)! / 1000).toFixed(1)}s
                                </Badge>
                              )}
                            </div>
                            {isRunning && (
                              <Badge className="text-[9px] h-4 bg-emerald-950 text-emerald-300 border-emerald-700/60 font-mono flex items-center gap-1 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Running
                              </Badge>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-zinc-500 truncate block mt-1" title={cmd}>
                            {cmd}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-zinc-800/60">
                          {isRunning ? (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => stopService(activeService.id)}
                              className="h-7 text-xs gap-1 px-2.5"
                            >
                              <Square className="w-3 h-3" /> Stop
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleLaunchScript(name, cmd)}
                              className="h-7 text-xs bg-violet-600 hover:bg-violet-700 gap-1 px-2.5"
                            >
                              <Play className="w-3 h-3" /> Start
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Subprojects & Code */}
        {activeTab === 'subprojects' && (
          <div className="space-y-4 max-w-6xl">
            {(!project.subprojects || project.subprojects.length === 0) ? (
              <div className="text-center py-16 text-zinc-600 text-xs bg-zinc-900/20 rounded-xl border border-zinc-800/60 space-y-2">
                <Boxes className="w-8 h-8 text-zinc-700 mx-auto" />
                <p>No monorepo subprojects or nested apps found in this repository.</p>
                <p className="text-[11px] text-zinc-600">Standard standalone repository structure detected.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.subprojects.map((sub: SubProject) => {
                  const subScripts = Object.entries(sub.scripts || {});
                  return (
                    <Card key={sub.path} className="bg-zinc-900/60 border-zinc-800/80 p-4 space-y-3 hover:border-zinc-700/80 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-zinc-100 truncate">{sub.name}</span>
                            <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-300">
                              {sub.type}
                            </Badge>
                          </div>
                          <span className="text-[11px] font-mono text-zinc-500 truncate block mt-0.5" title={sub.path}>
                            {sub.path}
                          </span>
                        </div>

                        {/* Subproject Action Toolbar */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSubprojectTerminal(sub)}
                            className="h-7 px-2 text-xs font-mono border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-emerald-400 hover:text-emerald-300 gap-1"
                            title="Spawn Terminal in Universal Bottom Dock"
                          >
                            <Terminal className="w-3 h-3" />
                            <span>Terminal</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSubprojectExplorer(sub)}
                            className="h-7 px-2 text-xs border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100 gap-1"
                            title="Open in File Explorer"
                          >
                            <FolderOpen className="w-3 h-3" />
                            <span>Explorer</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSubprojectPeek(sub)}
                            className="h-7 w-7 p-0 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-violet-400 hover:text-violet-300"
                            title="Quick Code Peek"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSubprojectEnv(sub)}
                            className="h-7 w-7 p-0 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-amber-400 hover:text-amber-300"
                            title="Subproject .env Editor"
                          >
                            <Lock className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSubprojectIde(sub)}
                            className="h-7 w-7 p-0 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                            title="Open in VS Code"
                          >
                            <Code className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-zinc-800/60">
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Subproject Scripts</span>
                        {subScripts.length === 0 ? (
                          <p className="text-[11px] text-zinc-600 italic">No package scripts detected.</p>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {subScripts.map(([sName, sCmd]) => (
                              <Button
                                key={sName}
                                variant="outline"
                                size="sm"
                                onClick={() => handleRunSubprojectScript(sub, sName, String(sCmd))}
                                className="h-6 text-[10px] font-mono border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-zinc-300 gap-1 px-2"
                              >
                                <Play className="w-2.5 h-2.5 text-emerald-400" /> {sName}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Git & Activity */}
        {activeTab === 'git' && (
          <div className="space-y-4 max-w-5xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-violet-400" /> Commit History & Activity Radar
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenFullGitStudio}
                className="h-6 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-400"
              >
                Open Full Git Studio <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            {commitsLoading ? (
              <div className="text-center py-12 text-zinc-500 text-xs font-mono">
                Loading commits...
              </div>
            ) : commits.length === 0 ? (
              <div className="text-center py-12 text-zinc-600 text-xs bg-zinc-900/20 rounded-xl border border-zinc-800/60">
                No git history found for this project.
              </div>
            ) : (
              <div className="space-y-2">
                {commits.map((c, i) => (
                  <div
                    key={c.hash || i}
                    className="flex items-start justify-between p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/40 text-xs gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-200 truncate">{c.message}</p>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                        <span>{c.author}</span>
                        <span>·</span>
                        <span>{c.date}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-semibold text-violet-400 bg-violet-950/40 px-1.5 py-0.5 rounded border border-violet-800/40">
                      {c.hashShort || c.hash?.slice(0, 7)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Notes & Docs */}
        {activeTab === 'notes' && (
          <div className="h-[70vh]">
            <MarkdownNotesEditor projectPath={project.path} projectName={project.name} />
          </div>
        )}

        {/* Tab 5: Environment & Secrets */}
        {activeTab === 'env' && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" /> Environment Variables & Secrets
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">Manage .env files, credentials, and comparison diffs</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEnvProfilerOpen(true)}
                  className="border-emerald-800/60 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40 text-xs h-7 gap-1.5"
                  title="Compare .env vs .env.example and detect missing keys"
                >
                  <FileText className="w-3 h-3 text-emerald-400" /> Profiler & Sync
                </Button>
                <Button
                  size="sm"
                  onClick={() => setEnvDialogOpen(true)}
                  className="bg-violet-600 hover:bg-violet-700 text-xs h-7 gap-1.5"
                >
                  <Lock className="w-3 h-3" /> Open Env Manager
                </Button>
              </div>
            </div>

            <Card className="bg-zinc-900/50 border-zinc-800/80 p-6 text-center text-xs text-zinc-400 space-y-3">
              <Lock className="w-8 h-8 text-zinc-700 mx-auto" />
              <p>Secure environment variables and secret files are managed in the Environment Manager dialog.</p>
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEnvProfilerOpen(true)}
                  className="border-emerald-800/60 text-emerald-300 hover:bg-emerald-950/30 text-xs gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Launch Env Profiler
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEnvDialogOpen(true)}
                  className="border-zinc-800 hover:bg-zinc-900 text-zinc-300 text-xs"
                >
                  Launch Env Manager
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Dialog Modals ── */}
      <ProjectConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        project={project}
      />

      <EnvManagerDialog
        open={envDialogOpen}
        onOpenChange={(open) => {
          setEnvDialogOpen(open);
          if (!open) setSubprojectEnvTarget(null);
        }}
        projectPath={subprojectEnvTarget?.path || project.path}
        projectName={subprojectEnvTarget?.name || project.name}
      />

      <EnvProfilerDialog
        open={envProfilerOpen}
        onOpenChange={setEnvProfilerOpen}
        projectPath={project.path}
      />

      <ProjectSnapshotDialog
        open={snapshotDialogOpen}
        onOpenChange={setSnapshotDialogOpen}
        project={project}
      />

      <ProjectCodePeekModal
        open={codePeekOpen}
        onOpenChange={(open) => {
          setCodePeekOpen(open);
          if (!open) setSubprojectPeekTarget(null);
        }}
        project={project}
        customPath={subprojectPeekTarget?.path}
        customName={subprojectPeekTarget?.name}
      />

      <RunConfigDialog
        open={runConfigDialogOpen}
        onOpenChange={setRunConfigDialogOpen}
        projectId={project.id}
        projectName={project.name}
        projectPath={project.path}
        existing={editingRunConfig}
        onSave={async (cfg) => {
          if (editingRunConfig) {
            await updateConfig(editingRunConfig.id, cfg);
          } else {
            await addConfig({ ...cfg, projectId: project.id, projectPath: project.path });
          }
        }}
      />
    </div>
  );
};
