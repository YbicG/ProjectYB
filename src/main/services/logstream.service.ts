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

/**
 * Robust ANSI and VT100/ConPTY escape sequence stripper
 */
export function cleanAnsiText(raw: string): string {
  if (!raw) return '';
  return raw
    // OSC sequences: \x1b] ... (\x07 | \x1b\) (e.g. window title \x1b]0;...\x07)
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '')
    // CSI sequences: \x1b[ ... [@-~] (including ? private modes e.g. \x1b[?25h, \x1b[?1004h, \x1b[?9001h)
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    // VT100 / ESC multi-character escapes
    .replace(/\x1b[PX^_][^\x1b]*\x1b\\/g, '')
    // VT100 / ESC 2-character sequences
    .replace(/\x1b[@-Z\\-_]/g, '')
    // Stripped/naked ConPTY bracket remnants: [?9001h, [?1004h, [?25l, [?25h, [?9001l, etc.
    .replace(/\[\?[0-9]+[a-zA-Z]/g, '')
    // Stripped/naked OSC title remnants: ]0;...
    .replace(/\]0;[^\r\n]*/g, '')
    // Remove control characters except \t, \r, \n
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
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
    const cleaned = cleanAnsiText(message);
    if (!cleaned) return; // Drop empty noise

    const entry: LogStreamEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      source,
      level,
      tag,
      message: cleaned,
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
