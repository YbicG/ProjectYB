import { create } from 'zustand';
import type { DockerStatus, ComposeService, DatabaseProbeResult } from '../types/docker';
import { toast } from 'sonner';
import { useNotificationStore } from './useNotificationStore';

interface DockerState {
  status: DockerStatus | null;
  services: ComposeService[];
  projectHasCompose: boolean;
  projectHasDockerfile: boolean;
  composeFile?: string;
  activeLogs: string;
  selectedServiceName: string | null;
  logsModalOpen: boolean;
  probeModalOpen: boolean;
  probeResult: DatabaseProbeResult | null;
  isProbing: boolean;
  isLoading: boolean;
  isStarting: boolean;
  isStopping: boolean;

  checkStatus: () => Promise<void>;
  loadProjectDocker: (projectPath: string) => Promise<void>;
  composeUp: (projectPath: string, serviceName?: string, build?: boolean) => Promise<boolean>;
  composeStop: (projectPath: string, serviceName?: string) => Promise<boolean>;
  composeRestart: (projectPath: string, serviceName?: string) => Promise<boolean>;
  composeDown: (projectPath: string) => Promise<boolean>;
  openLogs: (projectPath: string, serviceName?: string) => Promise<void>;
  closeLogs: () => void;
  probeDatabase: (connectionUrl: string) => Promise<DatabaseProbeResult | null>;
  setLogsModalOpen: (open: boolean) => void;
  setProbeModalOpen: (open: boolean) => void;
}

export const useDockerStore = create<DockerState>((set, get) => ({
  status: null,
  services: [],
  projectHasCompose: false,
  projectHasDockerfile: false,
  composeFile: undefined,
  activeLogs: '',
  selectedServiceName: null,
  logsModalOpen: false,
  probeModalOpen: false,
  probeResult: null,
  isProbing: false,
  isLoading: false,
  isStarting: false,
  isStopping: false,

  checkStatus: async () => {
    if (!window.api?.docker) return;
    try {
      const status = await window.api.docker.getStatus();
      set({ status });
    } catch {
      set({ status: { available: false, running: false } });
    }
  },

  loadProjectDocker: async (projectPath: string) => {
    if (!window.api?.docker) return;
    set({ isLoading: true });
    try {
      const files = await window.api.docker.getProjectFiles(projectPath);
      set({
        projectHasCompose: files.hasCompose,
        projectHasDockerfile: files.hasDockerfile,
        composeFile: files.composeFile
      });

      if (files.hasCompose) {
        const services = await window.api.docker.getServices(projectPath);
        set({ services: services || [] });
      } else {
        set({ services: [] });
      }
    } catch {
      set({ services: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  composeUp: async (projectPath, serviceName, build) => {
    if (!window.api?.docker) return false;
    set({ isStarting: true });
    try {
      const res = await window.api.docker.up(projectPath, serviceName, build);
      if (res.success) {
        useNotificationStore.getState().notify({
          title: 'Docker Stack Started',
          message: serviceName ? `Container "${serviceName}" started` : 'Docker Compose stack is running',
          type: 'success',
          category: 'docker'
        });
        get().loadProjectDocker(projectPath);
        return true;
      } else {
        useNotificationStore.getState().notify({
          title: 'Docker Start Failed',
          message: res.output || 'Failed to start containers',
          type: 'error',
          category: 'docker'
        });
        return false;
      }
    } catch (e: any) {
      toast.error(`Docker error: ${e.message}`);
      return false;
    } finally {
      set({ isStarting: false });
    }
  },

  composeStop: async (projectPath, serviceName) => {
    if (!window.api?.docker) return false;
    set({ isStopping: true });
    try {
      const res = await window.api.docker.stop(projectPath, serviceName);
      if (res.success) {
        useNotificationStore.getState().notify({
          title: 'Docker Stack Stopped',
          message: serviceName ? `Container "${serviceName}" stopped` : 'Docker Compose stack stopped',
          type: 'info',
          category: 'docker'
        });
        get().loadProjectDocker(projectPath);
        return true;
      } else {
        useNotificationStore.getState().notify({
          title: 'Docker Stop Failed',
          message: res.output || 'Failed to stop containers',
          type: 'error',
          category: 'docker'
        });
        return false;
      }
    } catch (e: any) {
      toast.error(`Docker error: ${e.message}`);
      return false;
    } finally {
      set({ isStopping: false });
    }
  },

  composeRestart: async (projectPath, serviceName) => {
    if (!window.api?.docker) return false;
    try {
      const res = await window.api.docker.restart(projectPath, serviceName);
      if (res.success) {
        useNotificationStore.getState().notify({
          title: 'Docker Stack Restarted',
          message: serviceName ? `Container "${serviceName}" restarted` : 'Docker Compose stack restarted',
          type: 'success',
          category: 'docker'
        });
        get().loadProjectDocker(projectPath);
        return true;
      } else {
        useNotificationStore.getState().notify({
          title: 'Docker Restart Failed',
          message: res.output || 'Failed to restart containers',
          type: 'error',
          category: 'docker'
        });
        return false;
      }
    } catch (e: any) {
      toast.error(`Docker error: ${e.message}`);
      return false;
    }
  },

  composeDown: async (projectPath) => {
    if (!window.api?.docker) return false;
    try {
      const res = await window.api.docker.down(projectPath);
      if (res.success) {
        useNotificationStore.getState().notify({
          title: 'Docker Stack Removed',
          message: 'Docker Compose containers and networks stopped and removed',
          type: 'info',
          category: 'docker'
        });
        get().loadProjectDocker(projectPath);
        return true;
      } else {
        useNotificationStore.getState().notify({
          title: 'Docker Down Failed',
          message: res.output || 'Failed to down containers',
          type: 'error',
          category: 'docker'
        });
        return false;
      }
    } catch (e: any) {
      toast.error(`Docker error: ${e.message}`);
      return false;
    }
  },

  openLogs: async (projectPath, serviceName) => {
    if (!window.api?.docker) return;
    set({ selectedServiceName: serviceName || null, logsModalOpen: true, activeLogs: 'Loading logs...' });
    try {
      const logs = await window.api.docker.getLogs(projectPath, serviceName, 150);
      set({ activeLogs: logs || 'No logs available.' });
    } catch (e: any) {
      set({ activeLogs: `Failed to load logs: ${e.message}` });
    }
  },

  closeLogs: () => set({ logsModalOpen: false, activeLogs: '', selectedServiceName: null }),

  probeDatabase: async (connectionUrl: string) => {
    if (!window.api?.docker || !connectionUrl.trim()) return null;
    set({ isProbing: true, probeResult: null });
    try {
      const res = await window.api.docker.probeDb(connectionUrl.trim());
      set({ probeResult: res });
      if (res.success) {
        toast.success(`Connected to ${res.protocol.toUpperCase()} on ${res.host}:${res.port} (${res.responseTimeMs}ms)`);
      } else {
        toast.error(`Connection failed: ${res.error}`);
      }
      return res;
    } catch (e: any) {
      const errRes: DatabaseProbeResult = {
        success: false,
        protocol: 'unknown',
        host: 'localhost',
        port: 0,
        responseTimeMs: 0,
        error: e.message
      };
      set({ probeResult: errRes });
      toast.error(`Probe error: ${e.message}`);
      return errRes;
    } finally {
      set({ isProbing: false });
    }
  },

  setLogsModalOpen: (open) => set({ logsModalOpen: open }),
  setProbeModalOpen: (open) => set({ probeModalOpen: open })
}));
