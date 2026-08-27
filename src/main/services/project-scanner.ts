import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { logger } from '../utils/logger';

export interface SubProjectInfo {
  id: string;
  name: string;
  path: string;
  relativePath: string;
  type: 'node' | 'python' | 'rust' | 'go' | 'dotnet' | 'godot' | 'git' | 'unknown';
  scripts?: Record<string, string>;
}

export interface ProjectYBConfig {
  name?: string;
  type?: 'node' | 'python' | 'rust' | 'go' | 'dotnet' | 'godot' | 'git' | 'unknown';
  ignore?: boolean;
  ignored?: boolean;
  tags?: string[];
  subprojects?: Array<{
    name: string;
    path: string;
    type?: 'node' | 'python' | 'rust' | 'go' | 'dotnet' | 'godot' | 'git' | 'unknown';
    scripts?: Record<string, string>;
  }>;
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
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  subprojects?: SubProjectInfo[];
  branch?: string;
  lastCommit?: string;
  isGitRepo?: boolean;
  ignored?: boolean;
  hasConfig?: boolean;
}

const GENERIC_FOLDER_NAMES = new Set([
  'src', 'client', 'server', 'frontend', 'backend', 'api', 'web', 'app', 'ui',
  'services', 'packages', 'microservices', 'mobile', 'desktop', 'core', 'shared',
  'admin', 'dashboard', 'bot', 'site', 'functions', 'lambda'
]);

class ProjectScanner {
  private watcher: chokidar.FSWatcher | null = null;
  private skipDirs = new Set([
    'node_modules', '.git', 'dist', 'build', 'builds', 'release', 'exports', 'obfuscated',
    '__pycache__', '.next', '.venv', 'venv', 'env', '.turbo', 'vendor', '.gradle', 'bin', 'obj',
    '.godot', 'cache', '.cache', 'target', '.idea', '.vscode'
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

  async writeProjectConfig(folderPath: string, updates: Partial<ProjectYBConfig>, overwrite: boolean = false): Promise<string> {
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

    const merged = overwrite ? updates : { ...existing, ...updates };
    await fs.promises.writeFile(configPath, JSON.stringify(merged, null, 2), 'utf8');
    return configPath;
  }

  async setIgnored(folderPath: string, ignore: boolean): Promise<string> {
    return this.writeProjectConfig(folderPath, { ignore });
  }

  private async inspectFolder(folderPath: string): Promise<{
    isProject: boolean;
    type: ProjectInfo['type'];
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    isGit: boolean;
  }> {
    try {
      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
      const fileNames = entries.filter(e => e.isFile()).map(e => e.name);
      const dirNames = entries.filter(e => e.isDirectory()).map(e => e.name);

      const hasGit = dirNames.includes('.git') || fs.existsSync(path.join(folderPath, '.git'));
      const hasPkg = fileNames.includes('package.json');
      const hasPyManifest = fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml') || fileNames.includes('setup.py') || fileNames.includes('Pipfile') || fileNames.includes('main.py');
      const hasAnyPy = fileNames.some(f => f.endsWith('.py'));
      const hasRust = fileNames.includes('Cargo.toml');
      const hasGo = fileNames.includes('go.mod');
      const hasGodot = fileNames.includes('project.godot') || dirNames.includes('.godot');
      const hasDotnet = fileNames.some(f => f.endsWith('.sln') || f.endsWith('.csproj'));
      const hasConfig = fileNames.includes('.projectyb.json') || fileNames.includes('.projectyb');

      let type: ProjectInfo['type'] = 'unknown';
      let isProject = false;
      let scripts: Record<string, string> | undefined;
      let dependencies: Record<string, string> | undefined;

      if (hasPkg) {
        isProject = true;
        type = 'node';
        try {
          const pkgRaw = await fs.promises.readFile(path.join(folderPath, 'package.json'), 'utf8');
          const pkg = JSON.parse(pkgRaw);
          scripts = pkg.scripts;
          dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
        } catch {}
      } else if (hasPyManifest || (hasAnyPy && GENERIC_FOLDER_NAMES.has(path.basename(folderPath).toLowerCase()))) {
        isProject = true;
        type = 'python';
      } else if (hasRust) {
        isProject = true;
        type = 'rust';
      } else if (hasGo) {
        isProject = true;
        type = 'go';
      } else if (hasGodot) {
        isProject = true;
        type = 'godot';
      } else if (hasDotnet) {
        isProject = true;
        type = 'dotnet';
      } else if (hasGit) {
        isProject = true;
        type = 'git';
      } else if (hasConfig) {
        isProject = true;
      }

      return { isProject, type, scripts, dependencies, isGit: hasGit };
    } catch {
      return { isProject: false, type: 'unknown', isGit: false };
    }
  }

  async scanDirectory(rootPaths: string[], maxDepth: number = 4, mode: 'git' | 'all' = 'git'): Promise<ProjectInfo[]> {
    const projects: ProjectInfo[] = [];
    const seenPaths = new Set<string>();

    for (const root of rootPaths) {
      if (!fs.existsSync(root)) continue;

      const walk = async (currentPath: string, depth: number) => {
        if (depth > maxDepth || seenPaths.has(currentPath)) return;

        try {
          const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
          const fileNames = entries.filter(e => e.isFile()).map(e => e.name);
          const dirEntries = entries.filter(e => e.isDirectory() && !this.skipDirs.has(e.name));

          // Check config first
          const { config, filePath: configPath } = await this.readProjectConfig(currentPath);
          if (config && (config.ignore === true || config.ignored === true)) {
            return;
          }

          // ── Subproject / Monorepo Detection ──
          const detectedSubprojects: SubProjectInfo[] = [];
          const mergedSubScripts: Record<string, string> = {};

          if (config?.subprojects && Array.isArray(config.subprojects)) {
            for (const sub of config.subprojects) {
              const subFullPath = path.isAbsolute(sub.path) ? sub.path : path.join(currentPath, sub.path);
              const subInspect = await this.inspectFolder(subFullPath);
              detectedSubprojects.push({
                id: sub.name,
                name: sub.name,
                relativePath: sub.path,
                path: subFullPath,
                type: sub.type || subInspect.type,
                scripts: sub.scripts || subInspect.scripts
              });
              seenPaths.add(subFullPath);
            }
          } else {
            // Auto-detect generic subfolders
            for (const subDir of dirEntries) {
              const subFullPath = path.join(currentPath, subDir.name);
              const isGeneric = GENERIC_FOLDER_NAMES.has(subDir.name.toLowerCase());

              if (isGeneric) {
                const subInspect = await this.inspectFolder(subFullPath);
                if (subInspect.isProject) {
                  detectedSubprojects.push({
                    id: subDir.name,
                    name: subDir.name,
                    relativePath: subDir.name,
                    path: subFullPath,
                    type: subInspect.type,
                    scripts: subInspect.scripts
                  });
                  if (subInspect.scripts) {
                    for (const [sName, sCmd] of Object.entries(subInspect.scripts)) {
                      mergedSubScripts[`${subDir.name}:${sName}`] = sCmd;
                    }
                  }
                  seenPaths.add(subFullPath);
                }
              }
            }
          }

          // Current path standalone inspection
          const selfInspect = await this.inspectFolder(currentPath);
          const hasSubprojects = detectedSubprojects.length > 0;
          const hasGit = selfInspect.isGit;

          let isProject = selfInspect.isProject || hasSubprojects;
          let type: ProjectInfo['type'] = config?.type || (hasSubprojects ? (detectedSubprojects[0]?.type || 'node') : selfInspect.type);

          if (mode === 'all' && depth === 1) {
            isProject = true;
          }

          // Don't treat root scan path as project
          if (depth === 0) {
            isProject = false;
          }

          if (isProject && !seenPaths.has(currentPath)) {
            seenPaths.add(currentPath);

            const folderBaseName = path.basename(currentPath);
            let defaultName = folderBaseName;

            // If folder itself is called "src", "client", "server" and not grouped, use parent folder name
            if (GENERIC_FOLDER_NAMES.has(folderBaseName.toLowerCase()) && depth > 1) {
              const parentFolder = path.basename(path.dirname(currentPath));
              defaultName = `${parentFolder} (${folderBaseName})`;
            }

            const name = config?.name || defaultName;
            const category = path.basename(path.dirname(currentPath));
            const tags = config?.tags || [];
            const scripts = { ...selfInspect.scripts, ...mergedSubScripts, ...config?.scripts };
            const dependencies = selfInspect.dependencies;

            projects.push({
              id: currentPath,
              name,
              path: currentPath,
              type,
              category,
              status: 'stopped' as const,
              tags,
              scripts,
              dependencies,
              subprojects: detectedSubprojects.length > 0 ? detectedSubprojects : undefined,
              runningServices: [],
              isGitRepo: hasGit,
              ignored: false,
              hasConfig: Boolean(configPath)
            });
          }

          // Recurse into child directories if not already absorbed as subprojects
          for (const subDir of dirEntries) {
            const childPath = path.join(currentPath, subDir.name);
            if (!seenPaths.has(childPath)) {
              await walk(childPath, depth + 1);
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

      const { config, filePath: configPath } = await this.readProjectConfig(folderPath);
      if (config && (config.ignore === true || config.ignored === true)) {
        return null;
      }

      const entries = await fs.promises.readdir(folderPath, { withFileTypes: true });
      const dirEntries = entries.filter(e => e.isDirectory() && !this.skipDirs.has(e.name));

      const detectedSubprojects: SubProjectInfo[] = [];
      const mergedSubScripts: Record<string, string> = {};

      for (const subDir of dirEntries) {
        const subFullPath = path.join(folderPath, subDir.name);
        const isGeneric = GENERIC_FOLDER_NAMES.has(subDir.name.toLowerCase());
        if (isGeneric) {
          const subInspect = await this.inspectFolder(subFullPath);
          if (subInspect.isProject) {
            detectedSubprojects.push({
              id: subDir.name,
              name: subDir.name,
              relativePath: subDir.name,
              path: subFullPath,
              type: subInspect.type,
              scripts: subInspect.scripts
            });
            if (subInspect.scripts) {
              for (const [sName, sCmd] of Object.entries(subInspect.scripts)) {
                mergedSubScripts[`${subDir.name}:${sName}`] = sCmd;
              }
            }
          }
        }
      }

      const selfInspect = await this.inspectFolder(folderPath);
      const folderBaseName = path.basename(folderPath);
      let defaultName = folderBaseName;

      if (GENERIC_FOLDER_NAMES.has(folderBaseName.toLowerCase())) {
        const parentFolder = path.basename(path.dirname(folderPath));
        defaultName = `${parentFolder} (${folderBaseName})`;
      }

      const name = config?.name || defaultName;
      const category = path.basename(path.dirname(folderPath));
      const tags = config?.tags || [];
      const type = config?.type || (detectedSubprojects.length > 0 ? (detectedSubprojects[0].type || 'node') : selfInspect.type);
      const scripts = { ...selfInspect.scripts, ...mergedSubScripts, ...config?.scripts };

      return {
        id: folderPath,
        name,
        path: folderPath,
        type,
        category,
        status: 'stopped' as const,
        tags,
        scripts,
        dependencies: selfInspect.dependencies,
        subprojects: detectedSubprojects.length > 0 ? detectedSubprojects : undefined,
        runningServices: [],
        isGitRepo: selfInspect.isGit,
        ignored: false,
        hasConfig: Boolean(configPath)
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
