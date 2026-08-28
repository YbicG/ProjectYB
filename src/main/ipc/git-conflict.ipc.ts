import { ipcMain } from 'electron';
import { gitConflictService } from '../services/git-conflict.service';

export function setupGitConflictIpc() {
  ipcMain.handle('gitConflict:getConflictedFiles', async (_, repoPath: string) => {
    return gitConflictService.getConflictedFiles(repoPath);
  });

  ipcMain.handle('gitConflict:parseFile', async (_, repoPath: string, relativePath: string) => {
    return gitConflictService.parseConflictFile(repoPath, relativePath);
  });

  ipcMain.handle('gitConflict:resolveFile', async (_, repoPath: string, relativePath: string, content: string) => {
    return gitConflictService.resolveFile(repoPath, relativePath, content);
  });

  ipcMain.handle('gitConflict:abortMerge', async (_, repoPath: string) => {
    return gitConflictService.abortMerge(repoPath);
  });
}
