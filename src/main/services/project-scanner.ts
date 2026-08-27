import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { logger } from '../utils/logger';

export interface ProjectYBConfig {
  name?: string;
  type?: 'node' | 'python' | 'rust' | 'go' | 'dotnet' | 'godot' | 'git' | 'unknown';
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
  type: 'node' | 'python' | 'rust' | 'go' | 'dotnet' | 'godot' | 'git' | 'unknown';
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
  private skipDirs = new Set([
    'node_modules', '.git', 'dist', 'build', '__pycache__', '.next', '.venv', '.turbo', 'vendor', '.gradle', 'bin', 'obj'
  ]);

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
    const seenPaths = new Set<string>();

    for (const root of rootPaths) {
      if (!fs.existsSync(root)) continue;

      const walk = async (currentPath: string, depth: number) => {
        if (depth > maxDepth) return;

        try {
          const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
          const fileNames = entries.filter(e => e.isFile()).map(e => e.name);
          const dirNames = entries.filter(e => e.isDirectory()).map(e => e.name);

          // Check for .projectyb.json or .projectyb
          const hasProjectYBConfig = fileNames.includes('.projectyb.json') || fileNames.includes('.projectyb');
          const { config } = await this.readProjectConfig(currentPath);

          // If explicitly ignored in config, skip this project completely
          if (config && (config.ignore === true || config.ignored === true)) {
            return;
          }

          const hasGit = dirNames.includes('.git') || fs.existsSync(path.join(currentPath, '.git'));
          const hasPkg = fileNames.includes('package.json');
          const hasPy = fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml') || fileNames.includes('setup.py') || fileNames.some(f => f.endsWith('.py'));
          const hasRust = fileNames.includes('Cargo.toml');
          const hasGo = fileNames.includes('go.mod');
          const hasGodot = fileNames.includes('project.godot') || dirNames.includes('.godot');
          const hasDotnet = fileNames.some(f => f.endsWith('.sln') || f.endsWith('.csproj'));

          let isProject = false;
          let type: ProjectInfo['type'] = 'unknown';

          if (hasPkg) { isProject = true; type = 'node'; }
          else if (hasPy) { isProject = true; type = 'python'; }
          else if (hasRust) { isProject = true; type = 'rust'; }
          else if (hasGo) { isProject = true; type = 'go'; }
          else if (hasGodot) { isProject = true; type = 'godot'; }
          else if (hasDotnet) { isProject = true; type = 'dotnet'; }
          else if (hasGit && depth > 0) { isProject = true; type = 'git'; }
          else if (hasProjectYBConfig) { isProject = true; type = config?.type || 'unknown'; }

          if (mode === 'all' && depth === 1) {
            isProject = true;
          }

          // Do not treat root search directory as a project if depth is 0
          if (depth === 0) {
            isProject = false;
          }

          if (isProject && !seenPaths.has(currentPath)) {
            seenPaths.add(currentPath);

            const defaultName = path.basename(currentPath);
            const name = config?.name || defaultName;
            const category = path.basename(path.dirname(currentPath));
            const tags = config?.tags || [];

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
              isGitRepo: hasGit,
              ignored: false
            });
          }

          // Recurse into child directories if this is a container directory or depth is low
          const isCategoryFolder = depth <= 1 && !hasGit && !hasPkg && !hasRust && !hasGo && !hasGodot;
          if (depth < 2 || isCategoryFolder) {
            for (const entry of entries) {
              if (entry.isDirectory() && !this.skipDirs.has(entry.name)) {
                await walk(path.join(currentPath, entry.name), depth + 1);
              }
            }
          }
        } catch (error) {
          logger.error(`Error scanning directory ${currentPath}`, error);
        }
      };

      await walk(root, 0);
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
      const fileNames = entries.filter(e => e.isFile()).map(e => e.name);
      const dirNames = entries.filter(e => e.isDirectory()).map(e => e.name);

      const hasGit = dirNames.includes('.git') || fs.existsSync(path.join(folderPath, '.git'));
      const hasPkg = fileNames.includes('package.json');
      const hasPy = fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml') || fileNames.includes('setup.py') || fileNames.some(f => f.endsWith('.py'));
      const hasRust = fileNames.includes('Cargo.toml');
      const hasGo = fileNames.includes('go.mod');
      const hasGodot = fileNames.includes('project.godot') || dirNames.includes('.godot');
      const hasDotnet = fileNames.some(f => f.endsWith('.sln') || f.endsWith('.csproj'));

      let type: ProjectInfo['type'] = 'unknown';
      if (hasPkg) { type = 'node'; }
      else if (hasPy) { type = 'python'; }
      else if (hasRust) { type = 'rust'; }
      else if (hasGo) { type = 'go'; }
      else if (hasGodot) { type = 'godot'; }
      else if (hasDotnet) { type = 'dotnet'; }
      else if (hasGit) { type = 'git'; }

      const defaultName = path.basename(folderPath);
      const name = config?.name || defaultName;
      const category = path.basename(path.dirname(folderPath));
      const tags = config?.tags || [];

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
        isGitRepo: hasGit,
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
