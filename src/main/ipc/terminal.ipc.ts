import { ipcMain, BrowserWindow } from 'electron';
import { terminalService } from '../services/terminal.service';

export function setupTerminalIpc(mainWindow: BrowserWindow) {
  ipcMain.handle('terminal:spawn', (_, options: { id: string; cwd?: string; cols: number; rows: number; shell?: string }) => {
    const { id, cwd, cols, rows, shell } = options;
    return terminalService.spawn(
      id, cwd || process.cwd(), cols || 80, rows || 24, shell,
      (data) => mainWindow.webContents.send(`terminal:data:${id}`, data),
      (exitCode) => mainWindow.webContents.send(`terminal:exit:${id}`, exitCode)
    );
  });
  
  ipcMain.on('terminal:write', (_, id: string, data: string) => terminalService.write(id, data));
  ipcMain.on('terminal:resize', (_, id: string, cols: number, rows: number) => terminalService.resize(id, cols, rows));
  ipcMain.on('terminal:kill', (_, id: string) => terminalService.kill(id));
  ipcMain.handle('terminal:list', () => terminalService.getAllTerminals());
}
