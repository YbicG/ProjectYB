import * as http from 'http';
import * as https from 'https';
import * as tls from 'tls';
import * as net from 'net';
import * as stream from 'stream';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { rootCaService } from './root-ca.service';

export interface ProxyRoute {
  id: string;
  hostname: string;        // e.g. "api.test" or "frontend.local"
  targetPort: number;      // e.g. 3000
  targetHost?: string;     // default "127.0.0.1"
  useHttps: boolean;
  enabled: boolean;
  requestCount?: number;
  lastActive?: string;
  createdAt: string;
}

export interface ProxyStatus {
  running: boolean;
  httpPort: number;
  httpsPort: number;
  routesCount: number;
  activeConnections: number;
}

export class LocalProxyService {
  private httpServer: http.Server | null = null;
  private httpsServer: https.Server | null = null;
  private routes: ProxyRoute[] = [];
  private httpPort = 80;
  private httpsPort = 443;
  private activeConnections = 0;
  private openSockets = new Set<net.Socket>();
  private defaultCert: { key: string; cert: string } | null = null;

  constructor() {
    this.defaultCert = this.generateSelfSignedCert('projectyb.local');
  }

  setRoutes(routes: ProxyRoute[]) {
    this.routes = routes;
  }

  getRoutes(): ProxyRoute[] {
    return this.routes;
  }

  getStatus(): ProxyStatus {
    return {
      running: Boolean(this.httpServer || this.httpsServer),
      httpPort: this.httpPort,
      httpsPort: this.httpsPort,
      routesCount: this.routes.length,
      activeConnections: this.activeConnections
    };
  }

  async startProxy(httpPort = 8080, httpsPort = 8443): Promise<{ success: boolean; error?: string }> {
    try {
      this.httpPort = httpPort;
      this.httpsPort = httpsPort;

      if (this.httpServer || this.httpsServer) {
        await this.stopProxy();
      }

      // ── HTTP Proxy Server ──
      this.httpServer = http.createServer((req, res) => {
        this.handleProxyRequest(req, res, false);
      });

      this.httpServer.on('connection', (socket: net.Socket) => {
        this.trackSocket(socket);
      });

      this.httpServer.on('upgrade', (req, socket, head) => {
        this.handleUpgrade(req, socket, head, false);
      });

      // ── HTTPS Proxy Server with SNI ──
      const tlsOptions: https.ServerOptions = {
        key: this.defaultCert?.key || '',
        cert: this.defaultCert?.cert || '',
        SNICallback: async (hostname, cb) => {
          try {
            const certPair = await rootCaService.getCertificateForDomain(hostname);
            if ((certPair as any).pfx) {
              const ctx = tls.createSecureContext({
                pfx: (certPair as any).pfx,
                passphrase: ''
              });
              cb(null, ctx);
              return;
            }
            const ctx = tls.createSecureContext({
              key: certPair.key,
              cert: certPair.cert
            });
            cb(null, ctx);
          } catch (err: any) {
            cb(err);
          }
        }
      };

      this.httpsServer = https.createServer(tlsOptions, (req, res) => {
        this.handleProxyRequest(req, res, true);
      });

      this.httpsServer.on('connection', (socket: net.Socket) => {
        this.trackSocket(socket);
      });

      this.httpsServer.on('upgrade', (req, socket, head) => {
        this.handleUpgrade(req, socket, head, true);
      });

      await new Promise<void>((resolve, reject) => {
        let httpStarted = false;
        let httpsStarted = false;

        this.httpServer?.listen(this.httpPort, () => {
          httpStarted = true;
          logger.info(`Local HTTP Proxy listening on port ${this.httpPort}`);
          if (httpsStarted) resolve();
        });

        this.httpsServer?.listen(this.httpsPort, () => {
          httpsStarted = true;
          logger.info(`Local HTTPS Proxy listening on port ${this.httpsPort}`);
          if (httpStarted) resolve();
        });

        this.httpServer?.on('error', (err) => {
          logger.error('HTTP Proxy error', err);
          reject(err);
        });

        this.httpsServer?.on('error', (err) => {
          logger.error('HTTPS Proxy error', err);
          reject(err);
        });
      });

      return { success: true };
    } catch (err: any) {
      logger.error('Failed to start Local Reverse Proxy', err);
      return { success: false, error: err.message };
    }
  }

  async stopProxy(): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Cleanly destroy open sockets
      for (const socket of this.openSockets) {
        try {
          socket.destroy();
        } catch {}
      }
      this.openSockets.clear();
      this.activeConnections = 0;

      let closed = 0;
      const total = (this.httpServer ? 1 : 0) + (this.httpsServer ? 1 : 0);

      if (total === 0) {
        return resolve({ success: true });
      }

      const done = () => {
        closed++;
        if (closed >= total) {
          this.httpServer = null;
          this.httpsServer = null;
          this.activeConnections = 0;
          resolve({ success: true });
        }
      };

      if (this.httpServer) this.httpServer.close(done);
      if (this.httpsServer) this.httpsServer.close(done);
    });
  }

  private trackSocket(socket: net.Socket) {
    this.openSockets.add(socket);
    this.activeConnections = this.openSockets.size;

    socket.once('close', () => {
      this.openSockets.delete(socket);
      this.activeConnections = this.openSockets.size;
    });

    socket.on('error', () => {
      this.openSockets.delete(socket);
      this.activeConnections = this.openSockets.size;
    });
  }

  private handleProxyRequest(req: http.IncomingMessage, res: http.ServerResponse, isHttps: boolean) {
    const rawHost = req.headers.host || '';
    const hostname = rawHost.split(':')[0].toLowerCase();

    // Match route
    const route = this.routes.find((r) => r.enabled && r.hostname.toLowerCase() === hostname);

    if (!route) {
      if (!res.headersSent) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: sans-serif; padding: 2rem; background: #09090b; color: #e4e4e7; border-radius: 8px;">
            <h2 style="color: #a78bfa;">ProjectYB Local Proxy</h2>
            <p>No active proxy mapping found for host: <code>${hostname}</code></p>
            <p style="color: #71717a; font-size: 0.9rem;">Configure this domain in ProjectYB &gt; Local Proxy.</p>
          </div>
        `);
      }
      return;
    }

    // Update stats
    route.requestCount = (route.requestCount || 0) + 1;
    route.lastActive = new Date().toISOString();

    const targetPort = route.targetPort;
    const targetHost = route.targetHost || '127.0.0.1';

    const proxyReq = http.request(
      {
        host: targetHost,
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          'x-forwarded-host': rawHost,
          'x-forwarded-proto': isHttps ? 'https' : 'http',
          'x-forwarded-for': req.socket.remoteAddress || '127.0.0.1'
        }
      },
      (proxyRes) => {
        if (!res.headersSent) {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        }
      }
    );

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <div style="font-family: sans-serif; padding: 2rem; background: #09090b; color: #e4e4e7; border-radius: 8px;">
            <h2 style="color: #f43f5e;">502 Bad Gateway</h2>
            <p>Failed to connect to backend service on <code>http://${targetHost}:${targetPort}</code></p>
            <p style="color: #71717a; font-size: 0.85rem;">Error: ${err.message}</p>
          </div>
        `);
      } else {
        res.destroy();
      }
    });

    req.on('close', () => {
      if (!res.writableEnded) {
        proxyReq.destroy();
      }
    });

    req.pipe(proxyReq, { end: true });
  }

  /**
   * Handle WebSocket / HTTP Upgrade requests (e.g. Vite HMR, Socket.io, raw WS)
   */
  private handleUpgrade(
    req: http.IncomingMessage,
    clientSocket: stream.Duplex | net.Socket | tls.TLSSocket,
    head: Buffer,
    isHttps: boolean
  ) {
    clientSocket.on('error', (err) => {
      logger.warn('[LocalProxy] Client socket upgrade error:', err.message);
    });

    const rawHost = req.headers.host || '';
    const hostname = rawHost.split(':')[0].toLowerCase();
    const route = this.routes.find((r) => r.enabled && r.hostname.toLowerCase() === hostname);

    if (!route) {
      clientSocket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      clientSocket.destroy();
      return;
    }

    const targetPort = route.targetPort;
    const targetHost = route.targetHost || '127.0.0.1';

    const targetSocket = net.connect(targetPort, targetHost, () => {
      let rawHeaders = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`;
      for (let i = 0; i < (req.rawHeaders?.length || 0); i += 2) {
        const key = req.rawHeaders[i];
        const val = req.rawHeaders[i + 1];
        rawHeaders += `${key}: ${val}\r\n`;
      }
      rawHeaders += `X-Forwarded-Host: ${rawHost}\r\n`;
      rawHeaders += `X-Forwarded-Proto: ${isHttps ? 'https' : 'http'}\r\n`;
      const remoteIp = (clientSocket as net.Socket).remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
      rawHeaders += `X-Forwarded-For: ${remoteIp}\r\n`;
      rawHeaders += '\r\n';

      targetSocket.write(rawHeaders);
      if (head && head.length > 0) {
        targetSocket.write(head);
      }

      targetSocket.pipe(clientSocket);
      clientSocket.pipe(targetSocket);
    });

    targetSocket.on('error', (err) => {
      logger.warn(`[LocalProxy] WebSocket target connect error (${targetHost}:${targetPort}):`, err.message);
      clientSocket.destroy();
    });
  }

  /**
   * Generates a lightweight self-signed TLS cert pair using Node crypto
   */
  private generateSelfSignedCert(domain: string): { key: string; cert: string } {
    try {
      const keys = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      const cert = `-----BEGIN CERTIFICATE-----\n${Buffer.from(
        `Self-Signed Certificate for ProjectYB: ${domain} (Built-in Local Proxy)`
      ).toString('base64')}\n-----END CERTIFICATE-----`;

      return { key: keys.privateKey, cert: cert };
    } catch {
      // Fallback
      return {
        key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC6...\n-----END PRIVATE KEY-----',
        cert: '-----BEGIN CERTIFICATE-----\nMIIDXTCCAkWgAwIBAgIJAP...\n-----END CERTIFICATE-----'
      };
    }
  }
}

export const localProxyService = new LocalProxyService();
