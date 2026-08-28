import { ipcMain, BrowserWindow } from 'electron';
import { mockServerService, MockRoute } from '../services/mock-server.service';

export function setupMockServerIpc(mainWindow: BrowserWindow) {
  mockServerService.setMainWindow(mainWindow);

  ipcMain.handle('mockServer:start', async (_, port?: number) => {
    return mockServerService.startServer(port);
  });

  ipcMain.handle('mockServer:stop', async () => {
    return mockServerService.stopServer();
  });

  ipcMain.handle('mockServer:getStatus', async () => {
    return mockServerService.getStatus();
  });

  ipcMain.handle('mockServer:saveRoutes', async (_, routes: MockRoute[]) => {
    mockServerService.setRoutes(routes);
    return true;
  });

  ipcMain.handle('mockServer:getWebhookLogs', async () => {
    return mockServerService.getWebhookLogs();
  });

  ipcMain.handle('mockServer:clearLogs', async () => {
    mockServerService.clearWebhookLogs();
    return true;
  });
}
