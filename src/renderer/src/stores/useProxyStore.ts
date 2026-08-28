import { create } from 'zustand';
import { toast } from 'sonner';
import type { ProxyRoute, ProxyStatus } from '../types/proxy';

interface ProxyState {
  routes: ProxyRoute[];
  status: ProxyStatus;
  isLoading: boolean;
  isEditorOpen: boolean;
  editingRoute?: ProxyRoute;

  // Actions
  fetchStatus: () => Promise<void>;
  startProxy: (httpPort?: number, httpsPort?: number) => Promise<void>;
  stopProxy: () => Promise<void>;
  addRoute: (route: Omit<ProxyRoute, 'id' | 'createdAt' | 'requestCount'>) => Promise<void>;
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
  isLoading: false,
  isEditorOpen: false,

  fetchStatus: async () => {
    try {
      if (window.api?.proxy) {
        const status = await window.api.proxy.getStatus();
        const savedRoutes = (await window.api.store?.get('proxy:routes')) as ProxyRoute[] | undefined;
        const routes = savedRoutes && savedRoutes.length > 0 ? savedRoutes : get().routes;
        set({ status, routes });
      }
    } catch (err) {
      console.error('Failed to fetch proxy status', err);
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

  addRoute: async (data) => {
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
  },

  updateRoute: async (id, updates) => {
    const updated = get().routes.map((r) => (r.id === id ? { ...r, ...updates } : r));
    set({ routes: updated, isEditorOpen: false });
    if (window.api?.store) await window.api.store.set('proxy:routes', updated);
    if (window.api?.proxy) await window.api.proxy.setRoutes(updated);
    toast.success('Updated proxy route');
  },

  deleteRoute: async (id) => {
    const updated = get().routes.filter((r) => r.id !== id);
    set({ routes: updated });
    if (window.api?.store) await window.api.store.set('proxy:routes', updated);
    if (window.api?.proxy) await window.api.proxy.setRoutes(updated);
    toast.info('Deleted proxy route');
  },

  toggleRoute: async (id) => {
    const route = get().routes.find((r) => r.id === id);
    if (!route) return;
    await get().updateRoute(id, { enabled: !route.enabled });
  },

  openEditor: (route) => set({ isEditorOpen: true, editingRoute: route }),
  closeEditor: () => set({ isEditorOpen: false, editingRoute: undefined })
}));
