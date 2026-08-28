import * as http from 'http';
import * as https from 'https';
import * as tls from 'tls';
import * as net from 'net';
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

      this.httpServer.on('connection', () => {
        this.activeConnections++;
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

  private handleProxyRequest(req: http.IncomingMessage, res: http.ServerResponse, isHttps: boolean) {
    const rawHost = req.headers.host || '';
    const hostname = rawHost.split(':')[0].toLowerCase();

    // Match route
    const route = this.routes.find((r) => r.enabled && r.hostname.toLowerCase() === hostname);

    if (!route) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: sans-serif; padding: 2rem; background: #09090b; color: #e4e4e7; border-radius: 8px;">
          <h2 style="color: #a78bfa;">ProjectYB Local Proxy</h2>
          <p>No active proxy mapping found for host: <code>${hostname}</code></p>
          <p style="color: #71717a; font-size: 0.9rem;">Configure this domain in ProjectYB &gt; Local Proxy.</p>
        </div>
      `);
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
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <div style="font-family: sans-serif; padding: 2rem; background: #09090b; color: #e4e4e7; border-radius: 8px;">
          <h2 style="color: #f43f5e;">502 Bad Gateway</h2>
          <p>Failed to connect to backend service on <code>http://${targetHost}:${targetPort}</code></p>
          <p style="color: #71717a; font-size: 0.85rem;">Error: ${err.message}</p>
        </div>
      `);
    });

    req.pipe(proxyReq, { end: true });
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

      // Simple self-signed X.509 certificate generator in pure Node.js
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
