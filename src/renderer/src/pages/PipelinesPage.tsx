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
  ShieldCheck
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
import { Pipeline, PipelineStep } from '@renderer/types/pipeline';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

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

  const { projects } = useProjectStore();

  // Editor form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetProjectId, setTargetProjectId] = useState<string>('');
  const [steps, setSteps] = useState<PipelineStep[]>([]);

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    if (editingPipeline) {
      setName(editingPipeline.name);
      setDescription(editingPipeline.description || '');
      setTargetProjectId(editingPipeline.targetProjectId || '');
      setSteps(editingPipeline.steps || []);
    }
  }, [editingPipeline]);

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        id: `step_${Date.now()}`,
        name: `Step ${steps.length + 1}`,
        type: 'command',
        command: 'npm run test',
        continueOnError: false
      }
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const handleUpdateStep = (idx: number, patch: Partial<PipelineStep>) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const handleSavePipeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please specify a pipeline name');
      return;
    }

    const targetProj = projects.find((p) => p.id === targetProjectId);

    const pipe: Pipeline = {
      id: editingPipeline?.id || `pipe_${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      targetProjectId: targetProjectId || undefined,
      targetProjectName: targetProj?.name,
      targetProjectPath: targetProj?.path,
      steps: steps.length > 0 ? steps : [{ id: 's1', name: 'Build Step', type: 'command', command: 'npm run build' }],
      createdAt: editingPipeline?.createdAt || Date.now()
    };

    savePipeline(pipe);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-zinc-950 text-zinc-100 p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                Workflow Automation Pipelines
                <Badge variant="outline" className="text-[10px] font-mono border-violet-500/30 text-violet-400 bg-violet-950/20">
                  Local CI/CD
                </Badge>
              </h1>
              <p className="text-xs text-zinc-400">
                Chain multi-step shell scripts, automated test suites, build tasks, and maintenance recipes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => openEditor()}
            className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-1.5 shadow-lg shadow-violet-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            New Pipeline
          </Button>
        </div>
      </div>

      {/* ── Active Pipeline Live Execution Viewer ── */}
      {activeRun && (
        <Card className="border-violet-500/40 bg-violet-950/10 shadow-xl overflow-hidden">
          <CardHeader className="p-4 pb-3 border-b border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    activeRun.status === 'running'
                      ? 'bg-violet-400 animate-ping'
                      : activeRun.status === 'success'
                      ? 'bg-emerald-400'
                      : 'bg-red-400'
                  )}
                />
                <h3 className="font-semibold text-sm text-zinc-100">
                  Pipeline Execution: {pipelines.find((p) => p.id === activeRun.pipelineId)?.name || activeRun.pipelineId}
                </h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[9px] font-mono uppercase',
                    activeRun.status === 'running'
                      ? 'border-violet-500/40 text-violet-300'
                      : activeRun.status === 'success'
                      ? 'border-emerald-500/40 text-emerald-300'
                      : 'border-red-500/40 text-red-300'
                  )}
                >
                  {activeRun.status}
                </Badge>
              </div>

              {activeRun.status === 'running' && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => stopPipeline(activeRun.pipelineId)}
                  className="h-7 text-xs bg-red-600/20 hover:bg-red-600 text-red-300 gap-1"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop Pipeline
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Step Progress Track */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {activeRun.stepLogs.map((log, idx) => (
                <React.Fragment key={log.stepId}>
                  <div
                    className={cn(
                      'p-2.5 rounded-lg border text-xs font-mono shrink-0 flex items-center gap-2 transition-all',
                      log.status === 'running'
                        ? 'bg-violet-900/40 border-violet-500 text-violet-200 shadow-md'
                        : log.status === 'success'
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                        : log.status === 'failed'
                        ? 'bg-red-950/20 border-red-500/40 text-red-300'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'
                    )}
                  >
                    <span className="w-5 h-5 rounded-full bg-zinc-950/80 flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-semibold">{log.stepName}</span>
                    {log.durationMs > 0 && (
                      <span className="text-[10px] text-zinc-400">({log.durationMs}ms)</span>
                    )}
                  </div>
                  {idx < activeRun.stepLogs.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Live Console Output for Current Running / Last Step */}
            <div className="bg-black/80 rounded-lg border border-zinc-800 p-3 font-mono text-xs max-h-48 overflow-y-auto space-y-1 text-zinc-300">
              {activeRun.stepLogs[activeRun.currentStepIndex]?.logs.length === 0 ? (
                <div className="text-zinc-600 italic">Streaming step execution logs...</div>
              ) : (
                activeRun.stepLogs[activeRun.currentStepIndex]?.logs.map((line, lIdx) => (
                  <div key={lIdx} className="leading-relaxed break-all">
                    {line}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Pipelines Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pipelines.map((pipe) => (
          <Card
            key={pipe.id}
            className="bg-zinc-900/70 border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between"
          >
            <CardHeader className="p-4 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-violet-400 shrink-0" />
                    <CardTitle className="text-sm font-semibold text-zinc-100 truncate">
                      {pipe.name}
                    </CardTitle>
                  </div>
                  {pipe.description && (
                    <CardDescription className="text-xs text-zinc-400 line-clamp-2">
                      {pipe.description}
                    </CardDescription>
                  )}
                </div>

                <Badge variant="outline" className="text-[9px] font-mono border-zinc-800 text-zinc-400 shrink-0">
                  {pipe.steps.length} steps
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-0 space-y-3">
              {/* Target Project */}
              {pipe.targetProjectName && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                  <FolderOpen className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-300 font-medium truncate">{pipe.targetProjectName}</span>
                </div>
              )}

              {/* Steps overview */}
              <div className="space-y-1.5 bg-zinc-950/60 p-2.5 rounded border border-zinc-850">
                {pipe.steps.slice(0, 3).map((s, idx) => (
                  <div key={s.id} className="flex items-center gap-2 text-[11px] font-mono text-zinc-300 truncate">
                    <span className="text-zinc-600">{idx + 1}.</span>
                    <span className="text-violet-300 font-semibold">{s.name}</span>
                    <span className="text-zinc-500 truncate">$ {s.command}</span>
                  </div>
                ))}
                {pipe.steps.length > 3 && (
                  <p className="text-[10px] text-zinc-500 italic pl-3">
                    +{pipe.steps.length - 3} more step(s)
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => runPipeline(pipe, pipe.targetProjectPath)}
                  disabled={isExecuting && activeRun?.pipelineId === pipe.id}
                  className="flex-1 h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-1.5"
                >
                  <Play className="w-3 h-3 fill-current" />
                  Run Pipeline
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-zinc-800 text-zinc-400 hover:text-zinc-100"
                  onClick={() => openEditor(pipe)}
                  title="Edit Pipeline"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 hover:text-red-400"
                  onClick={() => deletePipeline(pipe.id)}
                  title="Delete Pipeline"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Pipeline Editor Dialog ── */}
      <Dialog open={editorModalOpen} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-xl max-h-[85vh] flex flex-col p-5">
          <DialogHeader className="pb-3 border-b border-zinc-800">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Workflow className="w-4 h-4 text-violet-400" />
              {editingPipeline ? 'Edit Pipeline' : 'Create Automation Pipeline'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Configure sequential execution steps, commands, and target projects.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePipeline} className="flex-1 overflow-y-auto space-y-4 pt-2 pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Pipeline Name</Label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Deploy Prep & Tests"
                  required
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Target Project (Optional)</Label>
                <select
                  value={targetProjectId}
                  onChange={(e) => setTargetProjectId(e.target.value)}
                  className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">Global / Workspace Default</option>
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
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this workflow"
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            {/* Steps Builder */}
            <div className="space-y-2 pt-2 border-t border-zinc-850">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-zinc-300 font-semibold">Execution Steps</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleAddStep}
                  className="h-6 text-[10px] border-zinc-800 text-violet-300 gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Step
                </Button>
              </div>

              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={step.id} className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-zinc-400">Step {idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveStep(idx)}
                        className="h-5 w-5 text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="text"
                        value={step.name}
                        onChange={(e) => handleUpdateStep(idx, { name: e.target.value })}
                        placeholder="Step Name"
                        className="bg-zinc-950 border-zinc-800 text-xs text-zinc-100"
                      />
                      <Input
                        type="text"
                        value={step.command || ''}
                        onChange={(e) => handleUpdateStep(idx, { command: e.target.value })}
                        placeholder="Shell Command (e.g. npm test)"
                        className="col-span-2 bg-zinc-950 border-zinc-800 font-mono text-xs text-zinc-100"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-850">
              <Button type="button" variant="ghost" size="sm" onClick={closeEditor} className="text-xs text-zinc-400">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold">
                Save Pipeline
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
