import { ipcMain, BrowserWindow } from 'electron';
import { terminalService, TerminalSpawnMeta } from '../services/terminal.service';

export function setupTerminalIpc(mainWindow: BrowserWindow) {
  ipcMain.handle(
    'terminal:spawn',
    (
      _,
      options: {
        id: string;
        cwd?: string;
        cols: number;
        rows: number;
        shell?: string;
        name?: string;
        projectId?: string;
        projectName?: string;
        serviceId?: string;
        isService?: boolean;
        command?: string;
        port?: number;
      }
    ) => {
      const { id, cwd, cols, rows, shell, name, projectId, projectName, serviceId, isService, command, port } = options;
      return terminalService.spawn(
        id,
        cwd || process.cwd(),
        cols || 80,
        rows || 24,
        shell,
        (data) => mainWindow.webContents.send(`terminal:data:${id}`, data),
        (exitCode) => mainWindow.webContents.send(`terminal:exit:${id}`, exitCode),
        { name, projectId, projectName, serviceId, isService, command, port }
      );
    }
  );

  ipcMain.on('terminal:write', (_, id: string, data: string) => terminalService.write(id, data));
  ipcMain.on('terminal:resize', (_, id: string, cols: number, rows: number) => terminalService.resize(id, cols, rows));
  ipcMain.on('terminal:kill', (_, id: string) => terminalService.kill(id));
  ipcMain.handle('terminal:getBuffer', (_, id: string) => terminalService.getBuffer(id));
  ipcMain.handle('terminal:list', () => terminalService.getAllTerminals());
}
