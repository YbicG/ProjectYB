import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import {
  cloudSyncService,
  type CloudVaultPayload,
  type EncryptedBundle
} from '../services/cloud-sync.service';

export function setupCloudSyncIpc() {
  ipcMain.handle('sync:exportData', async () => {
    return cloudSyncService.exportWorkspaceData();
  });

  ipcMain.handle('sync:encrypt', async (_, payload: CloudVaultPayload, password: string) => {
    try {
      const bundle = cloudSyncService.encryptBundle(payload, password);
      return { success: true, bundle };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('sync:decryptAndRestore', async (_, bundle: EncryptedBundle, password: string) => {
    try {
      const decrypted = cloudSyncService.decryptBundle(bundle, password);
      const res = await cloudSyncService.restoreWorkspaceData(decrypted);
      return { success: true, itemsRestored: res.itemsRestored };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(
    'sync:githubGist',
    async (_, bundle: EncryptedBundle, githubToken: string, gistId?: string) => {
      return cloudSyncService.syncToGitHubGist(bundle, githubToken, gistId);
    }
  );

  ipcMain.handle(
    'sync:restoreFromGist',
    async (_, gistId: string, password: string, githubToken?: string) => {
      return cloudSyncService.restoreFromGitHubGist(gistId, password, githubToken);
    }
  );

  ipcMain.handle('sync:exportToFile', async (_, bundle: EncryptedBundle) => {
    const saveRes = await dialog.showSaveDialog({
      title: 'Export Encrypted Workspace Vault',
      defaultPath: `projectyb-vault-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'ProjectYB Vault', extensions: ['json'] }]
    });

    if (saveRes.canceled || !saveRes.filePath) {
      return { success: false, canceled: true };
    }

    await fs.promises.writeFile(saveRes.filePath, JSON.stringify(bundle, null, 2), 'utf8');
    return { success: true, filePath: saveRes.filePath };
  });

  ipcMain.handle('sync:importFromFile', async () => {
    const openRes = await dialog.showOpenDialog({
      title: 'Import Encrypted Workspace Vault',
      filters: [{ name: 'ProjectYB Vault', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (openRes.canceled || !openRes.filePaths?.[0]) {
      return { success: false, canceled: true };
    }

    const content = await fs.promises.readFile(openRes.filePaths[0], 'utf8');
    const bundle = JSON.parse(content) as EncryptedBundle;
    return { success: true, bundle, filePath: openRes.filePaths[0] };
  });
}
