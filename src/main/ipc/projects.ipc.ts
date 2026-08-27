import { ipcMain, shell } from 'electron';
import { projectScanner } from '../services/project-scanner';
import { spawn } from 'child_process';
import * as os from 'os';

export function setupProjectsIpc() {
  ipcMain.handle('projects:scan', async (_, rootPaths?: string[]) => {
    const paths = rootPaths && rootPaths.length > 0 ? rootPaths : ['D:\\Code'];
    return projectScanner.scanDirectory(paths);
  });

  ipcMain.handle('projects:openInExplorer', (_, path: string) => shell.openPath(path));

  ipcMain.handle('projects:openInVSCode', (_, path: string) => {
    spawn(os.platform() === 'win32' ? 'code.cmd' : 'code', [path], { detached: true, stdio: 'ignore' }).unref();
  });

  // Open an external terminal window at the given path
  ipcMain.handle('projects:openTerminal', (_, path: string) => {
    if (os.platform() === 'win32') {
      // Start PowerShell already cd'd into the project directory
      spawn('cmd.exe', ['/c', 'start', 'powershell.exe', '-NoExit', '-Command', `Set-Location '${path}'`], {
        detached: true,
        stdio: 'ignore'
      }).unref();
    } else {
      spawn('bash', [], { cwd: path, detached: true, stdio: 'ignore' }).unref();
    }
  });
}
