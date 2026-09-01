import { exec } from 'child_process';
import { EventEmitter } from 'events';
import { logStreamService, cleanAnsiText } from './logstream.service';
import { logger } from '../utils/logger';
import { getStore } from '../ipc/store.ipc';

export interface CronJob {
  id: string;
  name: string;
  command: string;
  cwd?: string;
  schedule: string;          // e.g. "*/10 * * * *", "0 0 * * *", "every 15m", "every 1h"
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  lastExitCode?: number;
  lastDurationMs?: number;
  lastStatus?: 'success' | 'failed' | 'running';
  nextRun?: string;
}

export interface CronRunHistoryItem {
  id: string;
  jobId: string;
  jobName: string;
  timestamp: string;
  durationMs: number;
  exitCode: number;
  status: 'success' | 'failed';
  output: string;
}

export class CronService extends EventEmitter {
  private jobs: Map<string, CronJob> = new Map();
  private history: Map<string, CronRunHistoryItem[]> = new Map();
  private timer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor() {
    super();
  }

  async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const store = await getStore();
      const savedJobs = store.get('cron:jobs', []) as CronJob[];
      for (const job of savedJobs) {
        this.jobs.set(job.id, {
          ...job,
          nextRun: this.calculateNextRun(job.schedule)
        });
      }

      const savedHistory = store.get('cron:history', {}) as Record<string, CronRunHistoryItem[]>;
      for (const [k, v] of Object.entries(savedHistory)) {
        if (Array.isArray(v)) {
          this.history.set(k, v);
        }
      }
    } catch {}

    // Start background ticker (checks every 30 seconds)
    this.timer = setInterval(() => this.tick(), 30000);
    this.tick();
  }

  private async persistJobs() {
    try {
      const store = await getStore();
      store.set('cron:jobs', Array.from(this.jobs.values()));
    } catch {}
  }

  private async persistHistory() {
    try {
      const store = await getStore();
      const histObj: Record<string, CronRunHistoryItem[]> = {};
      for (const [k, v] of this.history.entries()) {
        histObj[k] = v;
      }
      store.set('cron:history', histObj);
    } catch {}
  }

  /**
   * Parse next execution timestamp from standard 5-field cron or human interval string
   */
  calculateNextRun(schedule: string): string {
    const now = new Date();
    const sched = schedule.trim().toLowerCase();

    // Human interval: "every Xs", "every Xm", "every Xh", "every Xd"
    const secMatch = sched.match(/^every\s+(\d+)\s*s(?:ec(?:ond)?s?)?$/);
    if (secMatch) {
      const secs = parseInt(secMatch[1], 10);
      return new Date(now.getTime() + secs * 1000).toISOString();
    }

    const minMatch = sched.match(/^every\s+(\d+)\s*m(?:in(?:ute)?s?)?$/);
    if (minMatch) {
      const mins = parseInt(minMatch[1], 10);
      return new Date(now.getTime() + mins * 60 * 1000).toISOString();
    }

    const hourMatch = sched.match(/^every\s+(\d+)\s*h(?:(?:ou)?rs?)?$/);
    if (hourMatch) {
      const hrs = parseInt(hourMatch[1], 10);
      return new Date(now.getTime() + hrs * 3600 * 1000).toISOString();
    }

    const dayMatch = sched.match(/^every\s+(\d+)\s*d(?:ays?)?$/);
    if (dayMatch) {
      const days = parseInt(dayMatch[1], 10);
      return new Date(now.getTime() + days * 86400 * 1000).toISOString();
    }

    if (sched === 'daily' || sched === 'midnight' || sched === '0 0 * * *') {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      return next.toISOString();
    }

    if (sched === 'hourly' || sched === '0 * * * *') {
      const next = new Date(now);
      next.setHours(next.getHours() + 1, 0, 0, 0);
      return next.toISOString();
    }

    // Cron step pattern: */X * * * *
    const stepMatch = sched.match(/^\*\/(\d+)\s+\*\s+\*\s+\*\s+\*$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[1], 10);
      const curMin = now.getMinutes();
      const nextMin = Math.ceil((curMin + 1) / step) * step;
      const next = new Date(now);
      if (nextMin >= 60) {
        next.setHours(next.getHours() + Math.floor(nextMin / 60), nextMin % 60, 0, 0);
      } else {
        next.setMinutes(nextMin, 0, 0);
      }
      return next.toISOString();
    }

    // Cron exact minute pattern: M * * * * (e.g. 15 * * * *)
    const exactMinMatch = sched.match(/^(\d{1,2})\s+\*\s+\*\s+\*\s+\*$/);
    if (exactMinMatch) {
      const targetMin = parseInt(exactMinMatch[1], 10);
      const next = new Date(now);
      if (now.getMinutes() >= targetMin) {
        next.setHours(next.getHours() + 1, targetMin, 0, 0);
      } else {
        next.setMinutes(targetMin, 0, 0);
      }
      return next.toISOString();
    }

    // Cron exact minute & hour pattern: M H * * * (e.g. 30 14 * * *)
    const exactTimeMatch = sched.match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/);
    if (exactTimeMatch) {
      const targetMin = parseInt(exactTimeMatch[1], 10);
      const targetHour = parseInt(exactTimeMatch[2], 10);
      const next = new Date(now);
      next.setHours(targetHour, targetMin, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }
      return next.toISOString();
    }

    // Default fallback: 10 minutes from now
    return new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  }

  private async tick() {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (!job.enabled || job.lastStatus === 'running') continue;

      const nextRunTime = job.nextRun ? new Date(job.nextRun).getTime() : 0;
      if (nextRunTime > 0 && now >= nextRunTime) {
        this.executeJob(job.id);
      }
    }
  }

  /**
   * Execute a cron job immediately
   */
  async executeJob(jobId: string): Promise<CronRunHistoryItem> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Cron job ${jobId} not found`);
    }

    const startTime = Date.now();
    job.lastStatus = 'running';
    job.lastRun = new Date().toISOString();
    this.persistJobs();
    this.emit('job:status', job);

    logStreamService.log('system', 'info', `Cron: ${job.name}`, `Started scheduled task: "${job.command}"`);

    return new Promise((resolve) => {
      exec(
        job.command,
        {
          cwd: job.cwd || process.cwd(),
          timeout: 600000 // 10 min max
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const exitCode = error ? (error.code ?? 1) : 0;
          const status: 'success' | 'failed' = exitCode === 0 ? 'success' : 'failed';
          const combinedOutput = cleanAnsiText(`${stdout || ''}\n${stderr || ''}`.trim());

          job.lastExitCode = exitCode;
          job.lastDurationMs = durationMs;
          job.lastStatus = status;
          job.nextRun = this.calculateNextRun(job.schedule);

          const historyItem: CronRunHistoryItem = {
            id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            jobId: job.id,
            jobName: job.name,
            timestamp: new Date().toISOString(),
            durationMs,
            exitCode,
            status,
            output: combinedOutput || (status === 'success' ? 'Completed successfully with code 0' : `Failed with code ${exitCode}`)
          };

          const list = this.history.get(job.id) || [];
          list.unshift(historyItem);
          this.history.set(job.id, list.slice(0, 50)); // Keep last 50 runs

          this.persistJobs();
          this.persistHistory();
          this.emit('job:executed', { job, historyItem });

          const logLvl = status === 'success' ? 'info' : 'error';
          logStreamService.log(
            'system',
            logLvl,
            `Cron: ${job.name}`,
            `Task finished with status ${status} (${durationMs}ms): ${combinedOutput.slice(0, 150)}`
          );

          resolve(historyItem);
        }
      );
    });
  }

  getJobs(): CronJob[] {
    return Array.from(this.jobs.values());
  }

  getJob(id: string): CronJob | undefined {
    return this.jobs.get(id);
  }

  saveJob(jobData: Partial<CronJob> & { name: string; command: string; schedule: string }): CronJob {
    const id = jobData.id || `cron_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const existing = this.jobs.get(id);

    const job: CronJob = {
      id,
      name: jobData.name.trim(),
      command: jobData.command.trim(),
      cwd: jobData.cwd?.trim() || undefined,
      schedule: jobData.schedule.trim(),
      enabled: jobData.enabled ?? existing?.enabled ?? true,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastRun: existing?.lastRun,
      lastExitCode: existing?.lastExitCode,
      lastDurationMs: existing?.lastDurationMs,
      lastStatus: existing?.lastStatus,
      nextRun: this.calculateNextRun(jobData.schedule)
    };

    this.jobs.set(id, job);
    this.persistJobs();
    this.emit('job:saved', job);
    return job;
  }

  deleteJob(id: string): boolean {
    const deleted = this.jobs.delete(id);
    this.history.delete(id);
    this.persistJobs();
    this.emit('job:deleted', id);
    return deleted;
  }

  toggleJob(id: string, enabled: boolean): CronJob | null {
    const job = this.jobs.get(id);
    if (!job) return null;

    job.enabled = enabled;
    if (enabled) {
      job.nextRun = this.calculateNextRun(job.schedule);
    }
    this.persistJobs();
    this.emit('job:updated', job);
    return job;
  }

  getHistory(jobId: string): CronRunHistoryItem[] {
    return this.history.get(jobId) || [];
  }
}

export const cronService = new CronService();
