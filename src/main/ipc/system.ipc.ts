import { ipcMain, BrowserWindow, Notification, dialog, app } from 'electron';
import { exec } from 'child_process';
import { systemMonitor } from '../services/system-monitor';
import { trayService } from '../services/tray.service';
import { isProcessElevated } from '../services/terminal.service';
import { logger } from '../utils/logger';

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

  ipcMain.handle('system:isElevated', () => {
    return isProcessElevated();
  });

  ipcMain.handle('system:relaunchElevated', () => {
    try {
      if (process.platform === 'win32') {
        const exePath = process.execPath;
        const args = process.argv.slice(1).map((a) => `\\"${a.replace(/"/g, '`"')}\\"`).join(', ');
        const argList = args.length > 0 ? `-ArgumentList ${args}` : '';
        const cmd = `Start-Process \\"${exePath}\\" ${argList} -Verb RunAs`;

        exec(`powershell -NoProfile -Command "${cmd}"`, (err) => {
          if (err) {
            logger.error('[SystemIPC] Failed to relaunch elevated:', err);
          } else {
            logger.info('[SystemIPC] Successfully spawned elevated process, quitting current instance...');
            setTimeout(() => app.quit(), 400);
          }
        });
        return { success: true };
      } else {
        return { success: false, error: 'Administrator elevation relaunch is only supported on Windows.' };
      }
    } catch (err: any) {
      logger.error('[SystemIPC] Error in relaunchElevated:', err);
      return { success: false, error: err.message };
    }
  });

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
