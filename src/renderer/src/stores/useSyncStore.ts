import { create } from 'zustand';
import { toast } from 'sonner';
import type { EncryptedBundle, SyncStatus } from '../types/sync';
import { useProjectStore } from './useProjectStore';

interface SyncState {
  status: SyncStatus;
  isSyncing: boolean;
  githubToken: string;
  gistId: string;
  isBackupModalOpen: boolean;
  isRestoreModalOpen: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  setGitHubToken: (token: string) => Promise<void>;
  setGistId: (gistId: string) => Promise<void>;
  backupToGist: (password: string) => Promise<{ success: boolean; url?: string; error?: string }>;
  restoreFromGist: (password: string) => Promise<{ success: boolean; error?: string }>;
  exportToFile: (password: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  importFromFile: (password: string) => Promise<{ success: boolean; itemsRestored?: number; error?: string }>;
  setBackupModalOpen: (open: boolean) => void;
  setRestoreModalOpen: (open: boolean) => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  status: {},
  isSyncing: false,
  githubToken: '',
  gistId: '',
  isBackupModalOpen: false,
  isRestoreModalOpen: false,

  loadSettings: async () => {
    try {
      if (window.api?.store) {
        const githubToken = ((await window.api.store.get('githubToken')) as string) || '';
        const gistId = ((await window.api.store.get('sync:gistId')) as string) || '';
        const status = ((await window.api.store.get('sync:status')) as SyncStatus) || {};
        set({ githubToken, gistId, status });
      }
    } catch (err) {
      console.error('Failed to load sync settings', err);
    }
  },

  setGitHubToken: async (token: string) => {
    set({ githubToken: token });
    if (window.api?.store) await window.api.store.set('githubToken', token);
  },

  setGistId: async (gistId: string) => {
    set({ gistId });
    if (window.api?.store) await window.api.store.set('sync:gistId', gistId);
  },

  backupToGist: async (password: string) => {
    const { githubToken, gistId } = get();
    if (!password) {
      toast.error('Encryption password is required');
      return { success: false, error: 'Password required' };
    }
    if (!githubToken) {
      toast.error('GitHub Personal Access Token is required for Gist sync');
      return { success: false, error: 'GitHub token required' };
    }

    set({ isSyncing: true });
    try {
      if (!window.api?.sync) throw new Error('Sync API not available');

      // 1. Collect payload
      const payload = await window.api.sync.exportData();

      // 2. Encrypt with AES-256-GCM
      const encryptRes = await window.api.sync.encrypt(payload, password);
      if (!encryptRes.success || !encryptRes.bundle) {
        throw new Error(encryptRes.error || 'Encryption failed');
      }

      // 3. Upload to GitHub Gist
      const gistRes = await window.api.sync.githubGist(encryptRes.bundle, githubToken, gistId || undefined);
      if (!gistRes.success) {
        throw new Error(gistRes.error || 'Failed to upload Gist');
      }

      const newGistId = gistRes.gistId || gistId;
      const newStatus: SyncStatus = {
        lastBackupDate: new Date().toISOString(),
        lastGistId: newGistId,
        lastGistUrl: gistRes.htmlUrl
      };

      set({ gistId: newGistId, status: newStatus, isBackupModalOpen: false });
      if (window.api?.store) {
        await window.api.store.set('sync:gistId', newGistId);
        await window.api.store.set('sync:status', newStatus);
      }

      toast.success('Workspace securely encrypted and backed up to GitHub Gist!');
      return { success: true, url: gistRes.htmlUrl };
    } catch (err: any) {
      toast.error(`Backup failed: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      set({ isSyncing: false });
    }
  },

  restoreFromGist: async (password: string) => {
    const { githubToken, gistId } = get();
    if (!password || !gistId) {
      toast.error('Gist ID and encryption password are required');
      return { success: false, error: 'Missing credentials' };
    }

    set({ isSyncing: true });
    try {
      if (!window.api?.sync) throw new Error('Sync API not available');

      const res = await window.api.sync.restoreFromGist(gistId, password, githubToken || undefined);
      if (!res.success) {
        throw new Error(res.error || 'Decryption / Restore failed. Check your password.');
      }

      // Re-scan workspace projects
      await useProjectStore.getState().scanProjects();

      set({ isRestoreModalOpen: false });
      toast.success('Workspace successfully restored and decrypted!');
      return { success: true };
    } catch (err: any) {
      toast.error(`Restore failed: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      set({ isSyncing: false });
    }
  },

  exportToFile: async (password: string) => {
    if (!password) {
      toast.error('Encryption password is required');
      return { success: false, error: 'Password required' };
    }

    set({ isSyncing: true });
    try {
      if (!window.api?.sync) throw new Error('Sync API not available');

      const payload = await window.api.sync.exportData();
      const encryptRes = await window.api.sync.encrypt(payload, password);
      if (!encryptRes.success || !encryptRes.bundle) {
        throw new Error(encryptRes.error || 'Encryption failed');
      }

      const saveRes = await window.api.sync.exportToFile(encryptRes.bundle);
      if (saveRes.canceled) return { success: false };

      toast.success(`Encrypted vault exported to ${saveRes.filePath}`);
      set({ isBackupModalOpen: false });
      return { success: true, filePath: saveRes.filePath };
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      set({ isSyncing: false });
    }
  },

  importFromFile: async (password: string) => {
    if (!password) {
      toast.error('Encryption password is required');
      return { success: false, error: 'Password required' };
    }

    set({ isSyncing: true });
    try {
      if (!window.api?.sync) throw new Error('Sync API not available');

      const importRes = await window.api.sync.importFromFile();
      if (importRes.canceled || !importRes.bundle) return { success: false };

      const restoreRes = await window.api.sync.decryptAndRestore(importRes.bundle, password);
      if (!restoreRes.success) {
        throw new Error(restoreRes.error || 'Decryption failed. Please check your password.');
      }

      await useProjectStore.getState().scanProjects();
      toast.success(`Restored ${restoreRes.itemsRestored} workspace data collections!`);
      set({ isRestoreModalOpen: false });
      return { success: true, itemsRestored: restoreRes.itemsRestored };
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
      return { success: false, error: err.message };
    } finally {
      set({ isSyncing: false });
    }
  },

  setBackupModalOpen: (open) => set({ isBackupModalOpen: open }),
  setRestoreModalOpen: (open) => set({ isRestoreModalOpen: open })
}));
