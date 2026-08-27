import { ipcMain } from 'electron';
import { workspaceService, WorkspaceStack } from '../services/workspace.service';

export function setupWorkspaceIpc() {
  ipcMain.handle('workspaces:getStacks', () =>
    workspaceService.getStacks()
  );

  ipcMain.handle('workspaces:saveStack', (_, stack: WorkspaceStack) =>
    workspaceService.saveStack(stack)
  );

  ipcMain.handle('workspaces:deleteStack', (_, stackId: string) =>
    workspaceService.deleteStack(stackId)
  );
}
