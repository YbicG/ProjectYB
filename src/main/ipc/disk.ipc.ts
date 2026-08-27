import { ipcMain } from 'electron';
import { diskCleanerService, CleanCategory } from '../services/disk-cleaner.service';

export function setupDiskIpc() {
  ipcMain.handle('disk:analyzeProject', (_, projectId: string, projectName: string, projectPath: string) =>
    diskCleanerService.analyzeProject(projectId, projectName, projectPath)
  );

  ipcMain.handle('disk:analyzeProjects', (_, projects: Array<{ id: string; name: string; path: string }>) =>
    diskCleanerService.analyzeProjects(projects)
  );

  ipcMain.handle('disk:cleanProject', (_, projectPath: string, categories: CleanCategory[]) =>
    diskCleanerService.cleanProject(projectPath, categories)
  );

  ipcMain.handle('disk:cleanGlobalCache', (_, type: 'pnpm' | 'npm' | 'cargo' | 'pip') =>
    diskCleanerService.cleanGlobalCache(type)
  );
}
