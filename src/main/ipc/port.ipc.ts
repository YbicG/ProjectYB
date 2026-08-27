import { ipcMain } from 'electron';
import { portService } from '../services/port.service';

export function setupPortIpc() {
  ipcMain.handle('ports:list', () => portService.getListeningPorts());
  ipcMain.handle('ports:check', (_, port: number) => portService.checkPort(port));
  ipcMain.handle('ports:suggest', (_, startPort?: number) => portService.findAvailablePort(startPort));
  ipcMain.handle('ports:kill', (_, pid: number) => portService.killProcess(pid));
}
