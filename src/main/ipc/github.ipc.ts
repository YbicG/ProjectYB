import { ipcMain } from 'electron';
import { githubService } from '../services/github.service';

export function setupGithubIpc() {
  ipcMain.handle('github:create-repo', (_, token: string, name: string, isPrivate: boolean, desc?: string) => githubService.createRepository(token, name, isPrivate, desc));
  ipcMain.handle('github:list-repos', (_, token: string) => githubService.listRepositories(token));
  ipcMain.handle('github:create-pr', (_, token: string, owner: string, repo: string, title: string, head: string, base: string, body?: string) => githubService.createPullRequest(token, owner, repo, title, head, base, body));
  ipcMain.handle('github:list-prs', (_, token: string, owner: string, repo: string) => githubService.listPullRequests(token, owner, repo));
  ipcMain.handle('github:list-issues', (_, token: string, owner: string, repo: string) => githubService.listIssues(token, owner, repo));
  ipcMain.handle('github:get-user', (_, token: string) => githubService.getUser(token));
  ipcMain.handle('github:init-and-push', (_, token: string, localPath: string, repoName: string, isPrivate: boolean) => githubService.initAndPushToGitHub(token, localPath, repoName, isPrivate));
}
