import { ipcMain, BrowserWindow } from 'electron';
import { systemMonitor } from '../services/system-monitor';

export function setupSystemIpc(mainWindow: BrowserWindow) {
  ipcMain.on('system:start-monitor', (_, intervalMs?: number) => {
    systemMonitor.startMonitoring((metrics) => {
      mainWindow.webContents.send('system:metrics-update', metrics);
    }, intervalMs);
  });
  ipcMain.on('system:stop-monitor', () => {
    systemMonitor.stopMonitoring();
  });
  ipcMain.handle('system:get-process-stats', (_, pids: number[]) => systemMonitor.getProcessStats(pids));
}
