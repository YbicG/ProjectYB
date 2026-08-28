import { ipcMain } from 'electron';
import { serviceKillerService } from '../services/service-killer.service';

export function registerServiceKillerIpc() {
  ipcMain.handle('services:forceKill', async (_, options: { pid?: number; port?: number; terminalId?: string }) => {
    return serviceKillerService.forceKill(options);
  });

  ipcMain.handle('services:findPidsOnPort', async (_, port: number) => {
    return serviceKillerService.findPidsOnPort(port);
  });
}
