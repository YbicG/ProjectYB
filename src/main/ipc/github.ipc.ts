import { ipcMain } from 'electron';
import { githubService } from '../services/github.service';
import { getStore } from './store.ipc';

async function resolveToken(explicitToken?: string): Promise<string> {
  if (explicitToken && typeof explicitToken === 'string' && explicitToken.trim()) {
    return explicitToken.trim();
  }
  try {
    const store = await getStore();
    const token = (await store.get('githubToken')) as string | undefined;
    if (token && token.trim()) {
      return token.trim();
    }
  } catch {}
  throw new Error('No GitHub token configured. Please set your Personal Access Token in Settings.');
}

export function setupGithubIpc() {
  // getUser
  const handleGetUser = async (_: any, token?: string) => {
    const t = await resolveToken(token);
    return githubService.getUser(t);
  };
  ipcMain.handle('github:getUser', handleGetUser);
  ipcMain.handle('github:get-user', handleGetUser);

  // getRepo
  const handleGetRepo = async (_: any, ...args: any[]) => {
    let token: string;
    let owner: string;
    let repo: string;
    if (args.length >= 3) {
      token = await resolveToken(args[0]);
      owner = args[1];
      repo = args[2];
    } else {
      token = await resolveToken();
      owner = args[0];
      repo = args[1];
    }
    return githubService.getRepoDetails(token, owner, repo);
  };
  ipcMain.handle('github:getRepo', handleGetRepo);
  ipcMain.handle('github:get-repo', handleGetRepo);

  // createRepo
  const handleCreateRepo = async (_: any, ...args: any[]) => {
    let token: string;
    let name: string;
    let isPrivate: boolean;
    let desc: string | undefined;

    if (args.length >= 3 && typeof args[1] === 'string' && typeof args[2] === 'boolean') {
      token = await resolveToken(args[0]);
      name = args[1];
      isPrivate = args[2];
      desc = args[3];
    } else {
      token = await resolveToken();
      name = args[0];
      isPrivate = Boolean(args[1]);
      desc = args[2];
    }
    return githubService.createRepository(token, name, isPrivate, desc);
  };
  ipcMain.handle('github:createRepo', handleCreateRepo);
  ipcMain.handle('github:create-repo', handleCreateRepo);

  // listRepos
  const handleListRepos = async (_: any, token?: string) => {
    const t = await resolveToken(token);
    return githubService.listRepositories(t);
  };
  ipcMain.handle('github:listRepos', handleListRepos);
  ipcMain.handle('github:list-repos', handleListRepos);

  // createPR
  const handleCreatePR = async (_: any, ...args: any[]) => {
    let token: string;
    let owner: string;
    let repo: string;
    let title: string;
    let head: string;
    let base: string;
    let body: string | undefined;

    if (args.length >= 7) {
      token = await resolveToken(args[0]);
      owner = args[1];
      repo = args[2];
      title = args[3];
      head = args[4];
      base = args[5];
      body = args[6];
    } else {
      token = await resolveToken();
      owner = args[0];
      repo = args[1];
      title = args[2];
      head = args[3];
      base = args[4];
      body = args[5];
    }
    return githubService.createPullRequest(token, owner, repo, title, head, base, body);
  };
  ipcMain.handle('github:createPR', handleCreatePR);
  ipcMain.handle('github:create-pr', handleCreatePR);

  // listPRs
  const handleListPRs = async (_: any, ...args: any[]) => {
    let token: string;
    let owner: string;
    let repo: string;
    let state: 'open' | 'closed' | 'all' = 'open';

    if (args.length >= 4) {
      token = await resolveToken(args[0]);
      owner = args[1];
      repo = args[2];
      state = args[3] || 'open';
    } else if (args.length === 3 && typeof args[2] === 'string' && ['open', 'closed', 'all'].includes(args[2])) {
      token = await resolveToken();
      owner = args[0];
      repo = args[1];
      state = args[2] as any;
    } else {
      token = await resolveToken();
      owner = args[0];
      repo = args[1];
    }
    return githubService.listPullRequests(token, owner, repo, state);
  };
  ipcMain.handle('github:listPRs', handleListPRs);
  ipcMain.handle('github:list-prs', handleListPRs);

  // createIssue
  const handleCreateIssue = async (_: any, ...args: any[]) => {
    let token: string;
    let owner: string;
    let repo: string;
    let title: string;
    let body: string | undefined;
    let labels: string[] | undefined;

    if (args.length >= 6) {
      token = await resolveToken(args[0]);
      owner = args[1];
      repo = args[2];
      title = args[3];
      body = args[4];
      labels = args[5];
    } else {
      token = await resolveToken();
      owner = args[0];
      repo = args[1];
      title = args[2];
      body = args[3];
      labels = args[4];
    }
    return githubService.createIssue(token, owner, repo, title, body, labels);
  };
  ipcMain.handle('github:createIssue', handleCreateIssue);
  ipcMain.handle('github:create-issue', handleCreateIssue);

  // listIssues
  const handleListIssues = async (_: any, ...args: any[]) => {
    let token: string;
    let owner: string;
    let repo: string;
    let state: 'open' | 'closed' | 'all' = 'open';

    if (args.length >= 4) {
      token = await resolveToken(args[0]);
      owner = args[1];
      repo = args[2];
      state = args[3] || 'open';
    } else if (args.length === 3 && typeof args[2] === 'string' && ['open', 'closed', 'all'].includes(args[2])) {
      token = await resolveToken();
      owner = args[0];
      repo = args[1];
      state = args[2] as any;
    } else {
      token = await resolveToken();
      owner = args[0];
      repo = args[1];
    }
    return githubService.listIssues(token, owner, repo, state);
  };
  ipcMain.handle('github:listIssues', handleListIssues);
  ipcMain.handle('github:list-issues', handleListIssues);

  // initAndPush
  const handleInitAndPush = async (_: any, ...args: any[]) => {
    let token: string;
    let localPath: string;
    let repoName: string;
    let isPrivate: boolean;
    let description: string | undefined;

    if (args.length >= 5) {
      token = await resolveToken(args[0]);
      localPath = args[1];
      repoName = args[2];
      isPrivate = Boolean(args[3]);
      description = args[4];
    } else {
      token = await resolveToken();
      localPath = args[0];
      repoName = args[1];
      isPrivate = Boolean(args[2]);
      description = args[3];
    }
    return githubService.initAndPushToGitHub(token, localPath, repoName, isPrivate, description);
  };
  ipcMain.handle('github:initAndPush', handleInitAndPush);
  ipcMain.handle('github:init-and-push', handleInitAndPush);
}
