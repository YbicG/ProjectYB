import { ipcMain, BrowserWindow } from 'electron';
import { logStreamService, type LogSource, type LogLevel } from '../services/logstream.service';

export function setupLogStreamIpc(mainWindow: BrowserWindow | null) {
  logStreamService.setMainWindow(mainWindow);

  ipcMain.handle('logstream:getRecent', async (_, limit?: number) => {
    return logStreamService.getRecentLogs(limit);
  });

  ipcMain.handle('logstream:clear', async () => {
    logStreamService.clearLogs();
    return { success: true };
  });

  ipcMain.handle(
    'logstream:emit',
    async (_, source: LogSource, level: LogLevel, tag: string, message: string, projectId?: string) => {
      logStreamService.log(source, level, tag, message, projectId);
      return { success: true };
    }
  );
}
