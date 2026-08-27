import { ipcMain, BrowserWindow } from 'electron';
import { systemMonitor } from '../services/system-monitor';

export function setupSystemIpc(mainWindow: BrowserWindow) {
  systemMonitor.startMonitoring(mainWindow);
  
  ipcMain.on('system:stop-monitor', () => {
    systemMonitor.stopMonitoring();
  });
  
  ipcMain.handle('system:getMetrics', async () => {
    // Return empty or current metrics if we had them saved
    return null;
  });
  
  ipcMain.handle('system:getProcessStats', (_, pids: number[]) => systemMonitor.getProcessStats(pids));
}
