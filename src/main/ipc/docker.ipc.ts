import { ipcMain } from 'electron';
import { dockerService } from '../services/docker.service';

export function setupDockerIpc() {
  ipcMain.handle('docker:getStatus', () => dockerService.getStatus());

  ipcMain.handle('docker:getProjectFiles', (_, projectPath: string) =>
    dockerService.getProjectDockerFiles(projectPath)
  );

  ipcMain.handle('docker:getServices', (_, projectPath: string) =>
    dockerService.getComposeServices(projectPath)
  );

  ipcMain.handle('docker:up', (_, projectPath: string, serviceName?: string, build?: boolean) =>
    dockerService.composeUp(projectPath, serviceName, build)
  );

  ipcMain.handle('docker:stop', (_, projectPath: string, serviceName?: string) =>
    dockerService.composeStop(projectPath, serviceName)
  );

  ipcMain.handle('docker:restart', (_, projectPath: string, serviceName?: string) =>
    dockerService.composeRestart(projectPath, serviceName)
  );

  ipcMain.handle('docker:down', (_, projectPath: string) =>
    dockerService.composeDown(projectPath)
  );

  ipcMain.handle('docker:getLogs', (_, projectPath: string, serviceName?: string, tail?: number) =>
    dockerService.getComposeLogs(projectPath, serviceName, tail)
  );

  ipcMain.handle('docker:probeDb', (_, connectionUrl: string) =>
    dockerService.probeDatabaseConnection(connectionUrl)
  );
}
