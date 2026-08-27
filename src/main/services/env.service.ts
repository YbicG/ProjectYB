import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

export interface EnvEntry {
  key: string;
  value: string;
  comment?: string;
  isSecret?: boolean;
}

export interface EnvFileInfo {
  name: string;
  path: string;
  relativePath: string;
  isExample: boolean;
  entriesCount?: number;
}

export interface EnvDiffItem {
  key: string;
  valA?: string;
  valB?: string;
  status: 'onlyA' | 'onlyB' | 'mismatch' | 'match';
}

export interface EnvComparisonResult {
  fileAPath: string;
  fileBPath: string;
  fileAName: string;
  fileBName: string;
  items: EnvDiffItem[];
  totalA: number;
  totalB: number;
  matchingCount: number;
  missingInB: string[];
  missingInA: string[];
  mismatches: string[];
}

const SECRET_PATTERNS = [
  /secret/i,
  /password/i,
  /passwd/i,
  /token/i,
  /auth/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /jwt/i,
  /cert/i,
  /credential/i,
  /db[_-]?pass/i,
  /database[_-]?url/i,
  /connection[_-]?string/i,
  /access[_-]?key/i,
  /signing[_-]?key/i,
  /encryption[_-]?key/i
];

class EnvService {
  isLikelySecret(key: string): boolean {
    return SECRET_PATTERNS.some((pat) => pat.test(key));
  }

  parseEnvContent(raw: string): EnvEntry[] {
    const lines = raw.split(/\r?\n/);
    const entries: EnvEntry[] = [];
    let currentComment: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Empty line
      if (!trimmed) {
        currentComment = [];
        continue;
      }

      // Comment line
      if (trimmed.startsWith('#')) {
        currentComment.push(trimmed.replace(/^#\s?/, ''));
        continue;
      }

      // KEY=VALUE line (supporting optional export prefix)
      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_0-9.-]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1];
        let val = match[2];

        // Strip inline comments if value is not quoted
        let inlineComment: string | undefined;
        if (!val.startsWith('"') && !val.startsWith("'") && val.includes(' #')) {
          const parts = val.split(' #');
          val = parts[0].trim();
          inlineComment = parts.slice(1).join(' #').trim();
        }

        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }

        const commentParts = [...currentComment];
        if (inlineComment) commentParts.push(inlineComment);

        entries.push({
          key,
          value: val,
          comment: commentParts.length > 0 ? commentParts.join(' | ') : undefined,
          isSecret: this.isLikelySecret(key)
        });

        currentComment = [];
      }
    }

    return entries;
  }

  formatEnvEntries(entries: EnvEntry[]): string {
    const lines: string[] = [];

    for (const entry of entries) {
      if (entry.comment) {
        lines.push(`# ${entry.comment}`);
      }

      const val = entry.value;
      // Quote if contains spaces, newlines, or special characters
      const needsQuotes = /[\s#"'\n\r]/.test(val) || val === '';
      const formattedVal = needsQuotes ? `"${val.replace(/"/g, '\\"')}"` : val;

      lines.push(`${entry.key}=${formattedVal}`);
    }

    return lines.join('\n') + '\n';
  }

  async listEnvFiles(projectPath: string): Promise<EnvFileInfo[]> {
    const results: EnvFileInfo[] = [];
    const visitedDirs = new Set<string>();

    const scanDir = async (dirPath: string, relBase: string = '') => {
      if (visitedDirs.has(dirPath)) return;
      visitedDirs.add(dirPath);

      try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

        for (const e of entries) {
          if (e.isFile() && e.name.startsWith('.env') && !e.name.endsWith('.lock') && !e.name.endsWith('.vault')) {
            const fullPath = path.join(dirPath, e.name);
            const relPath = relBase ? path.join(relBase, e.name).replace(/\\/g, '/') : e.name;
            const isExample = e.name.includes('.example') || e.name.includes('.sample') || e.name.includes('.template');

            let entriesCount = 0;
            try {
              const raw = await fs.promises.readFile(fullPath, 'utf8');
              entriesCount = this.parseEnvContent(raw).length;
            } catch {}

            results.push({
              name: e.name,
              path: fullPath,
              relativePath: relPath,
              isExample,
              entriesCount
            });
          } else if (
            e.isDirectory() &&
            !['node_modules', '.git', 'dist', 'build', '.next', '.venv', 'vendor'].includes(e.name) &&
            ['src', 'client', 'server', 'apps', 'packages', 'services', 'api', 'web', 'frontend', 'backend'].includes(e.name.toLowerCase())
          ) {
            // Check submodules 1-level deep
            await scanDir(path.join(dirPath, e.name), relBase ? `${relBase}/${e.name}` : e.name);
          }
        }
      } catch (err) {
        logger.error(`Failed to scan env files in ${dirPath}:`, err);
      }
    };

    await scanDir(projectPath);
    return results;
  }

  async readEnvFile(filePath: string): Promise<{ raw: string; entries: EnvEntry[] }> {
    try {
      const raw = await fs.promises.readFile(filePath, 'utf8');
      const entries = this.parseEnvContent(raw);
      return { raw, entries };
    } catch (err: any) {
      logger.error(`Failed to read env file ${filePath}:`, err);
      throw new Error(`Could not read ${path.basename(filePath)}: ${err.message}`);
    }
  }

  async writeEnvFile(filePath: string, entries: EnvEntry[], rawContent?: string): Promise<{ success: boolean }> {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }

      const contentToWrite = rawContent !== undefined ? rawContent : this.formatEnvEntries(entries);
      await fs.promises.writeFile(filePath, contentToWrite, 'utf8');
      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to write env file ${filePath}:`, err);
      throw new Error(`Could not write ${path.basename(filePath)}: ${err.message}`);
    }
  }

  async generateExample(sourceFilePath: string, targetFilePath?: string): Promise<{ targetPath: string; content: string }> {
    try {
      const { entries } = await this.readEnvFile(sourceFilePath);
      const target = targetFilePath || path.join(path.dirname(sourceFilePath), '.env.example');

      const sanitizedEntries: EnvEntry[] = entries.map((entry) => {
        const isSec = entry.isSecret ?? this.isLikelySecret(entry.key);
        let sanitizedVal = entry.value;

        if (isSec) {
          sanitizedVal = `your_${entry.key.toLowerCase().replace(/[^a-z0-9_]/g, '_')}_here`;
        }

        return {
          key: entry.key,
          value: sanitizedVal,
          comment: entry.comment,
          isSecret: isSec
        };
      });

      const content = this.formatEnvEntries(sanitizedEntries);
      await fs.promises.writeFile(target, content, 'utf8');

      return { targetPath: target, content };
    } catch (err: any) {
      logger.error(`Failed to generate .env.example from ${sourceFilePath}:`, err);
      throw new Error(`Failed to generate example file: ${err.message}`);
    }
  }

  async compareEnvs(fileAPath: string, fileBPath: string): Promise<EnvComparisonResult> {
    const { entries: entriesA } = await this.readEnvFile(fileAPath);
    const { entries: entriesB } = await this.readEnvFile(fileBPath);

    const mapA = new Map<string, EnvEntry>(entriesA.map((e) => [e.key, e]));
    const mapB = new Map<string, EnvEntry>(entriesB.map((e) => [e.key, e]));

    const allKeys = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort();

    const items: EnvDiffItem[] = [];
    const missingInB: string[] = [];
    const missingInA: string[] = [];
    const mismatches: string[] = [];
    let matchingCount = 0;

    for (const key of allKeys) {
      const entryA = mapA.get(key);
      const entryB = mapB.get(key);

      if (entryA && !entryB) {
        items.push({ key, valA: entryA.value, status: 'onlyA' });
        missingInB.push(key);
      } else if (!entryA && entryB) {
        items.push({ key, valB: entryB.value, status: 'onlyB' });
        missingInA.push(key);
      } else if (entryA && entryB) {
        if (entryA.value === entryB.value) {
          items.push({ key, valA: entryA.value, valB: entryB.value, status: 'match' });
          matchingCount++;
        } else {
          items.push({ key, valA: entryA.value, valB: entryB.value, status: 'mismatch' });
          mismatches.push(key);
        }
      }
    }

    return {
      fileAPath,
      fileBPath,
      fileAName: path.basename(fileAPath),
      fileBName: path.basename(fileBPath),
      items,
      totalA: entriesA.length,
      totalB: entriesB.length,
      matchingCount,
      missingInB,
      missingInA,
      mismatches
    };
  }

  async syncKeys(sourceFilePath: string, targetFilePath: string, keys: string[]): Promise<{ success: boolean; addedCount: number }> {
    const { entries: sourceEntries } = await this.readEnvFile(sourceFilePath);
    let targetEntries: EnvEntry[] = [];
    try {
      const targetRes = await this.readEnvFile(targetFilePath);
      targetEntries = targetRes.entries;
    } catch {
      targetEntries = [];
    }

    const targetKeySet = new Set(targetEntries.map((e) => e.key));
    const sourceMap = new Map(sourceEntries.map((e) => [e.key, e]));

    let addedCount = 0;
    for (const k of keys) {
      if (!targetKeySet.has(k) && sourceMap.has(k)) {
        targetEntries.push(sourceMap.get(k)!);
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await this.writeEnvFile(targetFilePath, targetEntries);
    }

    return { success: true, addedCount };
  }
}

export const envService = new EnvService();
