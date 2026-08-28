import { ipcMain } from 'electron';
import { rootCaService } from '../services/root-ca.service';

export function registerRootCaIpc() {
  ipcMain.handle('rootCa:getStatus', async () => {
    return rootCaService.checkStatus();
  });

  ipcMain.handle('rootCa:install', async () => {
    return rootCaService.installRootCa();
  });

  ipcMain.handle('rootCa:uninstall', async () => {
    return rootCaService.uninstallRootCa();
  });

  ipcMain.handle('rootCa:getCertificate', async (_, domain: string) => {
    return rootCaService.getCertificateForDomain(domain);
  });
}
