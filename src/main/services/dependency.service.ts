import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export type PackageEcosystem = 'npm' | 'pypi' | 'cargo' | 'go' | 'unknown';

export interface InstalledPackage {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency' | 'optional';
  ecosystem: PackageEcosystem;
}

export interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  packageType: 'dependency' | 'devDependency' | 'peerDependency' | 'optional';
  isBreaking: boolean;
  ecosystem: PackageEcosystem;
}

export interface SecurityVulnerability {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  title: string;
  url?: string;
  advisory?: string;
  fixAvailable: boolean | string;
  affectedVersions?: string;
  patchedVersions?: string;
  ecosystem: PackageEcosystem;
}

export interface AuditSummary {
  vulnerabilities: SecurityVulnerability[];
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
}

export interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  author?: string;
  keywords?: string[];
  links?: {
    npm?: string;
    homepage?: string;
    repository?: string;
  };
}

class DependencyService {
  /**
   * Detect primary package manager and ecosystem in target directory
   */
  detectPackageManager(projectPath: string): { pm: 'pnpm' | 'yarn' | 'bun' | 'npm' | 'pip' | 'cargo' | 'go'; ecosystem: PackageEcosystem } {
    if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return { pm: 'pnpm', ecosystem: 'npm' };
    if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return { pm: 'yarn', ecosystem: 'npm' };
    if (fs.existsSync(path.join(projectPath, 'bun.lockb')) || fs.existsSync(path.join(projectPath, 'bun.lock'))) return { pm: 'bun', ecosystem: 'npm' };
    if (fs.existsSync(path.join(projectPath, 'package.json'))) return { pm: 'npm', ecosystem: 'npm' };
    if (fs.existsSync(path.join(projectPath, 'requirements.txt')) || fs.existsSync(path.join(projectPath, 'pyproject.toml'))) return { pm: 'pip', ecosystem: 'pypi' };
    if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) return { pm: 'cargo', ecosystem: 'cargo' };
    if (fs.existsSync(path.join(projectPath, 'go.mod'))) return { pm: 'go', ecosystem: 'go' };
    return { pm: 'npm', ecosystem: 'npm' };
  }

  /**
   * List installed packages from manifests
   */
  async getInstalledPackages(projectPath: string): Promise<InstalledPackage[]> {
    const pkgs: InstalledPackage[] = [];
    try {
      // 1. Node package.json
      const pkgJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        const raw = JSON.parse(await fs.promises.readFile(pkgJsonPath, 'utf8'));
        if (raw.dependencies) {
          for (const [name, ver] of Object.entries<string>(raw.dependencies)) {
            pkgs.push({ name, version: ver, type: 'dependency', ecosystem: 'npm' });
          }
        }
        if (raw.devDependencies) {
          for (const [name, ver] of Object.entries<string>(raw.devDependencies)) {
            pkgs.push({ name, version: ver, type: 'devDependency', ecosystem: 'npm' });
          }
        }
        if (raw.peerDependencies) {
          for (const [name, ver] of Object.entries<string>(raw.peerDependencies)) {
            pkgs.push({ name, version: ver, type: 'peerDependency', ecosystem: 'npm' });
          }
        }
        if (raw.optionalDependencies) {
          for (const [name, ver] of Object.entries<string>(raw.optionalDependencies)) {
            pkgs.push({ name, version: ver, type: 'optional', ecosystem: 'npm' });
          }
        }
      }

      // 2. Python requirements.txt
      const reqPath = path.join(projectPath, 'requirements.txt');
      if (fs.existsSync(reqPath)) {
        const content = await fs.promises.readFile(reqPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const match = trimmed.match(/^([a-zA-Z0-9_\-\.]+)(?:[>=<~!]+(.+))?$/);
          if (match) {
            pkgs.push({
              name: match[1],
              version: match[2] || '*',
              type: 'dependency',
              ecosystem: 'pypi'
            });
          }
        }
      }

      // 3. Rust Cargo.toml
      const cargoPath = path.join(projectPath, 'Cargo.toml');
      if (fs.existsSync(cargoPath)) {
        const content = await fs.promises.readFile(cargoPath, 'utf8');
        let inDeps = false;
        let inDevDeps = false;
        for (const line of content.split('\n')) {
          const t = line.trim();
          if (t === '[dependencies]') { inDeps = true; inDevDeps = false; continue; }
          if (t === '[dev-dependencies]') { inDeps = false; inDevDeps = true; continue; }
          if (t.startsWith('[') && t.endsWith(']')) { inDeps = false; inDevDeps = false; continue; }

          if ((inDeps || inDevDeps) && t.includes('=')) {
            const [namePart, verPart] = t.split('=').map(s => s.trim());
            const cleanVer = verPart.replace(/["'{}]/g, '').trim();
            pkgs.push({
              name: namePart,
              version: cleanVer,
              type: inDevDeps ? 'devDependency' : 'dependency',
              ecosystem: 'cargo'
            });
          }
        }
      }
    } catch (e) {
      logger.error(`Error reading installed packages in ${projectPath}`, e);
    }
    return pkgs;
  }

  /**
   * Scan for outdated packages across package managers
   */
  async getOutdatedPackages(projectPath: string): Promise<OutdatedPackage[]> {
    const { pm, ecosystem } = this.detectPackageManager(projectPath);
    const results: OutdatedPackage[] = [];

    try {
      if (ecosystem === 'npm') {
        let cmd = 'npm outdated --json';
        if (pm === 'pnpm') cmd = 'pnpm outdated --format json';
        else if (pm === 'yarn') cmd = 'yarn outdated --json';

        try {
          const { stdout } = await execAsync(cmd, { cwd: projectPath, timeout: 20000 });
          if (stdout && stdout.trim()) {
            const data = JSON.parse(stdout);
            for (const [name, info] of Object.entries<any>(data)) {
              const current = info.current || '';
              const wanted = info.wanted || '';
              const latest = info.latest || '';
              const currentMajor = parseInt(current.replace(/^[^0-9]*/, '').split('.')[0] || '0', 10);
              const latestMajor = parseInt(latest.replace(/^[^0-9]*/, '').split('.')[0] || '0', 10);

              results.push({
                name,
                current,
                wanted,
                latest,
                packageType: info.type === 'devDependencies' ? 'devDependency' : 'dependency',
                isBreaking: latestMajor > currentMajor,
                ecosystem: 'npm'
              });
            }
          }
        } catch (execErr: any) {
          // npm outdated exits with code 1 when outdated packages are found!
          if (execErr.stdout) {
            try {
              const data = JSON.parse(execErr.stdout);
              for (const [name, info] of Object.entries<any>(data)) {
                const current = info.current || '';
                const wanted = info.wanted || '';
                const latest = info.latest || '';
                const currentMajor = parseInt(current.replace(/^[^0-9]*/, '').split('.')[0] || '0', 10);
                const latestMajor = parseInt(latest.replace(/^[^0-9]*/, '').split('.')[0] || '0', 10);

                results.push({
                  name,
                  current,
                  wanted,
                  latest,
                  packageType: info.type === 'devDependencies' ? 'devDependency' : 'dependency',
                  isBreaking: latestMajor > currentMajor,
                  ecosystem: 'npm'
                });
              }
            } catch {}
          }
        }
      } else if (ecosystem === 'pypi') {
        try {
          const { stdout } = await execAsync('pip list --outdated --format json', { cwd: projectPath, timeout: 20000 });
          if (stdout) {
            const list = JSON.parse(stdout);
            for (const item of list) {
              const current = item.version || '';
              const latest = item.latest_version || '';
              const currentMajor = parseInt(current.split('.')[0] || '0', 10);
              const latestMajor = parseInt(latest.split('.')[0] || '0', 10);

              results.push({
                name: item.name,
                current,
                wanted: latest,
                latest,
                packageType: 'dependency',
                isBreaking: latestMajor > currentMajor,
                ecosystem: 'pypi'
              });
            }
          }
        } catch {}
      }
    } catch (e) {
      logger.error(`Failed to check outdated packages for ${projectPath}`, e);
    }

    return results;
  }

  /**
   * Run security vulnerability audit
   */
  async getSecurityAudit(projectPath: string): Promise<AuditSummary> {
    const { pm, ecosystem } = this.detectPackageManager(projectPath);
    const vulns: SecurityVulnerability[] = [];

    try {
      if (ecosystem === 'npm') {
        let cmd = 'npm audit --json';
        if (pm === 'pnpm') cmd = 'pnpm audit --json';

        try {
          const { stdout } = await execAsync(cmd, { cwd: projectPath, timeout: 25000 });
          this.parseNpmAudit(stdout, vulns);
        } catch (auditErr: any) {
          // npm audit exits with code > 0 if vulnerabilities exist
          if (auditErr.stdout) {
            this.parseNpmAudit(auditErr.stdout, vulns);
          }
        }
      }
    } catch (e) {
      logger.error(`Failed to audit ${projectPath}`, e);
    }

    const summary: AuditSummary = {
      vulnerabilities: vulns,
      total: vulns.length,
      critical: vulns.filter(v => v.severity === 'critical').length,
      high: vulns.filter(v => v.severity === 'high').length,
      moderate: vulns.filter(v => v.severity === 'moderate').length,
      low: vulns.filter(v => v.severity === 'low').length,
      info: vulns.filter(v => v.severity === 'info').length
    };

    return summary;
  }

  private parseNpmAudit(rawStdout: string, output: SecurityVulnerability[]) {
    try {
      const data = JSON.parse(rawStdout);
      // Modern npm / pnpm audit format (vulnerabilities object)
      if (data.vulnerabilities) {
        for (const [name, info] of Object.entries<any>(data.vulnerabilities)) {
          const via = Array.isArray(info.via) ? info.via[0] : info.via;
          const title = typeof via === 'object' ? via.title || via.name : (info.name || name);
          const url = typeof via === 'object' ? via.url : undefined;
          const severity = (info.severity || 'low').toLowerCase() as any;

          output.push({
            id: typeof via === 'object' && via.source ? String(via.source) : `${name}-${severity}`,
            name,
            severity: ['critical', 'high', 'moderate', 'low', 'info'].includes(severity) ? severity : 'low',
            title: title || `Vulnerability in ${name}`,
            url,
            advisory: typeof via === 'object' ? via.advisory : undefined,
            fixAvailable: info.fixAvailable ? true : false,
            affectedVersions: info.range || undefined,
            patchedVersions: typeof info.fixAvailable === 'object' ? info.fixAvailable.version : undefined,
            ecosystem: 'npm'
          });
        }
      } else if (data.advisories) {
        // Legacy format
        for (const adv of Object.values<any>(data.advisories)) {
          output.push({
            id: String(adv.id),
            name: adv.module_name,
            severity: (adv.severity || 'low').toLowerCase() as any,
            title: adv.title || 'Security advisory',
            url: adv.url,
            advisory: adv.overview,
            fixAvailable: Boolean(adv.patched_versions),
            affectedVersions: adv.vulnerable_versions,
            patchedVersions: adv.patched_versions,
            ecosystem: 'npm'
          });
        }
      }
    } catch {}
  }

  /**
   * Upgrade specific package
   */
  async upgradePackage(projectPath: string, packageName: string, targetVersion?: string, isDev?: boolean): Promise<{ success: boolean; output: string }> {
    const { pm, ecosystem } = this.detectPackageManager(projectPath);
    let cmd = '';
    const ver = targetVersion ? `@${targetVersion}` : '@latest';

    if (ecosystem === 'npm') {
      if (pm === 'pnpm') {
        cmd = `pnpm add ${isDev ? '-D ' : ''}${packageName}${ver}`;
      } else if (pm === 'yarn') {
        cmd = `yarn add ${isDev ? '-D ' : ''}${packageName}${ver}`;
      } else if (pm === 'bun') {
        cmd = `bun add ${isDev ? '-d ' : ''}${packageName}${ver}`;
      } else {
        cmd = `npm i ${isDev ? '--save-dev ' : ''}${packageName}${ver}`;
      }
    } else if (ecosystem === 'pypi') {
      cmd = `pip install --upgrade ${packageName}${targetVersion ? `==${targetVersion}` : ''}`;
    } else if (ecosystem === 'cargo') {
      cmd = `cargo add ${packageName}${targetVersion ? `@${targetVersion}` : ''}`;
    }

    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath, timeout: 60000 });
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      return { success: false, output: err.message || err.stderr || 'Upgrade failed' };
    }
  }

  /**
   * Run global / project audit autofix
   */
  async fixVulnerabilities(projectPath: string): Promise<{ success: boolean; output: string }> {
    const { pm, ecosystem } = this.detectPackageManager(projectPath);
    let cmd = 'npm audit fix';
    if (pm === 'pnpm') cmd = 'pnpm audit --fix';

    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath, timeout: 60000 });
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      return { success: false, output: err.message || err.stderr || 'Audit fix failed' };
    }
  }

  /**
   * Search NPM registry for packages
   */
  async searchRegistry(query: string, limit: number = 15): Promise<RegistryPackage[]> {
    if (!query.trim()) return [];

    return new Promise((resolve) => {
      const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query.trim())}&size=${limit}`;
      const req = https.get(url, { headers: { 'User-Agent': 'ProjectYB' } }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const results: RegistryPackage[] = (data.objects || []).map((item: any) => ({
              name: item.package.name,
              version: item.package.version,
              description: item.package.description || '',
              author: item.package.publisher?.username || item.package.author?.name,
              keywords: item.package.keywords || [],
              links: item.package.links
            }));
            resolve(results);
          } catch {
            resolve([]);
          }
        });
      });

      req.on('error', () => resolve([]));
      req.setTimeout(8000, () => {
        req.destroy();
        resolve([]);
      });
    });
  }

  /**
   * Install a new package into a project
   */
  async installPackage(projectPath: string, packageName: string, isDev: boolean = false): Promise<{ success: boolean; output: string }> {
    const { pm, ecosystem } = this.detectPackageManager(projectPath);
    let cmd = '';

    if (ecosystem === 'npm') {
      if (pm === 'pnpm') cmd = `pnpm add ${isDev ? '-D ' : ''}${packageName}`;
      else if (pm === 'yarn') cmd = `yarn add ${isDev ? '-D ' : ''}${packageName}`;
      else if (pm === 'bun') cmd = `bun add ${isDev ? '-d ' : ''}${packageName}`;
      else cmd = `npm i ${isDev ? '--save-dev ' : ''}${packageName}`;
    } else if (ecosystem === 'pypi') {
      cmd = `pip install ${packageName}`;
    } else if (ecosystem === 'cargo') {
      cmd = `cargo add ${isDev ? '--dev ' : ''}${packageName}`;
    }

    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath, timeout: 60000 });
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      return { success: false, output: err.message || err.stderr || 'Install failed' };
    }
  }

  /**
   * Uninstall a package from a project
   */
  async uninstallPackage(projectPath: string, packageName: string): Promise<{ success: boolean; output: string }> {
    const { pm, ecosystem } = this.detectPackageManager(projectPath);
    let cmd = '';

    if (ecosystem === 'npm') {
      if (pm === 'pnpm') cmd = `pnpm remove ${packageName}`;
      else if (pm === 'yarn') cmd = `yarn remove ${packageName}`;
      else if (pm === 'bun') cmd = `bun remove ${packageName}`;
      else cmd = `npm uninstall ${packageName}`;
    } else if (ecosystem === 'pypi') {
      cmd = `pip uninstall -y ${packageName}`;
    } else if (ecosystem === 'cargo') {
      cmd = `cargo remove ${packageName}`;
    }

    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: projectPath, timeout: 60000 });
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      return { success: false, output: err.message || err.stderr || 'Uninstall failed' };
    }
  }
}

export const dependencyService = new DependencyService();
