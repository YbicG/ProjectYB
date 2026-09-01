import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { diskCleanerService } from '../src/main/services/disk-cleaner.service';
import { formatBytes, formatDiskSize, formatDuration, timeAgo, truncate } from '../src/renderer/src/lib/utils';

describe('Disk Cleaner & Formatting Utilities', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectyb-disk-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('getDirectorySize calculation', () => {
    it('calculates recursive directory size correctly and caches result by mtime', async () => {
      const subDir = path.join(tempDir, 'nested', 'deep');
      fs.mkdirSync(subDir, { recursive: true });

      const file1 = path.join(tempDir, 'file1.dat');
      const file2 = path.join(subDir, 'file2.dat');

      const buf1 = Buffer.alloc(10 * 1024, 'a'); // 10 KB
      const buf2 = Buffer.alloc(25 * 1024, 'b'); // 25 KB
      fs.writeFileSync(file1, buf1);
      fs.writeFileSync(file2, buf2);

      const size1 = await diskCleanerService.getDirectorySize(tempDir);
      expect(size1).toBe(35 * 1024);

      // Second call should return cached size
      const size2 = await diskCleanerService.getDirectorySize(tempDir);
      expect(size2).toBe(35 * 1024);
    });

    it('returns 0 for non-existent directory', async () => {
      const nonExistent = path.join(tempDir, 'does-not-exist');
      const size = await diskCleanerService.getDirectorySize(nonExistent);
      expect(size).toBe(0);
    });
  });

  describe('analyzeProject & monorepo detection', () => {
    it('categorizes dependencies, build artifacts, and caches accurately', async () => {
      const projectPath = path.join(tempDir, 'sample-project');
      const nodeModules = path.join(projectPath, 'node_modules', 'pkg');
      const dist = path.join(projectPath, 'dist');
      const turboCache = path.join(projectPath, '.turbo');
      const src = path.join(projectPath, 'src');

      fs.mkdirSync(nodeModules, { recursive: true });
      fs.mkdirSync(dist, { recursive: true });
      fs.mkdirSync(turboCache, { recursive: true });
      fs.mkdirSync(src, { recursive: true });

      // Populate files
      fs.writeFileSync(path.join(nodeModules, 'index.js'), Buffer.alloc(100 * 1024, 'x')); // 100 KB
      fs.writeFileSync(path.join(dist, 'bundle.js'), Buffer.alloc(50 * 1024, 'x'));       // 50 KB
      fs.writeFileSync(path.join(turboCache, 'cache.bin'), Buffer.alloc(20 * 1024, 'x')); // 20 KB
      fs.writeFileSync(path.join(src, 'main.ts'), Buffer.alloc(5 * 1024, 'x'));          // 5 KB (source)

      const usage = await diskCleanerService.analyzeProject('proj-1', 'Sample App', projectPath);

      expect(usage.projectId).toBe('proj-1');
      expect(usage.dependenciesBytes).toBe(100 * 1024);
      expect(usage.buildBytes).toBe(50 * 1024);
      expect(usage.cachesBytes).toBe(20 * 1024);
      expect(usage.reclaimableBytes).toBe(170 * 1024);
      expect(usage.sourceBytes).toBe(5 * 1024);
      expect(usage.totalBytes).toBe(175 * 1024);
      expect(usage.items.length).toBe(3);
    });

    it('scans monorepo packages directory for nested reclaimable targets', async () => {
      const monorepoPath = path.join(tempDir, 'monorepo');
      const pkgNodeModules = path.join(monorepoPath, 'packages', 'ui', 'node_modules');
      const appDist = path.join(monorepoPath, 'packages', 'web', 'dist');

      fs.mkdirSync(pkgNodeModules, { recursive: true });
      fs.mkdirSync(appDist, { recursive: true });

      fs.writeFileSync(path.join(pkgNodeModules, 'test.js'), Buffer.alloc(40 * 1024, 'm'));
      fs.writeFileSync(path.join(appDist, 'index.js'), Buffer.alloc(30 * 1024, 'm'));

      const usage = await diskCleanerService.analyzeProject('mono-1', 'Monorepo', monorepoPath);

      expect(usage.dependenciesBytes).toBe(40 * 1024);
      expect(usage.buildBytes).toBe(30 * 1024);
      expect(usage.reclaimableBytes).toBe(70 * 1024);
      expect(usage.items.some((i) => i.name === 'packages/ui/node_modules')).toBe(true);
      expect(usage.items.some((i) => i.name === 'packages/web/dist')).toBe(true);
    });
  });

  describe('analyzeProjects (batch) & progress callback', () => {
    it('aggregates global usage across multiple projects and reports progress', async () => {
      const p1 = path.join(tempDir, 'p1');
      const p2 = path.join(tempDir, 'p2');
      fs.mkdirSync(path.join(p1, 'node_modules'), { recursive: true });
      fs.mkdirSync(path.join(p2, 'dist'), { recursive: true });

      fs.writeFileSync(path.join(p1, 'node_modules', 'a.js'), Buffer.alloc(10 * 1024, '1'));
      fs.writeFileSync(path.join(p2, 'dist', 'b.js'), Buffer.alloc(20 * 1024, '2'));

      const progressProjects: string[] = [];
      const summary = await diskCleanerService.analyzeProjects(
        [
          { id: '1', name: 'P1', path: p1 },
          { id: '2', name: 'P2', path: p2 }
        ],
        (usage) => {
          progressProjects.push(usage.projectName);
        }
      );

      expect(progressProjects).toContain('P1');
      expect(progressProjects).toContain('P2');
      expect(summary.dependenciesBytes).toBe(10 * 1024);
      expect(summary.buildBytes).toBe(20 * 1024);
      expect(summary.totalReclaimableBytes).toBe(30 * 1024);
      expect(summary.projects.length).toBe(2);
    });
  });

  describe('cleanProject', () => {
    it('purges specified category directories and leaves other files intact', async () => {
      const projPath = path.join(tempDir, 'clean-target');
      const nmDir = path.join(projPath, 'node_modules');
      const distDir = path.join(projPath, 'dist');
      const srcDir = path.join(projPath, 'src');

      fs.mkdirSync(nmDir, { recursive: true });
      fs.mkdirSync(distDir, { recursive: true });
      fs.mkdirSync(srcDir, { recursive: true });

      fs.writeFileSync(path.join(nmDir, 'lib.js'), Buffer.alloc(50 * 1024, 'x'));
      fs.writeFileSync(path.join(distDir, 'main.js'), Buffer.alloc(20 * 1024, 'x'));
      fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export const active = true;');

      // Clean ONLY dependencies
      const res = await diskCleanerService.cleanProject(projPath, ['dependencies']);

      expect(res.success).toBe(true);
      expect(res.freedBytes).toBe(50 * 1024);
      expect(fs.existsSync(nmDir)).toBe(false);
      expect(fs.existsSync(distDir)).toBe(true);
      expect(fs.existsSync(path.join(srcDir, 'index.ts'))).toBe(true);
    });
  });

  describe('Formatting Utilities (formatBytes & formatDiskSize)', () => {
    it('formats bytes with correct units and decimal precision', () => {
      expect(formatBytes(0)).toBe('0 Bytes');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1024 * 1024)).toBe('1 MB');
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(formatBytes(1536, 1)).toBe('1.5 KB');
      expect(formatBytes(2.5 * 1024 * 1024, 2)).toBe('2.5 MB');
    });

    it('formats disk size using formatDiskSize', () => {
      expect(formatDiskSize(0)).toBe('0 B');
      expect(formatDiskSize(500)).toBe('500 B');
      expect(formatDiskSize(2048)).toBe('2.0 KB');
      expect(formatDiskSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
      expect(formatDiskSize(15 * 1024 * 1024)).toBe('15 MB');
      expect(formatDiskSize(2.3 * 1024 * 1024 * 1024)).toBe('2.3 GB');
    });

    it('formats duration, timeAgo, and truncate helpers', () => {
      expect(formatDuration(5000)).toBe('0m 5s');
      expect(formatDuration(65000)).toBe('1m 5s');
      expect(formatDuration(3665000)).toBe('1h 1m');

      const now = Date.now();
      expect(timeAgo(now - 10000)).toBe('Just now');
      expect(timeAgo(now - 120000)).toBe('2 minutes ago');
      expect(timeAgo(now - 7200000)).toBe('2 hours ago');
      expect(timeAgo(now - 172800000)).toBe('2 days ago');

      expect(truncate('Hello World', 5)).toBe('Hello...');
      expect(truncate('Short', 10)).toBe('Short');
    });
  });
});
