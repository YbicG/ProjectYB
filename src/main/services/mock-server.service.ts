import * as http from 'http';
import * as url from 'url';
import { BrowserWindow } from 'electron';

export interface MockRoute {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  statusCode: number;
  responseBody: string;
  delayMs?: number;
  enabled: boolean;
}

export interface WebhookEvent {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: string;
  ip: string;
  matchedRoute?: string;
}

export interface MockServerStatus {
  running: boolean;
  port: number;
  routesCount: number;
  webhooksCount: number;
}

export class MockServerService {
  private server: http.Server | null = null;
  private routes: MockRoute[] = [];
  private webhookLogs: WebhookEvent[] = [];
  private port: number = 4100;
  private mainWindow: BrowserWindow | null = null;

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  setRoutes(routes: MockRoute[]) {
    this.routes = routes;
  }

  getStatus(): MockServerStatus {
    return {
      running: !!this.server,
      port: this.port,
      routesCount: this.routes.length,
      webhooksCount: this.webhookLogs.length
    };
  }

  getWebhookLogs(): WebhookEvent[] {
    return this.webhookLogs;
  }

  clearWebhookLogs() {
    this.webhookLogs = [];
  }

  startServer(port: number = 4100): Promise<{ success: boolean; port: number; error?: string }> {
    return new Promise((resolve) => {
      if (this.server) {
        return resolve({ success: true, port: this.port });
      }

      this.port = port;
      this.server = http.createServer(async (req, res) => {
        // Enable CORS for easy dev testing
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const parsedUrl = url.parse(req.url || '/', true);
        const reqPath = parsedUrl.pathname || '/';
        const reqMethod = req.method?.toUpperCase() || 'GET';

        // Collect body chunks
        const chunks: Buffer[] = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', async () => {
          const rawBody = Buffer.concat(chunks).toString();

          // Check if matches defined mock route
          const matched = this.routes.find((r) => {
            if (!r.enabled) return false;
            const methodMatches = r.method === 'ALL' || r.method === reqMethod;
            const pathMatches = r.path === reqPath || this.matchDynamicRoute(r.path, reqPath);
            return methodMatches && pathMatches;
          });

          // Log request / webhook event
          const headersObj: Record<string, string> = {};
          for (const [k, v] of Object.entries(req.headers)) {
            if (v) headersObj[k] = Array.isArray(v) ? v.join(', ') : v;
          }

          const queryObj: Record<string, string> = {};
          for (const [k, v] of Object.entries(parsedUrl.query)) {
            if (v) queryObj[k] = Array.isArray(v) ? v.join(', ') : v;
          }

          const event: WebhookEvent = {
            id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: Date.now(),
            method: reqMethod,
            path: reqPath,
            headers: headersObj,
            query: queryObj,
            body: rawBody,
            ip: req.socket.remoteAddress || '127.0.0.1',
            matchedRoute: matched ? matched.name || matched.path : undefined
          };

          this.webhookLogs.unshift(event);
          if (this.webhookLogs.length > 100) this.webhookLogs.pop();

          this.emitWebhook(event);

          // If route matched, apply response
          if (matched) {
            if (matched.delayMs && matched.delayMs > 0) {
              await new Promise((r) => setTimeout(r, matched.delayMs));
            }

            res.statusCode = matched.statusCode || 200;
            if (res.statusCode === 204) {
              res.end();
            } else {
              const bodyStr = matched.responseBody ?? JSON.stringify({ status: 'ok' });
              const trimmedBody = bodyStr.trim();
              const isJson =
                (trimmedBody.startsWith('{') && trimmedBody.endsWith('}')) ||
                (trimmedBody.startsWith('[') && trimmedBody.endsWith(']'));
              res.setHeader('Content-Type', isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8');
              res.end(bodyStr);
            }
          } else {
            // Default Webhook receiver ack
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                status: 'received',
                message: 'ProjectYB Webhook Catcher received payload',
                receivedAt: new Date().toISOString()
              })
            );
          }
        });
      });

      this.server.listen(port, () => {
        resolve({ success: true, port });
      });

      this.server.on('error', (err: any) => {
        this.server = null;
        resolve({ success: false, port, error: err.message });
      });
    });
  }

  stopServer(): boolean {
    if (this.server) {
      this.server.close();
      this.server = null;
      return true;
    }
    return false;
  }

  private matchDynamicRoute(routePattern: string, actualPath: string): boolean {
    const patternParts = routePattern.split('/').filter(Boolean);
    const pathParts = actualPath.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) return false;

    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) continue; // param wildcard
      if (patternParts[i] !== pathParts[i]) return false;
    }
    return true;
  }

  private emitWebhook(event: WebhookEvent) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('mock:webhook-received', event);
    }
  }
}

export const mockServerService = new MockServerService();
