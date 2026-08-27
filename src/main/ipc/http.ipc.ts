import { ipcMain } from 'electron';
import { httpClientService, HttpRequestOptions } from '../services/http-client.service';

export function setupHttpIpc(): void {
  ipcMain.handle('http:sendRequest', async (_, options: HttpRequestOptions) => {
    try {
      return await httpClientService.execute(options);
    } catch (err: any) {
      console.error('[HttpIPC] Request error:', err);
      return {
        status: 0,
        statusText: 'Internal Error',
        headers: {},
        body: '',
        isJson: false,
        durationMs: 0,
        sizeBytes: 0,
        error: err.message
      };
    }
  });
}
