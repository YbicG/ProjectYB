import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface InactiveProjectItem {
  projectId: string;
  projectName: string;
  projectPath: string;
  lastActiveDate: string;
  daysInactive: number;
  totalSizeBytes: number;
  reclaimableBytes: number;
  isFrozen: boolean;
  archivePath?: string;
}

const HEAVY_FOLDERS = ['node_modules', 'dist', '.cache', 'target', '.next', '.nuxt', 'build', '.turbo', '.parcel-cache'];

function getDirSize(dirPath: string, maxDepth: number = 16): number {
  let total = 0;
  try {
    if (!fs.existsSync(dirPath)) return 0;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dirPath, ent.name);
      if (ent.isDirectory()) {
        if (maxDepth > 0) {
          total += getDirSize(full, maxDepth - 1);
        }
      } else if (ent.isFile()) {
        try {
          total += fs.statSync(full).size;
        } catch {}
      }
    }
  } catch {}
  return total;
}

export class ProjectArchiverService {
  async scanInactiveProjects(
    projects: Array<{ id: string; name: string; path: string }>,
    daysThreshold: number = 30
  ): Promise<InactiveProjectItem[]> {
    const results: InactiveProjectItem[] = [];
    const now = Date.now();

    for (const p of projects) {
      if (!fs.existsSync(p.path)) continue;

      let lastActiveTime = 0;
      const isGit = fs.existsSync(path.join(p.path, '.git'));

      if (isGit) {
        try {
          const { stdout } = await execAsync('git log -1 --format=%ct', { cwd: p.path });
          const sec = parseInt(stdout.trim(), 10);
          if (!isNaN(sec) && sec > 0) {
            lastActiveTime = sec * 1000;
          }
        } catch {}
      }

      if (lastActiveTime === 0) {
        try {
          const stat = fs.statSync(p.path);
          lastActiveTime = stat.mtimeMs;
        } catch {
          lastActiveTime = now;
        }
      }

      const daysInactive = Math.max(0, Math.floor((now - lastActiveTime) / (1000 * 60 * 60 * 24)));
      const archiveFolder = path.join(p.path, '.projectyb_archive');
      const isFrozen = fs.existsSync(archiveFolder) && fs.readdirSync(archiveFolder).length > 0;

      let reclaimableBytes = 0;
      for (const h of HEAVY_FOLDERS) {
        const hPath = path.join(p.path, h);
        if (fs.existsSync(hPath)) {
          reclaimableBytes += getDirSize(hPath);
        }
      }

      const totalSizeBytes = reclaimableBytes + getDirSize(p.path, 2);

      if (daysInactive >= daysThreshold || isFrozen) {
        results.push({
          projectId: p.id,
          projectName: p.name,
          projectPath: p.path,
          lastActiveDate: new Date(lastActiveTime).toISOString().split('T')[0],
          daysInactive,
          totalSizeBytes,
          reclaimableBytes,
          isFrozen,
          archivePath: isFrozen ? path.join(archiveFolder, 'source_backup.zip') : undefined
        });
      }
    }

    return results.sort((a, b) => b.daysInactive - a.daysInactive);
  }

  async freezeProject(projectPath: string): Promise<{ success: boolean; savedBytes: number; message: string }> {
    if (!fs.existsSync(projectPath)) {
      return { success: false, savedBytes: 0, message: 'Project path does not exist' };
    }

    try {
      const archiveDir = path.join(projectPath, '.projectyb_archive');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }

      let savedBytes = 0;
      for (const h of HEAVY_FOLDERS) {
        const hPath = path.join(projectPath, h);
        if (fs.existsSync(hPath)) {
          const size = getDirSize(hPath);
          savedBytes += size;
          try {
            fs.rmSync(hPath, { recursive: true, force: true });
          } catch {}
        }
      }

      // Write frozen metadata file
      const meta = {
        frozenAt: Date.now(),
        savedBytes,
        platform: process.platform
      };
      fs.writeFileSync(path.join(archiveDir, 'frozen_meta.json'), JSON.stringify(meta, null, 2), 'utf8');

      logger.info('[ProjectArchiver] Deep froze project at ' + projectPath + ', reclaimed ' + Math.round(savedBytes / 1024 / 1024) + ' MB');
      return {
        success: true,
        savedBytes,
        message: 'Successfully frozen! Purged build caches and reclaimed ' + Math.round(savedBytes / 1024 / 1024) + ' MB'
      };
    } catch (err: any) {
      return { success: false, savedBytes: 0, message: err.message };
    }
  }

  async thawProject(projectPath: string): Promise<{ success: boolean; message: string }> {
    if (!fs.existsSync(projectPath)) {
      return { success: false, message: 'Project path not found' };
    }

    try {
      const archiveDir = path.join(projectPath, '.projectyb_archive');
      if (fs.existsSync(archiveDir)) {
        fs.rmSync(archiveDir, { recursive: true, force: true });
      }

      logger.info('[ProjectArchiver] Thawed project at ' + projectPath);
      return {
        success: true,
        message: 'Project thawed! You can now run your install command or start dev servers.'
      };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }
}

export const projectArchiverService = new ProjectArchiverService();