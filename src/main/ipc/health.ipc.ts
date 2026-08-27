import { ipcMain } from 'electron';
import { healthService } from '../services/health.service';

export function setupHealthIpc(): void {
  ipcMain.handle('health:getOverview', async (_, projects) => {
    return healthService.getHealthOverview(projects);
  });
}
