import * as pty from 'node-pty';
import { logger } from '../utils/logger';
import { logStreamService, cleanAnsiText } from './logstream.service';

export interface TerminalInstance {
  id: string;
  pty: pty.IPty;
  pid: number;
  cwd: string;
  buffer: string;
}

class TerminalService {
  private terminals: Map<string, TerminalInstance> = new Map();

  spawn(id: string, cwd: string, cols: number, rows: number, shell?: string, onData?: (data: string) => void, onExit?: (exitCode: number) => void) {
    const file = shell || (process.platform === 'win32' ? 'powershell.exe' : 'bash');
    const args = process.platform === 'win32' && !shell ? ['-NoLogo'] : [];
    try {
      const ptyProcess = pty.spawn(file, args, {
        name: 'xterm-256color',
        cols: cols || 120,
        rows: rows || 30,
        cwd: cwd || process.cwd(),
        env: process.env as any
      });

      const instance: TerminalInstance = {
        id,
        pty: ptyProcess,
        pid: ptyProcess.pid,
        cwd,
        buffer: ''
      };

      this.terminals.set(id, instance);

      let streamBuffer = '';

      ptyProcess.onData(data => {
        instance.buffer = (instance.buffer + data).slice(-300000);
        if (onData) onData(data);

        // Stream clean lines to LogStream Studio
        streamBuffer += data;
        if (streamBuffer.includes('\n') || streamBuffer.includes('\r')) {
          const lines = streamBuffer.split(/\r?\n/);
          streamBuffer = lines.pop() || '';

          for (const line of lines) {
            const clean = cleanAnsiText(line);
            // Skip empty lines, pure shell prompts, and raw handshake remnants
            if (
              clean &&
              clean.length > 1 &&
              !clean.match(/^PS [A-Za-z]:\\[^>]*>\s*$/) &&
              !clean.startsWith('[?') &&
              !clean.startsWith(']0;')
            ) {
              const level = clean.toLowerCase().includes('error') ? 'error' : clean.toLowerCase().includes('warn') ? 'warn' : 'info';
              logStreamService.log('terminal', level, `Terminal`, clean);
            }
          }
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        this.terminals.delete(id);
        if (onExit) onExit(exitCode);
      });

      return ptyProcess.pid;
    } catch (error) {
      logger.error(`Failed to spawn terminal ${id}`, error);
      throw error;
    }
  }

  getBuffer(id: string): string {
    return this.terminals.get(id)?.buffer || '';
  }

  write(id: string, data: string) {
    const term = this.terminals.get(id);
    if (term) term.pty.write(data);
  }

  resize(id: string, cols: number, rows: number) {
    const term = this.terminals.get(id);
    if (term) term.pty.resize(cols, rows);
  }

  kill(id: string) {
    const term = this.terminals.get(id);
    if (term) {
      if (process.platform === 'win32' && term.pid) {
        try {
          const { exec } = require('child_process');
          exec(`taskkill /pid ${term.pid} /T /F`, () => {});
        } catch {}
      }
      try {
        term.pty.kill();
      } catch {}
      this.terminals.delete(id);
    }
  }

  killAll() {
    for (const [id, term] of this.terminals.entries()) {
      if (process.platform === 'win32' && term.pid) {
        try {
          const { exec } = require('child_process');
          exec(`taskkill /pid ${term.pid} /T /F`, () => {});
        } catch {}
      }
      try {
        term.pty.kill();
      } catch {}
    }
    this.terminals.clear();
  }

  getPid(id: string) {
    const term = this.terminals.get(id);
    return term ? term.pid : null;
  }

  getAllTerminals() {
    return Array.from(this.terminals.values()).map(t => ({ id: t.id, pid: t.pid, cwd: t.cwd }));
  }
}

export const terminalService = new TerminalService();
