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
  color?: string; // violet, cyan, emerald, amber, rose, blue
  icon?: string;
  projectIds: string[]; // Project IDs or paths belonging to this workspace
  services: StackServiceItem[]; // Services in this workspace stack
  executionMode?: 'parallel' | 'sequential';
  createdAt: number;
  updatedAt: number;
}

// Alias for backwards compatibility
export type WorkspaceStack = Workspace;

export type StackBootState = 'idle' | 'booting' | 'running' | 'error';
