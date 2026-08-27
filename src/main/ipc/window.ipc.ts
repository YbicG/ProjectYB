import { ipcMain, BrowserWindow } from 'electron';

export function setupWindowIpc(mainWindow: BrowserWindow) {
  ipcMain.on('window:minimize', () => mainWindow.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow.close());
  ipcMain.handle('window:is-maximized', () => mainWindow.isMaximized());
}
