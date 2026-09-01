import { ipcMain } from 'electron';
import { changelogService } from '../services/changelog.service';

export function registerChangelogIpc(): void {
  ipcMain.handle('changelog:generate', async (_e, projectPath: string) => {
    return changelogService.generateChangelog(projectPath);
  });

  ipcMain.handle(
    'changelog:applyRelease',
    async (_e, projectPath: string, version: string, changelogText: string, createTag: boolean) => {
      return changelogService.applyRelease(projectPath, version, changelogText, createTag);
    }
  );
}