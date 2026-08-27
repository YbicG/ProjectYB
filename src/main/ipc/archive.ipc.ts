import { ipcMain } from 'electron';
import { archiveService, SnapshotOptions } from '../services/archive.service';

export function setupArchiveIpc(): void {
  ipcMain.handle('archive:createSnapshot', async (_, options: SnapshotOptions) => {
    try {
      return await archiveService.createCleanSnapshot(options);
    } catch (err: any) {
      console.error('[ArchiveIPC] Snapshot error:', err);
      return {
        success: false,
        zipPath: '',
        fileName: '',
        fileSizeBytes: 0,
        filesCount: 0,
        createdAt: new Date().toISOString(),
        error: err.message
      };
    }
  });
}
