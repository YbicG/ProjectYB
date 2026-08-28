export interface PipelineStep {
  id: string;
  name: string;
  type: 'command' | 'script' | 'docker' | 'notify' | 'delay';
  command?: string;
  cwd?: string;
  delayMs?: number;
  continueOnError?: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  targetProjectId?: string;
  targetProjectName?: string;
  targetProjectPath?: string;
  steps: PipelineStep[];
  cronExpression?: string;
  isCronActive?: boolean;
  lastRunAt?: number;
  lastStatus?: 'idle' | 'running' | 'success' | 'failed';
  createdAt: number;
}

export interface PipelineRunLog {
  pipelineId: string;
  stepId: string;
  stepName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  logs: string[];
  durationMs: number;
  exitCode?: number;
}

export interface PipelineRunState {
  pipelineId: string;
  status: 'running' | 'success' | 'failed' | 'stopped';
  startedAt: number;
  completedAt?: number;
  currentStepIndex: number;
  stepLogs: PipelineRunLog[];
}
