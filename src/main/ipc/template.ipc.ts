import { ipcMain, BrowserWindow } from 'electron';
import { templateService, type ScaffoldOptions, type ProjectTemplate } from '../services/template.service';

export function setupTemplateIpc(mainWindow?: BrowserWindow | null) {
  ipcMain.handle('templates:list', async () => {
    const builtin = templateService.getBuiltinTemplates();
    const custom = await templateService.getCustomTemplates();
    return [...builtin, ...custom];
  });

  ipcMain.handle('templates:scaffold', async (_, options: ScaffoldOptions) => {
    return templateService.scaffoldProject(options, (logLine) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('templates:log', logLine);
      }
    });
  });

  ipcMain.handle('templates:saveCustom', async (_, template: ProjectTemplate) => {
    return templateService.saveCustomTemplate(template);
  });
}
