import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export type CleanCategory = 'dependencies' | 'build' | 'caches';

export interface DiskItem {
  name: string;
  relativePath: string;
  fullPath: string;
  category: CleanCategory;
  bytes: number;
}

export interface ProjectDiskUsage {
  projectId: string;
  projectName: string;
  projectPath: string;
  totalBytes: number;
  dependenciesBytes: number;
  buildBytes: number;
  cachesBytes: number;
  sourceBytes: number;
  reclaimableBytes: number;
  items: DiskItem[];
}

export interface GlobalDiskSummary {
  totalAnalyzedBytes: number;
  totalReclaimableBytes: number;
  dependenciesBytes: number;
  buildBytes: number;
  cachesBytes: number;
  projects: ProjectDiskUsage[];
}

const DEPENDENCY_DIRS = ['node_modules', '.venv', 'venv', 'vendor', 'Pods'];
const BUILD_DIRS = ['dist', 'build', 'out', 'target', '.next', '.nuxt', '.output', '.astro', '.svelte-kit', 'bin', 'obj'];
const CACHE_DIRS = ['.turbo', '.vite', '.cache', '__pycache__', '.parcel-cache', '.eslintcache', '.pytest_cache', '.swc', '.rpt2_cache'];

class DiskCleanerService {
  private isCancelled = false;
  private dirCache = new Map<string, { mtime: number; size: number }>();

  cancelScan() {
    this.isCancelled = true;
  }

  /**
   * Ultra-fast directory size calculator with mtime caching and breadth-first worker queue
   */
  async getDirectorySize(dirPath: string, maxDepth: number = 6): Promise<number> {
    if (this.isCancelled) return 0;

    try {
      const rootStat = await fs.promises.stat(dirPath);
      const cached = this.dirCache.get(dirPath);
      if (cached && cached.mtime === rootStat.mtimeMs) {
        return cached.size;
      }

      let total = 0;
      const queue: Array<{ p: string; depth: number }> = [{ p: dirPath, depth: 0 }];

      while (queue.length > 0) {
        if (this.isCancelled) return 0;
        const currentBatch = queue.splice(0, 32);

        await Promise.all(
          currentBatch.map(async ({ p, depth }) => {
            if (depth > maxDepth) return;
            try {
              const entries = await fs.promises.readdir(p, { withFileTypes: true });
              for (const entry of entries) {
                const full = path.join(p, entry.name);
                if (entry.isDirectory()) {
                  queue.push({ p: full, depth: depth + 1 });
                } else if (entry.isFile()) {
                  try {
                    const st = await fs.promises.stat(full);
                    total += st.size;
                  } catch {}
                }
              }
            } catch {}
          })
        );
      }

      this.dirCache.set(dirPath, { mtime: rootStat.mtimeMs, size: total });
      return total;
    } catch {
      return 0;
    }
  }

  /**
   * Analyze single project disk usage
   */
  async analyzeProject(projectId: string, projectName: string, projectPath: string): Promise<ProjectDiskUsage> {
    const items: DiskItem[] = [];
    let dependenciesBytes = 0;
    let buildBytes = 0;
    let cachesBytes = 0;
    let totalBytes = 0;

    try {
      if (fs.existsSync(projectPath)) {
        const topEntries = await fs.promises.readdir(projectPath, { withFileTypes: true });

        // Run category checks in parallel
        await Promise.all(
          topEntries.map(async (entry) => {
            if (this.isCancelled) return;
            const fullPath = path.join(projectPath, entry.name);

            try {
              if (entry.isDirectory()) {
                const name = entry.name;
                let cat: CleanCategory | null = null;

                if (DEPENDENCY_DIRS.includes(name)) cat = 'dependencies';
                else if (BUILD_DIRS.includes(name)) cat = 'build';
                else if (CACHE_DIRS.includes(name)) cat = 'caches';

                if (cat) {
                  const dirSize = await this.getDirectorySize(fullPath);
                  totalBytes += dirSize;

                  if (cat === 'dependencies') dependenciesBytes += dirSize;
                  else if (cat === 'build') buildBytes += dirSize;
                  else if (cat === 'caches') cachesBytes += dirSize;

                  items.push({
                    name,
                    relativePath: name,
                    fullPath,
                    category: cat,
                    bytes: dirSize
                  });
                }
              } else if (entry.isFile()) {
                const stat = await fs.promises.stat(fullPath);
                totalBytes += stat.size;
              }
            } catch {}
          })
        );
      }
    } catch (err) {
      logger.error(`Failed to analyze disk usage for ${projectPath}`, err);
    }

    const reclaimableBytes = dependenciesBytes + buildBytes + cachesBytes;
    const sourceBytes = Math.max(0, totalBytes - reclaimableBytes);

    return {
      projectId,
      projectName,
      projectPath,
      totalBytes,
      dependenciesBytes,
      buildBytes,
      cachesBytes,
      sourceBytes,
      reclaimableBytes,
      items
    };
  }

  /**
   * Analyze multiple projects in batch with progressive streaming
   */
  async analyzeProjects(
    projects: Array<{ id: string; name: string; path: string }>,
    onProgress?: (usage: ProjectDiskUsage) => void
  ): Promise<GlobalDiskSummary> {
    this.isCancelled = false;
    const usages: ProjectDiskUsage[] = [];
    const chunkSize = 6;

    for (let i = 0; i < projects.length; i += chunkSize) {
      if (this.isCancelled) break;
      const chunk = projects.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map(async (p) => {
          const res = await this.analyzeProject(p.id, p.name, p.path);
          if (onProgress && !this.isCancelled) {
            onProgress(res);
          }
          return res;
        })
      );
      usages.push(...results);
    }

    let totalAnalyzedBytes = 0;
    let totalReclaimableBytes = 0;
    let dependenciesBytes = 0;
    let buildBytes = 0;
    let cachesBytes = 0;

    for (const u of usages) {
      totalAnalyzedBytes += u.totalBytes;
      totalReclaimableBytes += u.reclaimableBytes;
      dependenciesBytes += u.dependenciesBytes;
      buildBytes += u.buildBytes;
      cachesBytes += u.cachesBytes;
    }

    return {
      totalAnalyzedBytes,
      totalReclaimableBytes,
      dependenciesBytes,
      buildBytes,
      cachesBytes,
      projects: usages
    };
  }

  /**
   * Safely purge selected items in a project
   */
  async cleanProject(projectPath: string, categories: CleanCategory[]): Promise<{ success: boolean; freedBytes: number; cleanedPaths: string[] }> {
    let freedBytes = 0;
    const cleanedPaths: string[] = [];

    try {
      const topEntries = await fs.promises.readdir(projectPath, { withFileTypes: true });

      for (const entry of topEntries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        let matchCat: CleanCategory | null = null;

        if (DEPENDENCY_DIRS.includes(name) && categories.includes('dependencies')) matchCat = 'dependencies';
        else if (BUILD_DIRS.includes(name) && categories.includes('build')) matchCat = 'build';
        else if (CACHE_DIRS.includes(name) && categories.includes('caches')) matchCat = 'caches';

        if (matchCat) {
          const targetPath = path.join(projectPath, name);
          try {
            const size = await this.getDirectorySize(targetPath);
            await fs.promises.rm(targetPath, { recursive: true, force: true });
            this.dirCache.delete(targetPath);
            freedBytes += size;
            cleanedPaths.push(name);
          } catch (delErr) {
            logger.error(`Failed to remove ${targetPath}`, delErr);
          }
        }
      }

      return { success: true, freedBytes, cleanedPaths };
    } catch (err: any) {
      return { success: false, freedBytes, cleanedPaths };
    }
  }

  /**
   * Clean global package manager cache
   */
  async cleanGlobalCache(type: 'pnpm' | 'npm' | 'cargo' | 'pip'): Promise<{ success: boolean; output: string }> {
    let cmd = '';
    if (type === 'pnpm') cmd = 'pnpm store prune';
    else if (type === 'npm') cmd = 'npm cache clean --force';
    else if (type === 'cargo') cmd = 'cargo cache --autoclean';
    else if (type === 'pip') cmd = 'pip cache purge';

    try {
      const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
      return { success: true, output: stdout || stderr || `${type} cache cleaned successfully` };
    } catch (err: any) {
      return { success: false, output: err.message || err.stderr || `Failed to clean ${type} cache` };
    }
  }
}

export const diskCleanerService = new DiskCleanerService();
