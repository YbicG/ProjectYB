import { ipcMain } from 'electron';
import { searchService, SearchOptions } from '../services/search.service';

export function setupSearchIpc(): void {
  ipcMain.handle('search:query', async (_, options: SearchOptions) => {
    try {
      return await searchService.searchProjects(options);
    } catch (err: any) {
      console.error('[SearchIPC] Query error:', err);
      return [];
    }
  });
}
