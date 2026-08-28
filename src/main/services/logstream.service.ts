import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

export type LogSource = 'terminal' | 'service' | 'tunnel' | 'docker' | 'mock' | 'system';
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogStreamEntry {
  id: string;
  timestamp: string;
  source: LogSource;
  level: LogLevel;
  tag: string;           // e.g. "Next.js App", "cloudflared", "Local Proxy"
  message: string;
  projectId?: string;
}

export class LogStreamService extends EventEmitter {
  private buffer: LogStreamEntry[] = [];
  private maxBufferSize = 3000;
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(win: BrowserWindow | null) {
    this.mainWindow = win;
  }

  /**
   * Ingest a log entry from any system
   */
  log(source: LogSource, level: LogLevel, tag: string, message: string, projectId?: string) {
    const entry: LogStreamEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      source,
      level,
      tag,
      message: message.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, ''), // Strip ANSI for clean reading
      projectId
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    this.emit('log', entry);

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('logstream:event', entry);
    }
  }

  getRecentLogs(limit = 1000): LogStreamEntry[] {
    return this.buffer.slice(-limit);
  }

  clearLogs() {
    this.buffer = [];
  }
}

export const logStreamService = new LogStreamService();
