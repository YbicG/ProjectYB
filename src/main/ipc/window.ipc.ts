import { ipcMain, BrowserWindow } from 'electron';

export function setupWindowIpc(mainWindow: BrowserWindow) {
  ipcMain.on('window:minimize', () => {
    if (!mainWindow.isDestroyed()) mainWindow.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow.isDestroyed()) return;
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    if (!mainWindow.isDestroyed()) mainWindow.close();
  });

  const checkMaximized = () => (!mainWindow.isDestroyed() ? mainWindow.isMaximized() : false);
  ipcMain.handle('window:isMaximized', checkMaximized);
  ipcMain.handle('window:is-maximized', checkMaximized);

  // Emit maximize state changes to renderer
  mainWindow.on('maximize', () => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('window:maximizedChange', true);
  });
  mainWindow.on('unmaximize', () => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('window:maximizedChange', false);
  });
}
