import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import { app, BrowserWindow } from 'electron';
import { spawn, ChildProcess, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CloudflareBinaryStatus {
  installed: boolean;
  version?: string;
  binaryPath?: string;
  source: 'system' | 'embedded' | 'missing';
}

export interface ActiveTunnel {
  id: string;
  name: string;
  type: 'quick' | 'named';
  localPort: number;
  localHost: string;
  protocol: 'http' | 'https' | 'tcp';
  publicUrl?: string;
  status: 'starting' | 'connected' | 'error' | 'stopped';
  pid?: number;
  startedAt: number;
  error?: string;
  customHostname?: string;
  tunnelToken?: string;
}

export interface RemoteTunnelInfo {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  connectionsCount?: number;
}

interface ActiveTunnelInternal extends ActiveTunnel {
  process?: ChildProcess;
  logs: string[];
}

export class CloudflareService {
  private activeTunnels = new Map<string, ActiveTunnelInternal>();
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  /**
   * Get the local app binary path where cloudflared can be stored
   */
  private getLocalBinaryDir(): string {
    const userData = app?.getPath ? app.getPath('userData') : path.join(os.homedir(), '.projectyb');
    const binDir = path.join(userData, 'bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }
    return binDir;
  }

  private getLocalBinaryPath(): string {
    const binDir = this.getLocalBinaryDir();
    return process.platform === 'win32'
      ? path.join(binDir, 'cloudflared.exe')
      : path.join(binDir, 'cloudflared');
  }

  /**
   * Detect installed cloudflared executable (system PATH or local directory)
   */
  async getBinaryStatus(): Promise<CloudflareBinaryStatus> {
    const localPath = this.getLocalBinaryPath();
    if (fs.existsSync(localPath)) {
      try {
        const { stdout } = await execAsync(`"${localPath}" --version`, { timeout: 3000 });
        const version = stdout.trim().split('\n')[0] || 'Installed';
        return {
          installed: true,
          version,
          binaryPath: localPath,
          source: 'embedded'
        };
      } catch {}
    }

    // Check system PATH
    try {
      const cmd = process.platform === 'win32' ? 'where.exe cloudflared' : 'which cloudflared';
      const { stdout: whichOut } = await execAsync(cmd, { timeout: 3000 });
      const systemPath = whichOut.trim().split('\r\n')[0].split('\n')[0];

      if (systemPath && fs.existsSync(systemPath)) {
        const { stdout } = await execAsync(`"${systemPath}" --version`, { timeout: 3000 });
        const version = stdout.trim().split('\n')[0] || 'Installed';
        return {
          installed: true,
          version,
          binaryPath: systemPath,
          source: 'system'
        };
      }
    } catch {}

    return {
      installed: false,
      source: 'missing'
    };
  }

  /**
   * Download the official cloudflared binary directly from Cloudflare GitHub releases
   */
  async downloadBinary(onProgress?: (percent: number) => void): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const targetPath = this.getLocalBinaryPath();
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      let downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe';
      if (process.platform === 'darwin') {
        const isArm = process.arch === 'arm64';
        downloadUrl = isArm
          ? 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz'
          : 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz';
      } else if (process.platform === 'linux') {
        downloadUrl = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
      }

      await this.downloadFileWithRedirects(downloadUrl, targetPath, onProgress);

      if (process.platform !== 'win32') {
        fs.chmodSync(targetPath, 0o755);
      }

      return { success: true, path: targetPath };
    } catch (err: any) {
      console.error('[CloudflareService] Binary download failed:', err);
      return { success: false, error: err.message || 'Download failed' };
    }
  }

  private downloadFileWithRedirects(url: string, dest: string, onProgress?: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(dest);

      const request = (currentUrl: string, redirectCount = 0) => {
        if (redirectCount > 10) {
          file.close();
          fs.unlink(dest, () => {});
          return reject(new Error('Too many HTTP redirects during binary download'));
        }

        const client = currentUrl.startsWith('http:') ? require('http') : https;

        client.get(currentUrl, (response: any) => {
          // Handle HTTP redirects (301, 302, 307, 308)
          if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            const redirectUrl = new URL(response.headers.location, currentUrl).toString();
            return request(redirectUrl, redirectCount + 1);
          }

          if (response.statusCode !== 200) {
            file.close();
            fs.unlink(dest, () => {});
            return reject(new Error(`Server returned HTTP ${response.statusCode}`));
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let receivedBytes = 0;

          response.on('data', (chunk: Buffer) => {
            receivedBytes += chunk.length;
            if (totalBytes > 0 && onProgress) {
              const percent = Math.round((receivedBytes / totalBytes) * 100);
              onProgress(percent);
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close(() => resolve());
          });
        }).on('error', (err: Error) => {
          file.close();
          fs.unlink(dest, () => {});
          reject(err);
        });
      };

      request(url);
    });
  }

  /**
   * Start an instant zero-config Quick Tunnel (TryCloudflare)
   */
  async startQuickTunnel(options: {
    id?: string;
    name?: string;
    localPort: number;
    localHost?: string;
    protocol?: 'http' | 'https' | 'tcp';
  }): Promise<ActiveTunnel> {
    const status = await this.getBinaryStatus();
    if (!status.installed || !status.binaryPath) {
      throw new Error('cloudflared executable is not installed. Please download it first.');
    }

    const tunnelId = options.id || `quick_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const name = options.name || `Local Port ${options.localPort}`;
    const localHost = options.localHost || 'localhost';
    const protocol = options.protocol || 'http';
    const localTarget = `${protocol}://${localHost}:${options.localPort}`;

    const activeTunnel: ActiveTunnelInternal = {
      id: tunnelId,
      name,
      type: 'quick',
      localPort: options.localPort,
      localHost,
      protocol,
      status: 'starting',
      startedAt: Date.now(),
      logs: []
    };

    this.activeTunnels.set(tunnelId, activeTunnel);

    // Args for trycloudflare tunnel
    const args = ['tunnel', '--url', localTarget, '--no-autoupdate'];

    try {
      const child = spawn(status.binaryPath, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      activeTunnel.process = child;
      activeTunnel.pid = child.pid;

      const appendLog = (line: string) => {
        const cleaned = line.trim();
        if (!cleaned) return;
        activeTunnel.logs.push(`[${new Date().toLocaleTimeString()}] ${cleaned}`);
        if (activeTunnel.logs.length > 200) activeTunnel.logs.shift();

        // Check for trycloudflare.com URL
        // Example log: "https://some-random-words.trycloudflare.com"
        const urlMatch = cleaned.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/i);
        if (urlMatch && (!activeTunnel.publicUrl || activeTunnel.status === 'starting')) {
          activeTunnel.publicUrl = urlMatch[0];
          activeTunnel.status = 'connected';
          this.emitStatusUpdate(activeTunnel);
        }

        this.emitLogLine(tunnelId, cleaned);
      };

      child.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(appendLog);
      });

      child.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(appendLog);
      });

      child.on('error', (err) => {
        console.error(`[CloudflareService] Tunnel ${tunnelId} process error:`, err);
        activeTunnel.status = 'error';
        activeTunnel.error = err.message;
        this.emitStatusUpdate(activeTunnel);
      });

      child.on('close', (code) => {
        console.log(`[CloudflareService] Tunnel ${tunnelId} exited with code ${code}`);
        activeTunnel.status = 'stopped';
        this.emitStatusUpdate(activeTunnel);
      });

      this.emitStatusUpdate(activeTunnel);
      return this.toPublicTunnel(activeTunnel);
    } catch (err: any) {
      activeTunnel.status = 'error';
      activeTunnel.error = err.message;
      this.emitStatusUpdate(activeTunnel);
      throw err;
    }
  }

  /**
   * Start a named tunnel using a Cloudflare Zero Trust Tunnel Token
   */
  async startNamedTunnel(options: {
    id?: string;
    name: string;
    tunnelToken: string;
    localPort?: number;
    customHostname?: string;
  }): Promise<ActiveTunnel> {
    const status = await this.getBinaryStatus();
    if (!status.installed || !status.binaryPath) {
      throw new Error('cloudflared executable is not installed. Please download it first.');
    }

    const tunnelId = options.id || `named_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const activeTunnel: ActiveTunnelInternal = {
      id: tunnelId,
      name: options.name,
      type: 'named',
      localPort: options.localPort || 80,
      localHost: 'localhost',
      protocol: 'http',
      status: 'starting',
      startedAt: Date.now(),
      tunnelToken: options.tunnelToken,
      customHostname: options.customHostname,
      publicUrl: options.customHostname ? `https://${options.customHostname}` : undefined,
      logs: []
    };

    this.activeTunnels.set(tunnelId, activeTunnel);

    // Args for token-based tunnel run
    const args = ['tunnel', 'run', '--token', options.tunnelToken];

    try {
      const child = spawn(status.binaryPath, args, {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      activeTunnel.process = child;
      activeTunnel.pid = child.pid;

      const appendLog = (line: string) => {
        const cleaned = line.trim();
        if (!cleaned) return;
        activeTunnel.logs.push(`[${new Date().toLocaleTimeString()}] ${cleaned}`);
        if (activeTunnel.logs.length > 200) activeTunnel.logs.shift();

        const isConnected =
          /registered.*connection|connection.*registered|connection established|route propagation/i.test(cleaned);
        if (isConnected && activeTunnel.status !== 'connected') {
          activeTunnel.status = 'connected';
          this.emitStatusUpdate(activeTunnel);
        }

        this.emitLogLine(tunnelId, cleaned);
      };

      child.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(appendLog);
      });

      child.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(appendLog);
      });

      child.on('error', (err) => {
        activeTunnel.status = 'error';
        activeTunnel.error = err.message;
        this.emitStatusUpdate(activeTunnel);
      });

      child.on('close', (code) => {
        activeTunnel.status = 'stopped';
        this.emitStatusUpdate(activeTunnel);
      });

      this.emitStatusUpdate(activeTunnel);
      return this.toPublicTunnel(activeTunnel);
    } catch (err: any) {
      activeTunnel.status = 'error';
      activeTunnel.error = err.message;
      this.emitStatusUpdate(activeTunnel);
      throw err;
    }
  }

  /**
   * Stop an active tunnel by ID
   */
  async stopTunnel(tunnelId: string): Promise<boolean> {
    const tunnel = this.activeTunnels.get(tunnelId);
    if (!tunnel) return false;

    try {
      if (tunnel.process) {
        if (process.platform === 'win32' && tunnel.pid) {
          exec(`taskkill /pid ${tunnel.pid} /T /F`, () => {});
        } else {
          tunnel.process.kill('SIGTERM');
        }
      }
      tunnel.status = 'stopped';
      this.emitStatusUpdate(tunnel);
      this.activeTunnels.delete(tunnelId);
      return true;
    } catch (err) {
      console.error(`[CloudflareService] Failed to kill tunnel ${tunnelId}:`, err);
      return false;
    }
  }

  /**
   * Get all active tunnels
   */
  listActiveTunnels(): ActiveTunnel[] {
    return Array.from(this.activeTunnels.values()).map(this.toPublicTunnel);
  }

  /**
   * Get recent logs for a specific tunnel
   */
  getTunnelLogs(tunnelId: string): string[] {
    return this.activeTunnels.get(tunnelId)?.logs || [];
  }

  /**
   * Test Cloudflare API Token
   */
  async testApiToken(apiToken: string): Promise<{ success: boolean; message: string; user?: any }> {
    try {
      const res = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json() as any;
      if (data.success) {
        return { success: true, message: 'Cloudflare API Token verified successfully', user: data.result };
      }

      // Fallback: Test if token can access /accounts directly (common for account-scoped tunnel tokens)
      const accRes = await fetch('https://api.cloudflare.com/client/v4/accounts', {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      const accData = await accRes.json() as any;
      if (accData.success) {
        return { success: true, message: 'Cloudflare API Token verified via Account access' };
      }

      return { success: false, message: data.errors?.[0]?.message || accData.errors?.[0]?.message || 'Invalid API Token' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Verification request failed' };
    }
  }

  /**
   * List Cloudflare Accounts associated with API Token
   */
  async listAccounts(apiToken: string): Promise<Array<{ id: string; name: string }>> {
    try {
      const res = await fetch('https://api.cloudflare.com/client/v4/accounts', {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json() as any;
      if (data.success && Array.isArray(data.result)) {
        return data.result.map((acc: any) => ({ id: acc.id, name: acc.name }));
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * List remote named tunnels in an account
   */
  async listRemoteTunnels(apiToken: string, accountId: string): Promise<RemoteTunnelInfo[]> {
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/tunnels?is_deleted=false`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json() as any;
      if (data.success && Array.isArray(data.result)) {
        return data.result.map((t: any) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          createdAt: t.created_at,
          connectionsCount: t.connections?.length || 0
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Create a remote named tunnel in Cloudflare Zero Trust
   */
  async createRemoteTunnel(
    apiToken: string,
    accountId: string,
    name: string
  ): Promise<{ success: boolean; tunnel?: RemoteTunnelInfo; token?: string; error?: string }> {
    try {
      // 1. Create tunnel
      const secret = Buffer.from(Math.random().toString(36) + Math.random().toString(36)).toString('base64');
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/tunnels`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          tunnel_secret: secret
        })
      });
      const data = await res.json() as any;

      if (!data.success) {
        return { success: false, error: data.errors?.[0]?.message || 'Failed to create tunnel' };
      }

      const tunnel = data.result;

      // 2. Fetch token
      const tokenRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/tunnels/${tunnel.id}/token`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      const tokenData = await tokenRes.json() as any;

      return {
        success: true,
        tunnel: {
          id: tunnel.id,
          name: tunnel.name,
          status: tunnel.status || 'inactive',
          createdAt: tunnel.created_at
        },
        token: tokenData.result || ''
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Create tunnel error' };
    }
  }

  /**
   * Delete a remote named tunnel
   */
  async deleteRemoteTunnel(apiToken: string, accountId: string, tunnelId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/tunnels/${tunnelId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json() as any;
      return !!data.success;
    } catch {
      return false;
    }
  }

  /**
   * Terminate all active tunnels on app shutdown
   */
  cleanupAll() {
    for (const [id, tunnel] of this.activeTunnels.entries()) {
      try {
        if (tunnel.process) {
          if (process.platform === 'win32' && tunnel.pid) {
            exec(`taskkill /pid ${tunnel.pid} /T /F`, () => {});
          } else {
            tunnel.process.kill('SIGTERM');
          }
        }
      } catch {}
    }
    this.activeTunnels.clear();
  }

  private toPublicTunnel(t: ActiveTunnelInternal): ActiveTunnel {
    return {
      id: t.id,
      name: t.name,
      type: t.type,
      localPort: t.localPort,
      localHost: t.localHost,
      protocol: t.protocol,
      publicUrl: t.publicUrl,
      status: t.status,
      pid: t.pid,
      startedAt: t.startedAt,
      error: t.error,
      customHostname: t.customHostname,
      tunnelToken: t.tunnelToken
    };
  }

  private emitStatusUpdate(tunnel: ActiveTunnelInternal) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('cloudflare:status-update', this.toPublicTunnel(tunnel));
    }
  }

  private emitLogLine(tunnelId: string, line: string) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('cloudflare:log-line', { tunnelId, line });
    }
  }
}

export const cloudflareService = new CloudflareService();
