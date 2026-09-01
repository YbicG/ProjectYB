import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ProjectArchiverService, projectArchiverService } from '../src/main/services/project-archiver.service';

describe('ProjectArchiverService', () => {
  let service: ProjectArchiverService;
  let tempDir: string;

  beforeEach(() => {
    service = new ProjectArchiverService();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectyb-archiver-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('scanInactiveProjects & heavy folder calculation', () => {
    it('scans inactive projects and calculates reclaimable heavy folder sizes', async () => {
      const activeProjPath = path.join(tempDir, 'active-app');
      const inactiveProjPath = path.join(tempDir, 'inactive-app');
      fs.mkdirSync(activeProjPath, { recursive: true });
      fs.mkdirSync(inactiveProjPath, { recursive: true });

      // Active project: source files + node_modules
      fs.writeFileSync(path.join(activeProjPath, 'index.ts'), 'console.log("hello");');
      const activeNodeModules = path.join(activeProjPath, 'node_modules', 'lodash');
      fs.mkdirSync(activeNodeModules, { recursive: true });
      fs.writeFileSync(path.join(activeNodeModules, 'index.js'), 'module.exports = {};');

      // Inactive project: source files + heavy folders (node_modules, dist, .cache)
      fs.writeFileSync(path.join(inactiveProjPath, 'server.ts'), 'export const app = {};');
      const inactiveNodeModules = path.join(inactiveProjPath, 'node_modules', 'express');
      const inactiveDist = path.join(inactiveProjPath, 'dist');
      const inactiveCache = path.join(inactiveProjPath, '.cache');
      fs.mkdirSync(inactiveNodeModules, { recursive: true });
      fs.mkdirSync(inactiveDist, { recursive: true });
      fs.mkdirSync(inactiveCache, { recursive: true });

      const chunk100kb = Buffer.alloc(100 * 1024, 'x');
      fs.writeFileSync(path.join(inactiveNodeModules, 'index.js'), chunk100kb);
      fs.writeFileSync(path.join(inactiveDist, 'bundle.js'), chunk100kb);
      fs.writeFileSync(path.join(inactiveCache, 'cache.json'), chunk100kb);

      // Set mtime for inactive project to 45 days ago
      const fortyFiveDaysAgo = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);
      fs.utimesSync(inactiveProjPath, fortyFiveDaysAgo, fortyFiveDaysAgo);

      const projects = [
        { id: 'proj-active', name: 'Active App', path: activeProjPath },
        { id: 'proj-inactive', name: 'Inactive App', path: inactiveProjPath }
      ];

      const scanned = await service.scanInactiveProjects(projects, 30);

      // Only inactive project should be returned under 30 days threshold
      expect(scanned.length).toBe(1);
      expect(scanned[0].projectId).toBe('proj-inactive');
      expect(scanned[0].daysInactive).toBeGreaterThanOrEqual(44);
      expect(scanned[0].reclaimableBytes).toBeGreaterThanOrEqual(300 * 1024);
      expect(scanned[0].totalSizeBytes).toBeGreaterThan(scanned[0].reclaimableBytes);
      expect(scanned[0].isFrozen).toBe(false);
    });

    it('identifies already frozen projects even if within threshold', async () => {
      const frozenProjPath = path.join(tempDir, 'frozen-app');
      const archiveDir = path.join(frozenProjPath, '.projectyb_archive');
      fs.mkdirSync(archiveDir, { recursive: true });
      fs.writeFileSync(path.join(archiveDir, 'frozen_meta.json'), JSON.stringify({ frozenAt: Date.now() }));
      fs.writeFileSync(path.join(frozenProjPath, 'package.json'), '{}');

      const projects = [
        { id: 'proj-frozen', name: 'Frozen App', path: frozenProjPath }
      ];

      const scanned = await service.scanInactiveProjects(projects, 60);
      expect(scanned.length).toBe(1);
      expect(scanned[0].isFrozen).toBe(true);
      expect(scanned[0].archivePath).toContain('source_backup.zip');
    });

    it('skips non-existent project directories during scan', async () => {
      const scanned = await service.scanInactiveProjects([
        { id: 'ghost', name: 'Ghost', path: path.join(tempDir, 'missing') }
      ]);
      expect(scanned).toEqual([]);
    });
  });

  describe('freezeProject & thawProject simulation', () => {
    it('freezes project by purging heavy folders and recording metadata', async () => {
      const projPath = path.join(tempDir, 'app-to-freeze');
      const nodeModulesDir = path.join(projPath, 'node_modules');
      const distDir = path.join(projPath, 'dist');
      const srcDir = path.join(projPath, 'src');

      fs.mkdirSync(nodeModulesDir, { recursive: true });
      fs.mkdirSync(distDir, { recursive: true });
      fs.mkdirSync(srcDir, { recursive: true });

      const data50kb = Buffer.alloc(50 * 1024, 'a');
      fs.writeFileSync(path.join(nodeModulesDir, 'package.json'), data50kb);
      fs.writeFileSync(path.join(distDir, 'main.js'), data50kb);
      fs.writeFileSync(path.join(srcDir, 'index.ts'), 'export const hello = "world";');

      const freezeResult = await service.freezeProject(projPath);

      expect(freezeResult.success).toBe(true);
      expect(freezeResult.savedBytes).toBeGreaterThanOrEqual(100 * 1024);
      expect(freezeResult.message).toContain('Successfully frozen');

      // Verify heavy folders are purged
      expect(fs.existsSync(nodeModulesDir)).toBe(false);
      expect(fs.existsSync(distDir)).toBe(false);

      // Verify source files are preserved
      expect(fs.existsSync(path.join(srcDir, 'index.ts'))).toBe(true);

      // Verify frozen metadata was written
      const metaFile = path.join(projPath, '.projectyb_archive', 'frozen_meta.json');
      expect(fs.existsSync(metaFile)).toBe(true);
      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      expect(meta.savedBytes).toBe(freezeResult.savedBytes);
      expect(meta.platform).toBe(process.platform);

      // Now test thawing the project
      const thawResult = await service.thawProject(projPath);
      expect(thawResult.success).toBe(true);
      expect(thawResult.message).toContain('Project thawed');
      expect(fs.existsSync(path.join(projPath, '.projectyb_archive'))).toBe(false);
    });

    it('handles non-existent paths gracefully for freeze and thaw', async () => {
      const missingPath = path.join(tempDir, 'missing-app');

      const freezeRes = await service.freezeProject(missingPath);
      expect(freezeRes.success).toBe(false);
      expect(freezeRes.message).toContain('does not exist');

      const thawRes = await service.thawProject(missingPath);
      expect(thawRes.success).toBe(false);
      expect(thawRes.message).toContain('not found');
    });
  });
});
