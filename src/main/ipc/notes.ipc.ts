import { ipcMain } from 'electron';
import { notesService } from '../services/notes.service';

export function setupNotesIpc(): void {
  ipcMain.handle('notes:read', async (_, projectPath: string) => {
    return notesService.readProjectNotes(projectPath);
  });

  ipcMain.handle('notes:write', async (_, { projectPath, content }: { projectPath: string; content: string }) => {
    return notesService.writeProjectNotes(projectPath, content);
  });

  ipcMain.handle('notes:getGlobal', async () => {
    return notesService.getGlobalScratchpad();
  });

  ipcMain.handle('notes:setGlobal', async (_, content: string) => {
    return notesService.setGlobalScratchpad(content);
  });
}
