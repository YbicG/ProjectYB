import { ipcMain } from 'electron';
import { assetForgeService } from '../services/asset-forge.service';

export function registerAssetForgeIpc(): void {
  ipcMain.handle('assetForge:generateFaviconSuite', async (_e, projectPath: string, sourceImagePath: string) => {
    return assetForgeService.generateFaviconSuite(projectPath, sourceImagePath);
  });

  ipcMain.handle(
    'assetForge:convertImage',
    async (_e, sourcePath: string, targetFormat: 'png' | 'jpeg', quality?: number) => {
      return assetForgeService.convertImage(sourcePath, targetFormat, quality);
    }
  );
}