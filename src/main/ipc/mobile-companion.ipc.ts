import { ipcMain } from 'electron';
import { mobileCompanionService } from '../services/mobile-companion.service';

export function registerMobileCompanionIpc() {
  ipcMain.handle('mobile:start', async (_, options: {
    tunnelType?: 'quick' | 'named';
    namedToken?: string;
    customHostname?: string;
    port?: number;
  }) => {
    return mobileCompanionService.start(options);
  });

  ipcMain.handle('mobile:stop', async () => {
    return mobileCompanionService.stop();
  });

  ipcMain.handle('mobile:getStatus', async () => {
    return mobileCompanionService.getStatus();
  });

  ipcMain.handle('mobile:setCredentials', async (_, username: string, rawPass: string) => {
    return mobileCompanionService.setCredentials(username, rawPass);
  });

  ipcMain.handle('mobile:getCredentials', async () => {
    return mobileCompanionService.getCredentials();
  });
}
