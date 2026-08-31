export type RecipeActionBlockType =
  | 'install_deps'
  | 'clean_artifacts'
  | 'run_tests'
  | 'typecheck_lint'
  | 'docker_compose'
  | 'project_script'
  | 'git_pull'
  | 'custom_command'
  | 'delay';

export interface PipelineStep {
  id: string;
  name: string;
  type: 'command' | 'script' | 'docker' | 'notify' | 'delay';
  actionType?: RecipeActionBlockType;
  command?: string;
  scriptName?: string;
  cwd?: string;
  delayMs?: number;
  continueOnError?: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  category?: 'qa' | 'build' | 'deploy' | 'maintenance' | 'custom';
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
