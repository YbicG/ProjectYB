import simpleGit, { SimpleGit } from 'simple-git';
import * as fs from 'fs';
import * as path from 'path';

class GitService {
  private git(repoPath: string): SimpleGit {
    return simpleGit(repoPath, { maxConcurrentProcesses: 4 }).env('GIT_TERMINAL_PROMPT', '0');
  }

  async isGitRepo(targetPath: string): Promise<boolean> {
    if (!targetPath) return false;
    try {
      // 1. Direct .git folder or file check in target directory
      const gitDir = path.join(targetPath, '.git');
      if (fs.existsSync(gitDir)) {
        return true;
      }

      // 2. Check if git rev-parse --show-toplevel points exactly to targetPath
      const topLevel = await this.git(targetPath).revparse(['--show-toplevel']);
      if (topLevel) {
        const normTop = path.resolve(topLevel).toLowerCase().replace(/\\/g, '/');
        const normTarget = path.resolve(targetPath).toLowerCase().replace(/\\/g, '/');
        return normTop === normTarget;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getStatus(targetPath: string) {
    if (!(await this.isGitRepo(targetPath))) {
      return null;
    }
    try {
      const status = await this.git(targetPath).status();
      const staged: Array<{ path: string; status: 'modified' | 'added' | 'deleted' | 'renamed' }> = [];
      const unstaged: Array<{ path: string; status: 'modified' | 'added' | 'deleted' }> = [];

      for (const f of status.files) {
        // Check Staged
        if (f.index && f.index !== ' ' && f.index !== '?') {
          let st: 'modified' | 'added' | 'deleted' | 'renamed' = 'modified';
          if (f.index === 'A' || f.index === 'C') st = 'added';
          else if (f.index === 'D') st = 'deleted';
          else if (f.index === 'R') st = 'renamed';
          staged.push({ path: f.path, status: st });
        }

        // Check Unstaged
        if (f.working_dir && f.working_dir !== ' ' && f.working_dir !== '?') {
          let st: 'modified' | 'added' | 'deleted' = 'modified';
          if (f.working_dir === 'D') st = 'deleted';
          unstaged.push({ path: f.path, status: st });
        }
      }

      return {
        branch: status.current || 'HEAD',
        tracking: status.tracking || undefined,
        ahead: status.ahead || 0,
        behind: status.behind || 0,
        isClean: status.isClean(),
        staged,
        unstaged,
        untracked: status.not_added || [],
      };
    } catch {
      return null;
    }
  }

  async stageAll(path: string) {
    return await this.git(path).add('.');
  }

  async stageFile(path: string, filePath: string) {
    return await this.git(path).add(filePath);
  }

  async unstageFile(path: string, filePath: string) {
    const git = this.git(path);
    try {
      return await git.reset(['--', filePath]);
    } catch {
      try {
        return await git.raw(['rm', '--cached', '--', filePath]);
      } catch {
        return await git.reset(['HEAD', filePath]);
      }
    }
  }

  async discardChanges(path: string, filePath: string) {
    const git = this.git(path);
    try {
      return await git.checkout(['--', filePath]);
    } catch {
      try {
        const fs = require('fs');
        const pathUtil = require('path');
        const fullPath = pathUtil.isAbsolute(filePath) ? filePath : pathUtil.join(path, filePath);
        if (fs.existsSync(fullPath)) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      } catch {}
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
    if (!(await this.isGitRepo(path))) {
      return { current: '', all: [] };
    }
    try {
      const branches = await this.git(path).branchLocal();
      return {
        current: branches.current,
        all: branches.all
      };
    } catch {
      return { current: '', all: [] };
    }
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

  async abortMerge(path: string) {
    const git = this.git(path);
    try {
      await git.merge(['--abort']);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getDiff(path: string, staged: boolean = false) {
    if (!(await this.isGitRepo(path))) {
      return '';
    }
    try {
      if (staged) return await this.git(path).diff(['--cached']);
      return await this.git(path).diff();
    } catch {
      return '';
    }
  }

  async getFileDiff(path: string, filePath: string, staged: boolean = false) {
    if (!(await this.isGitRepo(path))) {
      return '';
    }
    const git = this.git(path);
    try {
      if (staged) {
        return await git.diff(['--cached', '--', filePath]);
      }
      const res = await git.diff(['--', filePath]);
      if (!res || !res.trim()) {
        // If untracked file or newly added, read content or diff against /dev/null
        try {
          const fs = require('fs');
          const pathUtil = require('path');
          const fullPath = pathUtil.isAbsolute(filePath) ? filePath : pathUtil.join(path, filePath);
          if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            const content = await fs.promises.readFile(fullPath, 'utf8');
            const lines = content.split('\n');
            return `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n` + lines.map((l: string) => `+${l}`).join('\n');
          }
        } catch {}
      }
      return res;
    } catch {
      return '';
    }
  }

  async getCommitDiff(path: string, commitHash: string) {
    if (!(await this.isGitRepo(path))) {
      return '';
    }
    try {
      const git = this.git(path);
      return await git.show([commitHash]);
    } catch {
      return '';
    }
  }

  async stash(path: string, action: 'push' | 'pop' | 'list' | 'apply' | 'drop', message?: string, index: number = 0) {
    if (!(await this.isGitRepo(path))) {
      return action === 'list' ? [] : undefined;
    }
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
    if (!(await this.isGitRepo(path))) {
      return [];
    }
    try {
      const raw = await this.git(path).log({ maxCount: limit });
      return (raw.all || []).map((entry) => ({
        hash: entry.hash,
        hashShort: entry.hash.substring(0, 7),
        message: entry.message,
        author: entry.author_name,
        date: entry.date,
        refs: entry.refs
      }));
    } catch {
      return [];
    }
  }

  async init(path: string) {
    return await this.git(path).init();
  }

  async addRemote(path: string, name: string, url: string) {
    return await this.git(path).addRemote(name, url);
  }

  async getRemotes(path: string) {
    if (!(await this.isGitRepo(path))) {
      return [];
    }
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
      const url = (origin.refs.fetch || origin.refs.push || '').trim();
      if (!url) return null;

      // Strip optional trailing .git and trailing slashes
      const cleanUrl = url.replace(/\.git$/i, '').replace(/\/+$/, '');

      // Match https://github.com/owner/repo or git@github.com:owner/repo
      const httpsMatch = cleanUrl.match(/github\.com\/([^/]+)\/(.+)$/i);
      if (httpsMatch) {
        return { owner: httpsMatch[1], repo: httpsMatch[2] };
      }
      const sshMatch = cleanUrl.match(/github\.com:([^/]+)\/(.+)$/i);
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
