import { ipcMain } from 'electron';
import { openApiService } from '../services/openapi.service';

export function setupOpenApiIpc() {
  ipcMain.handle('openapi:discover', async (_, projectPath: string) => {
    return openApiService.discoverProjectSpecs(projectPath);
  });

  ipcMain.handle('openapi:loadFromFile', async (_, filePath: string) => {
    return openApiService.loadFromFile(filePath);
  });

  ipcMain.handle('openapi:loadFromUrl', async (_, url: string) => {
    return openApiService.loadFromUrl(url);
  });
}
