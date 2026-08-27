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
  Bot,
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
  RefreshCw,
  Copy,
  Check,
  Plus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useRunConfigStore, type RunConfig } from '@renderer/stores/useRunConfigStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { StatusDot } from '../../shared/StatusDot';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { MarkdownNotesEditor } from '../../notes/MarkdownNotesEditor';
import { ProjectConfigDialog } from '../../dashboard/ProjectConfigDialog';
import { EnvManagerDialog } from '../../env/EnvManagerDialog';
import { ProjectSnapshotDialog } from '../../dashboard/ProjectSnapshotDialog';
import { AiContextDialog } from '../../dashboard/AiContextDialog';
import { RunConfigDialog } from '../../services/RunConfigDialog';
import { toast } from 'sonner';
import { cn } from '@renderer/lib/utils';
import type { ProjectInfo, SubProject } from '@renderer/types/project';
import type { GitLogEntry } from '@renderer/types/git';

export const ModernProjectWorkbench: React.FC = () => {
  const { selectedProjectId, projects, selectProject } = useProjectStore();
  const { runningServices, startService, stopService } = useServiceStore();
  const { createTerminal } = useTerminalStore();
  const { configs: allConfigs, addConfig, updateConfig } = useRunConfigStore();
  const { setActiveTab } = useAppStore();

  const [commits, setCommits] = useState<GitLogEntry[]>([]);
  const [commitsLoading, setCommitsLoading] = useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'ai' | 'git' | 'env'>('ai');
  const [aiContextContent, setAiContextContent] = useState<string>('');
  const [copiedAi, setCopiedAi] = useState(false);

  // Dialogs
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [envDialogOpen, setEnvDialogOpen] = useState(false);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [aiContextDialogOpen, setAiContextDialogOpen] = useState(false);
  const [runConfigDialogOpen, setRunConfigDialogOpen] = useState(false);
  const [editingRunConfig, setEditingRunConfig] = useState<RunConfig | undefined>();

  const project = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    if (!project) return;
    if (project.isGitRepo) {
      setCommitsLoading(true);
      window.api?.git
        ?.log?.(project.path, 8)
        ?.then?.((entries: GitLogEntry[]) => setCommits(entries ?? []))
        ?.catch?.(() => {})
        ?.finally?.(() => setCommitsLoading(false));
    } else {
      setActiveInspectorTab('ai');
      setCommits([]);
    }

    // Load AI context preview
    if (window.api?.projects?.generateAiContext) {
      window.api.projects
        .generateAiContext(project.path)
        .then((res) => {
          if (res?.success) setAiContextContent(res.content || '');
        })
        .catch(() => {});
    }
  }, [project?.id, project?.isGitRepo]);

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-3 p-6 text-center">
        <FolderOpen className="w-10 h-10 opacity-30" />
        <p className="text-sm font-semibold text-zinc-400">No project selected</p>
        <Button
          size="sm"
          onClick={() => setActiveTab('dashboard')}
          className="text-xs bg-violet-600 hover:bg-violet-700 text-white"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const isRunning = runningServices.some((s) => s.projectId === project.id);
  const scripts = project.scripts || {};
  const projectConfigs = allConfigs.filter((c) => c.projectId === project.id);

  const handleOpenTerminal = async (sub?: SubProject) => {
    const termName = sub ? `${project.name} (${sub.name})` : project.name;
    const termCwd = sub ? sub.path : project.path;
    await createTerminal({ name: termName, cwd: termCwd, projectId: project.id });
    setActiveTab('terminals');
  };

  const handleRunScript = async (scriptName: string, command: string, cwd?: string) => {
    const existing = runningServices.find(
      (s) => s.projectId === project.id && s.name === scriptName
    );
    if (existing) {
      stopService(existing.id);
      toast.info(`Stopped service: ${scriptName}`);
      return;
    }

    await startService(project.id, project.name, {
      name: scriptName,
      command,
      cwd: cwd || project.path,
      autoRestart: false,
      env: {}
    });
    toast.success(`Started service: ${scriptName}`);
  };

  const handleCopyAiContext = () => {
    if (aiContextContent) {
      navigator.clipboard.writeText(aiContextContent);
      setCopiedAi(true);
      toast.success('Copied .ybicg/AI_CONTEXT.md to clipboard');
      setTimeout(() => setCopiedAi(false), 2000);
    }
  };

  const handleSaveRunConfig = async (data: Omit<RunConfig, 'id' | 'createdAt'>) => {
    if (editingRunConfig) {
      await updateConfig(editingRunConfig.id, data);
      toast.success(`Updated ${data.name}`);
    } else {
      await addConfig(data);
      toast.success(`Created ${data.name}`);
    }
    setEditingRunConfig(undefined);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      {/* ── Top Project Header Bar ── */}
      <div className="h-14 px-4 sm:px-6 bg-zinc-950 border-b border-zinc-800/90 flex items-center justify-between gap-4 shrink-0 flex-wrap shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            onClick={() => setActiveTab('dashboard')}
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>

          <StatusDot status={isRunning ? 'running' : 'stopped'} size="md" />

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base text-zinc-100 truncate">{project.name}</h1>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-violet-500/40 text-violet-300"
              >
                {project.type}
              </Badge>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono truncate" title={project.path}>
              {project.path}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAiContextDialogOpen(true)}
            className="h-7 text-xs border-violet-500/40 text-violet-300 hover:bg-violet-950/30 gap-1.5"
          >
            <Bot className="w-3.5 h-3.5 text-violet-400" />
            AI Guide (.ybicg)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigDialogOpen(true)}
            className="h-7 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900 gap-1.5"
          >
            <FileCode className="w-3.5 h-3.5 text-zinc-400" />
            Config
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setEnvDialogOpen(true)}
            className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-950/30 gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            Env
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenTerminal()}
            className="h-7 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900 gap-1.5"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            Terminal
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.api?.projects?.openInVSCode?.(project.path)}
            className="h-7 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900 gap-1.5"
          >
            <Code className="w-3.5 h-3.5 text-zinc-400" />
            VS Code
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSnapshotDialogOpen(true)}
            className="h-7 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900 gap-1.5"
            title="Export clean project .zip archive"
          >
            <Archive className="w-3.5 h-3.5 text-zinc-400" />
            Snapshot
          </Button>
        </div>
      </div>


      {/* ── 3-Pane Workbench Body ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* ── Left Pane: Saved Configs & Scripts (3 cols) ── */}
        <div className="lg:col-span-3 border-r border-zinc-800/80 bg-zinc-950/60 p-3 overflow-y-auto space-y-4">
          {/* Saved Run Configurations (AT THE TOP) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-violet-400" />
                Saved Configs ({projectConfigs.length})
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] text-violet-400 hover:text-violet-300 hover:bg-violet-950/40"
                  onClick={() => {
                    setEditingRunConfig(undefined);
                    setRunConfigDialogOpen(true);
                  }}
                >
                  <Plus className="w-2.5 h-2.5 mr-0.5" /> New
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-[10px] text-zinc-500 hover:text-zinc-300"
                  onClick={() => setActiveTab('services')}
                >
                  Manage
                </Button>
              </div>
            </div>

            {projectConfigs.length === 0 ? (
              <div
                onClick={() => {
                  setEditingRunConfig(undefined);
                  setRunConfigDialogOpen(true);
                }}
                className="p-3 rounded-lg border border-dashed border-zinc-800/80 hover:border-violet-500/40 hover:bg-zinc-900/40 cursor-pointer text-center space-y-1 transition-colors"
              >
                <p className="text-[11px] font-medium text-zinc-400">+ Add Run Configuration</p>
                <p className="text-[9px] text-zinc-600">Save multi-command or parallel tasks</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {projectConfigs.map((cfg) => {
                  const isParallel =
                    cfg.executionMode === 'parallel' && (cfg.commands?.length || 0) > 1;
                  const cmds = cfg.commands?.length
                    ? cfg.commands.filter((c) => c.command.trim())
                    : cfg.command
                      ? [{ id: '1', name: '', command: cfg.command }]
                      : [];

                  return (
                    <div
                      key={cfg.id}
                      className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-2 hover:border-zinc-700 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-mono text-xs text-zinc-200 truncate">
                            {cfg.name}
                          </span>
                          {isParallel ? (
                            <Badge
                              variant="outline"
                              className="text-[8px] bg-cyan-950/40 border-cyan-800 text-cyan-300 px-1 py-0"
                            >
                              {cmds.length} tabs
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[8px] bg-violet-950/40 border-violet-800 text-violet-300 px-1 py-0"
                            >
                              1 tab
                            </Badge>
                          )}
                        </div>
                        <span
                          className="text-[10px] text-zinc-500 font-mono truncate block mt-0.5"
                          title={cmds.map((c) => c.command).join(' && ')}
                        >
                          {cmds.map((c) => c.command).join(' && ') || 'No command'}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-zinc-400 hover:text-emerald-400"
                          onClick={async () => {
                            if (!cmds.length) return;
                            const effectiveCwd = cfg.cwd || project.path;
                            if (isParallel) {
                              for (let i = 0; i < cmds.length; i++) {
                                const cmd = cmds[i];
                                const termName = cmd.name
                                  ? `${cfg.name} (${cmd.name})`
                                  : `${cfg.name} #${i + 1}`;
                                await startService(project.id, project.name, {
                                  id: `${cfg.id}-${cmd.id || i}`,
                                  name: termName,
                                  command: cmd.command,
                                  cwd: effectiveCwd,
                                  autoRestart: cfg.autoRestart
                                });
                              }
                              toast.success(`Launched ${cmds.length} commands for ${cfg.name}`);
                            } else {
                              const combined = cmds
                                .map((c) => c.command.trim())
                                .filter(Boolean)
                                .join(' && ');
                              await startService(project.id, project.name, {
                                id: cfg.id,
                                name: cfg.name,
                                command: combined,
                                cwd: effectiveCwd,
                                autoRestart: cfg.autoRestart
                              });
                              toast.success(`Launched ${cfg.name}`);
                            }
                          }}
                          title="Launch Configuration"
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Runnable Scripts (BELOW SAVED CONFIGS) */}
          <div className="space-y-2 pt-2 border-t border-zinc-800/80">
            <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-cyan-400" />
              Runnable Scripts ({Object.keys(scripts).length})
            </span>

            {Object.keys(scripts).length === 0 ? (
              <p className="text-xs text-zinc-600 italic">No scripts found in package.json</p>
            ) : (
              <div className="space-y-1.5">
                {Object.entries(scripts).map(([sName, sCmd]) => {
                  const isScriptRunning = runningServices.some(
                    (s) => s.projectId === project.id && s.name === sName
                  );
                  return (
                    <div
                      key={sName}
                      className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-2 hover:border-zinc-700 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={isScriptRunning ? 'running' : 'stopped'} size="sm" />
                          <span className="font-bold font-mono text-xs text-zinc-200 truncate">
                            {sName}
                          </span>
                        </div>
                        <span
                          className="text-[10px] text-zinc-500 font-mono truncate block mt-0.5"
                          title={sCmd}
                        >
                          {sCmd}
                        </span>
                      </div>

                      <Button
                        size="icon"
                        variant={isScriptRunning ? 'destructive' : 'ghost'}
                        className={cn(
                          'h-6 w-6 shrink-0',
                          isScriptRunning
                            ? 'bg-rose-600 text-white'
                            : 'text-zinc-400 hover:text-emerald-400'
                        )}
                        onClick={() => handleRunScript(sName, sCmd)}
                        title={isScriptRunning ? 'Stop Script' : 'Run Script'}
                      >
                        {isScriptRunning ? (
                          <Square className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3 fill-current" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Center Pane: Subprojects + Notes/Scratchpad (5 cols) ── */}
        <div className="lg:col-span-5 border-r border-zinc-800/80 bg-zinc-950 p-3 flex flex-col min-h-0 overflow-hidden gap-3">
          {/* Subprojects (above scratchpad) */}
          {project.subprojects && project.subprojects.length > 0 && (
            <div className="shrink-0 space-y-2">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-violet-400" />
                <span className="text-[10px] uppercase font-semibold text-zinc-400 tracking-wider">
                  Monorepo Subprojects ({project.subprojects.length})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {project.subprojects.map((sub) => (
                  <div
                    key={sub.name}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 transition-colors text-xs group"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-zinc-200 font-mono truncate block">{sub.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono truncate block">{sub.relativePath}</span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenTerminal(sub)}
                        className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors"
                        title="Open Terminal"
                      >
                        <Terminal className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => window.api?.projects?.openInVSCode?.(sub.path)}
                        className="p-1 rounded text-zinc-400 hover:text-violet-300 hover:bg-zinc-800 transition-colors"
                        title="Open in VS Code"
                      >
                        <Code className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Scratchpad */}
          <div className="flex-1 overflow-hidden">
            <MarkdownNotesEditor projectPath={project.path} projectName={project.name} />
          </div>
        </div>

        {/* ── Right Pane: AI Context & Git Commits Inspector (4 cols) ── */}
        <div className="lg:col-span-4 bg-zinc-950/80 flex flex-col min-h-0 overflow-hidden p-3 space-y-3">
          {/* Sub-tabs for Right Inspector */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveInspectorTab('ai')}
                className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded transition-colors flex items-center gap-1.5',
                  activeInspectorTab === 'ai'
                    ? 'bg-violet-950/60 text-violet-300 border border-violet-800/60'
                    : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                <Bot className="w-3 h-3 text-violet-400" />
                AI Context
              </button>

              {project.isGitRepo && (
                <button
                  onClick={() => setActiveInspectorTab('git')}
                  className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded transition-colors flex items-center gap-1.5',
                    activeInspectorTab === 'git'
                      ? 'bg-violet-950/60 text-violet-300 border border-violet-800/60'
                      : 'text-zinc-500 hover:text-zinc-300'
                  )}
                >
                  <Clock className="w-3 h-3 text-cyan-400" />
                  Recent Commits
                </button>
              )}
            </div>

            {activeInspectorTab === 'ai' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] text-zinc-400 hover:text-zinc-100 gap-1 px-1.5"
                onClick={handleCopyAiContext}
              >
                {copiedAi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copiedAi ? 'Copied' : 'Copy'}
              </Button>
            )}
          </div>

          {/* Right Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeInspectorTab === 'ai' ? (
              <ScrollArea className="h-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
                <pre className="text-[11px] font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed select-text">
                  {aiContextContent || 'Generating .ybicg/AI_CONTEXT.md...'}
                </pre>
              </ScrollArea>
            ) : (
              <ScrollArea className="h-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-2">
                {commitsLoading ? (
                  <p className="text-xs text-zinc-500 p-2">Loading commits...</p>
                ) : commits.length === 0 ? (
                  <p className="text-xs text-zinc-500 p-2 italic">No commits recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {commits.map((c) => (
                      <div
                        key={c.hash}
                        className="p-2 rounded bg-zinc-950/60 border border-zinc-850 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-violet-400 mb-0.5">
                          <span>{c.hash.substring(0, 7)}</span>
                          <span className="text-zinc-500">{c.date}</span>
                        </div>
                        <p className="text-xs text-zinc-200 font-medium truncate">{c.message}</p>
                        <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                          {c.author}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs ── */}
      {configDialogOpen && (
        <ProjectConfigDialog
          project={project}
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
        />
      )}
      {envDialogOpen && (
        <EnvManagerDialog
          projectPath={project.path}
          projectName={project.name}
          open={envDialogOpen}
          onOpenChange={setEnvDialogOpen}
        />
      )}
      {snapshotDialogOpen && (
        <ProjectSnapshotDialog
          project={project}
          open={snapshotDialogOpen}
          onOpenChange={setSnapshotDialogOpen}
        />
      )}
      {aiContextDialogOpen && (
        <AiContextDialog
          project={project}
          open={aiContextDialogOpen}
          onOpenChange={setAiContextDialogOpen}
        />
      )}
      {runConfigDialogOpen && (
        <RunConfigDialog
          open={runConfigDialogOpen}
          onOpenChange={setRunConfigDialogOpen}
          projectId={project.id}
          projectName={project.name}
          projectPath={project.path}
          existing={editingRunConfig}
          onSave={handleSaveRunConfig}
        />
      )}
    </div>
  );
};
