import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface ParsedCommit {
  hash: string;
  hashShort: string;
  author: string;
  date: string;
  message: string;
  type: 'feat' | 'fix' | 'perf' | 'docs' | 'refactor' | 'chore' | 'other';
  scope?: string;
  description: string;
  isBreaking: boolean;
}

export interface ChangelogResult {
  currentVersion: string;
  suggestedVersion: string;
  bumpType: 'patch' | 'minor' | 'major';
  latestTag?: string;
  commitsCount: number;
  categories: {
    breaking: ParsedCommit[];
    features: ParsedCommit[];
    fixes: ParsedCommit[];
    performance: ParsedCommit[];
    refactors: ParsedCommit[];
    docs: ParsedCommit[];
    other: ParsedCommit[];
  };
  formattedMarkdown: string;
}

export class ChangelogService {
  async generateChangelog(projectPath: string): Promise<ChangelogResult> {
    let currentVersion = '1.0.0';
    const pkgPath = path.join(projectPath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.version) currentVersion = pkg.version;
      } catch {}
    }

    let latestTag = '';
    try {
      const { stdout } = await execAsync('git describe --tags --abbrev=0', { cwd: projectPath });
      latestTag = stdout.trim();
    } catch {}

    const gitRange = latestTag ? latestTag + '..HEAD' : '-n 50';
    let commitsRaw = '';
    try {
      const { stdout } = await execAsync('git log ' + gitRange + ' --pretty=format:"%H|%h|%an|%ad|%s" --date=short', { cwd: projectPath });
      commitsRaw = stdout;
    } catch {
      try {
        const { stdout } = await execAsync('git log -n 50 --pretty=format:"%H|%h|%an|%ad|%s" --date=short', { cwd: projectPath });
        commitsRaw = stdout;
      } catch {}
    }

    const lines = commitsRaw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsedCommits: ParsedCommit[] = [];

    let hasBreaking = false;
    let hasFeat = false;
    let hasFix = false;

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length < 5) continue;
      const [hash, hashShort, author, date, ...msgParts] = parts;
      const message = msgParts.join('|').trim();

      let type: ParsedCommit['type'] = 'other';
      let scope: string | undefined;
      let description = message;
      let isBreaking = message.includes('BREAKING CHANGE') || message.startsWith('feat!') || message.startsWith('fix!');

      const match = message.match(/^(\w+)(?:\(([^)]+)\))?!?:\s*(.*)$/);
      if (match) {
        const prefix = match[1].toLowerCase();
        scope = match[2];
        description = match[3];

        if (prefix === 'feat' || prefix === 'feature') {
          type = 'feat';
          hasFeat = true;
        } else if (prefix === 'fix' || prefix === 'bug') {
          type = 'fix';
          hasFix = true;
        } else if (prefix === 'perf') {
          type = 'perf';
        } else if (prefix === 'docs') {
          type = 'docs';
        } else if (prefix === 'refactor') {
          type = 'refactor';
        } else if (prefix === 'chore' || prefix === 'test' || prefix === 'ci') {
          type = 'chore';
        }
      }

      if (isBreaking) hasBreaking = true;

      parsedCommits.push({
        hash,
        hashShort,
        author,
        date,
        message,
        type,
        scope,
        description,
        isBreaking
      });
    }

    let bumpType: 'patch' | 'minor' | 'major' = 'patch';
    if (hasBreaking) {
      bumpType = 'major';
    } else if (hasFeat) {
      bumpType = 'minor';
    }

    const suggestedVersion = this.calculateNextVersion(currentVersion, bumpType);

    const categories = {
      breaking: parsedCommits.filter((c) => c.isBreaking),
      features: parsedCommits.filter((c) => c.type === 'feat' && !c.isBreaking),
      fixes: parsedCommits.filter((c) => c.type === 'fix' && !c.isBreaking),
      performance: parsedCommits.filter((c) => c.type === 'perf' && !c.isBreaking),
      refactors: parsedCommits.filter((c) => c.type === 'refactor' && !c.isBreaking),
      docs: parsedCommits.filter((c) => c.type === 'docs' && !c.isBreaking),
      other: parsedCommits.filter((c) => (c.type === 'chore' || c.type === 'other') && !c.isBreaking)
    };

    const today = new Date().toISOString().split('T')[0];
    const mdLines: string[] = [
      '## [' + suggestedVersion + '] - ' + today,
      ''
    ];

    if (categories.breaking.length > 0) {
      mdLines.push('### ⚠️ Breaking Changes');
      for (const c of categories.breaking) {
        mdLines.push('- ' + (c.scope ? '**' + c.scope + ':** ' : '') + c.description + ' (' + c.hashShort + ')');
      }
      mdLines.push('');
    }

    if (categories.features.length > 0) {
      mdLines.push('### 🚀 Features & Enhancements');
      for (const c of categories.features) {
        mdLines.push('- ' + (c.scope ? '**' + c.scope + ':** ' : '') + c.description + ' (' + c.hashShort + ')');
      }
      mdLines.push('');
    }

    if (categories.fixes.length > 0) {
      mdLines.push('### 🐛 Bug Fixes');
      for (const c of categories.fixes) {
        mdLines.push('- ' + (c.scope ? '**' + c.scope + ':** ' : '') + c.description + ' (' + c.hashShort + ')');
      }
      mdLines.push('');
    }

    if (categories.performance.length > 0) {
      mdLines.push('### ⚡ Performance Improvements');
      for (const c of categories.performance) {
        mdLines.push('- ' + c.description + ' (' + c.hashShort + ')');
      }
      mdLines.push('');
    }

    if (categories.other.length > 0 && categories.features.length === 0 && categories.fixes.length === 0) {
      mdLines.push('### 🔧 Maintenance & Chores');
      for (const c of categories.other.slice(0, 10)) {
        mdLines.push('- ' + c.description + ' (' + c.hashShort + ')');
      }
      mdLines.push('');
    }

    return {
      currentVersion,
      suggestedVersion,
      bumpType,
      latestTag: latestTag || undefined,
      commitsCount: parsedCommits.length,
      categories,
      formattedMarkdown: mdLines.join('\n')
    };
  }

  private calculateNextVersion(current: string, bump: 'patch' | 'minor' | 'major'): string {
    const match = current.match(/^(\d+)\.(\d+)\.(\d+)/);
    if (!match) return current + '-next';
    let major = parseInt(match[1], 10);
    let minor = parseInt(match[2], 10);
    let patch = parseInt(match[3], 10);

    if (bump === 'major') {
      major += 1;
      minor = 0;
      patch = 0;
    } else if (bump === 'minor') {
      minor += 1;
      patch = 0;
    } else {
      patch += 1;
    }

    return major + '.' + minor + '.' + patch;
  }

  async applyRelease(
    projectPath: string,
    version: string,
    changelogText: string,
    createTag: boolean
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Update package.json version if exists
      const pkgPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          pkg.version = version;
          fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
        } catch {}
      }

      // 2. Prepend or create CHANGELOG.md
      const changelogPath = path.join(projectPath, 'CHANGELOG.md');
      let existingChangelog = '';
      if (fs.existsSync(changelogPath)) {
        existingChangelog = fs.readFileSync(changelogPath, 'utf8');
      }

      const header = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n';
      let newContent = '';
      if (existingChangelog.startsWith('# Changelog')) {
        newContent = existingChangelog.replace('# Changelog', '# Changelog\n\n' + changelogText.trim());
      } else {
        newContent = header + changelogText.trim() + '\n\n' + existingChangelog;
      }

      fs.writeFileSync(changelogPath, newContent, 'utf8');

      // 3. Create git tag if requested
      if (createTag) {
        try {
          await execAsync('git tag -a v' + version + ' -m "Release v' + version + '"', { cwd: projectPath });
        } catch {}
      }

      logger.info('[ChangelogService] Applied release v' + version + ' for ' + projectPath);
      return { success: true, message: 'Successfully generated release notes and updated to v' + version };
    } catch (err: any) {
      return { success: false, message: 'Failed to apply release: ' + err.message };
    }
  }
}

export const changelogService = new ChangelogService();