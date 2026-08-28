export type LogSource = 'terminal' | 'service' | 'tunnel' | 'docker' | 'mock' | 'system';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogStreamEntry {
  id: string;
  timestamp: string;
  source: LogSource;
  level: LogLevel;
  tag: string;
  message: string;
  projectId?: string;
}
