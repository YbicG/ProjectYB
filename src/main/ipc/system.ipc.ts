import { ipcMain, BrowserWindow, Notification, dialog } from 'electron';
import { systemMonitor } from '../services/system-monitor';
import { trayService } from '../services/tray.service';

export function setupSystemIpc(mainWindow: BrowserWindow) {
  systemMonitor.startMonitoring(mainWindow);
  
  ipcMain.on('system:stop-monitor', () => {
    systemMonitor.stopMonitoring();
  });
  
  ipcMain.handle('system:selectDirectory', async () => {
    try {
      const res = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
      });
      if (res.canceled || !res.filePaths?.[0]) return null;
      return res.filePaths[0];
    } catch (err) {
      console.error('Failed to open directory dialog:', err);
      return null;
    }
  });

  ipcMain.handle('system:getMetrics', async () => {
    return null;
  });
  
  ipcMain.handle('system:getProcessStats', (_, pids: number[]) => systemMonitor.getProcessStats(pids));
  ipcMain.handle('system:getDeveloperProcesses', () => systemMonitor.getAllDeveloperProcesses());

  ipcMain.handle('system:showNotification', (_, { title, body }: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      try {
        const icon = trayService.getAppIcon();
        const notification = new Notification({
          title,
          body,
          icon
        });

        notification.on('click', () => {
          if (!mainWindow.isDestroyed()) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        });

        notification.show();
        return true;
      } catch (err) {
        console.error('Failed to show system notification:', err);
        return false;
      }
    }
    return false;
  });
}
