import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface PortInfo {
  port: number;
  protocol: 'tcp' | 'udp';
  pid: number;
  processName: string;
  localAddress: string;
  state: string;
  serviceId?: string;
  serviceName?: string;
  projectName?: string;
}

export interface PortKillResult {
  success: boolean;
  error?: string;
}

class PortService {
  /**
   * Retrieves process map of PID -> processName
   */
  private async getProcessMap(): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('tasklist /FO CSV /NH', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        const lines = stdout.trim().split(/\r?\n/);
        for (const line of lines) {
          const match = line.match(/^"([^"]+)","(\d+)"/);
          if (match) {
            const name = match[1];
            const pid = parseInt(match[2], 10);
            if (!isNaN(pid)) map.set(pid, name);
          }
        }
      } else {
        const { stdout } = await execAsync('ps -eo pid,comm', { encoding: 'utf8' });
        const lines = stdout.trim().split(/\r?\n/);
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            const pid = parseInt(parts[0], 10);
            const name = parts.slice(1).join(' ');
            if (!isNaN(pid)) map.set(pid, name);
          }
        }
      }
    } catch (err) {
      logger.error('Failed to get process map:', err);
    }
    return map;
  }

  /**
   * Returns all active listening ports on the system
   */
  async getListeningPorts(): Promise<PortInfo[]> {
    const results: PortInfo[] = [];
    const seenPorts = new Set<number>();

    try {
      const processMap = await this.getProcessMap();

      if (process.platform === 'win32') {
        const { stdout } = await execAsync('netstat -ano -p tcp', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        const lines = stdout.split(/\r?\n/);

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('TCP')) continue;

          // Example: TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       4796
          // Example: TCP    [::]:8080              [::]:0                 LISTENING       1234
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 5 && parts[3] === 'LISTENING') {
            const localAddr = parts[1];
            const pid = parseInt(parts[4], 10);

            // Extract port from local address
            const portMatch = localAddr.match(/:(\d+)$/);
            if (portMatch) {
              const port = parseInt(portMatch[1], 10);
              if (!isNaN(port) && !seenPorts.has(port)) {
                seenPorts.add(port);
                const procName = processMap.get(pid) || (pid === 4 ? 'System' : pid === 0 ? 'Idle' : 'Unknown');

                results.push({
                  port,
                  protocol: 'tcp',
                  pid,
                  processName: procName,
                  localAddress: localAddr,
                  state: 'LISTENING'
                });
              }
            }
          }
        }
      } else {
        // Unix / macOS
        const { stdout } = await execAsync('lsof -iTCP -sTCP:LISTEN -n -P', { encoding: 'utf8' });
        const lines = stdout.split(/\r?\n/);
        for (const line of lines.slice(1)) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 9) {
            const procName = parts[0];
            const pid = parseInt(parts[1], 10);
            const nameField = parts[8];
            const portMatch = nameField.match(/:(\d+)$/);
            if (portMatch) {
              const port = parseInt(portMatch[1], 10);
              if (!isNaN(port) && !seenPorts.has(port)) {
                seenPorts.add(port);
                results.push({
                  port,
                  protocol: 'tcp',
                  pid,
                  processName: procName,
                  localAddress: nameField,
                  state: 'LISTENING'
                });
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error('Failed to get listening ports:', err);
    }

    // Sort by port number ascending
    return results.sort((a, b) => a.port - b.port);
  }

  /**
   * Probes if a given port is available for binding
   */
  async checkPort(port: number): Promise<{ isFree: boolean; port: number }> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.unref();

      server.on('error', () => {
        resolve({ isFree: false, port });
      });

      server.listen(port, () => {
        server.close(() => {
          resolve({ isFree: true, port });
        });
      });
    });
  }

  /**
   * Finds the next available port starting from startPort
   */
  async findAvailablePort(startPort: number = 3000, maxTries: number = 100): Promise<number> {
    for (let p = startPort; p < startPort + maxTries; p++) {
      const { isFree } = await this.checkPort(p);
      if (isFree) return p;
    }
    return startPort;
  }

  /**
   * Forcefully kills a process occupying a port by its PID
   */
  async killProcess(pid: number): Promise<PortKillResult> {
    if (pid <= 4) {
      return { success: false, error: 'Cannot terminate system critical process.' };
    }

    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /F /T /PID ${pid}`);
      } else {
        process.kill(pid, 'SIGKILL');
      }
      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to kill process ${pid}:`, err);
      return {
        success: false,
        error: err.message || 'Failed to terminate process. Administrator privileges may be required.'
      };
    }
  }
}

export const portService = new PortService();
