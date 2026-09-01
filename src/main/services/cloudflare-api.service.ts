import { logger } from '../utils/logger';

export interface CloudflareApiConfig {
  apiToken: string;
  accountId: string;
}

export interface CloudflareZone {
  id: string;
  name: string;
  status: string;
}

export interface CreateNamedTunnelResult {
  success: boolean;
  tunnelId?: string;
  name?: string;
  token?: string;
  error?: string;
}

export interface ConfigureIngressResult {
  success: boolean;
  hostname?: string;
  error?: string;
}

export interface CreateDnsResult {
  success: boolean;
  recordId?: string;
  hostname?: string;
  error?: string;
}

export class CloudflareApiService {
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  /**
   * Verify API token and account ID
   */
  async verifyCredentials(config: CloudflareApiConfig): Promise<{ success: boolean; accountName?: string; error?: string }> {
    try {
      if (!config.apiToken) return { success: false, error: 'API token is required' };
      if (!config.accountId) return { success: false, error: 'Account ID is required' };

      const res = await fetch(`${this.baseUrl}/accounts/${config.accountId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = (await res.json()) as any;
      if (!data.success) {
        const errorMsg = data.errors?.[0]?.message || 'Invalid API token or Account ID';
        return { success: false, error: errorMsg };
      }

      return {
        success: true,
        accountName: data.result?.name || config.accountId
      };
    } catch (err: any) {
      logger.error('Failed to verify Cloudflare credentials', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * List user DNS Zones / Domains
   */
  async listZones(config: CloudflareApiConfig): Promise<{ success: boolean; zones: CloudflareZone[]; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/zones?account.id=${config.accountId}&status=active&per_page=50`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = (await res.json()) as any;
      if (!data.success) {
        return { success: false, zones: [], error: data.errors?.[0]?.message || 'Failed to list zones' };
      }

      const zones: CloudflareZone[] = (data.result || []).map((z: any) => ({
        id: z.id,
        name: z.name,
        status: z.status
      }));

      return { success: true, zones };
    } catch (err: any) {
      logger.error('Failed to list Cloudflare zones', err);
      return { success: false, zones: [], error: err.message };
    }
  }

  /**
   * 1-Click Provision Named Tunnel
   * Calls POST /accounts/{account_id}/cfd_tunnel with config_src: "cloudflare"
   */
  async createNamedTunnel(name: string, config: CloudflareApiConfig): Promise<CreateNamedTunnelResult> {
    try {
      if (!name || !config.apiToken || !config.accountId) {
        return { success: false, error: 'Missing tunnel name, API token, or account ID' };
      }

      // Step 1: Create Tunnel
      const createRes = await fetch(`${this.baseUrl}/accounts/${config.accountId}/cfd_tunnel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiToken.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          config_src: 'cloudflare'
        })
      });

      const createData = (await createRes.json()) as any;
      if (!createData.success) {
        const errMsg = createData.errors?.[0]?.message || 'Failed to create Cloudflare tunnel';
        return { success: false, error: errMsg };
      }

      const tunnelId = createData.result?.id;
      if (!tunnelId) {
        return { success: false, error: 'Tunnel created but no ID was returned' };
      }

      // Step 2: Fetch the Run Token
      const tokenResult = await this.getTunnelToken(tunnelId, config);
      if (!tokenResult.success || !tokenResult.token) {
        return {
          success: true,
          tunnelId,
          name: createData.result?.name || name,
          error: tokenResult.error || 'Created tunnel, but failed to fetch run token automatically'
        };
      }

      return {
        success: true,
        tunnelId,
        name: createData.result?.name || name,
        token: tokenResult.token
      };
    } catch (err: any) {
      logger.error(`Failed to create named tunnel "${name}"`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Get the Base64 Run Token for a tunnel
   * GET /accounts/{account_id}/cfd_tunnel/{tunnel_id}/token
   */
  async getTunnelToken(tunnelId: string, config: CloudflareApiConfig): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/accounts/${config.accountId}/cfd_tunnel/${tunnelId}/token`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.apiToken.trim()}`,
          'Content-Type': 'application/json'
        }
      });

      const data = (await res.json()) as any;
      if (!data.success) {
        return { success: false, error: data.errors?.[0]?.message || 'Failed to get tunnel token' };
      }

      const token = data.result;
      if (typeof token === 'string') {
        return { success: true, token };
      }

      return { success: false, error: 'Invalid token response format from Cloudflare' };
    } catch (err: any) {
      logger.error(`Failed to get token for tunnel ${tunnelId}`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Configure Remote Ingress Routing
   * PUT /accounts/{account_id}/cfd_tunnel/{tunnel_id}/configurations
   */
  async configureIngress(
    tunnelId: string,
    hostname: string,
    localPort: number,
    config: CloudflareApiConfig
  ): Promise<ConfigureIngressResult> {
    try {
      const ingress = [
        {
          hostname: hostname.trim(),
          service: `http://localhost:${localPort}`
        },
        {
          service: 'http_status:404'
        }
      ];

      const res = await fetch(`${this.baseUrl}/accounts/${config.accountId}/cfd_tunnel/${tunnelId}/configurations`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${config.apiToken.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          config: { ingress }
        })
      });

      const data = (await res.json()) as any;
      if (!data.success) {
        return { success: false, error: data.errors?.[0]?.message || 'Failed to configure remote ingress' };
      }

      return { success: true, hostname };
    } catch (err: any) {
      logger.error(`Failed to configure ingress for tunnel ${tunnelId}`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Create CNAME DNS record in Cloudflare Zone
   * POST /zones/{zone_id}/dns_records
   */
  async createDnsCname(
    zoneId: string,
    subdomain: string,
    tunnelId: string,
    config: CloudflareApiConfig
  ): Promise<CreateDnsResult> {
    const trimmedSubdomain = subdomain.trim();
    const cnameTarget = `${tunnelId}.cfargotunnel.com`;

    try {
      const res = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiToken.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: trimmedSubdomain,
          content: cnameTarget,
          proxied: true,
          ttl: 1 // Auto
        })
      });

      const data = (await res.json()) as any;
      if (data.success) {
        return {
          success: true,
          recordId: data.result?.id,
          hostname: data.result?.name
        };
      }

      // Check if error is due to record already existing -> find and update it
      const alreadyExists =
        data.errors?.some((e: any) => e.code === 81053 || String(e.message).toLowerCase().includes('already exists'));

      if (alreadyExists) {
        try {
          const searchRes = await fetch(
            `${this.baseUrl}/zones/${zoneId}/dns_records?name=${encodeURIComponent(trimmedSubdomain)}`,
            {
              headers: {
                Authorization: `Bearer ${config.apiToken.trim()}`,
                'Content-Type': 'application/json'
              }
            }
          );
          const searchData = (await searchRes.json()) as any;
          if (searchData.success && searchData.result && searchData.result.length > 0) {
            const existingRecord = searchData.result[0];
            const updateRes = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records/${existingRecord.id}`, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${config.apiToken.trim()}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                type: 'CNAME',
                name: trimmedSubdomain,
                content: cnameTarget,
                proxied: true,
                ttl: 1
              })
            });
            const updateData = (await updateRes.json()) as any;
            if (updateData.success) {
              return {
                success: true,
                recordId: updateData.result?.id,
                hostname: updateData.result?.name
              };
            }
          }
        } catch {}
      }

      return { success: false, error: data.errors?.[0]?.message || 'Failed to create CNAME DNS record' };
    } catch (err: any) {
      logger.error(`Failed to create CNAME record in zone ${zoneId}`, err);
      return { success: false, error: err.message };
    }
  }
}

export const cloudflareApiService = new CloudflareApiService();
