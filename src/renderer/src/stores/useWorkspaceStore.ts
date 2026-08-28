import { create } from 'zustand';
import type { Workspace, WorkspaceStack, StackServiceItem, StackBootState } from '../types/workspace';
import { useServiceStore } from './useServiceStore';
import { useTerminalStore } from './useTerminalStore';
import { toast } from 'sonner';

interface WorkspaceState {
  workspaces: Workspace[];
  stacks: Workspace[]; // Alias for backwards compat
  activeWorkspaceId: string | null;
  activeStackId: string | null; // Alias
  runningWorkspaceIds: string[];
  runningServiceIdsByWorkspace: Record<string, string[]>;
  bootState: StackBootState;
  bootLog: string[];
  editorOpen: boolean;
  editingStack: Workspace | null;
  isLoading: boolean;

  loadWorkspaces: () => Promise<void>;
  loadStacks: () => Promise<void>;
  saveWorkspace: (workspace: Workspace) => Promise<void>;
  saveStack: (stack: WorkspaceStack) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  deleteStack: (id: string) => Promise<void>;
  setActiveWorkspace: (id: string | null) => Promise<void>;
  setActiveStack: (id: string | null) => void;
  openEditor: (workspace?: Workspace) => void;
  closeEditor: () => void;
  bootWorkspace: (workspace: Workspace) => Promise<void>;
  bootStack: (stack: WorkspaceStack) => Promise<void>;
  stopWorkspace: (workspace: Workspace) => Promise<void>;
  stopStack: (stack: WorkspaceStack) => Promise<void>;
  isWorkspaceRunning: (id: string) => boolean;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  stacks: [],
  activeWorkspaceId: null,
  activeStackId: null,
  runningWorkspaceIds: [],
  runningServiceIdsByWorkspace: {},
  bootState: 'idle',
  bootLog: [],
  editorOpen: false,
  editingStack: null,
  isLoading: false,

  loadWorkspaces: async () => {
    if (!window.api?.workspaces) return;
    set({ isLoading: true });
    try {
      const [list, activeId] = await Promise.all([
        window.api.workspaces.getWorkspaces ? window.api.workspaces.getWorkspaces() : window.api.workspaces.getStacks(),
        window.api.workspaces.getActive ? window.api.workspaces.getActive() : Promise.resolve(null)
      ]);
      const validWorkspaces: Workspace[] = (list || []).map((w: any) => ({
        ...w,
        projectIds: Array.isArray(w.projectIds) ? w.projectIds : [],
        services: Array.isArray(w.services) ? w.services : []
      }));
      set({
        workspaces: validWorkspaces,
        stacks: validWorkspaces,
        activeWorkspaceId: activeId || null,
        activeStackId: activeId || null
      });
    } catch {
      set({ workspaces: [], stacks: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadStacks: async () => {
    return get().loadWorkspaces();
  },

  saveWorkspace: async (workspace: Workspace) => {
    if (!window.api?.workspaces) return;
    try {
      const updated = window.api.workspaces.saveWorkspace
        ? await window.api.workspaces.saveWorkspace(workspace)
        : await window.api.workspaces.saveStack(workspace);
      const valid: Workspace[] = (updated || []).map((w: any) => ({
        ...w,
        projectIds: Array.isArray(w.projectIds) ? w.projectIds : [],
        services: Array.isArray(w.services) ? w.services : []
      }));
      set({
        workspaces: valid,
        stacks: valid,
        editorOpen: false,
        editingStack: null
      });
      toast.success(`Saved workspace "${workspace.name}"`);
    } catch (e: any) {
      toast.error(`Failed to save workspace: ${e.message}`);
    }
  },

  saveStack: async (stack: WorkspaceStack) => {
    return get().saveWorkspace(stack);
  },

  deleteWorkspace: async (id: string) => {
    if (!window.api?.workspaces) return;
    try {
      const updated = window.api.workspaces.deleteWorkspace
        ? await window.api.workspaces.deleteWorkspace(id)
        : await window.api.workspaces.deleteStack(id);
      const valid: Workspace[] = (updated || []).map((w: any) => ({
        ...w,
        projectIds: Array.isArray(w.projectIds) ? w.projectIds : [],
        services: Array.isArray(w.services) ? w.services : []
      }));
      const newActive = get().activeWorkspaceId === id ? null : get().activeWorkspaceId;
      set({
        workspaces: valid,
        stacks: valid,
        activeWorkspaceId: newActive,
        activeStackId: newActive
      });
      toast.success('Workspace deleted');
    } catch (e: any) {
      toast.error(`Failed to delete workspace: ${e.message}`);
    }
  },

  deleteStack: async (id: string) => {
    return get().deleteWorkspace(id);
  },

  setActiveWorkspace: async (id: string | null) => {
    set({ activeWorkspaceId: id, activeStackId: id });
    try {
      if (window.api?.workspaces?.setActive) {
        await window.api.workspaces.setActive(id);
      }
    } catch {}
  },

  setActiveStack: (id: string | null) => {
    get().setActiveWorkspace(id);
  },

  openEditor: (workspace) => set({ editorOpen: true, editingStack: workspace || null }),

  closeEditor: () => set({ editorOpen: false, editingStack: null }),

  bootWorkspace: async (workspace: Workspace) => {
    if (!workspace.services || workspace.services.length === 0) {
      toast.info(`Workspace "${workspace.name}" has no services configured in its stack.`);
      return;
    }

    set({
      bootState: 'booting',
      bootLog: [`Starting workspace stack "${workspace.name}" (${workspace.services.length} services)...`]
    });
    const serviceStore = useServiceStore.getState();
    const launchedServiceIds: string[] = [];

    try {
      for (let i = 0; i < workspace.services.length; i++) {
        const item = workspace.services[i];
        set((s) => ({
          bootLog: [...s.bootLog, `[${i + 1}/${workspace.services.length}] Launching ${item.name}...`]
        }));

        const serviceId = `ws-${workspace.id}-${item.id}-${Date.now()}`;
        await serviceStore.startService(item.projectId, item.projectName, {
          id: serviceId,
          name: `${workspace.name} • ${item.name}`,
          command: item.command,
          cwd: item.cwd || item.projectPath,
          port: item.waitPort,
          autoRestart: false
        });

        launchedServiceIds.push(serviceId);

        // Delay between services if configured
        if (item.delayMs && item.delayMs > 0 && i < workspace.services.length - 1) {
          await new Promise((r) => setTimeout(r, item.delayMs));
        }
      }

      set((s) => ({
        bootState: 'running',
        runningWorkspaceIds: Array.from(new Set([...s.runningWorkspaceIds, workspace.id])),
        runningServiceIdsByWorkspace: {
          ...s.runningServiceIdsByWorkspace,
          [workspace.id]: launchedServiceIds
        },
        bootLog: [...s.bootLog, `✓ Workspace "${workspace.name}" successfully started!`]
      }));
      toast.success(`Workspace "${workspace.name}" stack is now running!`);
    } catch (err: any) {
      set((s) => ({
        bootState: 'error',
        bootLog: [...s.bootLog, `❌ Error booting workspace: ${err.message}`]
      }));
      toast.error(`Failed to boot workspace: ${err.message}`);
    }
  },

  bootStack: async (stack: WorkspaceStack) => {
    return get().bootWorkspace(stack);
  },

  stopWorkspace: async (workspace: Workspace) => {
    const serviceStore = useServiceStore.getState();
    const trackMap = get().runningServiceIdsByWorkspace;
    const directIds = trackMap[workspace.id] || [];

    // Stop tracked service IDs
    for (const sid of directIds) {
      serviceStore.stopService(sid);
    }

    // Also fallback cleanup for any services matching name pattern
    const prefix = `${workspace.name} •`;
    const matching = serviceStore.services.filter((s) => s.name.startsWith(prefix));
    for (const s of matching) {
      serviceStore.stopService(s.id);
    }

    set((s) => {
      const nextRunning = s.runningWorkspaceIds.filter((id) => id !== workspace.id);
      const nextMap = { ...s.runningServiceIdsByWorkspace };
      delete nextMap[workspace.id];
      return {
        bootState: 'idle',
        bootLog: [],
        runningWorkspaceIds: nextRunning,
        runningServiceIdsByWorkspace: nextMap
      };
    });

    toast.success(`Stopped all services in workspace "${workspace.name}"`);
  },

  stopStack: async (stack: WorkspaceStack) => {
    return get().stopWorkspace(stack);
  },

  isWorkspaceRunning: (id: string) => {
    const state = get();
    if (state.runningWorkspaceIds.includes(id)) return true;
    const ws = state.workspaces.find((w) => w.id === id);
    if (!ws) return false;
    const serviceStore = useServiceStore.getState();
    const prefix = `${ws.name} •`;
    return serviceStore.services.some((s) => s.name.startsWith(prefix) && s.status === 'running');
  }
}));
