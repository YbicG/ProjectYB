import { ipcMain } from 'electron';
import { gitService } from '../services/git.service';

export function setupGitIpc() {
  ipcMain.handle('git:status', (_, path: string) => gitService.getStatus(path));
  ipcMain.handle('git:commit', (_, path: string, message: string, stageAll?: boolean) => gitService.commit(path, message, stageAll));
  ipcMain.handle('git:push', (_, path: string, remote?: string, branch?: string) => gitService.push(path, remote, branch));
  ipcMain.handle('git:pull', (_, path: string, remote?: string, branch?: string) => gitService.pull(path, remote, branch));
  ipcMain.handle('git:branches', (_, path: string) => gitService.getBranches(path));
  ipcMain.handle('git:checkout', (_, path: string, name: string, createNew?: boolean) => gitService.checkoutBranch(path, name, createNew));
  ipcMain.handle('git:delete-branch', (_, path: string, name: string) => gitService.deleteBranch(path, name));
  ipcMain.handle('git:deleteBranch', (_, path: string, name: string) => gitService.deleteBranch(path, name));
  ipcMain.handle('git:merge', (_, path: string, branchName: string) => gitService.mergeBranch(path, branchName));
  ipcMain.handle('git:mergeBranch', (_, path: string, branchName: string) => gitService.mergeBranch(path, branchName));

  ipcMain.handle('git:diff', (_, path: string, staged?: boolean) => gitService.getDiff(path, staged));
  ipcMain.handle('git:fileDiff', (_, path: string, filePath: string, staged?: boolean) => gitService.getFileDiff(path, filePath, staged));
  ipcMain.handle('git:commitDiff', (_, path: string, commitHash: string) => gitService.getCommitDiff(path, commitHash));

  ipcMain.handle('git:stageAll', (_, path: string) => gitService.stageAll(path));
  ipcMain.handle('git:stageFile', (_, path: string, filePath: string) => gitService.stageFile(path, filePath));
  ipcMain.handle('git:unstageFile', (_, path: string, filePath: string) => gitService.unstageFile(path, filePath));
  ipcMain.handle('git:discard', (_, path: string, filePath: string) => gitService.discardChanges(path, filePath));
  ipcMain.handle('git:discardChanges', (_, path: string, filePath: string) => gitService.discardChanges(path, filePath));

  ipcMain.handle('git:stash', (_, path: string, action: 'push'|'pop'|'list'|'apply'|'drop', message?: string, index?: number) => 
    gitService.stash(path, action, message, index)
  );
  ipcMain.handle('git:log', (_, path: string, limit?: number) => gitService.log(path, limit));
  ipcMain.handle('git:is-repo', (_, path: string) => gitService.isGitRepo(path));
  ipcMain.handle('git:isRepo', (_, path: string) => gitService.isGitRepo(path));
  ipcMain.handle('git:init', (_, path: string) => gitService.init(path));
  ipcMain.handle('git:add-remote', (_, path: string, name: string, url: string) => gitService.addRemote(path, name, url));
  ipcMain.handle('git:addRemote', (_, path: string, name: string, url: string) => gitService.addRemote(path, name, url));
}
