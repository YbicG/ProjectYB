import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getStore } from '../ipc/store.ipc';
import { logger } from '../utils/logger';

export interface CloudVaultPayload {
  version: string;
  createdAt: string;
  data: {
    scanPaths?: string[];
    scanPathModes?: Record<string, 'git' | 'all'>;
    pinnedProjects?: string[];
    databaseConnections?: any[];
    pipelines?: any[];
    snippets?: any[];
    workspaceStacks?: any[];
    runConfigs?: any[];
    mockRoutes?: any[];
    customTheme?: any;
  };
}

export interface EncryptedBundle {
  algorithm: 'aes-256-gcm';
  iv: string;         // hex
  authTag: string;    // hex
  ciphertext: string; // hex
  createdAt: string;
}

export class CloudSyncService {
  /**
   * Derive 32-byte key from password using scrypt
   */
  private deriveKey(password: string, salt: string = 'projectyb-vault-salt'): Buffer {
    return crypto.scryptSync(password, salt, 32);
  }

  /**
   * Collect all application data into a bundle
   */
  async exportWorkspaceData(): Promise<CloudVaultPayload> {
    const store = await getStore();
    return {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      data: {
        scanPaths: (store.get('scanPaths') as string[]) || [],
        scanPathModes: (store.get('scanPathModes') as any) || {},
        pinnedProjects: (store.get('pinnedProjects') as string[]) || [],
        databaseConnections: (store.get('database:connections') as any[]) || [],
        pipelines: (store.get('pipelines:data') as any[]) || [],
        snippets: (store.get('snippets') as any[]) || [],
        workspaceStacks: (store.get('workspaces:stacks') as any[]) || [],
        mockRoutes: (store.get('mock:routes') as any[]) || []
      }
    };
  }

  /**
   * Encrypt workspace bundle using AES-256-GCM
   */
  encryptBundle(payload: CloudVaultPayload, password: string): EncryptedBundle {
    const key = this.deriveKey(password);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const plaintext = JSON.stringify(payload);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      algorithm: 'aes-256-gcm',
      iv: iv.toString('hex'),
      authTag,
      ciphertext,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Decrypt bundle using AES-256-GCM
   */
  decryptBundle(bundle: EncryptedBundle, password: string): CloudVaultPayload {
    const key = this.deriveKey(password);
    const iv = Buffer.from(bundle.iv, 'hex');
    const authTag = Buffer.from(bundle.authTag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(bundle.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');

    return JSON.parse(plaintext) as CloudVaultPayload;
  }

  /**
   * Restore workspace data into electron-store
   */
  async restoreWorkspaceData(payload: CloudVaultPayload): Promise<{ success: boolean; itemsRestored: number }> {
    const store = await getStore();
    let count = 0;

    if (payload.data.scanPaths) {
      store.set('scanPaths', payload.data.scanPaths);
      count++;
    }
    if (payload.data.scanPathModes) {
      store.set('scanPathModes', payload.data.scanPathModes);
      count++;
    }
    if (payload.data.pinnedProjects) {
      store.set('pinnedProjects', payload.data.pinnedProjects);
      count++;
    }
    if (payload.data.databaseConnections) {
      store.set('database:connections', payload.data.databaseConnections);
      count++;
    }
    if (payload.data.pipelines) {
      store.set('pipelines:data', payload.data.pipelines);
      count++;
    }
    if (payload.data.snippets) {
      store.set('snippets', payload.data.snippets);
      count++;
    }
    if (payload.data.workspaceStacks) {
      store.set('workspaces:stacks', payload.data.workspaceStacks);
      count++;
    }
    if (payload.data.mockRoutes) {
      store.set('mock:routes', payload.data.mockRoutes);
      count++;
    }

    return { success: true, itemsRestored: count };
  }

  /**
   * Sync encrypted bundle to GitHub Gist (Private)
   */
  async syncToGitHubGist(
    encryptedBundle: EncryptedBundle,
    githubToken: string,
    existingGistId?: string
  ): Promise<{ success: boolean; gistId?: string; htmlUrl?: string; error?: string }> {
    try {
      if (!githubToken) return { success: false, error: 'Missing GitHub Personal Access Token' };

      const gistContent = JSON.stringify(encryptedBundle, null, 2);
      const url = existingGistId
        ? `https://api.github.com/gists/${existingGistId}`
        : 'https://api.github.com/gists';

      const method = existingGistId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${githubToken.trim()}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'ProjectYB-Sync'
        },
        body: JSON.stringify({
          description: 'ProjectYB Encrypted Workspace Vault (AES-256-GCM)',
          public: false,
          files: {
            'projectyb-vault.json': {
              content: gistContent
            }
          }
        })
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        return { success: false, error: data.message || 'Failed to sync to GitHub Gist' };
      }

      return {
        success: true,
        gistId: data.id,
        htmlUrl: data.html_url
      };
    } catch (err: any) {
      logger.error('Failed to sync to GitHub Gist', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch and decrypt bundle from GitHub Gist
   */
  async restoreFromGitHubGist(
    gistId: string,
    password: string,
    githubToken?: string
  ): Promise<{ success: boolean; payload?: CloudVaultPayload; error?: string }> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'ProjectYB-Sync'
      };
      if (githubToken) headers['Authorization'] = `Bearer ${githubToken.trim()}`;

      const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers });
      const data = (await res.json()) as any;
      if (!res.ok) {
        return { success: false, error: data.message || 'Failed to fetch GitHub Gist' };
      }

      const file = data.files?.['projectyb-vault.json'];
      if (!file || !file.content) {
        return { success: false, error: 'Gist does not contain a valid projectyb-vault.json file' };
      }

      const bundle = JSON.parse(file.content) as EncryptedBundle;
      const decrypted = this.decryptBundle(bundle, password);
      await this.restoreWorkspaceData(decrypted);

      return { success: true, payload: decrypted };
    } catch (err: any) {
      logger.error('Failed to restore from GitHub Gist', err);
      return { success: false, error: err.message };
    }
  }
}

export const cloudSyncService = new CloudSyncService();
