import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { ChangelogService, changelogService } from '../src/main/services/changelog.service';

describe('ChangelogService', () => {
  let tempDir: string;
  let service: ChangelogService;

  beforeEach(() => {
    service = new ChangelogService();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectyb-changelog-test-'));

    // Initialize git repo for testing
    execSync('git init -b main', { cwd: tempDir });
    execSync('git config user.name "Tester"', { cwd: tempDir });
    execSync('git config user.email "tester@example.com"', { cwd: tempDir });
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('generateChangelog with Conventional Commits', () => {
    it('parses features, fixes, chores and calculates minor bump', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '1.2.0' }, null, 2)
      );

      // Create commits
      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'init');
      execSync('git add . && git commit -m "chore: initial commit"', { cwd: tempDir });

      fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'feature');
      execSync('git add . && git commit -m "feat(auth): add google sso login"', { cwd: tempDir });

      fs.writeFileSync(path.join(tempDir, 'file3.txt'), 'fix');
      execSync('git add . && git commit -m "fix(ui): resolve button alignment"', { cwd: tempDir });

      fs.writeFileSync(path.join(tempDir, 'file4.txt'), 'perf');
      execSync('git add . && git commit -m "perf: optimize list rendering"', { cwd: tempDir });

      const result = await service.generateChangelog(tempDir);

      expect(result.currentVersion).toBe('1.2.0');
      expect(result.bumpType).toBe('minor');
      expect(result.suggestedVersion).toBe('1.3.0');
      expect(result.commitsCount).toBe(4);

      // Check categories
      expect(result.categories.features.length).toBe(1);
      expect(result.categories.features[0].scope).toBe('auth');
      expect(result.categories.features[0].description).toBe('add google sso login');
      expect(result.categories.features[0].type).toBe('feat');

      expect(result.categories.fixes.length).toBe(1);
      expect(result.categories.fixes[0].scope).toBe('ui');
      expect(result.categories.fixes[0].description).toBe('resolve button alignment');

      expect(result.categories.performance.length).toBe(1);
      expect(result.categories.performance[0].description).toBe('optimize list rendering');

      expect(result.categories.other.length).toBe(1);
      expect(result.categories.other[0].type).toBe('chore');

      // Check markdown output
      expect(result.formattedMarkdown).toContain('## [1.3.0]');
      expect(result.formattedMarkdown).toContain('### 🚀 Features & Enhancements');
      expect(result.formattedMarkdown).toContain('**auth:** add google sso login');
      expect(result.formattedMarkdown).toContain('### 🐛 Bug Fixes');
      expect(result.formattedMarkdown).toContain('**ui:** resolve button alignment');
      expect(result.formattedMarkdown).toContain('### ⚡ Performance Improvements');
    });

    it('detects breaking changes and triggers major version bump', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '2.4.1' }, null, 2)
      );

      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'v1');
      execSync('git add . && git commit -m "feat!: redesign authentication API with BREAKING CHANGE"', { cwd: tempDir });

      fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'v2');
      execSync('git add . && git commit -m "fix: patch minor memory leak"', { cwd: tempDir });

      const result = await service.generateChangelog(tempDir);

      expect(result.currentVersion).toBe('2.4.1');
      expect(result.bumpType).toBe('major');
      expect(result.suggestedVersion).toBe('3.0.0');
      expect(result.categories.breaking.length).toBe(1);
      expect(result.categories.breaking[0].isBreaking).toBe(true);
      expect(result.formattedMarkdown).toContain('### ⚠️ Breaking Changes');
    });

    it('triggers patch version bump when only bug fixes or chore commits are made', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '0.9.5' }, null, 2)
      );

      fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'fix');
      execSync('git add . && git commit -m "fix: resolve memory leak on unmount"', { cwd: tempDir });

      const result = await service.generateChangelog(tempDir);

      expect(result.currentVersion).toBe('0.9.5');
      expect(result.bumpType).toBe('patch');
      expect(result.suggestedVersion).toBe('0.9.6');
      expect(result.categories.fixes.length).toBe(1);
    });

    it('handles git tags and generates changelog since latest tag', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-app', version: '1.0.0' }, null, 2)
      );

      fs.writeFileSync(path.join(tempDir, 'f1.txt'), 'tag-base');
      execSync('git add . && git commit -m "chore: base release"', { cwd: tempDir });
      execSync('git tag v1.0.0', { cwd: tempDir });

      fs.writeFileSync(path.join(tempDir, 'f2.txt'), 'tag-new');
      execSync('git add . && git commit -m "feat: new tag feature"', { cwd: tempDir });

      const result = await service.generateChangelog(tempDir);
      expect(result.latestTag).toBe('v1.0.0');
      expect(result.commitsCount).toBe(1);
      expect(result.categories.features[0].description).toBe('new tag feature');
    });

    it('defaults current version to 1.0.0 if package.json does not exist', async () => {
      fs.writeFileSync(path.join(tempDir, 'f1.txt'), 'empty');
      execSync('git add . && git commit -m "chore: test"', { cwd: tempDir });

      const result = await service.generateChangelog(tempDir);
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.suggestedVersion).toBe('1.0.1');
    });
  });

  describe('applyRelease', () => {
    it('updates package.json version, creates CHANGELOG.md and git tag', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.0.0' }, null, 2)
      );
      execSync('git add . && git commit -m "chore: initial commit"', { cwd: tempDir });

      const changelogText = '## [1.1.0] - 2026-09-01\\n\\n### 🚀 Features & Enhancements\\n- Added dark mode support';
      const res = await service.applyRelease(tempDir, '1.1.0', changelogText, true);

      expect(res.success).toBe(true);

      // Verify package.json updated
      const updatedPkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8'));
      expect(updatedPkg.version).toBe('1.1.0');

      // Verify CHANGELOG.md created
      const changelogContent = fs.readFileSync(path.join(tempDir, 'CHANGELOG.md'), 'utf8');
      expect(changelogContent).toContain('# Changelog');
      expect(changelogContent).toContain('## [1.1.0]');
      expect(changelogContent).toContain('Added dark mode support');

      // Verify git tag created
      const tags = execSync('git tag', { cwd: tempDir }).toString();
      expect(tags).toContain('v1.1.0');
    });

    it('prepends new release notes to an existing CHANGELOG.md', async () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-app', version: '1.1.0' }, null, 2)
      );

      const existingContent = '# Changelog\n\n## [1.0.0] - 2026-08-01\n- Initial release\n';
      fs.writeFileSync(path.join(tempDir, 'CHANGELOG.md'), existingContent);

      const newChangelogText = '## [1.2.0] - 2026-09-01\n- New feature\n';
      const res = await service.applyRelease(tempDir, '1.2.0', newChangelogText, false);

      expect(res.success).toBe(true);
      const updatedContent = fs.readFileSync(path.join(tempDir, 'CHANGELOG.md'), 'utf8');
      expect(updatedContent.indexOf('## [1.2.0]')).toBeLessThan(updatedContent.indexOf('## [1.0.0]'));
    });

    it('handles error gracefully when applying release to invalid path', async () => {
      const res = await service.applyRelease(path.join(tempDir, 'missing-dir', 'deep'), '1.0.0', 'text', false);
      expect(res.success).toBe(false);
      expect(res.message).toContain('Failed to apply release');
    });
  });
});
