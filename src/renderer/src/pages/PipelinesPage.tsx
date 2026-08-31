import React, { useEffect, useState } from 'react';
import {
  Workflow,
  Play,
  Square,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
  RotateCw,
  FolderOpen,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Package,
  FileCode,
  Boxes,
  Activity,
  ChevronRight,
  Code,
  FastForward,
  Check
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { usePipelineStore } from '@renderer/stores/usePipelineStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useWorkspaceProjects } from '@renderer/hooks/useWorkspaceProjects';
import { Pipeline, PipelineStep, RecipeActionBlockType } from '@renderer/types/pipeline';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

const ACTION_BLOCK_DEFAULTS: Record<RecipeActionBlockType, { name: string; command: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  install_deps: {
    name: 'Install Dependencies',
    command: 'pnpm install || npm install || yarn install',
    icon: Package,
    desc: 'Install project packages'
  },
  clean_artifacts: {
    name: 'Clean Build Artifacts',
    command: 'rimraf dist build .turbo node_modules/.cache || rm -rf dist build .cache',
    icon: Trash2,
    desc: 'Purge cache and build artifacts'
  },
  run_tests: {
    name: 'Run Test Suite',
    command: 'npm test',
    icon: CheckCircle2,
    desc: 'Run unit & integration tests'
  },
  typecheck_lint: {
    name: 'Typecheck & Lint',
    command: 'npm run typecheck && npm run lint',
    icon: FileCode,
    desc: 'Run strict compiler checks'
  },
  docker_compose: {
    name: 'Docker Compose Up',
    command: 'docker compose up -d',
    icon: Layers,
    desc: 'Start background containers'
  },
  project_script: {
    name: 'Run Project Script',
    command: 'npm run build',
    icon: Play,
    desc: 'Execute script from package.json'
  },
  git_pull: {
    name: 'Git Pull Upstream',
    command: 'git pull origin main',
    icon: Activity,
    desc: 'Fetch and merge upstream commits'
  },
  custom_command: {
    name: 'Custom Shell Command',
    command: 'echo "Running custom action"',
    icon: Terminal,
    desc: 'Execute arbitrary shell command'
  },
  delay: {
    name: 'Delay / Wait',
    command: 'sleep 3',
    icon: Clock,
    desc: 'Wait for services to initialize'
  }
};

export const PipelinesPage: React.FC = () => {
  const {
    pipelines,
    loadPipelines,
    savePipeline,
    deletePipeline,
    runPipeline,
    stopPipeline,
    activeRun,
    isExecuting,
    editorModalOpen,
    editingPipeline,
    openEditor,
    closeEditor
  } = usePipelineStore();

  const { projects } = useWorkspaceProjects();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');

  // Builder form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetProjectId, setTargetProjectId] = useState<string>('');
  const [steps, setSteps] = useState<PipelineStep[]>([]);

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [pipelines]);

  useEffect(() => {
    if (editingPipeline) {
      setName(editingPipeline.name);
      setDescription(editingPipeline.description || '');
      setTargetProjectId(editingPipeline.targetProjectId || '');
      setSteps(editingPipeline.steps || []);
    } else {
      setName('');
      setDescription('');
      setTargetProjectId(projects[0]?.id || '');
      setSteps([]);
    }
  }, [editingPipeline, editorModalOpen]);

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0];

  const handleAddActionBlock = (blockType: RecipeActionBlockType) => {
    const template = ACTION_BLOCK_DEFAULTS[blockType];
    const newStep: PipelineStep = {
      id: 'step_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: template.name,
      type: 'command',
      actionType: blockType,
      command: template.command,
      continueOnError: false
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleUpdateStep = (id: string, patch: Partial<PipelineStep>) => {
    setSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Recipe name is required');
      return;
    }
    if (steps.length === 0) {
      toast.error('Add at least one step to the recipe');
      return;
    }

    const targetProj = projects.find((p) => p.id === targetProjectId);

    const pipe: Pipeline = {
      id: editingPipeline ? editingPipeline.id : 'recipe_' + Date.now(),
      name: name.trim(),
      description: description.trim(),
      targetProjectId: targetProjectId || undefined,
      targetProjectName: targetProj?.name,
      targetProjectPath: targetProj?.path,
      steps,
      createdAt: editingPipeline ? editingPipeline.createdAt : Date.now()
    };

    await savePipeline(pipe);
    setSelectedPipelineId(pipe.id);
    toast.success('Recipe saved successfully');
  };

  const handleRunActiveRecipe = async () => {
    if (!selectedPipeline) return;
    const targetProj = projects.find((p) => p.id === selectedPipeline.targetProjectId);
    const cwd = targetProj ? targetProj.path : projects[0]?.path;
    await runPipeline(selectedPipeline, cwd);
    toast.success('Started recipe: ' + selectedPipeline.name);
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-400">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-zinc-100">Visual Developer Recipes</h1>
              <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-300">
                Workflow Automation
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Chain dependencies, build steps, test suites, and Docker tasks into automated 1-click execution flows.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => openEditor()}
            className="bg-violet-600 hover:bg-violet-700 text-xs h-8 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New Recipe
          </Button>
        </div>
      </div>

      {/* ── Main Workbench ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left: Recipe Navigator */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/70 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Saved Recipes</span>
            <Badge variant="outline" className="text-[10px] font-mono border-zinc-800 text-zinc-400">
              {pipelines.length}
            </Badge>
          </div>

          <ScrollArea className="flex-1 p-3">
            <div className="space-y-2">
              {pipelines.map((pipe) => {
                const isSelected = selectedPipeline?.id === pipe.id;
                const isRunning = isExecuting && activeRun?.pipelineId === pipe.id;

                return (
                  <button
                    key={pipe.id}
                    onClick={() => setSelectedPipelineId(pipe.id)}
                    className={cn(
                      'w-full flex flex-col p-3 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'bg-violet-950/40 border-violet-500/60 ring-1 ring-violet-500/40 shadow-lg shadow-violet-950/20'
                        : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-bold text-zinc-200 truncate">{pipe.name}</span>
                      {isRunning ? (
                        <Badge className="text-[9px] h-4 bg-violet-950 text-violet-300 border-violet-700 animate-pulse font-mono">
                          Running
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] h-4 bg-zinc-950 text-zinc-500 border-zinc-800 font-mono">
                          {pipe.steps.length} steps
                        </Badge>
                      )}
                    </div>
                    {pipe.description && (
                      <p className="text-[11px] text-zinc-500 line-clamp-2">{pipe.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Visual Stepper & Execution Flow */}
        <div className="flex-1 flex flex-col bg-zinc-950/40 overflow-hidden">
          {selectedPipeline ? (
            <>
              {/* Recipe Execution Control Bar */}
              <div className="px-6 py-3.5 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-4 flex-wrap shrink-0">
                <div>
                  <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    {selectedPipeline.name}
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedPipeline.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditor(selectedPipeline)}
                    className="h-7 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete recipe ' + selectedPipeline.name + '?')) {
                        deletePipeline(selectedPipeline.id);
                      }
                    }}
                    className="h-7 text-xs border-zinc-800 hover:bg-rose-950/40 hover:text-rose-400 text-zinc-400 gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>

                  {isExecuting && activeRun?.pipelineId === selectedPipeline.id ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => stopPipeline(selectedPipeline.id)}
                      className="h-7 text-xs gap-1.5"
                    >
                      <Square className="w-3.5 h-3.5" /> Stop Run
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleRunActiveRecipe}
                      className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 px-3"
                    >
                      <Play className="w-3.5 h-3.5" /> Run Recipe
                    </Button>
                  )}
                </div>
              </div>

              {/* Visual Flow Timeline */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="max-w-3xl mx-auto space-y-3">
                  {selectedPipeline.steps.map((step, idx) => {
                    const template = step.actionType ? ACTION_BLOCK_DEFAULTS[step.actionType] : ACTION_BLOCK_DEFAULTS.custom_command;
                    const Icon = template.icon;
                    const runLog = activeRun?.stepLogs.find((l) => l.stepId === step.id);
                    const isStepRunning = activeRun?.status === 'running' && activeRun.currentStepIndex === idx;
                    const isStepSuccess = runLog?.status === 'success';
                    const isStepFailed = runLog?.status === 'failed';

                    return (
                      <div key={step.id || idx} className="relative">
                        {/* Timeline vertical connector */}
                        {idx < selectedPipeline.steps.length - 1 && (
                          <div className="absolute left-6 top-10 bottom-[-16px] w-0.5 bg-zinc-800 z-0" />
                        )}

                        <Card
                          className={cn(
                            'relative z-10 border transition-all p-4',
                            isStepRunning
                              ? 'bg-violet-950/30 border-violet-500 shadow-lg ring-1 ring-violet-500/30'
                              : isStepSuccess
                                ? 'bg-zinc-900/50 border-emerald-800/60'
                                : isStepFailed
                                  ? 'bg-rose-950/20 border-rose-800/60'
                                  : 'bg-zinc-900/40 border-zinc-800/80'
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={cn(
                                  'p-2 rounded-lg border shrink-0 mt-0.5',
                                  isStepRunning
                                    ? 'bg-violet-600/20 border-violet-500 text-violet-300 animate-pulse'
                                    : isStepSuccess
                                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-400'
                                      : isStepFailed
                                        ? 'bg-rose-950/60 border-rose-700 text-rose-400'
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                                )}
                              >
                                {isStepRunning ? (
                                  <RotateCw className="w-4 h-4 animate-spin text-violet-400" />
                                ) : isStepSuccess ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Icon className="w-4 h-4" />
                                )}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-zinc-200">
                                    Step {idx + 1}: {step.name}
                                  </span>
                                  {step.actionType && (
                                    <Badge variant="outline" className="text-[9px] font-mono border-zinc-700 text-zinc-400">
                                      {step.actionType}
                                    </Badge>
                                  )}
                                  {runLog?.durationMs ? (
                                    <span className="text-[10px] font-mono text-zinc-500">
                                      ({(runLog.durationMs / 1000).toFixed(2)}s)
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1.5 p-2 bg-zinc-950 rounded border border-zinc-800/80 font-mono text-[11px] text-zinc-300">
                                  {step.command}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-zinc-600 text-xs">
              No recipes available. Create a new recipe to get started.
            </div>
          )}
        </div>
      </div>

      {/* ── Visual Recipe Editor Modal ── */}
      <Dialog open={editorModalOpen} onOpenChange={(open) => (!open ? closeEditor() : null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] p-6 bg-zinc-950 border-zinc-800 text-zinc-50 flex flex-col overflow-hidden">
          <DialogHeader className="pb-3 border-b border-zinc-800">
            <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Workflow className="w-4 h-4 text-violet-400" />
              {editingPipeline ? 'Edit Developer Recipe' : 'Create Visual Developer Recipe'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Add visual action blocks to chain automated development tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-5">
            {/* Meta Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Recipe Name</Label>
                <Input
                  placeholder="e.g. Full-Stack Pre-Commit Verification"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Target Project</Label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">Active / Workspace Context</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Description</Label>
              <Input
                placeholder="Brief summary of what this recipe does"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-300"
              />
            </div>

            {/* Action Block Palette */}
            <div className="space-y-2 pt-2 border-t border-zinc-800/80">
              <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                + Add Pre-Built Action Block
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.keys(ACTION_BLOCK_DEFAULTS) as RecipeActionBlockType[]).map((key) => {
                  const block = ACTION_BLOCK_DEFAULTS[key];
                  const Icon = block.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleAddActionBlock(key)}
                      className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 hover:border-violet-600/60 text-left transition-all group"
                    >
                      <Icon className="w-3.5 h-3.5 text-violet-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] font-bold text-zinc-200 block">{block.name}</span>
                      <span className="text-[10px] text-zinc-500 line-clamp-1">{block.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Configured Steps List */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                Recipe Steps ({steps.length})
              </Label>

              {steps.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-xs bg-zinc-900/20 rounded-xl border border-zinc-800">
                  Click an action block above to add your first step.
                </div>
              ) : (
                <div className="space-y-2">
                  {steps.map((step, idx) => (
                    <div
                      key={step.id || idx}
                      className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-violet-300 font-mono">Step {idx + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveStep(step.id)}
                          className="h-6 w-6 text-zinc-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          placeholder="Step Name"
                          value={step.name}
                          onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                          className="bg-zinc-950 border-zinc-800 text-xs"
                        />
                        <Input
                          placeholder="Command to execute"
                          value={step.command || ''}
                          onChange={(e) => handleUpdateStep(step.id, { command: e.target.value })}
                          className="bg-zinc-950 border-zinc-800 text-xs font-mono text-zinc-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button type="button" variant="outline" size="sm" onClick={closeEditor} className="text-xs border-zinc-800">
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={handleSaveRecipe} className="bg-violet-600 hover:bg-violet-700 text-xs">
              Save Recipe
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
