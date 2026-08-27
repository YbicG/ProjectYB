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

export type StackBootState = 'idle' | 'booting' | 'running' | 'error';
