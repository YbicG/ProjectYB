import simpleGit, { SimpleGit } from 'simple-git';

class GitService {
  private git(path: string): SimpleGit {
    return simpleGit(path, { maxConcurrentProcesses: 4 }).env('GIT_TERMINAL_PROMPT', '0');
  }

  async getStatus(path: string) {
    const status = await this.git(path).status();
    return {
      files: status.files,
      branch: status.current,
      ahead: status.ahead,
      behind: status.behind,
      isClean: status.isClean()
    };
  }

  async commit(path: string, message: string, stageAll: boolean = true) {
    const git = this.git(path);
    if (stageAll) await git.add('.');
    return await git.commit(message);
  }

  async push(path: string, remote: string = 'origin', branch?: string) {
    const git = this.git(path);
    const b = branch || (await git.branch()).current;
    return await git.push(remote, b);
  }

  async pull(path: string, remote: string = 'origin', branch?: string) {
    const git = this.git(path);
    const b = branch || (await git.branch()).current;
    return await git.pull(remote, b);
  }

  async getBranches(path: string) {
    const branches = await this.git(path).branchLocal();
    const allBranches = await this.git(path).branch();
    return {
      current: branches.current,
      all: allBranches.all
    };
  }

  async checkoutBranch(path: string, name: string, createNew: boolean = false) {
    const git = this.git(path);
    if (createNew) {
      return await git.checkoutLocalBranch(name);
    }
    return await git.checkout(name);
  }

  async getDiff(path: string, staged: boolean = false) {
    if (staged) return await this.git(path).diff(['--cached']);
    return await this.git(path).diff();
  }

  async stash(path: string, action: 'push' | 'pop' | 'list', message?: string) {
    const git = this.git(path);
    if (action === 'push') return await git.stash(['push', ...(message ? ['-m', message] : [])]);
    if (action === 'pop') return await git.stash(['pop']);
    if (action === 'list') return await git.stashList();
  }

  async log(path: string, limit: number = 50) {
    return await this.git(path).log({ maxCount: limit });
  }

  async isGitRepo(path: string) {
    try {
      return await this.git(path).checkIsRepo();
    } catch {
      return false;
    }
  }

  async init(path: string) {
    return await this.git(path).init();
  }

  async addRemote(path: string, name: string, url: string) {
    return await this.git(path).addRemote(name, url);
  }
}

export const gitService = new GitService();
