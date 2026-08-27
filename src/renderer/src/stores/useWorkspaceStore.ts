import { create } from 'zustand';
import type { WorkspaceStack, StackServiceItem, StackBootState } from '../types/workspace';
import { useServiceStore } from './useServiceStore';
import { useTerminalStore } from './useTerminalStore';
import { toast } from 'sonner';

interface WorkspaceState {
  stacks: WorkspaceStack[];
  activeStackId: string | null;
  bootState: StackBootState;
  bootLog: string[];
  editorOpen: boolean;
  editingStack: WorkspaceStack | null;
  isLoading: boolean;

  loadStacks: () => Promise<void>;
  saveStack: (stack: WorkspaceStack) => Promise<void>;
  deleteStack: (stackId: string) => Promise<void>;
  setActiveStack: (stackId: string | null) => void;
  openEditor: (stack?: WorkspaceStack) => void;
  closeEditor: () => void;
  bootStack: (stack: WorkspaceStack) => Promise<void>;
  stopStack: (stack: WorkspaceStack) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  stacks: [],
  activeStackId: null,
  bootState: 'idle',
  bootLog: [],
  editorOpen: false,
  editingStack: null,
  isLoading: false,

  loadStacks: async () => {
    if (!window.api?.workspaces) return;
    set({ isLoading: true });
    try {
      const stacks = await window.api.workspaces.getStacks();
      set({ stacks: stacks || [] });
    } catch {
      set({ stacks: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  saveStack: async (stack) => {
    if (!window.api?.workspaces) return;
    try {
      const updated = await window.api.workspaces.saveStack(stack);
      set({ stacks: updated, editorOpen: false, editingStack: null });
      toast.success(`Saved stack "${stack.name}"`);
    } catch (e: any) {
      toast.error(`Failed to save stack: ${e.message}`);
    }
  },

  deleteStack: async (stackId) => {
    if (!window.api?.workspaces) return;
    try {
      const updated = await window.api.workspaces.deleteStack(stackId);
      set({
        stacks: updated,
        activeStackId: get().activeStackId === stackId ? null : get().activeStackId
      });
      toast.success('Workspace stack deleted');
    } catch (e: any) {
      toast.error(`Failed to delete stack: ${e.message}`);
    }
  },

  setActiveStack: (stackId) => set({ activeStackId: stackId }),

  openEditor: (stack) => set({ editorOpen: true, editingStack: stack || null }),

  closeEditor: () => set({ editorOpen: false, editingStack: null }),

  bootStack: async (stack) => {
    set({ bootState: 'booting', bootLog: [`Starting stack "${stack.name}" (${stack.services.length} services)...`] });
    const serviceStore = useServiceStore.getState();

    try {
      for (let i = 0; i < stack.services.length; i++) {
        const item = stack.services[i];
        set((s) => ({ bootLog: [...s.bootLog, `[${i + 1}/${stack.services.length}] Launching ${item.name}...`] }));

        await serviceStore.startService(item.projectId, item.projectName, {
          id: `stack-${stack.id}-${item.id}-${Date.now()}`,
          name: `${stack.name} / ${item.name}`,
          command: item.command,
          cwd: item.cwd || item.projectPath,
          port: item.waitPort,
          autoRestart: false
        });

        // Delay between services if configured
        if (item.delayMs && item.delayMs > 0) {
          await new Promise((r) => setTimeout(r, item.delayMs));
        }
      }

      set((s) => ({
        bootState: 'running',
        bootLog: [...s.bootLog, `✓ Stack "${stack.name}" successfully started!`]
      }));
      toast.success(`Stack "${stack.name}" is now running!`);
    } catch (err: any) {
      set((s) => ({
        bootState: 'error',
        bootLog: [...s.bootLog, `❌ Error booting stack: ${err.message}`]
      }));
      toast.error(`Failed to boot stack: ${err.message}`);
    }
  },

  stopStack: async (stack) => {
    const serviceStore = useServiceStore.getState();
    const prefix = `${stack.name} /`;
    const toStop = serviceStore.services.filter((s) => s.name.startsWith(prefix));

    for (const s of toStop) {
      serviceStore.stopService(s.id);
    }

    set({ bootState: 'idle', bootLog: [] });
    toast.success(`Stopped all services in stack "${stack.name}"`);
  }
}));
