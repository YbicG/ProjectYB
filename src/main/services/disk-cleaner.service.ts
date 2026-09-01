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

const DEPENDENCY_DIRS = ['node_modules', '.venv', 'venv', 'vendor', 'Pods', 'env'];
const BUILD_DIRS = ['dist', 'build', 'out', 'target', '.next', '.nuxt', '.output', '.astro', '.svelte-kit', 'bin', 'obj', 'pkg', 'coverage'];
const CACHE_DIRS = ['.turbo', '.vite', '.cache', '__pycache__', '.parcel-cache', '.eslintcache', '.pytest_cache', '.swc', '.rpt2_cache', '.temp', '.tmp'];
const SUB_CONTAINER_DIRS = ['packages', 'apps', 'services', 'modules', 'client', 'server', 'frontend', 'backend', 'core'];

class DiskCleanerService {
  private isCancelled = false;
  private dirCache = new Map<string, { mtime: number; size: number }>();

  cancelScan() {
    this.isCancelled = true;
  }

  /**
   * Ultra-fast directory size calculator with mtime caching and breadth-first worker queue
   */
  async getDirectorySize(dirPath: string, maxDepth: number = 16): Promise<number> {
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

                const dirSize = await this.getDirectorySize(fullPath);
                totalBytes += dirSize;

                if (cat) {
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
                } else if (SUB_CONTAINER_DIRS.includes(name.toLowerCase())) {
                  // Check 1 level down inside monorepo container folders for nested reclaimable targets
                  try {
                    const subEntries = await fs.promises.readdir(fullPath, { withFileTypes: true });
                    for (const sub of subEntries) {
                      if (sub.isDirectory()) {
                        const subName = sub.name;
                        const subFullPath = path.join(fullPath, subName);
                        let subCat: CleanCategory | null = null;

                        if (DEPENDENCY_DIRS.includes(subName)) subCat = 'dependencies';
                        else if (BUILD_DIRS.includes(subName)) subCat = 'build';
                        else if (CACHE_DIRS.includes(subName)) subCat = 'caches';

                        if (subCat) {
                          const subSize = await this.getDirectorySize(subFullPath);
                          if (subCat === 'dependencies') dependenciesBytes += subSize;
                          else if (subCat === 'build') buildBytes += subSize;
                          else if (subCat === 'caches') cachesBytes += subSize;

                          items.push({
                            name: name + '/' + subName,
                            relativePath: name + '/' + subName,
                            fullPath: subFullPath,
                            category: subCat,
                            bytes: subSize
                          });
                        }
                      }
                    }
                  } catch {}
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
      logger.error('Failed to analyze disk usage for ' + projectPath, err);
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
   * Clean specific categories from a project
   */
  async cleanProject(projectPath: string, categories: CleanCategory[]): Promise<{ freedBytes: number; cleanedPaths: string[] }> {
    const cleanedPaths: string[] = [];
    let freedBytes = 0;

    try {
      const usage = await this.analyzeProject('tmp', 'tmp', projectPath);
      const targets = usage.items.filter((item) => categories.includes(item.category));

      for (const target of targets) {
        try {
          if (fs.existsSync(target.fullPath)) {
            await fs.promises.rm(target.fullPath, { recursive: true, force: true });
            cleanedPaths.push(target.fullPath);
            freedBytes += target.bytes;
            this.dirCache.delete(target.fullPath);
          }
        } catch (err) {
          logger.error('Failed to remove ' + target.fullPath, err);
        }
      }
      this.dirCache.delete(projectPath);
    } catch (err) {
      logger.error('Failed to clean project at ' + projectPath, err);
    }

    return { freedBytes, cleanedPaths };
  }

  /**
   * Clean global package manager caches
   */
  async cleanGlobalCache(type: 'pnpm' | 'npm' | 'cargo' | 'pip'): Promise<{ success: boolean; message: string }> {
    try {
      let cmd = '';
      switch (type) {
        case 'pnpm':
          cmd = 'pnpm store prune';
          break;
        case 'npm':
          cmd = 'npm cache clean --force';
          break;
        case 'cargo':
          cmd = 'cargo cache --autoclean';
          break;
        case 'pip':
          cmd = 'pip cache purge';
          break;
      }

      await execAsync(cmd);
      return { success: true, message: 'Successfully cleaned ' + type + ' cache' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to clean global cache' };
    }
  }
}

export const diskCleanerService = new DiskCleanerService();
