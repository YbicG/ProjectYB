import { spawn, exec, ChildProcess } from 'child_process';
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
  executionMode?: 'sequential' | 'parallel';
  stopOnError?: boolean;
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
  private activeRuns = new Map<
    string,
    {
      state: PipelineRunState;
      activeProcesses: Set<ChildProcess>;
      isStopped: boolean;
    }
  >();

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * Run a pipeline sequentially or in parallel
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
      activeProcesses: new Set<ChildProcess>(),
      isStopped: false
    };

    this.activeRuns.set(pipeline.id, runContext);
    this.emitPipelineUpdate(runState);

    const isParallel = pipeline.executionMode === 'parallel';

    // Execute steps in background
    (async () => {
      if (isParallel) {
        // Parallel Execution
        const stepPromises = pipeline.steps.map(async (step, index) => {
          if (runContext.isStopped) {
            runState.stepLogs[index].status = 'skipped';
            return;
          }

          const stepLog = runState.stepLogs[index];
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
              stepLog.status = exitCode === 0 ? 'success' : 'failed';
            } else {
              stepLog.status = 'success';
            }
          } catch (err: any) {
            stepLog.status = 'failed';
            stepLog.logs.push(`Error: ${err.message}`);
          }

          stepLog.durationMs = Date.now() - stepStart;
          this.emitPipelineUpdate(runState);
        });

        await Promise.allSettled(stepPromises);

        const anyFailed = runState.stepLogs.some((l) => l.status === 'failed');
        runState.status = runContext.isStopped
          ? 'stopped'
          : anyFailed
          ? 'failed'
          : 'success';
      } else {
        // Sequential Execution
        let failed = false;

        for (let i = 0; i < pipeline.steps.length; i++) {
          if (runContext.isStopped || runState.status === 'stopped') break;

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
                if (!step.continueOnError && pipeline.stopOnError !== false) {
                  failed = true;
                }
              }
            } else {
              stepLog.status = 'success';
            }
          } catch (err: any) {
            stepLog.status = 'failed';
            stepLog.logs.push(`Error: ${err.message}`);
            if (!step.continueOnError && pipeline.stopOnError !== false) {
              failed = true;
            }
          }

          stepLog.durationMs = Date.now() - stepStart;
          this.emitPipelineUpdate(runState);

          if (failed) {
            // Mark remaining steps as skipped
            for (let j = i + 1; j < pipeline.steps.length; j++) {
              runState.stepLogs[j].status = 'skipped';
            }
            break;
          }
        }

        runState.status = runContext.isStopped
          ? 'stopped'
          : failed
          ? 'failed'
          : 'success';
      }

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
    context: { activeProcesses: Set<ChildProcess>; isStopped: boolean }
  ): Promise<number> {
    return new Promise((resolve) => {
      if (context.isStopped) {
        return resolve(1);
      }

      const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
      const args = process.platform === 'win32' ? ['-NoProfile', '-Command', command] : ['-c', command];

      let child: ChildProcess;
      try {
        child = spawn(shell, args, {
          cwd,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe']
        });
      } catch (err: any) {
        stepLog.logs.push(`Spawn error: ${err.message}`);
        return resolve(1);
      }

      context.activeProcesses.add(child);

      const append = (data: Buffer) => {
        const lines = data.toString().split(/\r?\n/);
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
        context.activeProcesses.delete(child);
        stepLog.logs.push(`Execution error: ${err.message}`);
        resolve(1);
      });

      child.on('close', (code) => {
        context.activeProcesses.delete(child);
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

    run.isStopped = true;
    run.state.status = 'stopped';

    for (const proc of run.activeProcesses) {
      try {
        if (process.platform === 'win32' && proc.pid) {
          exec(`taskkill /pid ${proc.pid} /T /F`, () => {});
        } else {
          proc.kill('SIGTERM');
        }
      } catch {}
    }
    run.activeProcesses.clear();

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
