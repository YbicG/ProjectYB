import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { gitService } from '../src/main/services/git.service';

describe('GitService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectyb-git-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('isGitRepo & init', () => {
    it('correctly identifies non-git vs git repository directories', async () => {
      const isNotRepo = await gitService.isGitRepo(tempDir);
      expect(isNotRepo).toBe(false);

      await gitService.init(tempDir);
      const isRepo = await gitService.isGitRepo(tempDir);
      expect(isRepo).toBe(true);
    });

    it('returns false for empty or non-existent path', async () => {
      expect(await gitService.isGitRepo('')).toBe(false);
      expect(await gitService.isGitRepo(path.join(tempDir, 'does-not-exist'))).toBe(false);
    });
  });

  describe('getStatus & file staging', () => {
    beforeEach(async () => {
      await gitService.init(tempDir);
      execSync('git config user.name "Tester"', { cwd: tempDir });
      execSync('git config user.email "tester@example.com"', { cwd: tempDir });
    });

    it('parses clean status, untracked, staged and unstaged files', async () => {
      // 1. Initial clean status
      fs.writeFileSync(path.join(tempDir, 'README.md'), '# Initial');
      await gitService.commit(tempDir, 'Initial commit', true);

      let status = await gitService.getStatus(tempDir);
      expect(status).not.toBeNull();
      expect(status?.isClean).toBe(true);
      expect(status?.staged.length).toBe(0);
      expect(status?.unstaged.length).toBe(0);
      expect(status?.untracked.length).toBe(0);

      // 2. Add untracked file
      fs.writeFileSync(path.join(tempDir, 'newfile.txt'), 'hello');
      status = await gitService.getStatus(tempDir);
      expect(status?.isClean).toBe(false);
      expect(status?.untracked).toContain('newfile.txt');

      // 3. Stage the file
      await gitService.stageFile(tempDir, 'newfile.txt');
      status = await gitService.getStatus(tempDir);
      expect(status?.staged.some((s) => s.path === 'newfile.txt' && s.status === 'added')).toBe(true);
      expect(status?.untracked.length).toBe(0);

      // 4. Modify existing tracked file without staging
      fs.appendFileSync(path.join(tempDir, 'README.md'), '\nNew line');
      status = await gitService.getStatus(tempDir);
      expect(status?.unstaged.some((u) => u.path === 'README.md' && u.status === 'modified')).toBe(true);

      // 5. Unstage file
      await gitService.unstageFile(tempDir, 'newfile.txt');
      status = await gitService.getStatus(tempDir);
      expect(status?.staged.some((s) => s.path === 'newfile.txt')).toBe(false);
    });

    it('discards modifications to working directory files', async () => {
      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'original content');
      await gitService.commit(tempDir, 'Base', true);

      fs.writeFileSync(path.join(tempDir, 'file.txt'), 'modified content');
      await gitService.discardChanges(tempDir, 'file.txt');

      const content = fs.readFileSync(path.join(tempDir, 'file.txt'), 'utf8');
      expect(content).toBe('original content');
    });

    it('returns null status for non-git repository', async () => {
      const nonRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'non-git-'));
      try {
        const status = await gitService.getStatus(nonRepo);
        expect(status).toBeNull();
      } finally {
        fs.rmSync(nonRepo, { recursive: true, force: true });
      }
    });
  });

  describe('log & branches', () => {
    beforeEach(async () => {
      await gitService.init(tempDir);
      execSync('git config user.name "Alice Dev"', { cwd: tempDir });
      execSync('git config user.email "alice@example.com"', { cwd: tempDir });
    });

    it('parses git log history with hash, shortHash, author, date, and message', async () => {
      fs.writeFileSync(path.join(tempDir, 'a.txt'), '1');
      await gitService.commit(tempDir, 'feat: add first feature', true);

      fs.writeFileSync(path.join(tempDir, 'b.txt'), '2');
      await gitService.commit(tempDir, 'fix: patch critical bug', true);

      const logs = await gitService.log(tempDir, 10);
      expect(logs.length).toBe(2);

      const latest = logs[0];
      expect(latest.message).toBe('fix: patch critical bug');
      expect(latest.author).toBe('Alice Dev');
      expect(latest.hash.length).toBe(40);
      expect(latest.hashShort.length).toBe(7);
      expect(latest.hash.startsWith(latest.hashShort)).toBe(true);

      const first = logs[1];
      expect(first.message).toBe('feat: add first feature');
    });

    it('creates, lists and checks out branches', async () => {
      fs.writeFileSync(path.join(tempDir, 'main.txt'), 'base');
      await gitService.commit(tempDir, 'Base commit', true);

      await gitService.checkoutBranch(tempDir, 'feature/auth', true);
      let branches = await gitService.getBranches(tempDir);
      expect(branches.current).toBe('feature/auth');
      expect(branches.all).toContain('feature/auth');

      // Switch back to master/main
      const mainBranchName = branches.all.find((b) => b === 'main' || b === 'master') || 'main';
      await gitService.checkoutBranch(tempDir, mainBranchName, false);
      branches = await gitService.getBranches(tempDir);
      expect(branches.current).toBe(mainBranchName);
    });

    it('returns empty log when directory is not a git repo', async () => {
      const logs = await gitService.log(path.join(tempDir, 'missing'));
      expect(logs).toEqual([]);
    });
  });

  describe('diff and stash operations', () => {
    beforeEach(async () => {
      await gitService.init(tempDir);
      execSync('git config user.name "Tester"', { cwd: tempDir });
      execSync('git config user.email "tester@example.com"', { cwd: tempDir });
      fs.writeFileSync(path.join(tempDir, 'code.js'), 'const a = 1;\n');
      await gitService.commit(tempDir, 'init', true);
    });

    it('computes diff for unstaged and staged changes', async () => {
      fs.appendFileSync(path.join(tempDir, 'code.js'), 'const b = 2;\n');

      const unstagedDiff = await gitService.getDiff(tempDir, false);
      expect(unstagedDiff).toContain('+const b = 2;');

      await gitService.stageFile(tempDir, 'code.js');
      const stagedDiff = await gitService.getDiff(tempDir, true);
      expect(stagedDiff).toContain('+const b = 2;');

      const fileDiff = await gitService.getFileDiff(tempDir, 'code.js', true);
      expect(fileDiff).toContain('+const b = 2;');
    });

    it('performs stash push, list, and pop operations', async () => {
      fs.appendFileSync(path.join(tempDir, 'code.js'), 'const stashMe = true;\n');

      await gitService.stash(tempDir, 'push', 'WIP: work in progress');
      const stashes = await gitService.stash(tempDir, 'list');
      expect(Array.isArray(stashes)).toBe(true);
      expect((stashes as any[]).length).toBe(1);
      expect((stashes as any[])[0].message).toContain('WIP');

      // Pop stash
      await gitService.stash(tempDir, 'pop');
      const content = fs.readFileSync(path.join(tempDir, 'code.js'), 'utf8');
      expect(content).toContain('const stashMe = true;');
    });
  });

  describe('getGitHubRemoteInfo', () => {
    beforeEach(async () => {
      await gitService.init(tempDir);
    });

    it('extracts owner and repo from HTTPS GitHub remote URLs', async () => {
      await gitService.addRemote(tempDir, 'origin', 'https://github.com/facebook/react.git');

      const info = await gitService.getGitHubRemoteInfo(tempDir);
      expect(info).not.toBeNull();
      expect(info?.owner).toBe('facebook');
      expect(info?.repo).toBe('react');
    });

    it('extracts owner and repo from SSH GitHub remote URLs', async () => {
      await gitService.addRemote(tempDir, 'origin', 'git@github.com:vercel/next.js.git');

      const info = await gitService.getGitHubRemoteInfo(tempDir);
      expect(info).not.toBeNull();
      expect(info?.owner).toBe('vercel');
      expect(info?.repo).toBe('next.js');
    });

    it('returns null for non-GitHub or invalid remote URLs', async () => {
      await gitService.addRemote(tempDir, 'origin', 'https://gitlab.com/group/project.git');

      const info = await gitService.getGitHubRemoteInfo(tempDir);
      expect(info).toBeNull();
    });

    it('returns null when no remotes are configured', async () => {
      const info = await gitService.getGitHubRemoteInfo(tempDir);
      expect(info).toBeNull();
    });
  });
});
