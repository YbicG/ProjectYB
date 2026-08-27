import { ipcMain } from 'electron';
import { gitService } from '../services/git.service';

export function setupGitIpc() {
  ipcMain.handle('git:status', (_, path: string) => gitService.getStatus(path));
  ipcMain.handle('git:commit', (_, path: string, message: string, stageAll?: boolean) => gitService.commit(path, message, stageAll));
  ipcMain.handle('git:push', (_, path: string, remote?: string, branch?: string) => gitService.push(path, remote, branch));
  ipcMain.handle('git:pull', (_, path: string, remote?: string, branch?: string) => gitService.pull(path, remote, branch));
  ipcMain.handle('git:branches', (_, path: string) => gitService.getBranches(path));
  ipcMain.handle('git:checkout', (_, path: string, name: string, createNew?: boolean) => gitService.checkoutBranch(path, name, createNew));
  ipcMain.handle('git:diff', (_, path: string, staged?: boolean) => gitService.getDiff(path, staged));
  ipcMain.handle('git:stash', (_, path: string, action: 'push'|'pop'|'list', message?: string) => gitService.stash(path, action, message));
  ipcMain.handle('git:log', (_, path: string, limit?: number) => gitService.log(path, limit));
  ipcMain.handle('git:is-repo', (_, path: string) => gitService.isGitRepo(path));
  ipcMain.handle('git:init', (_, path: string) => gitService.init(path));
  ipcMain.handle('git:add-remote', (_, path: string, name: string, url: string) => gitService.addRemote(path, name, url));
}
