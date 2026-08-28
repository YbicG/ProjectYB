import { spawn, ChildProcess } from 'child_process';
import { BrowserWindow } from 'electron';
import { getStore } from '../ipc/store.ipc';

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

export class PipelineService {
  private mainWindow: BrowserWindow | null = null;
  private activeRuns = new Map<string, { state: PipelineRunState; currentProcess?: ChildProcess; abortController?: AbortController }>();
  private cronIntervals = new Map<string, NodeJS.Timeout>();

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * Run a pipeline sequentially
   */
  async runPipeline(pipeline: Pipeline, baseCwd: string = 'D:\\Code'): Promise<PipelineRunState> {
    const runState: PipelineRunState = {
      pipelineId: pipeline.id,
      status: 'running',
      startedAt: Date.now(),
      currentStepIndex: 0,
      stepLogs: pipeline.steps.map((step) => ({
        pipelineId: pipeline.id,
        stepId: step.id,
        stepName: step.name,
        status: 'pending',
        logs: [],
        durationMs: 0
      }))
    };

    const runContext = {
      state: runState,
      currentProcess: undefined as ChildProcess | undefined
    };

    this.activeRuns.set(pipeline.id, runContext);
    this.emitPipelineUpdate(runState);

    // Execute steps in background
    (async () => {
      let failed = false;

      for (let i = 0; i < pipeline.steps.length; i++) {
        if (runState.status === 'stopped') break;

        const step = pipeline.steps[i];
        runState.currentStepIndex = i;
        const stepLog = runState.stepLogs[i];
        stepLog.status = 'running';
        const stepStart = Date.now();
        this.emitPipelineUpdate(runState);

        try {
          if (step.type === 'delay') {
            await new Promise((r) => setTimeout(r, step.delayMs || 1000));
            stepLog.status = 'success';
            stepLog.logs.push(`Delayed for ${step.delayMs || 1000}ms`);
          } else if (step.type === 'command' || step.type === 'script' || step.type === 'docker') {
            const cwd = step.cwd || pipeline.targetProjectPath || baseCwd;
            const cmd = step.command || 'echo "Step completed"';

            const exitCode = await this.executeStepCommand(
              pipeline.id,
              step.id,
              cmd,
              cwd,
              stepLog,
              runContext
            );

            stepLog.exitCode = exitCode;
            if (exitCode === 0) {
              stepLog.status = 'success';
            } else {
              stepLog.status = 'failed';
              if (!step.continueOnError) {
                failed = true;
              }
            }
          } else {
            stepLog.status = 'success';
          }
        } catch (err: any) {
          stepLog.status = 'failed';
          stepLog.logs.push(`Error: ${err.message}`);
          if (!step.continueOnError) failed = true;
        }

        stepLog.durationMs = Date.now() - stepStart;
        this.emitPipelineUpdate(runState);

        if (failed) {
          // Mark remaining as skipped
          for (let j = i + 1; j < pipeline.steps.length; j++) {
            runState.stepLogs[j].status = 'skipped';
          }
          break;
        }
      }

      runState.status = failed ? 'failed' : runState.status === 'stopped' ? 'stopped' : 'success';
      runState.completedAt = Date.now();
      this.activeRuns.delete(pipeline.id);
      this.emitPipelineUpdate(runState);
    })();

    return runState;
  }

  private executeStepCommand(
    pipelineId: string,
    stepId: string,
    command: string,
    cwd: string,
    stepLog: PipelineRunLog,
    context: any
  ): Promise<number> {
    return new Promise((resolve) => {
      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const args = process.platform === 'win32' ? ['-NoProfile', '-Command', command] : ['-c', command];

      const child = spawn(shell, args, {
        cwd,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      context.currentProcess = child;

      const append = (data: Buffer) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            stepLog.logs.push(trimmed);
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('pipeline:log-line', {
                pipelineId,
                stepId,
                line: trimmed
              });
            }
          }
        }
      };

      child.stdout?.on('data', append);
      child.stderr?.on('data', append);

      child.on('error', (err) => {
        stepLog.logs.push(`Execution error: ${err.message}`);
        resolve(1);
      });

      child.on('close', (code) => {
        resolve(code ?? 0);
      });
    });
  }

  /**
   * Stop active pipeline run
   */
  stopPipeline(pipelineId: string): boolean {
    const run = this.activeRuns.get(pipelineId);
    if (!run) return false;

    run.state.status = 'stopped';
    if (run.currentProcess) {
      try {
        if (process.platform === 'win32' && run.currentProcess.pid) {
          require('child_process').exec(`taskkill /pid ${run.currentProcess.pid} /T /F`, () => {});
        } else {
          run.currentProcess.kill('SIGTERM');
        }
      } catch {}
    }

    this.activeRuns.delete(pipelineId);
    this.emitPipelineUpdate(run.state);
    return true;
  }

  private emitPipelineUpdate(state: PipelineRunState) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('pipeline:status-update', state);
    }
  }
}

export const pipelineService = new PipelineService();
