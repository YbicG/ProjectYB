import { ipcMain } from 'electron';
import { envService, type EnvEntry } from '../services/env.service';

export function setupEnvIpc() {
  ipcMain.handle('env:listFiles', (_, projectPath: string) => envService.listEnvFiles(projectPath));
  ipcMain.handle('env:read', (_, filePath: string) => envService.readEnvFile(filePath));
  ipcMain.handle('env:write', (_, filePath: string, entries: EnvEntry[], rawContent?: string) =>
    envService.writeEnvFile(filePath, entries, rawContent)
  );
  ipcMain.handle('env:generateExample', (_, sourceFilePath: string, targetFilePath?: string) =>
    envService.generateExample(sourceFilePath, targetFilePath)
  );
  ipcMain.handle('env:compare', (_, fileAPath: string, fileBPath: string) =>
    envService.compareEnvs(fileAPath, fileBPath)
  );
  ipcMain.handle('env:syncKeys', (_, sourceFilePath: string, targetFilePath: string, keys: string[]) =>
    envService.syncKeys(sourceFilePath, targetFilePath, keys)
  );
}
