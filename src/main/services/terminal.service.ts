import { exec, execSync } from 'child_process';
import * as pty from 'node-pty';
import { logger } from '../utils/logger';
import { logStreamService, cleanAnsiText } from './logstream.service';

export interface TerminalInstance {
  id: string;
  pty: pty.IPty;
  pid: number;
  cwd: string;
  buffer: string;
  name?: string;
  projectId?: string;
  projectName?: string;
  serviceId?: string;
  isService?: boolean;
  isAdmin?: boolean;
  command?: string;
  port?: number;
  startedAt: number;
}

export interface TerminalSpawnMeta {
  name?: string;
  projectId?: string;
  projectName?: string;
  serviceId?: string;
  isService?: boolean;
  isAdmin?: boolean;
  command?: string;
  port?: number;
}

export function isProcessElevated(): boolean {
  if (process.platform !== 'win32') {
    return typeof process.getuid === 'function' && process.getuid() === 0;
  }
  try {
    execSync('net session', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function openElevatedTerminal(
  cwd: string = process.cwd(),
  command?: string,
  title?: string
): Promise<{ success: boolean; pid?: number; error?: string }> {
  return new Promise((resolve) => {
    try {
      const targetCwd = cwd || process.cwd();
      if (process.platform === 'win32') {
        const winTitle = (title || 'Terminal').replace(/'/g, "''");
        const safeCwd = targetCwd.replace(/'/g, "''");
        let psCommand = `Set-Location -LiteralPath '${safeCwd}'; $host.UI.RawUI.WindowTitle = 'ProjectYB [Admin] - ${winTitle}'; Write-Host '[ProjectYB Administrator Terminal]' -ForegroundColor Yellow; Write-Host 'Directory: ${safeCwd}' -ForegroundColor DarkGray;`;

        if (command && command.trim()) {
          const safeCmd = command.trim().replace(/"/g, '`"');
          psCommand += ` Write-Host 'Executing: ${safeCmd}' -ForegroundColor Cyan; ${safeCmd};`;
        }

        const args = ['-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', psCommand];
        const argList = args.map((a) => `\\"${a.replace(/"/g, '`"')}\\"`).join(', ');
        const elevateScript = `Start-Process powershell.exe -Verb RunAs -WorkingDirectory \\"${targetCwd.replace(/"/g, '`"')}\\" -ArgumentList ${argList}`;

        exec(`powershell -NoProfile -Command "${elevateScript}"`, (err: any) => {
          if (err) {
            logger.error('[TerminalService] Failed to launch elevated terminal:', err);
            resolve({ success: false, error: err.message });
          } else {
            logger.info(`[TerminalService] Launched elevated terminal in ${targetCwd}`);
            resolve({ success: true });
          }
        });
      } else {
        const script = command ? `sudo sh -c 'cd "${targetCwd}" && ${command}'` : `sudo -i`;
        exec(script, (err: any) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve({ success: true });
        });
      }
    } catch (err: any) {
      resolve({ success: false, error: err.message });
    }
  });
}

class TerminalService {
  private terminals: Map<string, TerminalInstance> = new Map();

  spawn(
    id: string,
    cwd: string,
    cols: number,
    rows: number,
    shell?: string,
    onData?: (data: string) => void,
    onExit?: (exitCode: number) => void,
    meta?: TerminalSpawnMeta
  ) {
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
        cwd: cwd || process.cwd(),
        buffer: '',
        name: meta?.name || id,
        projectId: meta?.projectId,
        projectName: meta?.projectName,
        serviceId: meta?.serviceId,
        isService: meta?.isService ?? Boolean(meta?.serviceId),
        isAdmin: meta?.isAdmin ?? isProcessElevated(),
        command: meta?.command,
        port: meta?.port,
        startedAt: Date.now()
      };

      this.terminals.set(id, instance);

      let streamBuffer = '';

      ptyProcess.onData((data) => {
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
              const level = clean.toLowerCase().includes('error')
                ? 'error'
                : clean.toLowerCase().includes('warn')
                  ? 'warn'
                  : 'info';
              logStreamService.log('terminal', level, instance.name || `Terminal`, clean);
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
    return Array.from(this.terminals.values()).map((t) => ({
      id: t.id,
      pid: t.pid,
      cwd: t.cwd,
      name: t.name,
      projectName: t.projectName,
      isService: t.isService
    }));
  }

  getAllRunningServices(): Array<{
    id: string;
    projectId: string;
    projectName: string;
    scriptName: string;
    command: string;
    cwd: string;
    terminalId: string;
    pid: number;
    port?: number;
    status: 'running';
    startedAt: number;
  }> {
    return Array.from(this.terminals.values()).map((t) => {
      const nameParts = (t.name || '').split(/[:•]/);
      const projName = t.projectName || (nameParts.length > 1 ? nameParts[0].trim() : 'Project');
      const scriptName = nameParts.length > 1 ? nameParts.slice(1).join(':').trim() : t.name || 'Terminal';

      return {
        id: t.serviceId || t.id,
        projectId: t.projectId || 'custom',
        projectName: projName,
        scriptName: scriptName,
        command: t.command || (t.isService ? 'npm run ' + scriptName : 'active process'),
        cwd: t.cwd,
        terminalId: t.id,
        pid: t.pid,
        port: t.port,
        status: 'running' as const,
        startedAt: t.startedAt || Date.now()
      };
    });
  }
}

export const terminalService = new TerminalService();
