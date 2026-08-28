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
