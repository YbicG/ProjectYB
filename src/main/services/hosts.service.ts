import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

const BEGIN_TAG = '# --- BEGIN PROJECTYB MANAGED DOMAINS ---';
const END_TAG = '# --- END PROJECTYB MANAGED DOMAINS ---';

export interface DomainHostStatus {
  domain: string;
  inHosts: boolean;
  ip?: string;
}

export class HostsService {
  private getHostsFilePath(): string {
    if (process.platform === 'win32') {
      const windir = process.env.windir || 'C:\\Windows';
      return path.join(windir, 'System32', 'drivers', 'etc', 'hosts');
    }
    return '/etc/hosts';
  }

  /**
   * Read raw hosts file content
   */
  async readRawHosts(): Promise<string> {
    try {
      const hostsPath = this.getHostsFilePath();
      return await fs.promises.readFile(hostsPath, 'utf8');
    } catch (err: any) {
      logger.error('Failed to read hosts file', err);
      return '';
    }
  }

  /**
   * Parse mapped domains from hosts file
   */
  async getMappedDomains(): Promise<string[]> {
    try {
      const content = await this.readRawHosts();
      const lines = content.split(/\r?\n/);
      const domains: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2 && (parts[0] === '127.0.0.1' || parts[0] === '::1')) {
          for (let i = 1; i < parts.length; i++) {
            const d = parts[i].trim().toLowerCase();
            if (d && !domains.includes(d)) {
              domains.push(d);
            }
          }
        }
      }
      return domains;
    } catch (err) {
      return [];
    }
  }

  /**
   * Check status of a list of domains
   */
  async checkDomainsStatus(domains: string[]): Promise<Record<string, boolean>> {
    const mapped = await this.getMappedDomains();
    const result: Record<string, boolean> = {};

    for (const domain of domains) {
      const normalized = domain.trim().toLowerCase();
      result[normalized] = mapped.includes(normalized);
    }

    return result;
  }

  /**
   * Synchronize active domains to the hosts file with ProjectYB tag markers
   */
  async syncManagedDomains(domains: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const hostsPath = this.getHostsFilePath();
      const currentContent = await this.readRawHosts();

      // Clean domain list
      const cleanDomains = [...new Set(domains.map((d) => d.trim().toLowerCase()).filter(Boolean))];

      // Build managed block
      let managedBlock = '';
      if (cleanDomains.length > 0) {
        managedBlock = [
          BEGIN_TAG,
          '# Automatically maintained by ProjectYB Local Reverse Proxy',
          ...cleanDomains.map((d) => `127.0.0.1 ${d}`),
          END_TAG
        ].join(os.EOL);
      }

      // Remove existing ProjectYB block if present
      let newContent = currentContent;
      const startIndex = newContent.indexOf(BEGIN_TAG);
      const endIndex = newContent.indexOf(END_TAG);

      if (startIndex !== -1 && endIndex !== -1) {
        const before = newContent.substring(0, startIndex).trimEnd();
        const after = newContent.substring(endIndex + END_TAG.length).trimStart();
        newContent = before + (before ? os.EOL + os.EOL : '') + (after ? after : '');
      }

      // Append new managed block if we have domains
      if (managedBlock) {
        newContent = newContent.trimEnd() + os.EOL + os.EOL + managedBlock + os.EOL;
      }

      // Attempt write
      await this.writeHostsFileElevated(hostsPath, newContent);

      // Flush DNS Cache on Windows
      if (process.platform === 'win32') {
        try {
          execSync('ipconfig /flushdns', { stdio: 'ignore' });
        } catch {}
      }

      return { success: true };
    } catch (err: any) {
      logger.error('Failed to sync hosts file', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Clear all ProjectYB managed domains from hosts file
   */
  async clearManagedDomains(): Promise<{ success: boolean; error?: string }> {
    return this.syncManagedDomains([]);
  }

  /**
   * Writes content to hosts file, using UAC elevation on Windows if needed
   */
  private async writeHostsFileElevated(targetPath: string, content: string): Promise<void> {
    try {
      // 1. Try direct write (succeeds if app has admin rights)
      await fs.promises.writeFile(targetPath, content, 'utf8');
      return;
    } catch (directErr: any) {
      if (process.platform === 'win32') {
        // 2. Windows: Write to temporary file, then run elevated PowerShell to copy
        const tempPath = path.join(os.tmpdir(), `projectyb-hosts-${Date.now()}.tmp`);
        await fs.promises.writeFile(tempPath, content, 'utf8');

        const psScript = `
          Copy-Item -Path '${tempPath}' -Destination '${targetPath}' -Force;
          Remove-Item -Path '${tempPath}' -Force -ErrorAction SilentlyContinue;
        `.replace(/\r?\n/g, ' ');

        const cmd = `powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList \\"-NoProfile -Command ${psScript}\\" -Wait"`;

        await execAsync(cmd);
        return;
      } else {
        // macOS / Linux: pkexec or sudo tee
        const tempPath = path.join(os.tmpdir(), `projectyb-hosts-${Date.now()}.tmp`);
        await fs.promises.writeFile(tempPath, content, 'utf8');
        await execAsync(`sudo cp "${tempPath}" "${targetPath}" && rm -f "${tempPath}"`);
        return;
      }
    }
  }
}

export const hostsService = new HostsService();
