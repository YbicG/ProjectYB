import { ipcMain, shell } from 'electron';
import { projectScanner } from '../services/project-scanner';
import { spawn } from 'child_process';
import * as os from 'os';

export function setupProjectsIpc() {
  ipcMain.handle('projects:scan', (_, rootPaths: string[]) => projectScanner.scanDirectory(rootPaths));
  ipcMain.handle('projects:open-in-explorer', (_, path: string) => shell.openPath(path));
  ipcMain.on('projects:open-in-vscode', (_, path: string) => {
    spawn(os.platform() === 'win32' ? 'code.cmd' : 'code', [path], { detached: true, stdio: 'ignore' }).unref();
  });
  ipcMain.on('projects:open-terminal', (_, path: string) => {
    const term = os.platform() === 'win32' ? 'cmd.exe' : 'bash';
    spawn(term, [], { cwd: path, detached: true, stdio: 'ignore' }).unref();
  });
}
