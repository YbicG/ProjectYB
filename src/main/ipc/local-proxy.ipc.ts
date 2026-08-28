import { ipcMain } from 'electron';
import { localProxyService, type ProxyRoute } from '../services/local-proxy.service';

export function setupLocalProxyIpc() {
  ipcMain.handle('proxy:start', async (_, httpPort?: number, httpsPort?: number) => {
    return localProxyService.startProxy(httpPort, httpsPort);
  });

  ipcMain.handle('proxy:stop', async () => {
    return localProxyService.stopProxy();
  });

  ipcMain.handle('proxy:getStatus', async () => {
    return localProxyService.getStatus();
  });

  ipcMain.handle('proxy:setRoutes', async (_, routes: ProxyRoute[]) => {
    localProxyService.setRoutes(routes);
    return { success: true };
  });

  ipcMain.handle('proxy:getRoutes', async () => {
    return localProxyService.getRoutes();
  });
}
