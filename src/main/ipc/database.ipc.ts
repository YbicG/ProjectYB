import { ipcMain, BrowserWindow } from 'electron';
import { databaseService, DatabaseConnection } from '../services/database.service';

export function setupDatabaseIpc(mainWindow: BrowserWindow) {
  databaseService.setMainWindow(mainWindow);

  ipcMain.handle('database:discoverConnections', async (_, projects: Array<{ id: string; name: string; path: string }>) => {
    return databaseService.discoverConnections(projects);
  });

  ipcMain.handle('database:testConnection', async (_, conn: DatabaseConnection) => {
    return databaseService.testConnection(conn);
  });

  ipcMain.handle('database:executeQuery', async (_, conn: DatabaseConnection, query: string) => {
    return databaseService.executeQuery(conn, query);
  });

  ipcMain.handle('database:getSchema', async (_, conn: DatabaseConnection) => {
    return databaseService.getSchema(conn);
  });

  ipcMain.handle('database:getRedisKeys', async (_, conn: DatabaseConnection, pattern?: string) => {
    return databaseService.getRedisKeys(conn, pattern);
  });
}
