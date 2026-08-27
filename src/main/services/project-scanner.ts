import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { logger } from '../utils/logger';

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  type: 'node' | 'python' | 'rust' | 'go' | 'unknown';
  category: string;
  status: 'running' | 'stopped' | 'error';
  tags: string[];
  runningServices: string[];
  scripts?: any;
  dependencies?: any;
  branch?: string;
  lastCommit?: string;
}

class ProjectScanner {
  private watcher: chokidar.FSWatcher | null = null;
  private skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', '.venv']);

  async scanDirectory(rootPaths: string[], maxDepth: number = 4, mode: 'git' | 'all' = 'git'): Promise<ProjectInfo[]> {
    const projects: ProjectInfo[] = [];

    const scan = async (currentPath: string, depth: number) => {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        
        let isProject = false;
        let type: ProjectInfo['type'] = 'unknown';
        const files = entries.filter(e => e.isFile()).map(e => e.name);

        if (files.includes('package.json')) { isProject = true; type = 'node'; }
        else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) { isProject = true; type = 'python'; }
        else if (files.includes('Cargo.toml')) { isProject = true; type = 'rust'; }
        else if (files.includes('go.mod')) { isProject = true; type = 'go'; }
        else if (files.includes('.git')) { isProject = true; type = 'unknown'; }

        if (mode === 'all' && depth === 1) {
          isProject = true;
        }

        if (isProject) {
          const name = path.basename(currentPath);
          const category = path.basename(path.dirname(currentPath));
          
          let scripts, dependencies;
          if (type === 'node') {
            try {
              const pkgStr = await fs.promises.readFile(path.join(currentPath, 'package.json'), 'utf8');
              const pkg = JSON.parse(pkgStr);
              scripts = pkg.scripts;
              dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
            } catch (e) {
              logger.error(`Error parsing package.json in ${currentPath}`, e);
            }
          }

          projects.push({
            name,
            path: currentPath,
            type,
            category,
            scripts,
            dependencies,
            id: currentPath,
            status: 'stopped' as const,
            tags: [],
            runningServices: []
          });
        }

        if (mode === 'all' && depth >= 1) return;

        for (const entry of entries) {
          if (entry.isDirectory() && !this.skipDirs.has(entry.name)) {
            await scan(path.join(currentPath, entry.name), depth + 1);
          }
        }
      } catch (error) {
        logger.error(`Error scanning directory ${currentPath}`, error);
      }
    };

    for (const root of rootPaths) {
      await scan(root, 0);
    }

    return projects;
  }

  async scanSingleFolder(folderPath: string): Promise<ProjectInfo | null> {
    try {
      const stat = await fs.promises.stat(folderPath);
      if (!stat.isDirectory()) return null;

      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
      let type: ProjectInfo['type'] = 'unknown';
      const files = entries.filter(e => e.isFile()).map(e => e.name);

      if (files.includes('package.json')) { type = 'node'; }
      else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) { type = 'python'; }
      else if (files.includes('Cargo.toml')) { type = 'rust'; }
      else if (files.includes('go.mod')) { type = 'go'; }

      const name = path.basename(folderPath);
      const category = path.basename(path.dirname(folderPath));

      let scripts, dependencies;
      if (type === 'node') {
        try {
          const pkgStr = await fs.promises.readFile(path.join(folderPath, 'package.json'), 'utf8');
          const pkg = JSON.parse(pkgStr);
          scripts = pkg.scripts;
          dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
        } catch (e) {}
      }

      return {
        name,
        path: folderPath,
        type,
        category,
        scripts,
        dependencies,
        id: folderPath,
        status: 'stopped' as const,
        tags: [],
        runningServices: []
      };
    } catch (error) {
      return null;
    }
  }

  watchForChanges(rootPaths: string[], callback: (event: string, filePath: string) => void) {
    if (this.watcher) {
      this.watcher.close();
    }

    this.watcher = chokidar.watch(rootPaths, {
      ignored: Array.from(this.skipDirs).map(d => `**/${d}/**`),
      persistent: true,
      depth: 4
    });

    this.watcher
      .on('addDir', (path) => callback('add', path))
      .on('unlinkDir', (path) => callback('remove', path))
      .on('add', (path) => callback('add_file', path))
      .on('unlink', (path) => callback('remove_file', path));
  }
}

export const projectScanner = new ProjectScanner();
