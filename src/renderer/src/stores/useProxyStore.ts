import { create } from 'zustand';
import { toast } from 'sonner';
import type { ProxyRoute, ProxyStatus } from '../types/proxy';

interface ProxyState {
  routes: ProxyRoute[];
  status: ProxyStatus;
  hostsStatus: Record<string, boolean>;
  isLoading: boolean;
  isSyncingHosts: boolean;
  isEditorOpen: boolean;
  editingRoute?: ProxyRoute;

  // Actions
  fetchStatus: () => Promise<void>;
  checkHostsStatus: () => Promise<void>;
  syncAllToHosts: () => Promise<boolean>;
  syncSingleToHosts: (domain: string) => Promise<boolean>;
  clearHosts: () => Promise<boolean>;
  startProxy: (httpPort?: number, httpsPort?: number) => Promise<void>;
  stopProxy: () => Promise<void>;
  addRoute: (route: Omit<ProxyRoute, 'id' | 'createdAt' | 'requestCount'>, autoSyncHosts?: boolean) => Promise<void>;
  updateRoute: (id: string, updates: Partial<ProxyRoute>) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  toggleRoute: (id: string) => Promise<void>;
  openEditor: (route?: ProxyRoute) => void;
  closeEditor: () => void;
}

const DEFAULT_ROUTES: ProxyRoute[] = [
  {
    id: 'route-app',
    hostname: 'app.test',
    targetPort: 3000,
    targetHost: '127.0.0.1',
    useHttps: true,
    enabled: true,
    requestCount: 0,
    createdAt: new Date().toISOString()
  },
  {
    id: 'route-api',
    hostname: 'api.test',
    targetPort: 5000,
    targetHost: '127.0.0.1',
    useHttps: true,
    enabled: true,
    requestCount: 0,
    createdAt: new Date().toISOString()
  }
];

export const useProxyStore = create<ProxyState>((set, get) => ({
  routes: DEFAULT_ROUTES,
  status: {
    running: false,
    httpPort: 8080,
    httpsPort: 8443,
    routesCount: 2,
    activeConnections: 0
  },
  hostsStatus: {},
  isLoading: false,
  isSyncingHosts: false,
  isEditorOpen: false,

  fetchStatus: async () => {
    try {
      if (window.api?.proxy) {
        const status = await window.api.proxy.getStatus();
        const savedRoutes = (await window.api.store?.get('proxy:routes')) as ProxyRoute[] | undefined;
        const routes = savedRoutes && savedRoutes.length > 0 ? savedRoutes : get().routes;
        set({ status, routes });
      }
      await get().checkHostsStatus();
    } catch (err) {
      console.error('Failed to fetch proxy status', err);
    }
  },

  checkHostsStatus: async () => {
    try {
      if (window.api?.hosts) {
        const domains = get().routes.map((r) => r.hostname);
        const hostsStatus = await window.api.hosts.checkStatus(domains);
        set({ hostsStatus });
      }
    } catch (err) {
      console.error('Failed to check hosts status', err);
    }
  },

  syncAllToHosts: async () => {
    set({ isSyncingHosts: true });
    try {
      if (!window.api?.hosts) throw new Error('Hosts API not available');
      const activeDomains = get().routes.filter((r) => r.enabled).map((r) => r.hostname);
      const res = await window.api.hosts.syncDomains(activeDomains);

      if (res.success) {
        toast.success(`Synchronized ${activeDomains.length} domains to System Hosts file and flushed DNS!`);
        await get().checkHostsStatus();
        return true;
      } else {
        toast.error(`Hosts sync error: ${res.error}`);
        return false;
      }
    } catch (err: any) {
      toast.error(`Failed to sync hosts: ${err.message}`);
      return false;
    } finally {
      set({ isSyncingHosts: false });
    }
  },

  syncSingleToHosts: async (domain: string) => {
    set({ isSyncingHosts: true });
    try {
      if (!window.api?.hosts) throw new Error('Hosts API not available');
      const currentMapped = await window.api.hosts.getMappedDomains();
      const newDomains = [...new Set([...currentMapped, domain.trim().toLowerCase()])];
      const res = await window.api.hosts.syncDomains(newDomains);

      if (res.success) {
        toast.success(`Added ${domain} to System Hosts file`);
        await get().checkHostsStatus();
        return true;
      } else {
        toast.error(`Hosts sync error: ${res.error}`);
        return false;
      }
    } catch (err: any) {
      toast.error(`Failed to update hosts: ${err.message}`);
      return false;
    } finally {
      set({ isSyncingHosts: false });
    }
  },

  clearHosts: async () => {
    set({ isSyncingHosts: true });
    try {
      if (!window.api?.hosts) throw new Error('Hosts API not available');
      const res = await window.api.hosts.clearDomains();
      if (res.success) {
        toast.info('Removed all ProjectYB entries from Hosts file');
        await get().checkHostsStatus();
        return true;
      } else {
        toast.error(`Failed to clear hosts: ${res.error}`);
        return false;
      }
    } catch (err: any) {
      toast.error(`Failed to clear hosts: ${err.message}`);
      return false;
    } finally {
      set({ isSyncingHosts: false });
    }
  },

  startProxy: async (httpPort = 8080, httpsPort = 8443) => {
    set({ isLoading: true });
    try {
      if (window.api?.proxy) {
        await window.api.proxy.setRoutes(get().routes);
        const res = await window.api.proxy.start(httpPort, httpsPort);
        if (res.success) {
          toast.success(`Local Reverse Proxy active on :${httpPort} (HTTP) and :${httpsPort} (HTTPS)`);
          await get().fetchStatus();
        } else {
          toast.error(`Proxy start error: ${res.error}`);
        }
      }
    } catch (err: any) {
      toast.error(`Failed to start proxy: ${err.message}`);
    } finally {
      set({ isLoading: false });
    }
  },

  stopProxy: async () => {
    set({ isLoading: true });
    try {
      if (window.api?.proxy) {
        await window.api.proxy.stop();
        toast.info('Local Reverse Proxy stopped');
        await get().fetchStatus();
      }
    } catch (err: any) {
      toast.error(`Failed to stop proxy: ${err.message}`);
    } finally {
      set({ isLoading: false });
    }
  },

  addRoute: async (data, autoSyncHosts = false) => {
    const newRoute: ProxyRoute = {
      ...data,
      id: `route-${Date.now()}`,
      requestCount: 0,
      createdAt: new Date().toISOString()
    };
    const updated = [...get().routes, newRoute];
    set({ routes: updated, isEditorOpen: false });
    if (window.api?.store) await window.api.store.set('proxy:routes', updated);
    if (window.api?.proxy) await window.api.proxy.setRoutes(updated);
    toast.success(`Added proxy route for ${newRoute.hostname}`);

    if (autoSyncHosts) {
      await get().syncSingleToHosts(newRoute.hostname);
    } else {
      await get().checkHostsStatus();
    }
  },

  updateRoute: async (id, updates) => {
    const updated = get().routes.map((r) => (r.id === id ? { ...r, ...updates } : r));
    set({ routes: updated, isEditorOpen: false });
    if (window.api?.store) await window.api.store.set('proxy:routes', updated);
    if (window.api?.proxy) await window.api.proxy.setRoutes(updated);
    toast.success('Updated proxy route');
    await get().checkHostsStatus();
  },

  deleteRoute: async (id) => {
    const updated = get().routes.filter((r) => r.id !== id);
    set({ routes: updated });
    if (window.api?.store) await window.api.store.set('proxy:routes', updated);
    if (window.api?.proxy) await window.api.proxy.setRoutes(updated);
    toast.info('Deleted proxy route');
    await get().checkHostsStatus();
  },

  toggleRoute: async (id) => {
    const route = get().routes.find((r) => r.id === id);
    if (!route) return;
    await get().updateRoute(id, { enabled: !route.enabled });
  },

  openEditor: (route) => set({ isEditorOpen: true, editingRoute: route }),
  closeEditor: () => set({ isEditorOpen: false, editingRoute: undefined })
}));
