import { ipcMain } from 'electron';
import { portResolverService } from '../services/port-resolver.service';

export function registerPortResolverIpc(): void {
  ipcMain.handle('portResolver:findAvailablePort', async (_e, startPort?: number) => {
    return portResolverService.findAvailablePort(startPort);
  });

  ipcMain.handle('portResolver:getPortProcess', async (_e, port: number) => {
    return portResolverService.getPortProcess(port);
  });

  ipcMain.handle('portResolver:killPortProcess', async (_e, port: number) => {
    return portResolverService.killPortProcess(port);
  });

  ipcMain.handle('portResolver:updateEnvPort', async (_e, projectPath: string, newPort: number) => {
    return portResolverService.updateEnvPort(projectPath, newPort);
  });
}