import { create } from 'zustand';
import {
  ActiveTunnel,
  CloudflareBinaryStatus,
  CloudflareConfig,
  CloudflareAccount,
  RemoteTunnelInfo,
  TunnelProtocol
} from '../types/cloudflare';
import { useNotificationStore } from './useNotificationStore';
import { toast } from 'sonner';

interface CloudflareState {
  binaryStatus: CloudflareBinaryStatus | null;
  isCheckingBinary: boolean;
  isDownloadingBinary: boolean;
  downloadProgress: number;

  activeTunnels: ActiveTunnel[];
  selectedTunnelId: string | null;
  tunnelLogs: Record<string, string[]>;

  logsModalOpen: boolean;
  qrModalOpen: boolean;
  createModalOpen: boolean;
  activeQrTunnel: ActiveTunnel | null;
  activeLogsTunnel: ActiveTunnel | null;

  config: CloudflareConfig;
  accounts: CloudflareAccount[];
  remoteTunnels: RemoteTunnelInfo[];
  isTestingToken: boolean;
  tokenVerified: boolean;

  // Actions
  checkBinaryStatus: () => Promise<CloudflareBinaryStatus>;
  installBinary: () => Promise<boolean>;
  loadActiveTunnels: () => Promise<void>;
  startQuickTunnel: (options: {
    localPort: number;
    localHost?: string;
    protocol?: TunnelProtocol;
    name?: string;
    serviceId?: string;
    projectName?: string;
  }) => Promise<ActiveTunnel | null>;
  startNamedTunnel: (options: {
    name: string;
    tunnelToken: string;
    localPort?: number;
    customHostname?: string;
  }) => Promise<ActiveTunnel | null>;
  stopTunnel: (tunnelId: string) => Promise<boolean>;
  fetchTunnelLogs: (tunnelId: string) => Promise<string[]>;

  openLogsModal: (tunnel: ActiveTunnel) => void;
  closeLogsModal: () => void;
  openQrModal: (tunnel: ActiveTunnel) => void;
  closeQrModal: () => void;
  setCreateModalOpen: (open: boolean) => void;

  loadConfig: () => Promise<void>;
  saveConfig: (config: Partial<CloudflareConfig>) => Promise<void>;
  testToken: (token: string) => Promise<boolean>;
  loadRemoteTunnels: () => Promise<void>;
  createRemoteNamedTunnel: (
    name: string
  ) => Promise<{ success: boolean; tunnel?: RemoteTunnelInfo; token?: string; error?: string }>;
  deleteRemoteNamedTunnel: (tunnelId: string) => Promise<boolean>;
}

export const useCloudflareStore = create<CloudflareState>((set, get) => ({
  binaryStatus: null,
  isCheckingBinary: false,
  isDownloadingBinary: false,
  downloadProgress: 0,

  activeTunnels: [],
  selectedTunnelId: null,
  tunnelLogs: {},

  logsModalOpen: false,
  qrModalOpen: false,
  createModalOpen: false,
  activeQrTunnel: null,
  activeLogsTunnel: null,

  config: {},
  accounts: [],
  remoteTunnels: [],
  isTestingToken: false,
  tokenVerified: false,

  checkBinaryStatus: async () => {
    if (!window.api?.cloudflare) {
      const fallback: CloudflareBinaryStatus = { installed: false, source: 'missing' };
      set({ binaryStatus: fallback });
      return fallback;
    }

    set({ isCheckingBinary: true });
    try {
      const status = await window.api.cloudflare.getBinaryStatus();
      set({ binaryStatus: status, isCheckingBinary: false });
      return status;
    } catch {
      const fallback: CloudflareBinaryStatus = { installed: false, source: 'missing' };
      set({ binaryStatus: fallback, isCheckingBinary: false });
      return fallback;
    }
  },

  installBinary: async () => {
    if (!window.api?.cloudflare) return false;
    set({ isDownloadingBinary: true, downloadProgress: 0 });

    const unsub = window.api.cloudflare.onDownloadProgress((percent) => {
      set({ downloadProgress: percent });
    });

    try {
      const res = await window.api.cloudflare.installBinary();
      unsub();
      if (res.success) {
        toast.success('cloudflared installed successfully!');
        useNotificationStore.getState().notify({
          title: 'Cloudflare CLI Installed',
          message: 'cloudflared executable was installed and is ready for public tunneling',
          type: 'success',
          category: 'network'
        });
        await get().checkBinaryStatus();
        set({ isDownloadingBinary: false, downloadProgress: 100 });
        return true;
      } else {
        toast.error(`Install failed: ${res.error}`);
        set({ isDownloadingBinary: false });
        return false;
      }
    } catch (err: any) {
      unsub();
      toast.error(`Install error: ${err.message}`);
      set({ isDownloadingBinary: false });
      return false;
    }
  },

  loadActiveTunnels: async () => {
    if (!window.api?.cloudflare) return;
    try {
      const tunnels = await window.api.cloudflare.listActiveTunnels();
      set({ activeTunnels: tunnels || [] });
    } catch {
      set({ activeTunnels: [] });
    }
  },

  startQuickTunnel: async (options) => {
    if (!window.api?.cloudflare) return null;

    try {
      const tunnel = await window.api.cloudflare.startQuickTunnel({
        localPort: options.localPort,
        localHost: options.localHost || 'localhost',
        protocol: options.protocol || 'http',
        name: options.name || `Local Port ${options.localPort}`
      });

      // Merge extra metadata
      const enrichedTunnel: ActiveTunnel = {
        ...tunnel,
        serviceId: options.serviceId,
        projectName: options.projectName
      };

      set((state) => {
        const filtered = state.activeTunnels.filter((t) => t.id !== enrichedTunnel.id);
        return { activeTunnels: [...filtered, enrichedTunnel] };
      });

      toast.info(`Starting tunnel on port ${options.localPort}...`);
      return enrichedTunnel;
    } catch (err: any) {
      toast.error(`Failed to start tunnel: ${err.message}`);
      useNotificationStore.getState().notify({
        title: 'Tunnel Launch Failed',
        message: err.message || 'Could not spawn cloudflared tunnel',
        type: 'error',
        category: 'network'
      });
      return null;
    }
  },

  startNamedTunnel: async (options) => {
    if (!window.api?.cloudflare) return null;

    try {
      const tunnel = await window.api.cloudflare.startNamedTunnel(options);
      set((state) => {
        const filtered = state.activeTunnels.filter((t) => t.id !== tunnel.id);
        return { activeTunnels: [...filtered, tunnel] };
      });

      toast.info(`Starting named tunnel "${options.name}"...`);
      return tunnel;
    } catch (err: any) {
      toast.error(`Failed to start named tunnel: ${err.message}`);
      useNotificationStore.getState().notify({
        title: 'Named Tunnel Failed',
        message: err.message || 'Could not start tunnel with provided token',
        type: 'error',
        category: 'network'
      });
      return null;
    }
  },

  stopTunnel: async (tunnelId) => {
    if (!window.api?.cloudflare) return false;
    const tunnel = get().activeTunnels.find((t) => t.id === tunnelId);

    try {
      const res = await window.api.cloudflare.stopTunnel(tunnelId);
      if (res) {
        set((state) => ({
          activeTunnels: state.activeTunnels.filter((t) => t.id !== tunnelId)
        }));
        toast.info(`Tunnel "${tunnel?.name || tunnelId}" stopped`);
        useNotificationStore.getState().notify({
          title: 'Cloudflare Tunnel Stopped',
          message: `Closed tunnel for ${tunnel?.publicUrl || tunnel?.name || tunnelId}`,
          type: 'info',
          category: 'network'
        });
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(`Failed to stop tunnel: ${err.message}`);
      return false;
    }
  },

  fetchTunnelLogs: async (tunnelId) => {
    if (!window.api?.cloudflare) return [];
    try {
      const logs = await window.api.cloudflare.getTunnelLogs(tunnelId);
      set((state) => ({
        tunnelLogs: { ...state.tunnelLogs, [tunnelId]: logs || [] }
      }));
      return logs || [];
    } catch {
      return [];
    }
  },

  openLogsModal: (tunnel) => {
    set({ logsModalOpen: true, activeLogsTunnel: tunnel });
    get().fetchTunnelLogs(tunnel.id);
  },

  closeLogsModal: () => set({ logsModalOpen: false, activeLogsTunnel: null }),

  openQrModal: (tunnel) => set({ qrModalOpen: true, activeQrTunnel: tunnel }),

  closeQrModal: () => set({ qrModalOpen: false, activeQrTunnel: null }),

  setCreateModalOpen: (createModalOpen) => set({ createModalOpen }),

  loadConfig: async () => {
    if (!window.api?.store) return;
    try {
      const saved = (await window.api.store.get('cloudflare:config')) as CloudflareConfig | undefined;
      if (saved) {
        set({ config: saved });
        if (saved.apiToken) {
          get().testToken(saved.apiToken);
        }
      }
    } catch {}
  },

  saveConfig: async (partial) => {
    const updated = { ...get().config, ...partial };
    set({ config: updated });
    try {
      if (window.api?.store) {
        await window.api.store.set('cloudflare:config', updated);
      }
      if (partial.apiToken) {
        get().testToken(partial.apiToken);
      }
    } catch {}
  },

  testToken: async (token) => {
    if (!window.api?.cloudflare || !token) return false;
    set({ isTestingToken: true });
    try {
      const res = await window.api.cloudflare.testApiToken(token);
      if (res.success) {
        set({ tokenVerified: true, isTestingToken: false });
        const accounts = await window.api.cloudflare.listAccounts(token);
        set({ accounts });
        if (accounts.length > 0 && !get().config.accountId) {
          get().saveConfig({ accountId: accounts[0].id });
        }
        get().loadRemoteTunnels();
        return true;
      } else {
        set({ tokenVerified: false, isTestingToken: false });
        return false;
      }
    } catch {
      set({ tokenVerified: false, isTestingToken: false });
      return false;
    }
  },

  loadRemoteTunnels: async () => {
    const { config } = get();
    if (!window.api?.cloudflare || !config.apiToken || !config.accountId) return;
    try {
      const list = await window.api.cloudflare.listRemoteTunnels(config.apiToken, config.accountId);
      set({ remoteTunnels: list || [] });
    } catch {
      set({ remoteTunnels: [] });
    }
  },

  createRemoteNamedTunnel: async (name) => {
    const { config } = get();
    if (!window.api?.cloudflare || !config.apiToken || !config.accountId) {
      return { success: false, error: 'Missing Cloudflare API Token or Account ID' };
    }

    try {
      const res = await window.api.cloudflare.createRemoteTunnel(config.apiToken, config.accountId, name);
      if (res.success) {
        toast.success(`Remote tunnel "${name}" created!`);
        get().loadRemoteTunnels();
      } else {
        toast.error(`Creation failed: ${res.error}`);
      }
      return res;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  deleteRemoteNamedTunnel: async (tunnelId) => {
    const { config } = get();
    if (!window.api?.cloudflare || !config.apiToken || !config.accountId) return false;

    try {
      const ok = await window.api.cloudflare.deleteRemoteTunnel(config.apiToken, config.accountId, tunnelId);
      if (ok) {
        toast.success('Remote tunnel deleted');
        get().loadRemoteTunnels();
        return true;
      } else {
        toast.error('Failed to delete remote tunnel');
        return false;
      }
    } catch (err: any) {
      toast.error(`Delete error: ${err.message}`);
      return false;
    }
  }
}));
