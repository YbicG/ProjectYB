import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface DockerStatus {
  available: boolean;
  running: boolean;
  version?: string;
  containers?: number;
  images?: number;
}

export interface ComposeService {
  id: string;
  name: string;
  service: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'unknown';
  status: string;
  image: string;
  ports: string;
  publishers: { url: string; targetPort: number; publishedPort: number; protocol: string }[];
}

export interface DatabaseProbeResult {
  success: boolean;
  protocol: string;
  host: string;
  port: number;
  database?: string;
  responseTimeMs: number;
  error?: string;
}

class DockerService {
  /**
   * Check if Docker is installed and running
   */
  async getStatus(): Promise<DockerStatus> {
    try {
      const { stdout } = await execAsync('docker info --format "{{json .}}"', { timeout: 4000 });
      if (stdout) {
        try {
          const info = JSON.parse(stdout);
          return {
            available: true,
            running: true,
            version: info.ServerVersion || 'Docker Engine',
            containers: info.Containers || 0,
            images: info.Images || 0
          };
        } catch {
          return { available: true, running: true };
        }
      }
      return { available: true, running: true };
    } catch (e: any) {
      // Docker command might not exist or daemon might be stopped
      const msg = (e.message || '').toLowerCase();
      if (msg.includes('command not found') || msg.includes('not recognized') || msg.includes('cannot find the file')) {
        return { available: false, running: false };
      }
      return { available: true, running: false };
    }
  }

  /**
   * Check for Docker & Compose files in project
   */
  getProjectDockerFiles(projectPath: string): { hasDockerfile: boolean; hasCompose: boolean; composeFile?: string } {
    const composeNames = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
    let composeFile: string | undefined;

    for (const name of composeNames) {
      const fullPath = path.join(projectPath, name);
      if (fs.existsSync(fullPath)) {
        composeFile = fullPath;
        break;
      }
    }

    const hasDockerfile = fs.existsSync(path.join(projectPath, 'Dockerfile'));

    return {
      hasDockerfile,
      hasCompose: Boolean(composeFile),
      composeFile
    };
  }

  /**
   * List compose services in a project
   */
  async getComposeServices(projectPath: string): Promise<ComposeService[]> {
    const { hasCompose } = this.getProjectDockerFiles(projectPath);
    if (!hasCompose) return [];

    try {
      const { stdout } = await execAsync('docker compose ps --format json', { cwd: projectPath, timeout: 10000 });
      if (!stdout || !stdout.trim()) return [];

      const services: ComposeService[] = [];
      const lines = stdout.trim().split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line);
          const publishers: { url: string; targetPort: number; publishedPort: number; protocol: string }[] = [];

          if (Array.isArray(item.Publishers)) {
            for (const pub of item.Publishers) {
              if (pub.PublishedPort) {
                publishers.push({
                  url: pub.URL || '0.0.0.0',
                  targetPort: pub.TargetPort || 0,
                  publishedPort: pub.PublishedPort || 0,
                  protocol: pub.Protocol || 'tcp'
                });
              }
            }
          }

          let state: ComposeService['state'] = 'unknown';
          const rawState = (item.State || '').toLowerCase();
          if (rawState === 'running') state = 'running';
          else if (rawState === 'exited') state = 'exited';
          else if (rawState === 'paused') state = 'paused';
          else if (rawState === 'restarting') state = 'restarting';
          else if (rawState === 'created') state = 'created';

          services.push({
            id: item.ID || item.Name || Math.random().toString(),
            name: item.Name || item.Service || 'service',
            service: item.Service || item.Name || 'service',
            state,
            status: item.Status || item.State || '',
            image: item.Image || '',
            ports: item.Ports || '',
            publishers
          });
        } catch {}
      }

      return services;
    } catch (err: any) {
      logger.error(`Error listing compose services in ${projectPath}`, err);
      return [];
    }
  }

  /**
   * Start / Up compose services
   */
  async composeUp(projectPath: string, serviceName?: string, build: boolean = false): Promise<{ success: boolean; output: string }> {
    const cmd = `docker compose up -d ${build ? '--build ' : ''}${serviceName || ''}`;
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath, timeout: 120000 });
      return { success: true, output: stdout || stderr || 'Services started' };
    } catch (err: any) {
      return { success: false, output: err.message || err.stderr || 'Failed to start compose services' };
    }
  }

  /**
   * Stop compose services
   */
  async composeStop(projectPath: string, serviceName?: string): Promise<{ success: boolean; output: string }> {
    const cmd = `docker compose stop ${serviceName || ''}`;
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath, timeout: 30000 });
      return { success: true, output: stdout || stderr || 'Services stopped' };
    } catch (err: any) {
      return { success: false, output: err.message || err.stderr || 'Failed to stop compose services' };
    }
  }

  /**
   * Restart compose services
   */
  async composeRestart(projectPath: string, serviceName?: string): Promise<{ success: boolean; output: string }> {
    const cmd = `docker compose restart ${serviceName || ''}`;
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath, timeout: 45000 });
      return { success: true, output: stdout || stderr || 'Services restarted' };
    } catch (err: any) {
      return { success: false, output: err.message || err.stderr || 'Failed to restart compose services' };
    }
  }

  /**
   * Tear down compose stack
   */
  async composeDown(projectPath: string): Promise<{ success: boolean; output: string }> {
    const cmd = 'docker compose down';
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath, timeout: 45000 });
      return { success: true, output: stdout || stderr || 'Compose stack removed' };
    } catch (err: any) {
      return { success: false, output: err.message || err.stderr || 'Failed to tear down compose stack' };
    }
  }

  /**
   * Fetch logs for container/compose service
   */
  async getComposeLogs(projectPath: string, serviceName?: string, tail: number = 100): Promise<string> {
    const cmd = `docker compose logs --tail=${tail} --no-color ${serviceName || ''}`;
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath, timeout: 15000 });
      return stdout || stderr || 'No logs found';
    } catch (err: any) {
      return err.stderr || err.message || 'Failed to fetch logs';
    }
  }

  /**
   * Test database socket connection (PostgreSQL, MySQL, Redis, MongoDB, HTTP)
   */
  async probeDatabaseConnection(connectionUrl: string): Promise<DatabaseProbeResult> {
    const start = Date.now();
    try {
      let protocol = 'tcp';
      let host = '127.0.0.1';
      let port = 5432;
      let database = '';

      // Parse connection URI (e.g. postgres://user:pass@localhost:5432/mydb or redis://127.0.0.1:6379)
      const uriMatch = connectionUrl.match(/^([a-zA-Z0-9_\-]+):\/\/(?:[^:@/]+(?::[^@/]*)?@)?([^:/]+)(?::([0-9]+))?(?:\/([^?#]+))?/);
      if (uriMatch) {
        protocol = uriMatch[1].toLowerCase();
        host = uriMatch[2];
        if (uriMatch[3]) port = parseInt(uriMatch[3], 10);
        else {
          // Default ports by protocol
          if (protocol.includes('postgres')) port = 5432;
          else if (protocol.includes('mysql') || protocol.includes('mariadb')) port = 3306;
          else if (protocol.includes('redis')) port = 6379;
          else if (protocol.includes('mongo')) port = 27017;
          else if (protocol.includes('rabbit')) port = 5672;
          else if (protocol.includes('http')) port = 80;
        }
        database = uriMatch[4] || '';
      } else {
        // Fallback: check if host:port
        const simpleMatch = connectionUrl.match(/^([^:]+):([0-9]+)$/);
        if (simpleMatch) {
          host = simpleMatch[1];
          port = parseInt(simpleMatch[2], 10);
        }
      }

      if (host === 'localhost') host = '127.0.0.1';

      return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(3000);

        socket.on('connect', () => {
          const responseTimeMs = Date.now() - start;
          socket.destroy();
          resolve({
            success: true,
            protocol,
            host,
            port,
            database,
            responseTimeMs
          });
        });

        socket.on('timeout', () => {
          socket.destroy();
          resolve({
            success: false,
            protocol,
            host,
            port,
            database,
            responseTimeMs: Date.now() - start,
            error: 'Connection timed out (3000ms)'
          });
        });

        socket.on('error', (err: any) => {
          socket.destroy();
          resolve({
            success: false,
            protocol,
            host,
            port,
            database,
            responseTimeMs: Date.now() - start,
            error: err.message || 'Connection refused'
          });
        });

        socket.connect(port, host);
      });
    } catch (e: any) {
      return {
        success: false,
        protocol: 'unknown',
        host: 'localhost',
        port: 0,
        responseTimeMs: Date.now() - start,
        error: e.message || 'Invalid connection string'
      };
    }
  }
}

export const dockerService = new DockerService();
