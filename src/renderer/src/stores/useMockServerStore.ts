import { create } from 'zustand';
import { MockRoute, WebhookEvent, MockServerStatus } from '../types/mock';
import { useNotificationStore } from './useNotificationStore';
import { toast } from 'sonner';

const DEFAULT_MOCK_ROUTES: MockRoute[] = [
  {
    id: 'route_users',
    name: 'Get Users List',
    path: '/api/v1/users',
    method: 'GET',
    statusCode: 200,
    responseBody: JSON.stringify(
      {
        data: [
          { id: 1, name: 'Alice Walker', role: 'admin' },
          { id: 2, name: 'Bob Stone', role: 'developer' }
        ],
        total: 2
      },
      null,
      2
    ),
    delayMs: 150,
    enabled: true
  },
  {
    id: 'route_checkout',
    name: 'Mock Checkout / Payment',
    path: '/api/v1/checkout',
    method: 'POST',
    statusCode: 201,
    responseBody: JSON.stringify(
      {
        success: true,
        orderId: 'ord_987654321',
        status: 'PAID'
      },
      null,
      2
    ),
    delayMs: 300,
    enabled: true
  }
];

interface MockServerState {
  status: MockServerStatus;
  routes: MockRoute[];
  webhooks: WebhookEvent[];
  selectedWebhook: WebhookEvent | null;
  routeEditorOpen: boolean;
  editingRoute: MockRoute | null;
  serverPort: number;

  // Actions
  startServer: (port?: number) => Promise<boolean>;
  stopServer: () => Promise<boolean>;
  loadServerState: () => Promise<void>;
  saveRoute: (route: MockRoute) => Promise<void>;
  deleteRoute: (id: string) => Promise<void>;
  toggleRoute: (id: string) => Promise<void>;
  clearWebhooks: () => Promise<void>;
  selectWebhook: (event: WebhookEvent | null) => void;
  openRouteEditor: (route?: MockRoute) => void;
  closeRouteEditor: () => void;
}

export const useMockServerStore = create<MockServerState>((set, get) => ({
  status: { running: false, port: 4100, routesCount: 2, webhooksCount: 0 },
  routes: DEFAULT_MOCK_ROUTES,
  webhooks: [],
  selectedWebhook: null,
  routeEditorOpen: false,
  editingRoute: null,
  serverPort: 4100,

  loadServerState: async () => {
    if (!window.api?.mockServer) return;

    try {
      const savedRoutes = (await window.api?.store?.get('mock:routes')) as MockRoute[] | undefined;
      const routes = savedRoutes && savedRoutes.length > 0 ? savedRoutes : DEFAULT_MOCK_ROUTES;
      set({ routes });
      window.api.mockServer.saveRoutes(routes);

      const status = await window.api.mockServer.getStatus();
      const logs = await window.api.mockServer.getWebhookLogs();
      set({ status, webhooks: logs || [] });
    } catch {}

    if (window.api?.mockServer?.onWebhookReceived) {
      window.api.mockServer.onWebhookReceived((event) => {
        set((state) => {
          const updated = [event, ...state.webhooks].slice(0, 100);
          return {
            webhooks: updated,
            selectedWebhook: state.selectedWebhook || event
          };
        });

        toast.info(`Webhook received: ${event.method} ${event.path}`);
        useNotificationStore.getState().notify({
          title: 'Webhook Received',
          message: `${event.method} ${event.path} from ${event.ip}`,
          type: 'info',
          category: 'network'
        });
      });
    }
  },

  startServer: async (port) => {
    if (!window.api?.mockServer) return false;
    const targetPort = port || get().serverPort;

    try {
      const res = await window.api.mockServer.start(targetPort);
      if (res.success) {
        set((state) => ({
          status: { ...state.status, running: true, port: res.port },
          serverPort: res.port
        }));
        toast.success(`Mock Server listening on http://localhost:${res.port}`);
        return true;
      } else {
        toast.error(`Failed to start Mock Server: ${res.error}`);
        return false;
      }
    } catch (err: any) {
      toast.error(`Mock server error: ${err.message}`);
      return false;
    }
  },

  stopServer: async () => {
    if (!window.api?.mockServer) return false;
    try {
      await window.api.mockServer.stop();
      set((state) => ({ status: { ...state.status, running: false } }));
      toast.info('Mock Server stopped');
      return true;
    } catch {
      return false;
    }
  },

  saveRoute: async (route) => {
    const { routes } = get();
    const exists = routes.some((r) => r.id === route.id);
    const updated = exists ? routes.map((r) => (r.id === route.id ? route : r)) : [route, ...routes];

    set({ routes: updated, routeEditorOpen: false, editingRoute: null });

    if (window.api?.mockServer) {
      await window.api.mockServer.saveRoutes(updated);
    }
    if (window.api?.store) {
      await window.api.store.set('mock:routes', updated);
    }
    toast.success(`Route ${route.method} ${route.path} saved`);
  },

  deleteRoute: async (id) => {
    const remaining = get().routes.filter((r) => r.id !== id);
    set({ routes: remaining });

    if (window.api?.mockServer) {
      await window.api.mockServer.saveRoutes(remaining);
    }
    if (window.api?.store) {
      await window.api.store.set('mock:routes', remaining);
    }
    toast.info('Route removed');
  },

  toggleRoute: async (id) => {
    const updated = get().routes.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    set({ routes: updated });
    if (window.api?.mockServer) {
      await window.api.mockServer.saveRoutes(updated);
    }
    if (window.api?.store) {
      await window.api.store.set('mock:routes', updated);
    }
  },

  clearWebhooks: async () => {
    if (window.api?.mockServer) {
      await window.api.mockServer.clearLogs();
    }
    set({ webhooks: [], selectedWebhook: null });
    toast.info('Webhook logs cleared');
  },

  selectWebhook: (event) => set({ selectedWebhook: event }),

  openRouteEditor: (route) => {
    set({
      routeEditorOpen: true,
      editingRoute:
        route || {
          id: `route_${Date.now()}`,
          name: 'New Mock Endpoint',
          path: '/api/v1/resource',
          method: 'GET',
          statusCode: 200,
          responseBody: JSON.stringify({ message: 'Hello from ProjectYB Mock API' }, null, 2),
          delayMs: 0,
          enabled: true
        }
    });
  },

  closeRouteEditor: () => set({ routeEditorOpen: false, editingRoute: null })
}));
