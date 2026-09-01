import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export class PortResolverService {
  async isPortFree(port: number): Promise<boolean> {
    if (!port || typeof port !== 'number' || isNaN(port) || port <= 0 || port > 65535) {
      return false;
    }
    return new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
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
    const start = Math.max(1, Math.min(startPort, 65535));
    const max = Math.max(start, Math.min(maxPort, 65535));
    for (let p = start; p <= max; p++) {
      const free = await this.isPortFree(p);
      if (free) return p;
    }
    return start + 1;
  }

  async getPortProcess(port: number): Promise<{ pid?: number; processName?: string; commandLine?: string } | null> {
    if (!port || typeof port !== 'number' || isNaN(port) || port <= 0 || port > 65535) {
      return null;
    }

    if (process.platform === 'win32') {
      try {
        const { stdout } = await execAsync('netstat -ano -p tcp');
        const lines = stdout.split(/\r?\n/);
        let pid: number | null = null;

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5 && parts[0] === 'TCP') {
            const localAddress = parts[1];
            if (localAddress.endsWith(':' + port) && parts[3] === 'LISTENING') {
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
    } else {
      // Unix / macOS
      try {
        const { stdout } = await execAsync(`lsof -i :${port} -sTCP:LISTEN -F p -F c`);
        const lines = stdout.split(/\r?\n/);
        let pid: number | null = null;
        let processName = '';
        for (const line of lines) {
          if (line.startsWith('p')) {
            pid = parseInt(line.substring(1), 10);
          } else if (line.startsWith('c')) {
            processName = line.substring(1);
          }
        }
        if (pid) return { pid, processName: processName || 'node' };
        return null;
      } catch {
        return null;
      }
    }
  }

  async killPortProcess(port: number): Promise<{ success: boolean; message: string }> {
    const procInfo = await this.getPortProcess(port);
    if (!procInfo || !procInfo.pid) {
      return { success: false, message: 'No process found holding port ' + port };
    }

    try {
      if (process.platform === 'win32') {
        await execAsync(`taskkill /F /T /PID ${procInfo.pid}`);
      } else {
        try {
          await execAsync(`pkill -9 -P ${procInfo.pid}`);
        } catch {}
        await execAsync(`kill -9 ${procInfo.pid}`);
      }
      logger.info('[PortResolver] Killed process holding port ' + port + ' (PID: ' + procInfo.pid + ')');
      return { success: true, message: 'Killed ' + (procInfo.processName || 'PID ' + procInfo.pid) + ' on port ' + port };
    } catch (err: any) {
      return { success: false, message: 'Failed to kill PID ' + procInfo.pid + ': ' + err.message };
    }
  }

  async updateEnvPort(projectPath: string, newPort: number): Promise<{ success: boolean; message: string; oldPort?: number }> {
    if (!projectPath || typeof projectPath !== 'string') {
      return { success: false, message: 'Invalid project path provided' };
    }

    let envPath = path.join(projectPath, '.env');
    if (!fs.existsSync(envPath)) {
      const altLocal = path.join(projectPath, '.env.local');
      const altDev = path.join(projectPath, '.env.development');
      if (fs.existsSync(altLocal)) {
        envPath = altLocal;
      } else if (fs.existsSync(altDev)) {
        envPath = altDev;
      }
    }

    let content = '';
    let oldPort: number | undefined;

    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf8');
    }

    const lines = content.split(/\r?\n/);
    let portFound = false;
    const portKeyRegex = /^(PORT|VITE_PORT|NEXT_PUBLIC_PORT|SERVER_PORT|APP_PORT|API_PORT)\s*=\s*(.*)$/i;

    const updatedLines = lines.map((l) => {
      const trimmed = l.trim();
      const match = trimmed.match(portKeyRegex);
      if (match) {
        const key = match[1];
        const val = match[2].replace(/["']/g, '').trim();
        const oldVal = parseInt(val, 10);
        if (!isNaN(oldVal)) oldPort = oldVal;
        portFound = true;
        return `${key}=${newPort}`;
      }
      return l;
    });

    if (!portFound) {
      if (updatedLines.length === 1 && updatedLines[0] === '') {
        updatedLines[0] = `PORT=${newPort}`;
      } else {
        updatedLines.push(`PORT=${newPort}`);
      }
    }

    try {
      fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf8');
      logger.info(`[PortResolver] Updated port in ${envPath} to ${newPort}`);
      return { success: true, message: `Updated PORT to ${newPort} in ${path.basename(envPath)}`, oldPort };
    } catch (err: any) {
      return { success: false, message: 'Failed to update .env: ' + err.message };
    }
  }
}

export const portResolverService = new PortResolverService();