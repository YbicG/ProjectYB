import { ipcMain } from 'electron';
import { projectArchiverService } from '../services/project-archiver.service';

export function registerProjectArchiverIpc(): void {
  ipcMain.handle(
    'projectArchiver:scanInactiveProjects',
    async (_e, projects: Array<{ id: string; name: string; path: string }>, daysThreshold?: number) => {
      return projectArchiverService.scanInactiveProjects(projects, daysThreshold);
    }
  );

  ipcMain.handle('projectArchiver:freezeProject', async (_e, projectPath: string) => {
    return projectArchiverService.freezeProject(projectPath);
  });

  ipcMain.handle('projectArchiver:thawProject', async (_e, projectPath: string) => {
    return projectArchiverService.thawProject(projectPath);
  });
}