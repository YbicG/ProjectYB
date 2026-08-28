import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as si from 'systeminformation';

import { logStreamService } from './logstream.service';
import { cloudflareService } from './cloudflare.service';
import { serviceKillerService } from './service-killer.service';
import { terminalService } from './terminal.service';
import { notesService } from './notes.service';
import { projectScanner } from './project-scanner';
import { gitService } from './git.service';
import { cronService } from './cron.service';
import { portService } from './port.service';
import { workspaceService } from './workspace.service';
import { getStore } from '../ipc/store.ipc';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface MobileCredentials {
  username: string;
  passwordHash: string;
  rawPasswordDisplay?: string;
  updatedAt: string;
}

export interface MobileCompanionStatus {
  running: boolean;
  port: number;
  localUrl: string;
  publicUrl?: string;
  tunnelType?: 'quick' | 'named';
  tunnelId?: string;
  username: string;
  activeSessions: number;
}

export interface MobileRunningService {
  id: string;
  projectId: string;
  projectName: string;
  scriptName: string;
  command: string;
  cwd: string;
  terminalId: string;
  pid?: number;
  port?: number;
  status: 'running' | 'stopped' | 'error';
  startedAt: number;
  tunnelUrl?: string;
}

export class MobileCompanionService extends EventEmitter {
  private server: http.Server | null = null;
  private port = 4848;
  private activeTunnelId: string | null = null;
  private activeSessions: Set<string> = new Set();
  private runningServices: Map<string, MobileRunningService> = new Map();
  private credentials: MobileCredentials = {
    username: 'admin',
    passwordHash: '',
    rawPasswordDisplay: 'projectyb123',
    updatedAt: new Date().toISOString()
  };

  constructor() {
    super();
    this.initCredentials();
  }

  private async initCredentials() {
    try {
      const store = await getStore();
      const savedCreds = store.get('mobile:credentials') as MobileCredentials | undefined;
      if (savedCreds && savedCreds.passwordHash) {
        this.credentials = savedCreds;
      } else {
        const defaultPass = 'projectyb123';
        this.credentials = {
          username: 'admin',
          passwordHash: this.hashPassword(defaultPass),
          rawPasswordDisplay: defaultPass,
          updatedAt: new Date().toISOString()
        };
        store.set('mobile:credentials', this.credentials);
      }
    } catch {
      this.credentials.passwordHash = this.hashPassword('projectyb123');
    }
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async setCredentials(username: string, rawPass: string): Promise<MobileCredentials> {
    const creds: MobileCredentials = {
      username: username.trim() || 'admin',
      passwordHash: this.hashPassword(rawPass),
      rawPasswordDisplay: rawPass,
      updatedAt: new Date().toISOString()
    };
    this.credentials = creds;
    this.activeSessions.clear();

    try {
      const store = await getStore();
      store.set('mobile:credentials', creds);
    } catch {}

    this.emit('credentials:updated', creds);
    return creds;
  }

  getCredentials(): { username: string; rawPasswordDisplay?: string } {
    return {
      username: this.credentials.username,
      rawPasswordDisplay: this.credentials.rawPasswordDisplay
    };
  }

  getStatus(): MobileCompanionStatus {
    const activeTunnel = this.activeTunnelId
      ? cloudflareService.listActiveTunnels().find((t) => t.id === this.activeTunnelId)
      : undefined;

    return {
      running: Boolean(this.server),
      port: this.port,
      localUrl: 'http://localhost:' + this.port,
      publicUrl: activeTunnel?.publicUrl,
      tunnelType: activeTunnel?.type,
      tunnelId: activeTunnel?.id,
      username: this.credentials.username,
      activeSessions: this.activeSessions.size
    };
  }

  async start(options?: {
    tunnelType?: 'quick' | 'named';
    namedToken?: string;
    customHostname?: string;
    port?: number;
  }): Promise<{ success: boolean; status: MobileCompanionStatus; error?: string }> {
    if (options?.port) {
      this.port = options.port;
    }

    if (this.server) {
      await this.stop();
    }

    return new Promise((resolve) => {
      try {
        this.server = http.createServer((req, res) => {
          this.handleHttpRequest(req, res);
        });

        this.server.listen(this.port, '0.0.0.0', async () => {
          logger.info('[MobileCompanion] Server listening on port ' + this.port);

          const tunnelType = options?.tunnelType || 'quick';
          let publicUrl: string | undefined;

          try {
            if (tunnelType === 'named' && options?.namedToken) {
              const tunnel = await cloudflareService.startNamedTunnel({
                name: 'ProjectYB-Mobile-Remote',
                tunnelToken: options.namedToken,
                localPort: this.port,
                customHostname: options.customHostname
              });
              this.activeTunnelId = tunnel.id;
              publicUrl = options.customHostname ? 'https://' + options.customHostname : tunnel.publicUrl;
            } else {
              const tunnel = await cloudflareService.startQuickTunnel({
                localPort: this.port,
                name: 'ProjectYB Mobile Remote'
              });
              this.activeTunnelId = tunnel.id;
              publicUrl = tunnel.publicUrl;
            }
          } catch (tunnelErr: any) {
            logger.warn('[MobileCompanion] Tunnel start warning: ' + tunnelErr.message);
          }

          const status = this.getStatus();
          if (publicUrl) status.publicUrl = publicUrl;

          this.emit('started', status);
          resolve({ success: true, status });
        });

        this.server.on('error', (err: any) => {
          logger.error('[MobileCompanion] Server error:', err);
          resolve({ success: false, status: this.getStatus(), error: err.message });
        });
      } catch (err: any) {
        resolve({ success: false, status: this.getStatus(), error: err.message });
      }
    });
  }

  async stop(): Promise<boolean> {
    if (this.activeTunnelId) {
      try {
        await cloudflareService.stopTunnel(this.activeTunnelId);
      } catch {}
      this.activeTunnelId = null;
    }

    if (this.server) {
      return new Promise((resolve) => {
        this.server?.close(() => {
          this.server = null;
          this.activeSessions.clear();
          logger.info('[MobileCompanion] Server stopped');
          this.emit('stopped');
          resolve(true);
        });
      });
    }
    return true;
  }

  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = url.parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';

    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(this.getMobilePwaHtml());
      return;
    }

    if (pathname === '/manifest.json') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(this.getPwaManifest());
      return;
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      this.readJsonBody(req, (body) => {
        const { username, password } = body;
        const passHash = this.hashPassword(password || '');

        if (username === this.credentials.username && passHash === this.credentials.passwordHash) {
          const sessionToken = crypto.randomBytes(24).toString('hex');
          this.activeSessions.add(sessionToken);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, token: sessionToken, username: this.credentials.username }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid username or password' }));
        }
      });
      return;
    }

    if (pathname.startsWith('/api/')) {
      const authHeader = req.headers['authorization'];
      const token = authHeader?.replace(/^Bearer\s+/i, '');

      if (!token || !this.activeSessions.has(token)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized session' }));
        return;
      }

      this.handleAuthenticatedApi(pathname, parsedUrl.query, req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  private async handleAuthenticatedApi(
    pathname: string,
    query: Record<string, any>,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ) {
    // ── 1. Telemetry & Overview ──
    if (pathname === '/api/status' && req.method === 'GET') {
      try {
        const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);
        const terminals = terminalService.getAllTerminals();
        const activeServices = terminalService.getAllRunningServices();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            telemetry: {
              cpuUsage: Math.round(cpu.currentLoad || 0),
              memoryUsage: Math.round(((mem.used || 0) / (mem.total || 1)) * 100),
              memoryUsedMb: Math.round((mem.used || 0) / (1024 * 1024)),
              memoryTotalMb: Math.round((mem.total || 0) / (1024 * 1024)),
              terminalsCount: terminals.length,
              runningServicesCount: activeServices.length
            }
          })
        );
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // ── 2. Workspaces & Stacks ──
    if (pathname === '/api/workspaces' && req.method === 'GET') {
      try {
        const [workspaces, activeWorkspaceId] = await Promise.all([
          workspaceService.getWorkspaces(),
          workspaceService.getActiveWorkspaceId()
        ]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, workspaces, activeWorkspaceId }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message, workspaces: [] }));
      }
      return;
    }

    if (pathname === '/api/workspaces/set-active' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { id } = body;
        await workspaceService.setActiveWorkspaceId(id || null);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, activeWorkspaceId: id || null }));
      });
      return;
    }

    if (pathname === '/api/workspaces/boot' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { workspaceId } = body;
        const workspaces = await workspaceService.getWorkspaces();
        const ws = workspaces.find((w) => w.id === workspaceId);

        if (!ws || !ws.services || ws.services.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Workspace or services not found' }));
          return;
        }

        try {
          for (let i = 0; i < ws.services.length; i++) {
            const item = ws.services[i];
            const serviceId = 'ws_' + ws.id + '_' + item.id + '_' + Date.now();
            const terminalId = 'term_' + serviceId;

            const serviceItem: MobileRunningService = {
              id: serviceId,
              projectId: item.projectId,
              projectName: ws.name,
              scriptName: item.name,
              command: item.command,
              cwd: item.cwd || item.projectPath || process.cwd(),
              terminalId,
              port: item.waitPort,
              status: 'running',
              startedAt: Date.now()
            };

            terminalService.spawn(
              terminalId,
              serviceItem.cwd,
              120,
              30,
              undefined,
              () => {},
              (code) => {
                const current = this.runningServices.get(serviceId);
                if (current) {
                  current.status = code === 0 ? 'stopped' : 'error';
                }
              },
              {
                name: ws.name + ' • ' + item.name,
                projectId: item.projectId,
                projectName: ws.name,
                serviceId,
                isService: true,
                command: item.command,
                port: item.waitPort
              }
            );

            setTimeout(() => {
              terminalService.write(terminalId, item.command + '\r\n');
            }, 300);

            this.runningServices.set(serviceId, serviceItem);

            if (item.delayMs && item.delayMs > 0 && i < ws.services.length - 1) {
              await new Promise((r) => setTimeout(r, item.delayMs));
            }
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Workspace stack booted' }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // ── 3. Projects List & Discovery ──
    if (pathname === '/api/projects' && req.method === 'GET') {
      try {
        const store = await getStore();
        const scanPaths = store.get('scanPaths', ['D:\\Code']) as string[];
        const projects = await projectScanner.scanDirectory(scanPaths, 4, 'all');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, projects }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message, projects: [] }));
      }
      return;
    }

    // ── 4. Running Services & Process Management (Unified Desktop + Mobile Sync) ──
    if (pathname === '/api/services/running' && req.method === 'GET') {
      const allActive = terminalService.getAllRunningServices();
      const mergedMap = new Map<string, MobileRunningService>();

      for (const s of allActive) {
        const existing = this.runningServices.get(s.id) || this.runningServices.get(s.terminalId);
        mergedMap.set(s.terminalId, {
          id: s.id,
          projectId: s.projectId,
          projectName: s.projectName,
          scriptName: s.scriptName,
          command: s.command,
          cwd: s.cwd,
          terminalId: s.terminalId,
          pid: s.pid,
          port: s.port,
          status: 'running',
          startedAt: s.startedAt,
          tunnelUrl: existing?.tunnelUrl
        });
      }

      for (const [id, s] of this.runningServices.entries()) {
        if (s.status === 'running' && !mergedMap.has(s.terminalId)) {
          if (terminalService.getPid(s.terminalId)) {
            mergedMap.set(s.terminalId, s);
          }
        }
      }

      const services = Array.from(mergedMap.values());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, services }));
      return;
    }

    if (pathname === '/api/services/start' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { projectId, projectName, scriptName, command, cwd, port } = body;
        if (!command || !cwd) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing command or cwd' }));
          return;
        }

        try {
          const serviceId = 'svc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          const terminalId = 'term_' + serviceId;

          const serviceItem: MobileRunningService = {
            id: serviceId,
            projectId: projectId || 'custom',
            projectName: projectName || 'Service',
            scriptName: scriptName || command,
            command,
            cwd,
            terminalId,
            port: port ? parseInt(port, 10) : undefined,
            status: 'running',
            startedAt: Date.now()
          };

          terminalService.spawn(
            terminalId,
            cwd,
            120,
            30,
            undefined,
            () => {},
            (code) => {
              const current = this.runningServices.get(serviceId);
              if (current) {
                current.status = code === 0 ? 'stopped' : 'error';
              }
            }
          );

          setTimeout(() => {
            terminalService.write(terminalId, command + '\r\n');
          }, 300);

          this.runningServices.set(serviceId, serviceItem);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, service: serviceItem }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (pathname === '/api/services/stop' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { serviceId, terminalId } = body;
        if (terminalId) {
          try {
            terminalService.kill(terminalId);
          } catch {}
        }
        if (serviceId && this.runningServices.has(serviceId)) {
          const item = this.runningServices.get(serviceId)!;
          item.status = 'stopped';
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
      return;
    }

    if (pathname === '/api/services/restart' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { serviceId } = body;
        const item = this.runningServices.get(serviceId);
        if (!item) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Service not found' }));
          return;
        }

        try {
          terminalService.kill(item.terminalId);
        } catch {}

        const newTerminalId = 'term_svc_' + Date.now();
        item.terminalId = newTerminalId;
        item.status = 'running';
        item.startedAt = Date.now();

        terminalService.spawn(
          newTerminalId,
          item.cwd,
          120,
          30,
          undefined,
          () => {},
          (code) => {
            item.status = code === 0 ? 'stopped' : 'error';
          }
        );

        setTimeout(() => {
          terminalService.write(newTerminalId, item.command + '\r\n');
        }, 300);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, service: item }));
      });
      return;
    }

    if (pathname === '/api/services/tunnel' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { serviceId, port, name } = body;
        if (!port) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing port' }));
          return;
        }

        try {
          const tunnel = await cloudflareService.startQuickTunnel({
            localPort: parseInt(port, 10),
            name: name || 'Mobile Service'
          });

          if (serviceId && this.runningServices.has(serviceId)) {
            const item = this.runningServices.get(serviceId)!;
            item.tunnelUrl = tunnel.publicUrl;
          }

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, publicUrl: tunnel.publicUrl, tunnelId: tunnel.id }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // ── 5. Mobile Command Runner / Terminal ──
    if (pathname === '/api/terminal/exec' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { command, cwd } = body;
        if (!command) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Missing command' }));
          return;
        }

        const startT = Date.now();
        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: cwd || process.cwd(),
            timeout: 45000,
            maxBuffer: 1024 * 1024 * 5
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: true,
              exitCode: 0,
              stdout: stdout || '',
              stderr: stderr || '',
              durationMs: Date.now() - startT
            })
          );
        } catch (err: any) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              exitCode: err.code || 1,
              stdout: err.stdout || '',
              stderr: err.stderr || err.message,
              durationMs: Date.now() - startT
            })
          );
        }
      });
      return;
    }

    if (pathname === '/api/terminal/logs' && req.method === 'GET') {
      const terminalId = query.terminalId;
      if (!terminalId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing terminalId' }));
        return;
      }

      const buffer = terminalService.getBuffer(terminalId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, buffer }));
      return;
    }

    // ── 6. Git Status & 1-Click Operations ──
    if (pathname === '/api/git/status' && req.method === 'GET') {
      const projectPath = query.projectPath;
      if (!projectPath) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing projectPath' }));
        return;
      }

      try {
        const isRepo = await gitService.isGitRepo(projectPath);
        if (!isRepo) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, isGitRepo: false }));
          return;
        }

        const status = await gitService.getStatus(projectPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, isGitRepo: true, status }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    if (pathname === '/api/git/pull' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { projectPath } = body;
        try {
          const result = await gitService.pull(projectPath);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (pathname === '/api/git/commit-push' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { projectPath, message } = body;
        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Commit message required' }));
          return;
        }

        try {
          await gitService.commit(projectPath, message, true);
          await gitService.push(projectPath);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    // ── 7. Cron & Scheduled Tasks ──
    if (pathname === '/api/cron/jobs' && req.method === 'GET') {
      const jobs = cronService.getJobs();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, jobs }));
      return;
    }

    if (pathname === '/api/cron/run-now' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { id } = body;
        try {
          const result = await cronService.executeJob(id);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, result }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (pathname === '/api/cron/toggle' && req.method === 'POST') {
      this.readJsonBody(req, (body) => {
        const { id, enabled } = body;
        const job = cronService.toggleJob(id, enabled);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: Boolean(job), job }));
      });
      return;
    }

    // ── 8. Active Ports & Tunnels ──
    if (pathname === '/api/ports' && req.method === 'GET') {
      try {
        const ports = await portService.getListeningPorts();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, ports }));
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message, ports: [] }));
      }
      return;
    }

    if (pathname === '/api/ports/kill' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { port, pid } = body;
        try {
          if (pid) {
            await portService.killProcess(pid);
          } else if (port) {
            await serviceKillerService.forceKill({ port });
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }

    if (pathname === '/api/tunnels' && req.method === 'GET') {
      const tunnels = cloudflareService.listActiveTunnels();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, tunnels }));
      return;
    }

    // ── 9. Logs & Scratchpad ──
    if (pathname === '/api/logs' && req.method === 'GET') {
      const logs = logStreamService.getRecentLogs(100);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, logs }));
      return;
    }

    if (pathname === '/api/notes') {
      if (req.method === 'GET') {
        const note = await notesService.getGlobalScratchpad();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, content: note }));
      } else if (req.method === 'POST') {
        this.readJsonBody(req, async (body) => {
          await notesService.setGlobalScratchpad(body.content || '');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });
      }
      return;
    }

    if (pathname === '/api/services/force-kill' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { pid, port, terminalId } = body;
        const result = await serviceKillerService.forceKill({ pid, port, terminalId });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      return;
    }

    if (pathname === '/api/emergency-stop' && req.method === 'POST') {
      terminalService.killAll();
      this.runningServices.forEach((s) => {
        s.status = 'stopped';
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'All terminals and processes terminated' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  }

  private readJsonBody(req: http.IncomingMessage, cb: (data: any) => void) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        cb(body ? JSON.parse(body) : {});
      } catch {
        cb({});
      }
    });
  }

  private getPwaManifest(): string {
    return JSON.stringify({
      name: 'ProjectYB Remote',
      short_name: 'ProjectYB',
      description: 'Mobile Companion for ProjectYB Desktop',
      start_url: '/',
      display: 'standalone',
      background_color: '#09090b',
      theme_color: '#09090b',
      icons: [
        {
          src: 'https://raw.githubusercontent.com/YbicG/ProjectYB/main/src/renderer/src/assets/logo.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    });
  }

  /**
   * Generates the standalone, complete, touch-friendly Mobile Developer PWA interface
   */
  private getMobilePwaHtml(): string {
    return "<!DOCTYPE html>\n<html lang=\"en\" class=\"dark\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover\">\n  <meta name=\"theme-color\" content=\"#09090b\">\n  <meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n  <meta name=\"apple-mobile-web-app-status-bar-style\" content=\"black-translucent\">\n  <title>ProjectYB Developer Remote</title>\n  <link rel=\"manifest\" href=\"/manifest.json\">\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n  <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n  <link href=\"https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap\" rel=\"stylesheet\">\n  <script src=\"https://cdn.tailwindcss.com\"></script>\n  <script>\n    tailwind.config = {\n      darkMode: 'class',\n      theme: {\n        extend: {\n          fontFamily: {\n            sans: ['\"Plus Jakarta Sans\"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],\n            mono: ['\"JetBrains Mono\"', 'ui-monospace', 'monospace']\n          },\n          colors: {\n            brand: '#8b5cf6',\n            zinc: {\n              850: '#1f1f23',\n              925: '#121215',\n              950: '#09090b'\n            }\n          }\n        }\n      }\n    }\n  </script>\n  <style>\n    :root {\n      --sat: env(safe-area-inset-top, 0px);\n      --sab: env(safe-area-inset-bottom, 0px);\n      --sal: env(safe-area-inset-left, 0px);\n      --sar: env(safe-area-inset-right, 0px);\n    }\n    body {\n      background-color: #09090b;\n      color: #f4f4f5;\n      font-family: \"Plus Jakarta Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n      -webkit-tap-highlight-color: transparent;\n      padding-top: var(--sat);\n      padding-left: var(--sal);\n      padding-right: var(--sar);\n      box-sizing: border-box;\n    }\n    header.mobile-header {\n      padding-top: calc(0.5rem + var(--sat));\n      height: calc(3.6rem + var(--sat));\n    }\n    nav.mobile-nav {\n      padding-bottom: calc(0.5rem + var(--sab));\n      height: calc(4.25rem + var(--sab));\n    }\n    main.mobile-main {\n      padding-bottom: calc(5.5rem + var(--sab));\n    }\n    .modal-sheet {\n      padding-bottom: calc(1.5rem + var(--sab));\n      padding-top: calc(1rem + var(--sat));\n    }\n    .no-scrollbar::-webkit-scrollbar { display: none; }\n    .tab-content { display: none; }\n    .tab-content.active { display: block; }\n    .glow-violet { box-shadow: 0 0 25px -5px rgba(139, 92, 246, 0.25); }\n    .glow-emerald { box-shadow: 0 0 25px -5px rgba(16, 185, 129, 0.25); }\n    .glow-cyan { box-shadow: 0 0 25px -5px rgba(6, 182, 212, 0.25); }\n  </style>\n</head>\n<body class=\"flex flex-col h-screen overflow-hidden select-none bg-zinc-950 text-zinc-100 antialiased\">\n  \n  <!-- Top HUD Header with Safe Area Top Inset -->\n  <header class=\"mobile-header border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl flex items-center justify-between px-3.5 shrink-0 z-30 fixed top-0 inset-x-0\">\n    <div class=\"flex items-center gap-2.5 min-w-0\">\n      <div class=\"w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-violet-400 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-violet-600/30 shrink-0\">\n        YB\n      </div>\n      <div class=\"flex flex-col min-w-0\">\n        <div class=\"flex items-center gap-1.5 leading-none\">\n          <span class=\"font-extrabold text-xs tracking-tight text-zinc-100\">ProjectYB</span>\n          <span class=\"text-[9px] px-1.5 py-0.2 rounded-full bg-violet-950/80 border border-violet-500/30 text-violet-300 font-mono font-bold\">HUD</span>\n        </div>\n        <!-- Workspace Dropdown Chip -->\n        <div class=\"flex items-center gap-1 mt-0.5\">\n          <select id=\"headerWorkspaceSelect\" onchange=\"changeMobileWorkspace(this.value)\" class=\"bg-transparent text-[10px] text-zinc-400 font-mono font-medium focus:outline-none cursor-pointer truncate max-w-[130px]\">\n            <option value=\"\">🌐 All Projects</option>\n          </select>\n        </div>\n      </div>\n    </div>\n\n    <!-- Header Actions -->\n    <div class=\"flex items-center gap-1.5 shrink-0\">\n      <!-- 1-Tap Workspace Boot Button -->\n      <button id=\"wsBootBtn\" onclick=\"toggleCurrentWorkspaceStack()\" class=\"px-2 py-1.5 bg-violet-600/20 border border-violet-500/40 text-violet-300 rounded-xl text-[10px] font-bold active:scale-95 transition-all hidden items-center gap-1\">\n        <span>▶</span> <span>Stack</span>\n      </button>\n\n      <button onclick=\"triggerEmergencyStop()\" class=\"px-2.5 py-1.5 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-[10px] font-extrabold active:scale-95 transition-all flex items-center gap-1\">\n        <span>🛑</span> <span>STOP</span>\n      </button>\n      <button onclick=\"refreshCurrentTab()\" class=\"p-2 bg-zinc-900/80 border border-zinc-800 text-zinc-300 rounded-xl text-xs hover:text-white active:scale-95 transition-all\">\n        🔄\n      </button>\n      <button onclick=\"logout()\" class=\"p-2 bg-zinc-900/80 border border-zinc-800 text-zinc-400 rounded-xl text-xs hover:text-rose-400 active:scale-95 transition-all\">\n        🚪\n      </button>\n    </div>\n  </header>\n\n  <!-- Login View Modal -->\n  <div id=\"loginView\" class=\"fixed inset-0 bg-zinc-950 z-50 flex flex-col justify-center px-6 modal-sheet\">\n    <div class=\"max-w-sm w-full mx-auto space-y-6\">\n      <div class=\"text-center space-y-2\">\n        <div class=\"w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 mx-auto flex items-center justify-center shadow-2xl shadow-violet-500/30\">\n          <span class=\"text-3xl font-black text-white\">YB</span>\n        </div>\n        <h1 class=\"text-xl font-black tracking-tight text-zinc-100\">ProjectYB Developer Remote</h1>\n        <p class=\"text-xs text-zinc-400\">Authenticate with desktop credentials to manage workspaces, services, & git</p>\n      </div>\n\n      <form onsubmit=\"handleLogin(event)\" class=\"space-y-4 bg-zinc-900/70 p-6 rounded-3xl border border-zinc-800/90 shadow-2xl backdrop-blur-xl\">\n        <div class=\"space-y-1.5\">\n          <label class=\"text-xs font-semibold text-zinc-400\">Username</label>\n          <input id=\"usernameInput\" type=\"text\" value=\"admin\" required class=\"w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 font-medium\">\n        </div>\n        <div class=\"space-y-1.5\">\n          <label class=\"text-xs font-semibold text-zinc-400\">Password</label>\n          <input id=\"passwordInput\" type=\"password\" placeholder=\"Desktop Password\" required class=\"w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-3 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 font-medium\">\n        </div>\n        <button type=\"submit\" id=\"loginBtn\" class=\"w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold rounded-2xl text-sm shadow-xl shadow-violet-600/30 active:scale-95 transition-all text-white\">\n          Unlock Remote HUD\n        </button>\n        <div id=\"loginError\" class=\"text-xs text-rose-400 text-center font-medium hidden\"></div>\n      </form>\n    </div>\n  </div>\n\n  <!-- Main Tabs Body with Top & Bottom Safe-Area Inset Spacing -->\n  <main class=\"flex-1 overflow-y-auto p-3.5 pt-16 mobile-main space-y-4 no-scrollbar\">\n    \n    <!-- TAB 1: DASHBOARD / TELEMETRY -->\n    <section id=\"tab-dashboard\" class=\"tab-content active space-y-4\">\n      \n      <!-- Live Telemetry Gauges (Bento Style) -->\n      <div class=\"grid grid-cols-2 gap-2.5\">\n        <div class=\"bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2 shadow-sm backdrop-blur-md\">\n          <div class=\"flex items-center justify-between text-[11px] text-zinc-400\">\n            <span class=\"font-medium\">CPU Load</span>\n            <span id=\"cpuText\" class=\"font-mono font-bold text-violet-400\">0%</span>\n          </div>\n          <div class=\"w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden\">\n            <div id=\"cpuBar\" class=\"h-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300\" style=\"width: 0%\"></div>\n          </div>\n        </div>\n\n        <div class=\"bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2 shadow-sm backdrop-blur-md\">\n          <div class=\"flex items-center justify-between text-[11px] text-zinc-400\">\n            <span class=\"font-medium\">Memory Usage</span>\n            <span id=\"memText\" class=\"font-mono font-bold text-cyan-400\">0%</span>\n          </div>\n          <div class=\"w-full h-1.5 bg-zinc-800/80 rounded-full overflow-hidden\">\n            <div id=\"memBar\" class=\"h-full bg-gradient-to-r from-cyan-600 to-teal-400 transition-all duration-300\" style=\"width: 0%\"></div>\n          </div>\n        </div>\n      </div>\n\n      <!-- Quick Metrics Counters -->\n      <div class=\"grid grid-cols-3 gap-2 text-center font-mono\">\n        <div class=\"bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-2xl shadow-sm\">\n          <div id=\"statRunningServices\" class=\"text-lg font-black text-emerald-400\">0</div>\n          <div class=\"text-[9px] text-zinc-500 font-sans font-semibold uppercase tracking-wider\">Services</div>\n        </div>\n        <div class=\"bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-2xl shadow-sm\">\n          <div id=\"statActiveTerminals\" class=\"text-lg font-black text-violet-400\">0</div>\n          <div class=\"text-[9px] text-zinc-500 font-sans font-semibold uppercase tracking-wider\">Terminals</div>\n        </div>\n        <div class=\"bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-2xl shadow-sm\">\n          <div id=\"statActivePorts\" class=\"text-lg font-black text-cyan-400\">0</div>\n          <div class=\"text-[9px] text-zinc-500 font-sans font-semibold uppercase tracking-wider\">Ports</div>\n        </div>\n      </div>\n\n      <!-- Active Workspace Overview Card -->\n      <div id=\"workspaceHeroCard\" class=\"p-3.5 bg-gradient-to-r from-violet-950/40 via-zinc-900/60 to-zinc-900/60 border border-violet-500/30 rounded-2xl space-y-2 shadow-sm\">\n        <div class=\"flex items-center justify-between\">\n          <div class=\"flex items-center gap-2\">\n            <span class=\"w-2.5 h-2.5 rounded-full bg-violet-400\"></span>\n            <h3 id=\"wsHeroTitle\" class=\"text-xs font-bold text-zinc-100\">All Projects</h3>\n          </div>\n          <span id=\"wsHeroBadge\" class=\"text-[9px] px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 font-mono border border-violet-500/30\">\n            Global\n          </span>\n        </div>\n        <p id=\"wsHeroDesc\" class=\"text-[11px] text-zinc-400\">Displaying all scanned repositories across your computer.</p>\n      </div>\n\n      <!-- Live LogStream Feed -->\n      <div class=\"bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2 shadow-sm\">\n        <div class=\"flex items-center justify-between\">\n          <h2 class=\"text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5\">\n            <span class=\"w-2 h-2 rounded-full bg-violet-500 animate-pulse\"></span>\n            Live LogStream\n          </h2>\n          <button onclick=\"loadLogs()\" class=\"text-[10px] text-violet-400 font-mono font-semibold\">Refresh</button>\n        </div>\n        <div id=\"logsContainer\" class=\"h-44 bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 font-mono text-[10px] text-zinc-300 overflow-y-auto space-y-1 no-scrollbar leading-relaxed\">\n          <div class=\"text-zinc-600\">Connecting to LogStream...</div>\n        </div>\n      </div>\n    </section>\n\n    <!-- TAB 2: PROJECTS & SERVICES -->\n    <section id=\"tab-services\" class=\"tab-content space-y-4\">\n      \n      <!-- Active Running Services -->\n      <div class=\"space-y-2\">\n        <div class=\"flex items-center justify-between\">\n          <h2 class=\"text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5\">\n            <span class=\"w-2 h-2 rounded-full bg-emerald-500 animate-pulse\"></span>\n            Running Services (<span id=\"runningCount\">0</span>)\n          </h2>\n          <button onclick=\"loadRunningServices()\" class=\"text-[10px] text-violet-400 font-mono font-semibold\">Refresh</button>\n        </div>\n        <div id=\"runningServicesList\" class=\"space-y-2\">\n          <div class=\"text-center py-4 text-xs text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-850\">No background services currently active.</div>\n        </div>\n      </div>\n\n      <!-- Scanned Projects & Scripts -->\n      <div class=\"space-y-2 pt-2 border-t border-zinc-850\">\n        <div class=\"flex items-center justify-between gap-2\">\n          <h2 class=\"text-xs font-bold uppercase tracking-wider text-zinc-400\">Projects & Scripts</h2>\n          <input id=\"projectSearchInput\" oninput=\"filterProjects()\" type=\"text\" placeholder=\"Search...\" class=\"bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 w-32 font-mono\">\n        </div>\n        <div id=\"projectsList\" class=\"space-y-2.5\">\n          <div class=\"text-center py-6 text-xs text-zinc-500\">Loading projects from PC...</div>\n        </div>\n      </div>\n    </section>\n\n    <!-- TAB 3: COMMAND RUNNER & TERMINAL -->\n    <section id=\"tab-terminal\" class=\"tab-content space-y-3.5\">\n      <div class=\"bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 space-y-3 shadow-sm\">\n        <div class=\"text-xs font-bold uppercase tracking-wider text-zinc-400\">Interactive Console Runner</div>\n        \n        <!-- Project Selector -->\n        <div class=\"space-y-1\">\n          <label class=\"text-[11px] text-zinc-400 font-semibold\">Working Directory</label>\n          <select id=\"terminalProjectSelect\" class=\"w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 font-mono\">\n            <option value=\"\">Default Root Directory</option>\n          </select>\n        </div>\n\n        <!-- Quick Command Preset Chips -->\n        <div class=\"flex flex-wrap gap-1.5 pt-1\">\n          <button onclick=\"setExecCommand('git status')\" class=\"px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg font-mono active:bg-zinc-800\">git status</button>\n          <button onclick=\"setExecCommand('git pull')\" class=\"px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg font-mono active:bg-zinc-800\">git pull</button>\n          <button onclick=\"setExecCommand('npm install')\" class=\"px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg font-mono active:bg-zinc-800\">npm i</button>\n          <button onclick=\"setExecCommand('npm test')\" class=\"px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg font-mono active:bg-zinc-800\">npm test</button>\n          <button onclick=\"setExecCommand('docker ps')\" class=\"px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg font-mono active:bg-zinc-800\">docker ps</button>\n          <button onclick=\"setExecCommand('netstat -ano')\" class=\"px-2.5 py-1 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg font-mono active:bg-zinc-800\">netstat</button>\n        </div>\n\n        <!-- Input Bar -->\n        <div class=\"flex gap-2\">\n          <input id=\"execCommandInput\" type=\"text\" placeholder=\"Type shell command...\" class=\"flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-violet-500\">\n          <button onclick=\"executeMobileCommand()\" id=\"execBtn\" class=\"px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all\">\n            Run\n          </button>\n        </div>\n      </div>\n\n      <!-- Output Screen -->\n      <div class=\"bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2 shadow-sm\">\n        <div class=\"flex items-center justify-between text-xs text-zinc-400\">\n          <span class=\"font-bold uppercase tracking-wider\">Execution Output</span>\n          <div class=\"flex items-center gap-2\">\n            <span id=\"execMeta\" class=\"font-mono text-[10px] text-zinc-500\"></span>\n            <button onclick=\"clearExecOutput()\" class=\"text-[10px] text-zinc-400 hover:text-white font-mono\">Clear</button>\n          </div>\n        </div>\n        <pre id=\"execOutput\" class=\"h-64 bg-zinc-950 border border-zinc-850 rounded-xl p-3 font-mono text-[10px] text-zinc-300 overflow-y-auto whitespace-pre-wrap leading-relaxed no-scrollbar select-text\">Ready for command execution...</pre>\n      </div>\n    </section>\n\n    <!-- TAB 4: GIT HUB -->\n    <section id=\"tab-git\" class=\"tab-content space-y-3.5\">\n      <div class=\"bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 space-y-3 shadow-sm\">\n        <div class=\"text-xs font-bold uppercase tracking-wider text-zinc-400\">Git Operations</div>\n        \n        <!-- Repo Select -->\n        <select id=\"gitProjectSelect\" onchange=\"loadGitStatusForProject()\" class=\"w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 font-mono\">\n          <option value=\"\">Select Project Repository...</option>\n        </select>\n\n        <!-- Git Status Card -->\n        <div id=\"gitStatusDisplay\" class=\"p-3 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2 font-mono text-xs hidden\">\n          <div class=\"flex items-center justify-between\">\n            <span class=\"text-zinc-400\">Branch: <strong id=\"gitBranchText\" class=\"text-violet-400\">main</strong></span>\n            <span id=\"gitCleanBadge\" class=\"text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30\">CLEAN</span>\n          </div>\n          <div class=\"text-[11px] text-zinc-400\">\n            Modified: <span id=\"gitModifiedCount\" class=\"text-amber-400 font-bold\">0</span> files\n          </div>\n          <div id=\"gitFilesList\" class=\"max-h-28 overflow-y-auto text-[10px] text-zinc-500 space-y-0.5 no-scrollbar\"></div>\n        </div>\n\n        <!-- 1-Tap Git Action Buttons -->\n        <div class=\"grid grid-cols-2 gap-2\">\n          <button onclick=\"triggerGitPull()\" class=\"py-2.5 px-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all\">\n            <span>📥</span> Git Pull\n          </button>\n          <button onclick=\"openCommitModal()\" class=\"py-2.5 px-3 bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 text-violet-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all\">\n            <span>🚀</span> Commit & Push\n          </button>\n        </div>\n      </div>\n    </section>\n\n    <!-- TAB 5: CRON & PORTS -->\n    <section id=\"tab-cron\" class=\"tab-content space-y-4\">\n      <!-- Cron Jobs -->\n      <div class=\"space-y-2\">\n        <div class=\"flex items-center justify-between\">\n          <h2 class=\"text-xs font-bold uppercase tracking-wider text-zinc-400\">Scheduled Cron Jobs</h2>\n          <button onclick=\"loadCronJobs()\" class=\"text-[10px] text-violet-400 font-mono font-semibold\">Refresh</button>\n        </div>\n        <div id=\"cronJobsList\" class=\"space-y-2\">\n          <div class=\"text-center py-4 text-xs text-zinc-500\">Loading cron tasks...</div>\n        </div>\n      </div>\n\n      <!-- Active Network Ports -->\n      <div class=\"space-y-2 pt-2 border-t border-zinc-850\">\n        <div class=\"flex items-center justify-between\">\n          <h2 class=\"text-xs font-bold uppercase tracking-wider text-zinc-400\">Active Network Ports</h2>\n          <button onclick=\"loadActivePorts()\" class=\"text-[10px] text-violet-400 font-mono font-semibold\">Refresh</button>\n        </div>\n        <div id=\"portsList\" class=\"space-y-1.5 max-h-56 overflow-y-auto no-scrollbar\">\n          <div class=\"text-center py-4 text-xs text-zinc-500\">Loading ports...</div>\n        </div>\n      </div>\n    </section>\n\n    <!-- TAB 6: NOTES & SCRATCHPAD -->\n    <section id=\"tab-notes\" class=\"tab-content space-y-3\">\n      <div class=\"bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 space-y-2 shadow-sm\">\n        <div class=\"flex items-center justify-between\">\n          <h2 class=\"text-xs font-bold uppercase tracking-wider text-zinc-400\">Desktop Scratchpad</h2>\n          <span id=\"noteSaveStatus\" class=\"text-[10px] text-emerald-400 font-mono hidden\">Saved</span>\n        </div>\n        <textarea id=\"notesArea\" rows=\"12\" placeholder=\"Type quick notes, todos, or snippets from your phone...\" class=\"w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 resize-none font-mono leading-relaxed\"></textarea>\n        <button onclick=\"saveNotes()\" class=\"w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-violet-600/20 active:scale-95 transition-all\">Save to Desktop</button>\n      </div>\n    </section>\n\n  </main>\n\n  <!-- Service Terminal Logs Drawer with Safe Area Spacing -->\n  <div id=\"serviceLogModal\" class=\"fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-end hidden\">\n    <div class=\"bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-4 max-h-[85vh] h-[85vh] flex flex-col space-y-3 modal-sheet\">\n      <div class=\"flex items-center justify-between pb-2 border-b border-zinc-800\">\n        <div class=\"flex items-center gap-2\">\n          <span class=\"w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse\"></span>\n          <h3 id=\"serviceLogTitle\" class=\"font-mono text-xs font-bold text-zinc-100 truncate\">Service Logs</h3>\n        </div>\n        <button onclick=\"closeServiceLogModal()\" class=\"text-xs text-zinc-400 hover:text-white px-2 py-1\">✕ Close</button>\n      </div>\n      <pre id=\"serviceLogBody\" class=\"flex-1 bg-zinc-900/80 rounded-2xl p-3 font-mono text-[10px] text-zinc-300 overflow-y-auto leading-relaxed whitespace-pre-wrap no-scrollbar select-text\">Loading terminal stream...</pre>\n    </div>\n  </div>\n\n  <!-- Commit & Push Modal -->\n  <div id=\"commitModal\" class=\"fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col justify-center px-4 hidden\">\n    <div class=\"bg-zinc-950 border border-zinc-800/90 rounded-3xl p-5 max-w-sm w-full mx-auto space-y-3.5 shadow-2xl\">\n      <h3 class=\"text-sm font-bold text-zinc-100\">Commit & Push to Remote</h3>\n      <input id=\"commitMessageInput\" type=\"text\" placeholder=\"e.g. fix: update API response\" class=\"w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-violet-500 font-mono\">\n      <div class=\"flex gap-2 pt-1\">\n        <button onclick=\"closeCommitModal()\" class=\"flex-1 py-2.5 bg-zinc-850 text-zinc-400 text-xs font-semibold rounded-xl\">Cancel</button>\n        <button onclick=\"submitCommitPush()\" id=\"commitPushBtn\" class=\"flex-1 py-2.5 bg-violet-600 text-white font-bold text-xs rounded-xl shadow-md\">Push Now</button>\n      </div>\n    </div>\n  </div>\n\n  <!-- Bottom Fixed 6-Tab Navigation Bar with Safe Area Bottom Inset -->\n  <nav class=\"mobile-nav fixed bottom-0 inset-x-0 bg-zinc-950/95 border-t border-zinc-800/80 backdrop-blur-xl flex items-center justify-around px-2 z-40\">\n    <button onclick=\"switchTab('dashboard')\" id=\"nav-dashboard\" class=\"flex flex-col items-center gap-1 text-violet-400 py-1 px-2 transition-all\">\n      <span class=\"text-base\">⚡</span>\n      <span class=\"text-[9px] font-semibold\">HUD</span>\n    </button>\n    <button onclick=\"switchTab('services')\" id=\"nav-services\" class=\"flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200 py-1 px-2 transition-all\">\n      <span class=\"text-base\">📦</span>\n      <span class=\"text-[9px] font-semibold\">Services</span>\n    </button>\n    <button onclick=\"switchTab('terminal')\" id=\"nav-terminal\" class=\"flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200 py-1 px-2 transition-all\">\n      <span class=\"text-base\">💻</span>\n      <span class=\"text-[9px] font-semibold\">Console</span>\n    </button>\n    <button onclick=\"switchTab('git')\" id=\"nav-git\" class=\"flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200 py-1 px-2 transition-all\">\n      <span class=\"text-base\">🌿</span>\n      <span class=\"text-[9px] font-semibold\">Git</span>\n    </button>\n    <button onclick=\"switchTab('cron')\" id=\"nav-cron\" class=\"flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200 py-1 px-2 transition-all\">\n      <span class=\"text-base\">⏰</span>\n      <span class=\"text-[9px] font-semibold\">Tasks</span>\n    </button>\n    <button onclick=\"switchTab('notes')\" id=\"nav-notes\" class=\"flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200 py-1 px-2 transition-all\">\n      <span class=\"text-base\">📝</span>\n      <span class=\"text-[9px] font-semibold\">Notes</span>\n    </button>\n  </nav>\n\n  <script>\n    let token = localStorage.getItem('pyb_mobile_token') || '';\n    let currentTab = 'dashboard';\n    let allProjects = [];\n    let allWorkspaces = [];\n    let activeWorkspaceId = null;\n    let activeLogStreamInterval = null;\n\n    function checkAuth() {\n      if (token) {\n        document.getElementById('loginView').classList.add('hidden');\n        loadWorkspaces();\n        refreshCurrentTab();\n        loadProjects();\n        loadNotes();\n        setInterval(refreshTelemetry, 3500);\n      } else {\n        document.getElementById('loginView').classList.remove('hidden');\n      }\n    }\n\n    async function handleLogin(e) {\n      e.preventDefault();\n      const username = document.getElementById('usernameInput').value;\n      const password = document.getElementById('passwordInput').value;\n      const errEl = document.getElementById('loginError');\n\n      try {\n        const res = await fetch('/api/auth/login', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ username, password })\n        });\n        const data = await res.json();\n        if (data.success && data.token) {\n          token = data.token;\n          localStorage.setItem('pyb_mobile_token', token);\n          checkAuth();\n        } else {\n          errEl.innerText = data.error || 'Authentication failed';\n          errEl.classList.remove('hidden');\n        }\n      } catch (err) {\n        errEl.innerText = 'Network error connecting to ProjectYB';\n        errEl.classList.remove('hidden');\n      }\n    }\n\n    function logout() {\n      localStorage.removeItem('pyb_mobile_token');\n      token = '';\n      checkAuth();\n    }\n\n    async function apiFetch(endpoint, options = {}) {\n      options.headers = options.headers || {};\n      options.headers['Authorization'] = 'Bearer ' + token;\n      const res = await fetch(endpoint, options);\n      if (res.status === 401) {\n        logout();\n        throw new Error('Unauthorized');\n      }\n      return res.json();\n    }\n\n    function switchTab(tabId) {\n      currentTab = tabId;\n      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));\n      document.querySelectorAll('nav button').forEach(btn => {\n        btn.classList.remove('text-violet-400');\n        btn.classList.add('text-zinc-400');\n      });\n\n      const tabEl = document.getElementById('tab-' + tabId);\n      const navBtn = document.getElementById('nav-' + tabId);\n      if (tabEl) tabEl.classList.add('active');\n      if (navBtn) {\n        navBtn.classList.add('text-violet-400');\n        navBtn.classList.remove('text-zinc-400');\n      }\n\n      refreshCurrentTab();\n    }\n\n    function refreshCurrentTab() {\n      refreshTelemetry();\n      if (currentTab === 'dashboard') {\n        loadLogs();\n      } else if (currentTab === 'services') {\n        loadRunningServices();\n        loadProjects();\n      } else if (currentTab === 'git') {\n        loadGitStatusForProject();\n      } else if (currentTab === 'cron') {\n        loadCronJobs();\n        loadActivePorts();\n      } else if (currentTab === 'notes') {\n        loadNotes();\n      }\n    }\n\n    // Workspaces\n    async function loadWorkspaces() {\n      if (!token) return;\n      try {\n        const data = await apiFetch('/api/workspaces');\n        if (data.success && Array.isArray(data.workspaces)) {\n          allWorkspaces = data.workspaces;\n          activeWorkspaceId = data.activeWorkspaceId || null;\n          updateWorkspaceUI();\n        }\n      } catch {}\n    }\n\n    function updateWorkspaceUI() {\n      const select = document.getElementById('headerWorkspaceSelect');\n      if (!select) return;\n\n      const opts = allWorkspaces.map(w => \n        '<option value=\"' + w.id + '\"' + (w.id === activeWorkspaceId ? ' selected' : '') + '>📁 ' + w.name + '</option>'\n      ).join('');\n\n      select.innerHTML = '<option value=\"\">🌐 All Projects</option>' + opts;\n\n      const activeWs = allWorkspaces.find(w => w.id === activeWorkspaceId);\n      const bootBtn = document.getElementById('wsBootBtn');\n      const heroTitle = document.getElementById('wsHeroTitle');\n      const heroBadge = document.getElementById('wsHeroBadge');\n      const heroDesc = document.getElementById('wsHeroDesc');\n\n      if (activeWs) {\n        if (heroTitle) heroTitle.innerText = activeWs.name;\n        if (heroBadge) heroBadge.innerText = (activeWs.projectIds ? activeWs.projectIds.length : 0) + ' projects';\n        if (heroDesc) heroDesc.innerText = activeWs.description || 'Filtered workspace scope active on mobile.';\n        if (bootBtn && activeWs.services && activeWs.services.length > 0) {\n          bootBtn.classList.remove('hidden');\n          bootBtn.classList.add('flex');\n        } else if (bootBtn) {\n          bootBtn.classList.add('hidden');\n        }\n      } else {\n        if (heroTitle) heroTitle.innerText = 'All Projects';\n        if (heroBadge) heroBadge.innerText = 'Global';\n        if (heroDesc) heroDesc.innerText = 'Displaying all scanned repositories across your computer.';\n        if (bootBtn) bootBtn.classList.add('hidden');\n      }\n\n      renderProjectsList(getFilteredProjects());\n    }\n\n    async function changeMobileWorkspace(wsId) {\n      activeWorkspaceId = wsId || null;\n      try {\n        await apiFetch('/api/workspaces/set-active', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ id: activeWorkspaceId })\n        });\n      } catch {}\n      updateWorkspaceUI();\n    }\n\n    async function toggleCurrentWorkspaceStack() {\n      const activeWs = allWorkspaces.find(w => w.id === activeWorkspaceId);\n      if (!activeWs) return;\n\n      try {\n        await apiFetch('/api/workspaces/boot', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ workspaceId: activeWs.id })\n        });\n        alert('Workspace stack \"' + activeWs.name + '\" launched!');\n        switchTab('services');\n        loadRunningServices();\n      } catch (err) {\n        alert('Failed to boot stack: ' + err.message);\n      }\n    }\n\n    function getFilteredProjects() {\n      const activeWs = allWorkspaces.find(w => w.id === activeWorkspaceId);\n      if (!activeWs || !activeWs.projectIds || activeWs.projectIds.length === 0) {\n        return allProjects;\n      }\n      return allProjects.filter(p => activeWs.projectIds.includes(p.id) || activeWs.projectIds.includes(p.path));\n    }\n\n    // Telemetry & Overview\n    async function refreshTelemetry() {\n      if (!token) return;\n      try {\n        const data = await apiFetch('/api/status');\n        if (data.success && data.telemetry) {\n          const t = data.telemetry;\n          document.getElementById('cpuText').innerText = t.cpuUsage + '%';\n          document.getElementById('cpuBar').style.width = t.cpuUsage + '%';\n          document.getElementById('memText').innerText = t.memoryUsage + '%';\n          document.getElementById('memBar').style.width = t.memoryUsage + '%';\n          document.getElementById('statRunningServices').innerText = t.runningServicesCount || 0;\n          document.getElementById('statActiveTerminals').innerText = t.terminalsCount || 0;\n        }\n      } catch {}\n    }\n\n    // Projects & Services\n    async function loadProjects() {\n      if (!token) return;\n      try {\n        const data = await apiFetch('/api/projects');\n        if (data.success && Array.isArray(data.projects)) {\n          allProjects = data.projects;\n          populateProjectDropdowns(allProjects);\n          renderProjectsList(getFilteredProjects());\n        }\n      } catch {}\n    }\n\n    function populateProjectDropdowns(projects) {\n      const termSelect = document.getElementById('terminalProjectSelect');\n      const gitSelect = document.getElementById('gitProjectSelect');\n      if (!termSelect || !gitSelect) return;\n\n      const opts = projects.map(p => '<option value=\"' + p.path.replace(/\"/g, '&quot;') + '\">' + p.name + '</option>').join('');\n      termSelect.innerHTML = '<option value=\"\">Default Working Directory</option>' + opts;\n      gitSelect.innerHTML = '<option value=\"\">Select Project Repository...</option>' + opts;\n    }\n\n    function renderProjectsList(projects) {\n      const container = document.getElementById('projectsList');\n      if (!container) return;\n\n      if (projects.length === 0) {\n        container.innerHTML = '<div class=\"text-center py-6 text-xs text-zinc-500\">No projects found.</div>';\n        return;\n      }\n\n      container.innerHTML = projects.map(p => {\n        const scripts = p.scripts ? Object.entries(p.scripts) : [];\n        const cleanPath = p.path.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, \"\\\\'\");\n        return '<div class=\"p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl space-y-2.5 backdrop-blur-md shadow-sm\">' +\n          '<div class=\"flex items-center justify-between\">' +\n            '<div class=\"min-w-0 flex-1\">' +\n              '<div class=\"font-bold text-xs text-zinc-100 truncate\">' + p.name + '</div>' +\n              '<div class=\"text-[10px] text-zinc-500 font-mono truncate\">' + p.path + '</div>' +\n            '</div>' +\n            '<span class=\"text-[9px] px-2 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 font-mono uppercase font-bold\">' + (p.type || 'app') + '</span>' +\n          '</div>' +\n          '<div class=\"space-y-1\">' +\n            '<div class=\"text-[9px] font-mono text-zinc-400 uppercase tracking-wider font-semibold\">1-Tap Scripts:</div>' +\n            '<div class=\"flex flex-wrap gap-1.5\">' +\n              (scripts.length > 0 ? scripts.map(([name, cmd]) => \n                '<button onclick=\"startProjectScript(\\'' + p.id + '\\', \\'' + p.name.replace(/'/g, \"\\\\'\") + '\\', \\'' + name + '\\', \\'npm run ' + name + '\\', \\'' + cleanPath + '\\')\" class=\"px-2.5 py-1 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-xl text-[10px] font-mono font-medium active:scale-95 transition-all\">' +\n                  '▶ ' + name +\n                '</button>'\n              ).join('') : '<span class=\"text-[10px] text-zinc-600\">No package scripts defined</span>') +\n            '</div>' +\n          '</div>' +\n        '</div>';\n      }).join('');\n    }\n\n    function filterProjects() {\n      const q = document.getElementById('projectSearchInput').value.toLowerCase();\n      const base = getFilteredProjects();\n      const filtered = base.filter(p => p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q));\n      renderProjectsList(filtered);\n    }\n\n    async function startProjectScript(projectId, projectName, scriptName, command, cwd) {\n      if (!token) return;\n      try {\n        const res = await apiFetch('/api/services/start', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ projectId, projectName, scriptName, command, cwd })\n        });\n        if (res.success) {\n          alert('Service \"' + projectName + ' > ' + scriptName + '\" started!');\n          switchTab('services');\n          loadRunningServices();\n        }\n      } catch (err) {\n        alert('Failed to start service: ' + err.message);\n      }\n    }\n\n    async function loadRunningServices() {\n      if (!token) return;\n      try {\n        const data = await apiFetch('/api/services/running');\n        const container = document.getElementById('runningServicesList');\n        if (!container) return;\n\n        if (data.success && Array.isArray(data.services)) {\n          const list = data.services.filter(s => s.status === 'running');\n          document.getElementById('runningCount').innerText = list.length;\n          document.getElementById('statRunningServices').innerText = list.length;\n\n          if (list.length === 0) {\n            container.innerHTML = '<div class=\"text-center py-4 text-xs text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-850\">No background services currently active.</div>';\n            return;\n          }\n\n          container.innerHTML = list.map(s => {\n            return '<div class=\"p-3.5 bg-zinc-900/70 border border-emerald-500/20 rounded-2xl space-y-2.5 font-mono shadow-sm\">' +\n              '<div class=\"flex items-center justify-between\">' +\n                '<div class=\"min-w-0\">' +\n                  '<div class=\"font-bold text-xs text-zinc-100 flex items-center gap-1.5 truncate\">' +\n                    '<span class=\"w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0\"></span>' +\n                    s.projectName + ' > ' + s.scriptName +\n                  '</div>' +\n                  '<div class=\"text-[10px] text-zinc-500 truncate mt-0.5\">' + s.command + '</div>' +\n                '</div>' +\n                '<span class=\"text-[9px] text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 font-bold\">RUNNING</span>' +\n              '</div>' +\n              (s.tunnelUrl ? \n                '<div class=\"p-2 bg-zinc-950 rounded-xl border border-orange-500/30 flex items-center justify-between text-[10px]\">' +\n                  '<span class=\"text-orange-400 font-bold\">☁️ Public Link:</span>' +\n                  '<a href=\"' + s.tunnelUrl + '\" target=\"_blank\" class=\"text-cyan-400 underline truncate max-w-[180px]\">' + s.tunnelUrl + '</a>' +\n                '</div>' : '') +\n              '<div class=\"grid grid-cols-4 gap-1.5 text-[10px] pt-0.5\">' +\n                '<button onclick=\"openServiceLogModal(\\'' + s.terminalId + '\\', \\'' + s.projectName.replace(/'/g, \"\\\\'\") + ' > ' + s.scriptName.replace(/'/g, \"\\\\'\") + '\\')\" class=\"py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-xl text-center font-bold active:scale-95 transition-all\">📄 Logs</button>' +\n                '<button onclick=\"restartService(\\'' + s.id + '\\')\" class=\"py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-xl text-center font-bold active:scale-95 transition-all\">🔄 Restart</button>' +\n                '<button onclick=\"stopService(\\'' + s.id + '\\', \\'' + s.terminalId + '\\')\" class=\"py-2 bg-zinc-850 hover:bg-zinc-800 text-zinc-200 rounded-xl text-center font-bold active:scale-95 transition-all\">⏹ Stop</button>' +\n                '<button onclick=\"forceKillService(\\'' + s.terminalId + '\\', ' + (s.port || 0) + ')\" class=\"py-2 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-center font-bold active:scale-95 transition-all\">🔥 Kill</button>' +\n              '</div>' +\n            '</div>';\n          }).join('');\n        }\n      } catch {}\n    }\n\n    async function stopService(serviceId, terminalId) {\n      try {\n        await apiFetch('/api/services/stop', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ serviceId, terminalId })\n        });\n        loadRunningServices();\n      } catch {}\n    }\n\n    async function restartService(serviceId) {\n      try {\n        await apiFetch('/api/services/restart', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ serviceId })\n        });\n        loadRunningServices();\n      } catch {}\n    }\n\n    async function forceKillService(terminalId, port) {\n      try {\n        await apiFetch('/api/services/force-kill', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ terminalId, port: port > 0 ? port : undefined })\n        });\n        loadRunningServices();\n      } catch {}\n    }\n\n    // Live Service Logs Modal\n    async function openServiceLogModal(terminalId, title) {\n      document.getElementById('serviceLogTitle').innerText = title;\n      document.getElementById('serviceLogModal').classList.remove('hidden');\n      \n      const load = async () => {\n        try {\n          const data = await apiFetch('/api/terminal/logs?terminalId=' + encodeURIComponent(terminalId));\n          const el = document.getElementById('serviceLogBody');\n          el.innerText = data.buffer || 'No log output yet.';\n          el.scrollTop = el.scrollHeight;\n        } catch {}\n      };\n\n      load();\n      activeLogStreamInterval = setInterval(load, 1500);\n    }\n\n    function closeServiceLogModal() {\n      document.getElementById('serviceLogModal').classList.add('hidden');\n      if (activeLogStreamInterval) {\n        clearInterval(activeLogStreamInterval);\n        activeLogStreamInterval = null;\n      }\n    }\n\n    // Command Runner\n    function setExecCommand(cmd) {\n      document.getElementById('execCommandInput').value = cmd;\n      document.getElementById('execCommandInput').focus();\n    }\n\n    async function executeMobileCommand() {\n      const cmd = document.getElementById('execCommandInput').value;\n      const cwd = document.getElementById('terminalProjectSelect').value;\n      if (!cmd.trim()) return;\n\n      const outEl = document.getElementById('execOutput');\n      const btn = document.getElementById('execBtn');\n      const meta = document.getElementById('execMeta');\n\n      btn.disabled = true;\n      btn.innerText = 'Running...';\n      outEl.innerText = '> Executing: ' + cmd + '\\n\\n';\n\n      try {\n        const data = await apiFetch('/api/terminal/exec', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ command: cmd, cwd })\n        });\n\n        meta.innerText = data.durationMs + 'ms (Exit ' + data.exitCode + ')';\n        outEl.innerText += data.stdout || '';\n        if (data.stderr) {\n          outEl.innerText += '\\n' + data.stderr;\n        }\n        outEl.scrollTop = outEl.scrollHeight;\n      } catch (err) {\n        outEl.innerText += '\\nError: ' + err.message;\n      } finally {\n        btn.disabled = false;\n        btn.innerText = 'Run';\n      }\n    }\n\n    function clearExecOutput() {\n      document.getElementById('execOutput').innerText = 'Ready for command execution...';\n      document.getElementById('execMeta').innerText = '';\n    }\n\n    // Git Control Center\n    async function loadGitStatusForProject() {\n      const projectPath = document.getElementById('gitProjectSelect').value;\n      const display = document.getElementById('gitStatusDisplay');\n      if (!projectPath) {\n        display.classList.add('hidden');\n        return;\n      }\n\n      try {\n        const data = await apiFetch('/api/git/status?projectPath=' + encodeURIComponent(projectPath));\n        if (data.success && data.isGitRepo && data.status) {\n          const s = data.status;\n          display.classList.remove('hidden');\n          document.getElementById('gitBranchText').innerText = s.current || 'main';\n          \n          const files = s.files || [];\n          document.getElementById('gitModifiedCount').innerText = files.length;\n          const isClean = files.length === 0;\n          document.getElementById('gitCleanBadge').innerText = isClean ? 'CLEAN' : 'DIRTY';\n          document.getElementById('gitCleanBadge').className = isClean \n            ? 'text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30'\n            : 'text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-500/30';\n\n          document.getElementById('gitFilesList').innerHTML = files.map(f => '<div class=\"truncate\">📄 ' + f.path + '</div>').join('');\n        } else {\n          display.classList.add('hidden');\n        }\n      } catch {}\n    }\n\n    async function triggerGitPull() {\n      const projectPath = document.getElementById('gitProjectSelect').value;\n      if (!projectPath) {\n        alert('Please select a project repository first.');\n        return;\n      }\n\n      try {\n        await apiFetch('/api/git/pull', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ projectPath })\n        });\n        alert('Git pull completed successfully!');\n        loadGitStatusForProject();\n      } catch (err) {\n        alert('Git pull failed: ' + err.message);\n      }\n    }\n\n    function openCommitModal() {\n      const projectPath = document.getElementById('gitProjectSelect').value;\n      if (!projectPath) {\n        alert('Please select a project repository first.');\n        return;\n      }\n      document.getElementById('commitModal').classList.remove('hidden');\n    }\n\n    function closeCommitModal() {\n      document.getElementById('commitModal').classList.add('hidden');\n    }\n\n    async function submitCommitPush() {\n      const projectPath = document.getElementById('gitProjectSelect').value;\n      const message = document.getElementById('commitMessageInput').value;\n      if (!message.trim()) return;\n\n      const btn = document.getElementById('commitPushBtn');\n      btn.disabled = true;\n      btn.innerText = 'Pushing...';\n\n      try {\n        await apiFetch('/api/git/commit-push', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ projectPath, message })\n        });\n        alert('Commit & Push succeeded!');\n        closeCommitModal();\n        loadGitStatusForProject();\n      } catch (err) {\n        alert('Commit & Push failed: ' + err.message);\n      } finally {\n        btn.disabled = false;\n        btn.innerText = 'Push Now';\n      }\n    }\n\n    // Cron & Scheduled Tasks\n    async function loadCronJobs() {\n      if (!token) return;\n      try {\n        const data = await apiFetch('/api/cron/jobs');\n        const container = document.getElementById('cronJobsList');\n        if (!container) return;\n\n        if (data.success && Array.isArray(data.jobs)) {\n          if (data.jobs.length === 0) {\n            container.innerHTML = '<div class=\"text-center py-4 text-xs text-zinc-500\">No cron tasks configured.</div>';\n            return;\n          }\n\n          container.innerHTML = data.jobs.map(j => {\n            return '<div class=\"p-3.5 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl space-y-2 font-mono text-xs shadow-sm\">' +\n              '<div class=\"flex items-center justify-between\">' +\n                '<span class=\"font-bold text-zinc-100 truncate\">' + j.name + '</span>' +\n                '<span class=\"text-[9px] px-2 py-0.5 rounded-lg ' + (j.enabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-500') + '\">' + j.schedule + '</span>' +\n              '</div>' +\n              '<div class=\"text-[10px] text-zinc-500 truncate\">' + j.command + '</div>' +\n              '<div class=\"flex items-center justify-between pt-1\">' +\n                '<span class=\"text-[9px] text-zinc-500\">' + (j.lastDurationMs ? j.lastDurationMs + 'ms' : 'Not run yet') + '</span>' +\n                '<button onclick=\"runCronJobNow(\\'' + j.id + '\\')\" class=\"px-3 py-1 bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-xl text-[10px] font-bold active:scale-95 transition-all\">▶ Run Now</button>' +\n              '</div>' +\n            '</div>';\n          }).join('');\n        }\n      } catch {}\n    }\n\n    async function runCronJobNow(id) {\n      try {\n        const res = await apiFetch('/api/cron/run-now', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ id })\n        });\n        alert('Cron job executed!');\n        loadCronJobs();\n      } catch (err) {\n        alert('Cron execution failed: ' + err.message);\n      }\n    }\n\n    // Active Network Ports\n    async function loadActivePorts() {\n      if (!token) return;\n      try {\n        const data = await apiFetch('/api/ports');\n        const container = document.getElementById('portsList');\n        if (!container) return;\n\n        if (data.success && Array.isArray(data.ports)) {\n          document.getElementById('statActivePorts').innerText = data.ports.length;\n          container.innerHTML = data.ports.slice(0, 15).map(p => {\n            return '<div class=\"p-2.5 bg-zinc-900/40 border border-zinc-850 rounded-xl flex items-center justify-between font-mono text-[10px] shadow-sm\">' +\n              '<div>' +\n                '<span class=\"text-cyan-400 font-bold\">:' + p.port + '</span>' +\n                '<span class=\"text-zinc-400 ml-1.5 truncate max-w-[120px]\">' + (p.processName || 'PID ' + p.pid) + '</span>' +\n              '</div>' +\n              '<button onclick=\"killPortProcess(' + p.port + ', ' + p.pid + ')\" class=\"px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[9px] font-bold active:scale-95 transition-all\">Kill</button>' +\n            '</div>';\n          }).join('');\n        }\n      } catch {}\n    }\n\n    async function killPortProcess(port, pid) {\n      if (!confirm('Terminate process on port :' + port + '?')) return;\n      try {\n        await apiFetch('/api/ports/kill', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ port, pid })\n        });\n        loadActivePorts();\n      } catch {}\n    }\n\n    // Notes & Scratchpad\n    async function loadNotes() {\n      if (!token) return;\n      try {\n        const data = await apiFetch('/api/notes');\n        if (data.success) {\n          document.getElementById('notesArea').value = data.content || '';\n        }\n      } catch {}\n    }\n\n    async function saveNotes() {\n      if (!token) return;\n      const content = document.getElementById('notesArea').value;\n      try {\n        await apiFetch('/api/notes', {\n          method: 'POST',\n          headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ content })\n        });\n        const status = document.getElementById('noteSaveStatus');\n        status.classList.remove('hidden');\n        setTimeout(() => status.classList.add('hidden'), 2000);\n      } catch {}\n    }\n\n    // Emergency Stop\n    async function triggerEmergencyStop() {\n      if (!confirm('Are you sure you want to terminate all background terminals and processes?')) return;\n      try {\n        await apiFetch('/api/emergency-stop', { method: 'POST' });\n        alert('Emergency Stop triggered successfully!');\n        refreshCurrentTab();\n      } catch {}\n    }\n\n    // Live Logs\n    async function loadLogs() {\n      if (!token) return;\n      try {\n        const data = await apiFetch('/api/logs');\n        if (data.success && Array.isArray(data.logs)) {\n          const container = document.getElementById('logsContainer');\n          if (!container) return;\n          if (data.logs.length === 0) {\n            container.innerHTML = '<div class=\"text-zinc-600\">No logs captured yet</div>';\n            return;\n          }\n          container.innerHTML = data.logs.slice(-50).map(l => {\n            const color = l.level === 'error' ? 'text-rose-400' : l.level === 'warn' ? 'text-amber-400' : 'text-zinc-300';\n            return '<div><span class=\"text-zinc-600\">[' + l.timestamp.slice(11, 19) + ']</span> <span class=\"text-violet-400\">[' + l.tag + ']</span> <span class=\"' + color + '\">' + l.message + '</span></div>';\n          }).join('');\n          container.scrollTop = container.scrollHeight;\n        }\n      } catch {}\n    }\n\n    checkAuth();\n  </script>\n</body>\n</html>";
  }
}

export const mobileCompanionService = new MobileCompanionService();
