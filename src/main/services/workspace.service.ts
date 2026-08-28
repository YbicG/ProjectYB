import { getStore } from '../ipc/store.ipc';

export interface StackServiceItem {
  id: string;
  projectId: string;
  projectName: string;
  projectPath?: string;
  runConfigId?: string;
  name: string;
  command: string;
  cwd?: string;
  waitPort?: number;
  delayMs?: number;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  projectIds: string[];
  services: StackServiceItem[];
  executionMode?: 'parallel' | 'sequential';
  createdAt: number;
  updatedAt: number;
}

export type WorkspaceStack = Workspace;

class WorkspaceService {
  async getWorkspaces(): Promise<Workspace[]> {
    const store = await getStore();
    const list = (store.get('workspaceStacks', []) as Workspace[]) || [];
    return list.map((w) => ({
      ...w,
      projectIds: Array.isArray(w.projectIds) ? w.projectIds : [],
      services: Array.isArray(w.services) ? w.services : []
    }));
  }

  async getStacks(): Promise<Workspace[]> {
    return this.getWorkspaces();
  }

  async saveWorkspace(workspace: Workspace): Promise<Workspace[]> {
    const store = await getStore();
    const workspaces = await this.getWorkspaces();
    const index = workspaces.findIndex((s) => s.id === workspace.id);

    const formatted: Workspace = {
      ...workspace,
      projectIds: Array.isArray(workspace.projectIds) ? workspace.projectIds : [],
      services: Array.isArray(workspace.services) ? workspace.services : [],
      updatedAt: Date.now()
    };

    if (index >= 0) {
      workspaces[index] = formatted;
    } else {
      workspaces.push({ ...formatted, createdAt: Date.now() });
    }

    store.set('workspaceStacks', workspaces);
    return workspaces;
  }

  async saveStack(stack: WorkspaceStack): Promise<Workspace[]> {
    return this.saveWorkspace(stack);
  }

  async deleteWorkspace(workspaceId: string): Promise<Workspace[]> {
    const store = await getStore();
    const workspaces = await this.getWorkspaces();
    const filtered = workspaces.filter((s) => s.id !== workspaceId);
    store.set('workspaceStacks', filtered);

    const activeId = store.get('activeWorkspaceId') as string | null;
    if (activeId === workspaceId) {
      store.set('activeWorkspaceId', null);
    }

    return filtered;
  }

  async deleteStack(stackId: string): Promise<Workspace[]> {
    return this.deleteWorkspace(stackId);
  }

  async getActiveWorkspaceId(): Promise<string | null> {
    const store = await getStore();
    return (store.get('activeWorkspaceId', null) as string | null) || null;
  }

  async setActiveWorkspaceId(id: string | null): Promise<void> {
    const store = await getStore();
    store.set('activeWorkspaceId', id);
  }
}

export const workspaceService = new WorkspaceService();
