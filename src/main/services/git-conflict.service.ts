import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface ConflictBlock {
  id: string;
  type: 'conflict' | 'clean';
  currentContent: string;  // Ours (HEAD)
  incomingContent: string; // Theirs
  baseContent?: string;    // Common ancestor (diff3)
  mergedContent?: string;
  startLine: number;
}

export interface ConflictedFile {
  filePath: string;
  relativePath: string;
  conflictCount: number;
  blocks: ConflictBlock[];
}

export class GitConflictService {
  /**
   * Find all files with active merge conflicts in a repo
   */
  async getConflictedFiles(repoPath: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
      const files: string[] = [];

      for (const line of stdout.split(/\r?\n/)) {
        if (!line.trim()) continue;
        const status = line.substring(0, 2);
        const file = line.substring(3).trim();

        // UU = both modified, AA = both added, etc.
        if (status === 'UU' || status === 'AA' || status === 'UD' || status === 'DU') {
          files.push(file);
        }
      }

      return files;
    } catch (err) {
      return [];
    }
  }

  /**
   * Parse conflict blocks in a file
   */
  async parseConflictFile(repoPath: string, relativePath: string): Promise<ConflictedFile | null> {
    try {
      const fullPath = path.join(repoPath, relativePath);
      if (!fs.existsSync(fullPath)) return null;

      const content = await fs.promises.readFile(fullPath, 'utf8');
      const lines = content.split(/\r?\n/);

      const blocks: ConflictBlock[] = [];
      let inConflict = false;
      let inBase = false;
      let inTheirs = false;

      let currentLines: string[] = [];
      let baseLines: string[] = [];
      let incomingLines: string[] = [];
      let cleanLines: string[] = [];
      let blockStartLine = 1;
      let blockIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('<<<<<<<')) {
          if (cleanLines.length > 0) {
            blocks.push({
              id: `block-clean-${blockIndex++}`,
              type: 'clean',
              currentContent: cleanLines.join('\n'),
              incomingContent: cleanLines.join('\n'),
              startLine: blockStartLine
            });
            cleanLines = [];
          }
          inConflict = true;
          inBase = false;
          inTheirs = false;
          currentLines = [];
          baseLines = [];
          incomingLines = [];
          blockStartLine = i + 1;
        } else if (inConflict && line.startsWith('|||||||')) {
          // diff3 base ancestor marker
          inBase = true;
          inTheirs = false;
        } else if (inConflict && line.startsWith('=======')) {
          inBase = false;
          inTheirs = true;
        } else if (inConflict && line.startsWith('>>>>>>>')) {
          inConflict = false;
          inBase = false;
          inTheirs = false;
          blocks.push({
            id: `block-conflict-${blockIndex++}`,
            type: 'conflict',
            currentContent: currentLines.join('\n'),
            incomingContent: incomingLines.join('\n'),
            baseContent: baseLines.length > 0 ? baseLines.join('\n') : undefined,
            startLine: blockStartLine
          });
          currentLines = [];
          baseLines = [];
          incomingLines = [];
          blockStartLine = i + 2;
        } else {
          if (inConflict) {
            if (inTheirs) {
              incomingLines.push(line);
            } else if (inBase) {
              baseLines.push(line);
            } else {
              currentLines.push(line);
            }
          } else {
            cleanLines.push(line);
          }
        }
      }

      if (cleanLines.length > 0) {
        blocks.push({
          id: `block-clean-${blockIndex++}`,
          type: 'clean',
          currentContent: cleanLines.join('\n'),
          incomingContent: cleanLines.join('\n'),
          startLine: blockStartLine
        });
      }

      const conflictCount = blocks.filter((b) => b.type === 'conflict').length;

      return {
        filePath: fullPath,
        relativePath,
        conflictCount,
        blocks
      };
    } catch (err: any) {
      logger.error(`Failed to parse conflict file ${relativePath}`, err);
      return null;
    }
  }

  /**
   * Save resolved file and automatically stage it
   */
  async resolveFile(repoPath: string, relativePath: string, content: string): Promise<{ success: boolean; error?: string }> {
    try {
      const fullPath = path.join(repoPath, relativePath);
      await fs.promises.writeFile(fullPath, content, 'utf8');
      await execAsync(`git add "${relativePath}"`, { cwd: repoPath });
      return { success: true };
    } catch (err: any) {
      logger.error(`Failed to resolve conflict for ${relativePath}`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Abort merge in progress
   */
  async abortMerge(repoPath: string): Promise<{ success: boolean; error?: string }> {
    try {
      await execAsync('git merge --abort', { cwd: repoPath });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const gitConflictService = new GitConflictService();
