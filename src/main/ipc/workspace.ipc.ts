import { ipcMain } from 'electron';
import { workspaceService, Workspace } from '../services/workspace.service';

export function setupWorkspaceIpc() {
  ipcMain.handle('workspaces:getStacks', () =>
    workspaceService.getWorkspaces()
  );

  ipcMain.handle('workspaces:getWorkspaces', () =>
    workspaceService.getWorkspaces()
  );

  ipcMain.handle('workspaces:saveStack', (_, stack: Workspace) =>
    workspaceService.saveWorkspace(stack)
  );

  ipcMain.handle('workspaces:saveWorkspace', (_, workspace: Workspace) =>
    workspaceService.saveWorkspace(workspace)
  );

  ipcMain.handle('workspaces:deleteStack', (_, stackId: string) =>
    workspaceService.deleteWorkspace(stackId)
  );

  ipcMain.handle('workspaces:deleteWorkspace', (_, workspaceId: string) =>
    workspaceService.deleteWorkspace(workspaceId)
  );

  ipcMain.handle('workspaces:getActive', () =>
    workspaceService.getActiveWorkspaceId()
  );

  ipcMain.handle('workspaces:setActive', (_, id: string | null) =>
    workspaceService.setActiveWorkspaceId(id)
  );
}
