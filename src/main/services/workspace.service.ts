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

export interface WorkspaceStack {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  services: StackServiceItem[];
  createdAt: number;
  updatedAt: number;
}

class WorkspaceService {
  async getStacks(): Promise<WorkspaceStack[]> {
    const store = await getStore();
    return (store.get('workspaceStacks', []) as WorkspaceStack[]) || [];
  }

  async saveStack(stack: WorkspaceStack): Promise<WorkspaceStack[]> {
    const store = await getStore();
    const stacks = (store.get('workspaceStacks', []) as WorkspaceStack[]) || [];
    const index = stacks.findIndex(s => s.id === stack.id);

    if (index >= 0) {
      stacks[index] = { ...stack, updatedAt: Date.now() };
    } else {
      stacks.push({ ...stack, createdAt: Date.now(), updatedAt: Date.now() });
    }

    store.set('workspaceStacks', stacks);
    return stacks;
  }

  async deleteStack(stackId: string): Promise<WorkspaceStack[]> {
    const store = await getStore();
    const stacks = (store.get('workspaceStacks', []) as WorkspaceStack[]) || [];
    const filtered = stacks.filter(s => s.id !== stackId);
    store.set('workspaceStacks', filtered);
    return filtered;
  }
}

export const workspaceService = new WorkspaceService();
