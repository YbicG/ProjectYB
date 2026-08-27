import * as pty from 'node-pty';
import { logger } from '../utils/logger';

export interface TerminalInstance {
  id: string;
  pty: pty.IPty;
  pid: number;
  cwd: string;
}

class TerminalService {
  private terminals: Map<string, TerminalInstance> = new Map();

  spawn(id: string, cwd: string, cols: number, rows: number, shell?: string, onData?: (data: string) => void, onExit?: (exitCode: number) => void) {
    const file = shell || (process.platform === 'win32' ? 'powershell.exe' : 'bash');
    try {
      const ptyProcess = pty.spawn(file, [], {
        name: 'xterm-color',
        cols: cols || 80,
        rows: rows || 30,
        cwd: cwd || process.cwd(),
        env: process.env as any
      });

      this.terminals.set(id, {
        id,
        pty: ptyProcess,
        pid: ptyProcess.pid,
        cwd
      });

      ptyProcess.onData(data => {
        if (onData) onData(data);
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
      term.pty.kill();
      this.terminals.delete(id);
    }
  }

  killAll() {
    for (const [id, term] of this.terminals.entries()) {
      term.pty.kill();
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
