import { exec } from 'child_process';
import { promisify } from 'util';
import { terminalService } from './terminal.service';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface ForceKillResult {
  success: boolean;
  killedPids: number[];
  freedPort?: number;
  error?: string;
}

export class ServiceKillerService {
  /**
   * Find PIDs listening on a specific port
   */
  async findPidsOnPort(port: number): Promise<number[]> {
    const pids: Set<number> = new Set();
    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          // Format: TCP 0.0.0.0:3000 0.0.0.0:0 LISTENING 12345
          if (parts.length >= 5 && parts[1]?.endsWith(`:${port}`) && parts[3] === 'LISTENING') {
            const pid = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
              pids.add(pid);
            }
          }
        }
      } catch {
        // netstat findstr returns exit code 1 if not found
      }
    } else {
      try {
        const { stdout } = await execAsync(`lsof -ti :${port}`);
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const pid = parseInt(line.trim(), 10);
          if (!isNaN(pid) && pid > 0 && pid !== process.pid) {
            pids.add(pid);
          }
        }
      } catch {}
    }
    return Array.from(pids);
  }

  /**
   * Forcefully kill an entire process tree and free any associated port
   */
  async forceKill(options: {
    pid?: number;
    port?: number;
    terminalId?: string;
  }): Promise<ForceKillResult> {
    const killedPids: Set<number> = new Set();

    try {
      // 1. Kill terminal session if terminalId provided
      if (options.terminalId) {
        try {
          terminalService.kill(options.terminalId);
        } catch {}
      }

      // 2. Find any PIDs occupying the port
      if (options.port) {
        const portPids = await this.findPidsOnPort(options.port);
        for (const p of portPids) {
          killedPids.add(p);
        }
      }

      // 3. Add explicit PID if provided
      if (options.pid && options.pid > 0 && options.pid !== process.pid) {
        killedPids.add(options.pid);
      }

      // 4. Force kill each process tree
      for (const pid of killedPids) {
        try {
          if (process.platform === 'win32') {
            await execAsync(`taskkill /pid ${pid} /T /F`);
          } else {
            await execAsync(`kill -9 ${pid}`);
          }
        } catch (err: any) {
          // If already dead, ignore
          logger.warn(`[ServiceKiller] taskkill error for PID ${pid}: ${err.message}`);
        }
      }

      logger.info(`[ServiceKiller] Successfully force-killed PIDs: ${Array.from(killedPids).join(', ')}`);
      return {
        success: true,
        killedPids: Array.from(killedPids),
        freedPort: options.port
      };
    } catch (error: any) {
      logger.error('[ServiceKiller] Error during forceKill:', error);
      return {
        success: false,
        killedPids: Array.from(killedPids),
        error: error.message
      };
    }
  }
}

export const serviceKillerService = new ServiceKillerService();
