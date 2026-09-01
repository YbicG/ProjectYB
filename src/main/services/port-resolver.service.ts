import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export class PortResolverService {
  async isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => {
        resolve(false);
      });
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '127.0.0.1');
    });
  }

  async findAvailablePort(startPort: number = 3000, maxPort: number = 9999): Promise<number> {
    for (let p = startPort; p <= maxPort; p++) {
      const free = await this.isPortFree(p);
      if (free) return p;
    }
    return startPort + 1;
  }

  async getPortProcess(port: number): Promise<{ pid?: number; processName?: string; commandLine?: string } | null> {
    if (process.platform !== 'win32') return null;
    try {
      const { stdout } = await execAsync('netstat -ano -p tcp');
      const lines = stdout.split(/\r?\n/);
      let pid: number | null = null;

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[0] === 'TCP') {
          const localAddress = parts[1];
          if (localAddress.endsWith(':' + port)) {
            const foundPid = parseInt(parts[4], 10);
            if (!isNaN(foundPid) && foundPid > 0) {
              pid = foundPid;
              break;
            }
          }
        }
      }

      if (pid) {
        try {
          const { stdout: taskOut } = await execAsync('tasklist /FI "PID eq ' + pid + '" /FO CSV /NH');
          const name = taskOut.split(',')[0]?.replace(/"/g, '').trim();
          return { pid, processName: name || 'node.exe' };
        } catch {
          return { pid, processName: 'node.exe' };
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async killPortProcess(port: number): Promise<{ success: boolean; message: string }> {
    const procInfo = await this.getPortProcess(port);
    if (!procInfo || !procInfo.pid) {
      return { success: false, message: 'No process found holding port ' + port };
    }

    try {
      await execAsync('taskkill /F /PID ' + procInfo.pid);
      logger.info('[PortResolver] Killed process holding port ' + port + ' (PID: ' + procInfo.pid + ')');
      return { success: true, message: 'Killed ' + (procInfo.processName || 'PID ' + procInfo.pid) + ' on port ' + port };
    } catch (err: any) {
      return { success: false, message: 'Failed to kill PID ' + procInfo.pid + ': ' + err.message };
    }
  }

  async updateEnvPort(projectPath: string, newPort: number): Promise<{ success: boolean; message: string; oldPort?: number }> {
    const envPath = path.join(projectPath, '.env');
    let content = '';
    let oldPort: number | undefined;

    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }

    const lines = content.split(/\r?\n/);
    let portFound = false;
    const updatedLines = lines.map((l) => {
      const trimmed = l.trim();
      if (trimmed.startsWith('PORT=') || trimmed.startsWith('VITE_PORT=')) {
        const eq = trimmed.indexOf('=');
        const key = trimmed.substring(0, eq);
        const oldVal = parseInt(trimmed.substring(eq + 1), 10);
        if (!isNaN(oldVal)) oldPort = oldVal;
        portFound = true;
        return key + '=' + newPort;
      }
      return l;
    });

    if (!portFound) {
      updatedLines.push('PORT=' + newPort);
    }

    try {
      fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
      logger.info('[PortResolver] Updated port in ' + envPath + ' to ' + newPort);
      return { success: true, message: 'Updated PORT to ' + newPort + ' in .env', oldPort };
    } catch (err: any) {
      return { success: false, message: 'Failed to update .env: ' + err.message };
    }
  }
}

export const portResolverService = new PortResolverService();