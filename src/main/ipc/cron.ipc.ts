import { ipcMain } from 'electron';
import { cronService, CronJob } from '../services/cron.service';

export function registerCronIpc() {
  ipcMain.handle('cron:getJobs', async () => {
    return cronService.getJobs();
  });

  ipcMain.handle('cron:saveJob', async (_, jobData: Partial<CronJob> & { name: string; command: string; schedule: string }) => {
    return cronService.saveJob(jobData);
  });

  ipcMain.handle('cron:deleteJob', async (_, id: string) => {
    return cronService.deleteJob(id);
  });

  ipcMain.handle('cron:runNow', async (_, id: string) => {
    return cronService.executeJob(id);
  });

  ipcMain.handle('cron:toggleJob', async (_, id: string, enabled: boolean) => {
    return cronService.toggleJob(id, enabled);
  });

  ipcMain.handle('cron:getHistory', async (_, jobId: string) => {
    return cronService.getHistory(jobId);
  });
}
