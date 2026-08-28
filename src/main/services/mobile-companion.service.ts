import * as http from 'http';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { logStreamService } from './logstream.service';
import { cloudflareService } from './cloudflare.service';
import { serviceKillerService } from './service-killer.service';
import { terminalService } from './terminal.service';
import { notesService } from './notes.service';
import { getStore } from '../ipc/store.ipc';
import { logger } from '../utils/logger';
import * as si from 'systeminformation';

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

export class MobileCompanionService extends EventEmitter {
  private server: http.Server | null = null;
  private port = 4848;
  private activeTunnelId: string | null = null;
  private activeSessions: Set<string> = new Set();
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
      const saved = store.get('mobile:credentials') as MobileCredentials | undefined;
      if (saved && saved.passwordHash) {
        this.credentials = saved;
      } else {
        // Default initial credentials
        const initialPass = 'projectyb123';
        this.credentials = {
          username: 'admin',
          passwordHash: this.hashPassword(initialPass),
          rawPasswordDisplay: initialPass,
          updatedAt: new Date().toISOString()
        };
        store.set('mobile:credentials', this.credentials);
      }
    } catch {}
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  async setCredentials(username: string, rawPassword: string): Promise<MobileCredentials> {
    const creds: MobileCredentials = {
      username: username.trim() || 'admin',
      passwordHash: this.hashPassword(rawPassword),
      rawPasswordDisplay: rawPassword,
      updatedAt: new Date().toISOString()
    };
    this.credentials = creds;
    this.activeSessions.clear(); // Invalidate existing sessions
    try {
      const store = await getStore();
      store.set('mobile:credentials', creds);
    } catch {}
    this.emit('credentials:changed', creds);
    return creds;
  }

  getCredentials(): { username: string; rawPasswordDisplay?: string } {
    return {
      username: this.credentials.username,
      rawPasswordDisplay: this.credentials.rawPasswordDisplay
    };
  }

  /**
   * Start the Mobile Companion HTTP Server and Cloudflare Tunnel
   */
  async start(options: {
    tunnelType?: 'quick' | 'named';
    namedToken?: string;
    customHostname?: string;
    port?: number;
  }): Promise<{ success: boolean; status: MobileCompanionStatus; error?: string }> {
    if (this.server) {
      await this.stop();
    }

    this.port = options.port || 4848;

    try {
      // 1. Create HTTP Web Server
      this.server = http.createServer((req, res) => {
        this.handleHttpRequest(req, res);
      });

      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.port, '0.0.0.0', () => {
          logger.info(`[MobileCompanion] Server listening on http://localhost:${this.port}`);
          resolve();
        });
        this.server!.on('error', reject);
      });

      // 2. Launch Cloudflare Tunnel
      let publicUrl = '';
      const tunnelType = options.tunnelType || 'quick';

      if (tunnelType === 'quick') {
        const tunnel = await cloudflareService.startQuickTunnel({
          localPort: this.port,
          name: 'ProjectYB Mobile Remote'
        });
        this.activeTunnelId = tunnel.id;
        publicUrl = tunnel.publicUrl || '';
      } else if (tunnelType === 'named' && options.namedToken) {
        const tunnel = await cloudflareService.startNamedTunnel({
          name: 'ProjectYB Mobile Remote',
          tunnelToken: options.namedToken,
          localPort: this.port,
          customHostname: options.customHostname
        });
        if (tunnel) {
          this.activeTunnelId = tunnel.id;
          publicUrl = tunnel.publicUrl || (options.customHostname ? `https://${options.customHostname}` : '');
        }
      }

      const status = this.getStatus();
      status.publicUrl = publicUrl;
      this.emit('status', status);
      return { success: true, status };
    } catch (err: any) {
      logger.error('[MobileCompanion] Failed to start:', err);
      return { success: false, status: this.getStatus(), error: err.message };
    }
  }

  /**
   * Stop Mobile Companion Server and associated Tunnel
   */
  async stop(): Promise<boolean> {
    if (this.activeTunnelId) {
      try {
        await cloudflareService.stopTunnel(this.activeTunnelId);
      } catch {}
      this.activeTunnelId = null;
    }

    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }

    this.activeSessions.clear();
    this.emit('status', this.getStatus());
    return true;
  }

  getStatus(): MobileCompanionStatus {
    const activeTunnels = cloudflareService.listActiveTunnels();
    const tunnel = this.activeTunnelId ? activeTunnels.find((t) => t.id === this.activeTunnelId) : undefined;

    return {
      running: Boolean(this.server),
      port: this.port,
      localUrl: `http://localhost:${this.port}`,
      publicUrl: tunnel?.publicUrl,
      tunnelType: tunnel?.type as any,
      tunnelId: this.activeTunnelId || undefined,
      username: this.credentials.username,
      activeSessions: this.activeSessions.size
    };
  }

  private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    // Enable CORS for mobile fetch requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;

    // ── Static PWA Web App ──
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

    // ── API: Login ──
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      this.readJsonBody(req, (body) => {
        const { username, password } = body;
        if (
          username === this.credentials.username &&
          this.hashPassword(password || '') === this.credentials.passwordHash
        ) {
          const sessionToken = `ses_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
          this.activeSessions.add(sessionToken);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, token: sessionToken, username }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid username or password' }));
        }
      });
      return;
    }

    // ── Authentication Check for all other /api/* routes ──
    if (pathname.startsWith('/api/')) {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      if (!token || !this.activeSessions.has(token)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized session' }));
        return;
      }

      this.handleAuthenticatedApi(pathname, req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  private async handleAuthenticatedApi(pathname: string, req: http.IncomingMessage, res: http.ServerResponse) {
    // 1. System Telemetry & Status
    if (pathname === '/api/status' && req.method === 'GET') {
      try {
        const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);
        const terminals = terminalService.getAllTerminals();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            telemetry: {
              cpuUsage: Math.round(cpu.currentLoad || 0),
              memoryUsage: Math.round(((mem.used || 0) / (mem.total || 1)) * 100),
              memoryUsedMb: Math.round((mem.used || 0) / (1024 * 1024)),
              memoryTotalMb: Math.round((mem.total || 0) / (1024 * 1024)),
              terminalsCount: terminals.length
            }
          })
        );
      } catch (err: any) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
      return;
    }

    // 2. Recent Live Logs
    if (pathname === '/api/logs' && req.method === 'GET') {
      const logs = logStreamService.getRecentLogs(100);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, logs }));
      return;
    }

    // 3. Global Scratchpad Notes (Read / Write)
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

    // 4. Force Kill PID or Port
    if (pathname === '/api/services/force-kill' && req.method === 'POST') {
      this.readJsonBody(req, async (body) => {
        const { pid, port, terminalId } = body;
        const result = await serviceKillerService.forceKill({ pid, port, terminalId });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      });
      return;
    }

    // 5. Emergency Stop All
    if (pathname === '/api/emergency-stop' && req.method === 'POST') {
      terminalService.killAll();
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
   * Generates the standalone, beautiful, touch-friendly Mobile PWA Web Interface
   */
  private getMobilePwaHtml(): string {
    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#09090b">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>ProjectYB Mobile</title>
  <link rel="manifest" href="/manifest.json">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: '#8b5cf6',
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
  </style>
</head>
<body class="flex flex-col h-screen overflow-hidden select-none">
  
  <!-- Top App Bar -->
  <header class="h-14 border-b border-zinc-850 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 shrink-0 z-20">
    <div class="flex items-center gap-2">
      <div class="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-violet-600/30">YB</div>
      <span class="font-bold text-sm tracking-tight text-zinc-100">ProjectYB <span class="text-[10px] text-violet-400 font-mono font-normal">Remote</span></span>
    </div>
    <div id="authStatus" class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      <button onclick="logout()" class="text-xs text-zinc-400 hover:text-zinc-200">Logout</button>
    </div>
  </header>

  <!-- Login Modal -->
  <div id="loginView" class="fixed inset-0 bg-zinc-950 z-50 flex flex-col justify-center px-6">
    <div class="max-w-sm w-full mx-auto space-y-6">
      <div class="text-center space-y-2">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 mx-auto flex items-center justify-center shadow-xl shadow-violet-500/20">
          <span class="text-2xl font-black text-white">YB</span>
        </div>
        <h1 class="text-xl font-bold text-zinc-100">Remote Authentication</h1>
        <p class="text-xs text-zinc-400">Enter your ProjectYB desktop credentials to connect</p>
      </div>

      <form onsubmit="handleLogin(event)" class="space-y-4 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800">
        <div class="space-y-1">
          <label class="text-xs text-zinc-400">Username</label>
          <input id="usernameInput" type="text" value="admin" required class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500">
        </div>
        <div class="space-y-1">
          <label class="text-xs text-zinc-400">Password</label>
          <input id="passwordInput" type="password" placeholder="Password" required class="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-violet-500">
        </div>
        <button type="submit" id="loginBtn" class="w-full py-3 bg-violet-600 hover:bg-violet-500 font-semibold rounded-xl text-sm shadow-lg shadow-violet-600/30 transition-all">Unlock Remote HUD</button>
        <div id="loginError" class="text-xs text-rose-400 text-center hidden"></div>
      </form>
    </div>
  </div>

  <!-- Main View Container -->
  <main class="flex-1 overflow-y-auto p-4 space-y-4 pb-20 no-scrollbar" id="appView">
    
    <!-- Telemetry Cards -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 space-y-1.5">
        <div class="flex items-center justify-between text-xs text-zinc-400">
          <span>CPU Load</span>
          <span id="cpuText" class="font-mono font-bold text-violet-400">0%</span>
        </div>
        <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div id="cpuBar" class="h-full bg-violet-500 transition-all duration-300" style="width: 0%"></div>
        </div>
      </div>

      <div class="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-3.5 space-y-1.5">
        <div class="flex items-center justify-between text-xs text-zinc-400">
          <span>Memory</span>
          <span id="memText" class="font-mono font-bold text-cyan-400">0%</span>
        </div>
        <div class="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div id="memBar" class="h-full bg-cyan-500 transition-all duration-300" style="width: 0%"></div>
        </div>
      </div>
    </div>

    <!-- Quick Emergency Actions -->
    <div class="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
      <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-400">Remote Controls</h2>
      <div class="grid grid-cols-2 gap-2">
        <button onclick="triggerEmergencyStop()" class="py-2.5 px-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl text-xs font-semibold hover:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5">
          🛑 Kill All Terminals
        </button>
        <button onclick="refreshData()" class="py-2.5 px-3 bg-zinc-800/80 border border-zinc-700 text-zinc-200 rounded-xl text-xs font-semibold hover:bg-zinc-700 active:scale-95 transition-all flex items-center justify-center gap-1.5">
          🔄 Refresh Status
        </button>
      </div>
    </div>

    <!-- Mobile Scratchpad -->
    <div class="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-400">Quick Scratchpad</h2>
        <span id="noteSaveStatus" class="text-[10px] text-emerald-400 font-mono hidden">Saved</span>
      </div>
      <textarea id="notesArea" rows="4" placeholder="Type quick notes from your phone (syncs instantly to desktop)..." class="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-violet-500 resize-none font-mono"></textarea>
      <button onclick="saveNotes()" class="w-full py-2 bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-xl text-xs font-semibold hover:bg-violet-600/30 active:scale-95 transition-all">Save to Desktop</button>
    </div>

    <!-- Live LogStream -->
    <div class="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-4 space-y-2">
      <div class="flex items-center justify-between">
        <h2 class="text-xs font-bold uppercase tracking-wider text-zinc-400">Live LogStream</h2>
        <span class="text-[10px] text-zinc-500 font-mono">Last 100 lines</span>
      </div>
      <div id="logsContainer" class="h-44 bg-zinc-950 border border-zinc-850 rounded-xl p-2.5 font-mono text-[10px] text-zinc-300 overflow-y-auto space-y-1 no-scrollbar leading-relaxed">
        <div class="text-zinc-600">Connecting to LogStream...</div>
      </div>
    </div>

  </main>

  <!-- Bottom Touch Navigation -->
  <nav class="fixed bottom-0 inset-x-0 h-16 bg-zinc-950/90 border-t border-zinc-850 backdrop-blur-lg flex items-center justify-around px-4 z-20">
    <button onclick="refreshData()" class="flex flex-col items-center gap-1 text-violet-400">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
      <span class="text-[10px] font-medium">HUD</span>
    </button>
    <button onclick="document.getElementById('notesArea').focus()" class="flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
      <span class="text-[10px] font-medium">Notes</span>
    </button>
    <button onclick="loadLogs()" class="flex flex-col items-center gap-1 text-zinc-400 hover:text-zinc-200">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      <span class="text-[10px] font-medium">Logs</span>
    </button>
  </nav>

  <script>
    let token = localStorage.getItem('pyb_mobile_token') || '';

    function checkAuth() {
      if (token) {
        document.getElementById('loginView').classList.add('hidden');
        refreshData();
        loadNotes();
        loadLogs();
        setInterval(refreshData, 3000);
        setInterval(loadLogs, 3000);
      } else {
        document.getElementById('loginView').classList.remove('hidden');
      }
    }

    async function handleLogin(e) {
      e.preventDefault();
      const username = document.getElementById('usernameInput').value;
      const password = document.getElementById('passwordInput').value;
      const errEl = document.getElementById('loginError');

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success && data.token) {
          token = data.token;
          localStorage.setItem('pyb_mobile_token', token);
          checkAuth();
        } else {
          errEl.innerText = data.error || 'Authentication failed';
          errEl.classList.remove('hidden');
        }
      } catch (err) {
        errEl.innerText = 'Network error connecting to ProjectYB';
        errEl.classList.remove('hidden');
      }
    }

    function logout() {
      localStorage.removeItem('pyb_mobile_token');
      token = '';
      checkAuth();
    }

    async function apiFetch(endpoint, options = {}) {
      options.headers = options.headers || {};
      options.headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(endpoint, options);
      if (res.status === 401) {
        logout();
        throw new Error('Unauthorized');
      }
      return res.json();
    }

    async function refreshData() {
      if (!token) return;
      try {
        const data = await apiFetch('/api/status');
        if (data.success && data.telemetry) {
          const cpu = data.telemetry.cpuUsage;
          const mem = data.telemetry.memoryUsage;
          document.getElementById('cpuText').innerText = cpu + '%';
          document.getElementById('cpuBar').style.width = cpu + '%';
          document.getElementById('memText').innerText = mem + '%';
          document.getElementById('memBar').style.width = mem + '%';
        }
      } catch {}
    }

    async function loadLogs() {
      if (!token) return;
      try {
        const data = await apiFetch('/api/logs');
        if (data.success && Array.isArray(data.logs)) {
          const container = document.getElementById('logsContainer');
          if (data.logs.length === 0) {
            container.innerHTML = '<div class="text-zinc-600">No logs captured yet</div>';
            return;
          }
          container.innerHTML = data.logs.slice(-50).map(l => {
            const color = l.level === 'error' ? 'text-rose-400' : l.level === 'warn' ? 'text-amber-400' : 'text-zinc-300';
            return \`<div><span class="text-zinc-600">[\${l.timestamp.slice(11,19)}]</span> <span class="text-violet-400">[\${l.tag}]</span> <span class="\${color}">\${l.message}</span></div>\`;
          }).join('');
          container.scrollTop = container.scrollHeight;
        }
      } catch {}
    }

    async function loadNotes() {
      if (!token) return;
      try {
        const data = await apiFetch('/api/notes');
        if (data.success) {
          document.getElementById('notesArea').value = data.content || '';
        }
      } catch {}
    }

    async function saveNotes() {
      if (!token) return;
      const content = document.getElementById('notesArea').value;
      try {
        await apiFetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        });
        const status = document.getElementById('noteSaveStatus');
        status.classList.remove('hidden');
        setTimeout(() => status.classList.add('hidden'), 2000);
      } catch {}
    }

    async function triggerEmergencyStop() {
      if (!confirm('Are you sure you want to terminate all background terminals and processes?')) return;
      try {
        await apiFetch('/api/emergency-stop', { method: 'POST' });
        alert('Emergency Stop triggered successfully!');
        refreshData();
      } catch {}
    }

    checkAuth();
  </script>
</body>
</html>`;
  }
}

export const mobileCompanionService = new MobileCompanionService();
