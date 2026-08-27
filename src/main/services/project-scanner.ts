import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { logger } from '../utils/logger';

export interface ProjectYBConfig {
  name?: string;
  type?: 'node' | 'python' | 'rust' | 'go' | 'dotnet' | 'unknown';
  ignore?: boolean;
  ignored?: boolean;
  tags?: string[];
  scripts?: Record<string, string>;
  services?: any[];
  quickActions?: any[];
  [key: string]: any;
}

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  type: 'node' | 'python' | 'rust' | 'go' | 'dotnet' | 'unknown';
  category: string;
  status: 'running' | 'stopped' | 'error';
  tags: string[];
  runningServices: string[];
  scripts?: any;
  dependencies?: any;
  branch?: string;
  lastCommit?: string;
  isGitRepo?: boolean;
  ignored?: boolean;
}

class ProjectScanner {
  private watcher: chokidar.FSWatcher | null = null;
  private skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', '.venv']);

  async getConfigFilePath(folderPath: string): Promise<string | null> {
    try {
      const jsonPath = path.join(folderPath, '.projectyb.json');
      if (fs.existsSync(jsonPath)) return jsonPath;
      const dotPath = path.join(folderPath, '.projectyb');
      if (fs.existsSync(dotPath)) return dotPath;
    } catch {}
    return null;
  }

  async readProjectConfig(folderPath: string): Promise<{ config: ProjectYBConfig | null; filePath: string | null }> {
    const configPath = await this.getConfigFilePath(folderPath);
    if (!configPath) return { config: null, filePath: null };
    try {
      const raw = await fs.promises.readFile(configPath, 'utf8');
      const config = JSON.parse(raw);
      return { config, filePath: configPath };
    } catch (e) {
      logger.error(`Error reading config at ${configPath}`, e);
      return { config: null, filePath: configPath };
    }
  }

  async writeProjectConfig(folderPath: string, updates: Partial<ProjectYBConfig>): Promise<string> {
    let configPath = await this.getConfigFilePath(folderPath);
    let existing: ProjectYBConfig = {};

    if (configPath) {
      try {
        const raw = await fs.promises.readFile(configPath, 'utf8');
        existing = JSON.parse(raw);
      } catch {}
    } else {
      configPath = path.join(folderPath, '.projectyb.json');
    }

    const merged = { ...existing, ...updates };
    await fs.promises.writeFile(configPath, JSON.stringify(merged, null, 2), 'utf8');
    return configPath;
  }

  async setIgnored(folderPath: string, ignore: boolean): Promise<string> {
    return this.writeProjectConfig(folderPath, { ignore });
  }

  async scanDirectory(rootPaths: string[], maxDepth: number = 4, mode: 'git' | 'all' = 'git'): Promise<ProjectInfo[]> {
    const projects: ProjectInfo[] = [];

    const scan = async (currentPath: string, depth: number) => {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        const files = entries.filter(e => e.isFile()).map(e => e.name);

        // Check for .projectyb.json or .projectyb
        const hasProjectYBConfig = files.includes('.projectyb.json') || files.includes('.projectyb');
        const { config } = await this.readProjectConfig(currentPath);

        // If explicitly ignored in config, skip this project
        if (config && (config.ignore === true || config.ignored === true)) {
          return;
        }

        let isProject = false;
        let type: ProjectInfo['type'] = 'unknown';

        if (files.includes('package.json')) { isProject = true; type = 'node'; }
        else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) { isProject = true; type = 'python'; }
        else if (files.includes('Cargo.toml')) { isProject = true; type = 'rust'; }
        else if (files.includes('go.mod')) { isProject = true; type = 'go'; }
        else if (files.includes('.git')) { isProject = true; type = 'unknown'; }
        else if (hasProjectYBConfig) { isProject = true; type = config?.type || 'unknown'; }

        if (mode === 'all' && depth === 1) {
          isProject = true;
        }

        if (isProject) {
          const defaultName = path.basename(currentPath);
          const name = config?.name || defaultName;
          const category = path.basename(path.dirname(currentPath));
          const tags = config?.tags || [];
          const isGit = files.includes('.git') || fs.existsSync(path.join(currentPath, '.git'));
          
          let scripts = config?.scripts;
          let dependencies;

          if (type === 'node') {
            try {
              const pkgStr = await fs.promises.readFile(path.join(currentPath, 'package.json'), 'utf8');
              const pkg = JSON.parse(pkgStr);
              scripts = { ...pkg.scripts, ...scripts };
              dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
            } catch (e) {
              logger.error(`Error parsing package.json in ${currentPath}`, e);
            }
          }

          projects.push({
            name,
            path: currentPath,
            type: config?.type || type,
            category,
            scripts,
            dependencies,
            id: currentPath,
            status: 'stopped' as const,
            tags,
            runningServices: [],
            isGitRepo: isGit,
            ignored: false
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

      const { config } = await this.readProjectConfig(folderPath);
      if (config && (config.ignore === true || config.ignored === true)) {
        return null;
      }

      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
      let type: ProjectInfo['type'] = 'unknown';
      const files = entries.filter(e => e.isFile()).map(e => e.name);

      if (files.includes('package.json')) { type = 'node'; }
      else if (files.includes('requirements.txt') || files.includes('pyproject.toml')) { type = 'python'; }
      else if (files.includes('Cargo.toml')) { type = 'rust'; }
      else if (files.includes('go.mod')) { type = 'go'; }

      const defaultName = path.basename(folderPath);
      const name = config?.name || defaultName;
      const category = path.basename(path.dirname(folderPath));
      const tags = config?.tags || [];
      const isGit = files.includes('.git') || fs.existsSync(path.join(folderPath, '.git'));

      let scripts = config?.scripts;
      let dependencies;
      if (type === 'node') {
        try {
          const pkgStr = await fs.promises.readFile(path.join(folderPath, 'package.json'), 'utf8');
          const pkg = JSON.parse(pkgStr);
          scripts = { ...pkg.scripts, ...scripts };
          dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
        } catch (e) {}
      }

      return {
        name,
        path: folderPath,
        type: config?.type || type,
        category,
        scripts,
        dependencies,
        id: folderPath,
        status: 'stopped' as const,
        tags,
        runningServices: [],
        isGitRepo: isGit,
        ignored: false
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
