import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cloudflareService } from '../src/main/services/cloudflare.service';
import { cloudflareApiService } from '../src/main/services/cloudflare-api.service';

describe('CloudflareService & CloudflareApiService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('CloudflareService Binary Status', () => {
    it('detects binary status and returns valid object', async () => {
      const status = await cloudflareService.getBinaryStatus();
      expect(status).toHaveProperty('installed');
      expect(status).toHaveProperty('source');
      if (status.installed) {
        expect(status.binaryPath).toBeDefined();
        expect(status.version).toBeDefined();
      }
    });
  });

  describe('CloudflareService API Token Testing', () => {
    it('verifies token successfully via user/tokens/verify endpoint', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          result: { id: 'token-123', status: 'active' }
        })
      } as any);

      const result = await cloudflareService.testApiToken('valid-token');
      expect(result.success).toBe(true);
      expect(result.message).toContain('verified successfully');
    });

    it('falls back to accounts verification when user/tokens/verify is forbidden', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => ({
            success: false,
            errors: [{ message: 'Forbidden' }]
          })
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: [{ id: 'acc-1', name: 'Primary Account' }]
          })
        } as any);

      const result = await cloudflareService.testApiToken('account-scoped-token');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Account access');
    });

    it('falls back to Zero Trust tunnel check when accountId is provided and account listing fails', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => ({
            success: false,
            errors: [{ message: 'Forbidden user verify' }]
          })
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({
            success: false,
            errors: [{ message: 'Forbidden list accounts' }]
          })
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: [{ id: 'tun-1', name: 'my-tunnel' }]
          })
        } as any);

      const result = await cloudflareService.testApiToken('tunnel-scoped-token', 'my-acc-id');
      expect(result.success).toBe(true);
      expect(result.message).toContain('Zero Trust account tunnel access');
    });
  });

  describe('CloudflareService Remote Tunnels', () => {
    it('lists remote named tunnels and enriches with ingress hostnames', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: [
              {
                id: 'tun-101',
                name: 'staging-app',
                status: 'healthy',
                created_at: '2026-09-01T00:00:00Z',
                connections: [{ id: 'conn-1' }]
              }
            ]
          })
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: {
              config: {
                ingress: [
                  { hostname: 'staging.company.com', service: 'http://localhost:3000' },
                  { service: 'http_status:404' }
                ]
              }
            }
          })
        } as any);

      const list = await cloudflareService.listRemoteTunnels('mock-token', 'mock-account');
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('tun-101');
      expect(list[0].name).toBe('staging-app');
      expect(list[0].hostname).toBe('staging.company.com');
      expect(list[0].connectionsCount).toBe(1);
    });

    it('creates remote tunnel and fetches run token', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: {
              id: 'tun-202',
              name: 'new-tunnel',
              status: 'inactive',
              created_at: '2026-09-10T00:00:00Z'
            }
          })
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token'
          })
        } as any);

      const result = await cloudflareService.createRemoteTunnel('token', 'account', 'new-tunnel');
      expect(result.success).toBe(true);
      expect(result.tunnel?.id).toBe('tun-202');
      expect(result.token).toContain('eyJ');
    });

    it('gracefully recovers and connects to existing tunnel if tunnel name already exists', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => ({
            success: false,
            errors: [{ code: 1003, message: 'A tunnel with the name already exists' }]
          })
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: [
              {
                id: 'existing-tun-303',
                name: 'reused-tunnel',
                status: 'healthy',
                created_at: '2026-08-01T00:00:00Z'
              }
            ]
          })
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: 'existing-token-xyz'
          })
        } as any);

      const result = await cloudflareService.createRemoteTunnel('token', 'account', 'reused-tunnel');
      expect(result.success).toBe(true);
      expect(result.tunnel?.id).toBe('existing-tun-303');
      expect(result.token).toBe('existing-token-xyz');
    });
  });

  describe('CloudflareApiService', () => {
    it('creates named tunnel and fetches run token', async () => {
      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: {
              id: 'api-tun-1',
              name: 'api-app'
            }
          })
        } as any)
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: 'base64-run-token-123'
          })
        } as any);

      const res = await cloudflareApiService.createNamedTunnel('api-app', {
        apiToken: 'tok',
        accountId: 'acc'
      });

      expect(res.success).toBe(true);
      expect(res.tunnelId).toBe('api-tun-1');
      expect(res.token).toBe('base64-run-token-123');
    });

    it('configures ingress routing while preserving existing ingress rules', async () => {
      let putBody: any = null;

      globalThis.fetch = vi.fn()
        .mockResolvedValueOnce({
          json: async () => ({
            success: true,
            result: {
              config: {
                ingress: [
                  { hostname: 'first.app.com', service: 'http://localhost:8000' },
                  { service: 'http_status:404' }
                ]
              }
            }
          })
        } as any)
        .mockImplementationOnce((_url, options: any) => {
          putBody = JSON.parse(options.body);
          return Promise.resolve({
            json: async () => ({ success: true })
          } as any);
        });

      const res = await cloudflareApiService.configureIngress('tun-1', 'second.app.com', 3000, {
        apiToken: 'tok',
        accountId: 'acc'
      });

      expect(res.success).toBe(true);
      expect(res.hostname).toBe('second.app.com');
      expect(putBody).toBeDefined();
      expect(putBody.config.ingress.length).toBe(3);
      expect(putBody.config.ingress[0].hostname).toBe('first.app.com');
      expect(putBody.config.ingress[1].hostname).toBe('second.app.com');
      expect(putBody.config.ingress[1].service).toBe('http://localhost:3000');
      expect(putBody.config.ingress[2].service).toBe('http_status:404');
    });
  });
});
