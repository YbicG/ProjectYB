import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SnapshotOptions {
  projectId: string;
  projectPath: string;
  projectName: string;
  destinationDir?: string; // default to os.homedir()/Desktop or project parent
  customName?: string;
}

export interface SnapshotResult {
  success: boolean;
  zipPath: string;
  fileName: string;
  fileSizeBytes: number;
  filesCount: number;
  createdAt: string;
  error?: string;
}

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  'out',
  'target',
  '.venv',
  'venv',
  '__pycache__',
  '.cache',
  'coverage',
  '.turbo',
  'tmp',
  'temp'
]);

export class ArchiveService {
  async createCleanSnapshot(options: SnapshotOptions): Promise<SnapshotResult> {
    const {
      projectPath,
      projectName,
      destinationDir = path.join(os.homedir(), 'Desktop'),
      customName
    } = options;

    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path does not exist: ${projectPath}`);
    }

    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sanitizedName = (customName || projectName).replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipFileName = `${sanitizedName}_snapshot_${timestamp}.zip`;
    const finalZipPath = path.join(destinationDir, zipFileName);

    // Create a temporary clean copy directory
    const tempBase = path.join(os.tmpdir(), `projectyb_snapshot_${Date.now()}`);
    const stageDir = path.join(tempBase, sanitizedName);
    fs.mkdirSync(stageDir, { recursive: true });

    let filesCount = 0;

    const copyClean = (src: string, dest: string) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          if (!EXCLUDE_DIRS.has(entry.name) && !entry.name.startsWith('.turbo')) {
            fs.mkdirSync(destPath, { recursive: true });
            copyClean(srcPath, destPath);
          }
        } else if (entry.isFile()) {
          fs.copyFileSync(srcPath, destPath);
          filesCount++;
        }
      }
    };

    try {
      copyClean(projectPath, stageDir);

      // Compress using PowerShell Compress-Archive on Windows
      const psCommand = `powershell.exe -NoProfile -NonInteractive -Command "Compress-Archive -Path '${stageDir}' -DestinationPath '${finalZipPath}' -Force"`;
      await execAsync(psCommand);

      const stats = fs.statSync(finalZipPath);

      return {
        success: true,
        zipPath: finalZipPath,
        fileName: zipFileName,
        fileSizeBytes: stats.size,
        filesCount,
        createdAt: new Date().toISOString()
      };
    } finally {
      // Clean up temp staging directory
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch {}
    }
  }
}

export const archiveService = new ArchiveService();
