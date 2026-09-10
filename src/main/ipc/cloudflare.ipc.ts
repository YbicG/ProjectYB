import { ipcMain, BrowserWindow } from 'electron';
import { cloudflareService } from '../services/cloudflare.service';

export function setupCloudflareIpc(mainWindow: BrowserWindow) {
  cloudflareService.setMainWindow(mainWindow);

  // Binary management
  ipcMain.handle('cloudflare:getBinaryStatus', async () => {
    return cloudflareService.getBinaryStatus();
  });

  ipcMain.handle('cloudflare:installBinary', async () => {
    return cloudflareService.downloadBinary((percent) => {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('cloudflare:download-progress', percent);
      }
    });
  });

  // Tunnel management
  ipcMain.handle('cloudflare:startQuickTunnel', async (_, options: {
    id?: string;
    name?: string;
    localPort: number;
    localHost?: string;
    protocol?: 'http' | 'https' | 'tcp';
  }) => {
    return cloudflareService.startQuickTunnel(options);
  });

  ipcMain.handle('cloudflare:startNamedTunnel', async (_, options: {
    id?: string;
    name: string;
    tunnelToken: string;
    localPort?: number;
    customHostname?: string;
  }) => {
    return cloudflareService.startNamedTunnel(options);
  });

  ipcMain.handle('cloudflare:stopTunnel', async (_, tunnelId: string) => {
    return cloudflareService.stopTunnel(tunnelId);
  });

  ipcMain.handle('cloudflare:listActiveTunnels', async () => {
    return cloudflareService.listActiveTunnels();
  });

  ipcMain.handle('cloudflare:getTunnelLogs', async (_, tunnelId: string) => {
    return cloudflareService.getTunnelLogs(tunnelId);
  });

  // Cloudflare REST API management
  ipcMain.handle('cloudflare:testApiToken', async (_, apiToken: string, accountId?: string) => {
    return cloudflareService.testApiToken(apiToken, accountId);
  });

  ipcMain.handle('cloudflare:listAccounts', async (_, apiToken: string) => {
    return cloudflareService.listAccounts(apiToken);
  });

  ipcMain.handle('cloudflare:listRemoteTunnels', async (_, apiToken: string, accountId: string) => {
    return cloudflareService.listRemoteTunnels(apiToken, accountId);
  });

  ipcMain.handle('cloudflare:createRemoteTunnel', async (_, apiToken: string, accountId: string, name: string) => {
    return cloudflareService.createRemoteTunnel(apiToken, accountId, name);
  });

  ipcMain.handle('cloudflare:getRemoteTunnelToken', async (_, apiToken: string, accountId: string, tunnelId: string) => {
    return cloudflareService.getRemoteTunnelToken(apiToken, accountId, tunnelId);
  });

  ipcMain.handle('cloudflare:deleteRemoteTunnel', async (_, apiToken: string, accountId: string, tunnelId: string) => {
    return cloudflareService.deleteRemoteTunnel(apiToken, accountId, tunnelId);
  });
}
