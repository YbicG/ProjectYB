import simpleGit, { SimpleGit } from 'simple-git';

class GitService {
  private git(path: string): SimpleGit {
    return simpleGit(path, { maxConcurrentProcesses: 4 }).env('GIT_TERMINAL_PROMPT', '0');
  }

  async getStatus(path: string) {
    const status = await this.git(path).status();
    const staged = status.staged.map(f => ({ path: f, status: 'modified' as const }));
    const unstaged = status.modified.filter(f => !status.staged.includes(f))
      .map(f => ({ path: f, status: 'modified' as const }));
    const deleted = status.deleted.map(f => ({ path: f, status: 'deleted' as const }));
    const created = status.created.map(f => ({ path: f, status: 'added' as const }));
    return {
      branch: status.current || 'HEAD',
      tracking: status.tracking || undefined,
      ahead: status.ahead,
      behind: status.behind,
      isClean: status.isClean(),
      staged: [...staged],
      unstaged: [...unstaged, ...deleted, ...created],
      untracked: status.not_added,
    };
  }

  async stageAll(path: string) {
    return await this.git(path).add('.');
  }

  async stageFile(path: string, filePath: string) {
    return await this.git(path).add(filePath);
  }

  async unstageFile(path: string, filePath: string) {
    return await this.git(path).reset(['HEAD', filePath]);
  }

  async discardChanges(path: string, filePath: string) {
    const git = this.git(path);
    try {
      // Try checkout first (for tracked files)
      return await git.checkout(['--', filePath]);
    } catch {
      // If untracked, clean
      return await git.clean('f', ['-d', filePath]);
    }
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

  async deleteBranch(path: string, name: string) {
    return await this.git(path).deleteLocalBranch(name);
  }

  async mergeBranch(path: string, branchName: string) {
    const git = this.git(path);
    try {
      const result = await git.merge([branchName]);
      return { success: true, result, conflicts: [] };
    } catch (error: any) {
      // Check if conflicts exist
      const status = await git.status();
      return {
        success: false,
        error: error.message || 'Merge conflict',
        conflicts: status.conflicted || []
      };
    }
  }

  async getDiff(path: string, staged: boolean = false) {
    if (staged) return await this.git(path).diff(['--cached']);
    return await this.git(path).diff();
  }

  async getFileDiff(path: string, filePath: string, staged: boolean = false) {
    const git = this.git(path);
    if (staged) {
      return await git.diff(['--cached', '--', filePath]);
    }
    return await git.diff(['--', filePath]);
  }

  async getCommitDiff(path: string, commitHash: string) {
    const git = this.git(path);
    // Show diff for specific commit
    return await git.show([commitHash]);
  }

  async stash(path: string, action: 'push' | 'pop' | 'list' | 'apply' | 'drop', message?: string, index: number = 0) {
    const git = this.git(path);
    if (action === 'push') {
      const args = ['push'];
      if (message) args.push('-m', message);
      return await git.stash(args);
    }
    if (action === 'pop') {
      return await git.stash(['pop', `stash@{${index}}`]);
    }
    if (action === 'apply') {
      return await git.stash(['apply', `stash@{${index}}`]);
    }
    if (action === 'drop') {
      return await git.stash(['drop', `stash@{${index}}`]);
    }
    if (action === 'list') {
      const raw = await git.stashList();
      return (raw.all || []).map((s, idx) => ({
        index: idx,
        message: s.message || `Stash #${idx}`,
        date: s.date || '',
        hash: s.hash || ''
      }));
    }
  }

  async log(path: string, limit: number = 50) {
    const raw = await this.git(path).log({ maxCount: limit });
    return (raw.all || []).map(entry => ({
      hash: entry.hash,
      hashShort: entry.hash.substring(0, 7),
      message: entry.message,
      author: entry.author_name,
      date: entry.date,
      refs: entry.refs
    }));
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

  async getRemotes(path: string) {
    try {
      return await this.git(path).getRemotes(true);
    } catch {
      return [];
    }
  }

  async getGitHubRemoteInfo(path: string): Promise<{ owner: string; repo: string } | null> {
    try {
      const remotes = await this.getRemotes(path);
      if (!remotes || remotes.length === 0) return null;
      const origin = remotes.find((r) => r.name === 'origin') || remotes[0];
      if (!origin) return null;
      const url = origin.refs.fetch || origin.refs.push;
      if (!url) return null;

      // Match https://github.com/owner/repo(.git) or git@github.com:owner/repo(.git)
      const httpsMatch = url.match(/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?/i);
      if (httpsMatch) {
        return { owner: httpsMatch[1], repo: httpsMatch[2] };
      }
      const sshMatch = url.match(/github\.com:([^/]+)\/([^/.]+)(?:\.git)?/i);
      if (sshMatch) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const gitService = new GitService();
