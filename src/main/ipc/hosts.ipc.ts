import { ipcMain } from 'electron';
import { hostsService } from '../services/hosts.service';

export function setupHostsIpc() {
  ipcMain.handle('hosts:checkStatus', async (_, domains: string[]) => {
    return hostsService.checkDomainsStatus(domains);
  });

  ipcMain.handle('hosts:getMappedDomains', async () => {
    return hostsService.getMappedDomains();
  });

  ipcMain.handle('hosts:syncDomains', async (_, domains: string[]) => {
    return hostsService.syncManagedDomains(domains);
  });

  ipcMain.handle('hosts:clearDomains', async () => {
    return hostsService.clearManagedDomains();
  });

  ipcMain.handle('hosts:readRaw', async () => {
    return hostsService.readRawHosts();
  });
}
