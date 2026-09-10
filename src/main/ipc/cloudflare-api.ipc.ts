import { ipcMain } from 'electron';
import { cloudflareApiService, type CloudflareApiConfig } from '../services/cloudflare-api.service';

export function setupCloudflareApiIpc() {
  ipcMain.handle('cloudflare:api:verify', async (_, config: CloudflareApiConfig) => {
    return cloudflareApiService.verifyCredentials(config);
  });

  ipcMain.handle('cloudflare:api:listZones', async (_, config: CloudflareApiConfig) => {
    return cloudflareApiService.listZones(config);
  });

  ipcMain.handle('cloudflare:api:createNamedTunnel', async (_, name: string, config: CloudflareApiConfig) => {
    return cloudflareApiService.createNamedTunnel(name, config);
  });

  ipcMain.handle('cloudflare:api:getTunnelToken', async (_, tunnelId: string, config: CloudflareApiConfig) => {
    return cloudflareApiService.getTunnelToken(tunnelId, config);
  });

  ipcMain.handle(
    'cloudflare:api:configureIngress',
    async (_, tunnelId: string, hostname: string, localPort: number, config: CloudflareApiConfig) => {
      return cloudflareApiService.configureIngress(tunnelId, hostname, localPort, config);
    }
  );

  ipcMain.handle(
    'cloudflare:api:createDnsCname',
    async (_, zoneId: string, subdomain: string, tunnelId: string, config: CloudflareApiConfig) => {
      return cloudflareApiService.createDnsCname(zoneId, subdomain, tunnelId, config);
    }
  );

  ipcMain.handle(
    'cloudflare:api:getConfiguration',
    async (_, tunnelId: string, config: CloudflareApiConfig) => {
      return cloudflareApiService.getConfiguration(tunnelId, config);
    }
  );
}
