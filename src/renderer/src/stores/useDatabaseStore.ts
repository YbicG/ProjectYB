import { create } from 'zustand';
import { DatabaseConnection, QueryResult, TableSchema, RedisKeyItem } from '../types/database';
import { useProjectStore } from './useProjectStore';
import { useNotificationStore } from './useNotificationStore';
import { toast } from 'sonner';

interface DatabaseState {
  connections: DatabaseConnection[];
  selectedConnectionId: string | null;
  activeConnection: DatabaseConnection | null;
  activeSchema: TableSchema[];
  queryText: string;
  queryResult: QueryResult | null;
  redisKeys: RedisKeyItem[];
  isExecuting: boolean;
  isDiscovering: boolean;
  connectionModalOpen: boolean;

  // Actions
  discoverConnections: () => Promise<void>;
  selectConnection: (id: string) => Promise<void>;
  addManualConnection: (conn: Omit<DatabaseConnection, 'id' | 'createdAt'>) => Promise<void>;
  removeConnection: (id: string) => void;
  setQueryText: (text: string) => void;
  executeQuery: (query?: string) => Promise<QueryResult | null>;
  loadSchema: (conn?: DatabaseConnection) => Promise<void>;
  loadRedisKeys: (pattern?: string) => Promise<void>;
  setConnectionModalOpen: (open: boolean) => void;
  exportCsv: () => void;
  exportJson: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  connections: [],
  selectedConnectionId: null,
  activeConnection: null,
  activeSchema: [],
  queryText: 'SELECT * FROM sqlite_master LIMIT 25;',
  queryResult: null,
  redisKeys: [],
  isExecuting: false,
  isDiscovering: false,
  connectionModalOpen: false,

  discoverConnections: async () => {
    if (!window.api?.database) return;
    set({ isDiscovering: true });
    try {
      const { projects } = useProjectStore.getState();
      const discovered = await window.api.database.discoverConnections(
        projects.map((p) => ({ id: p.id, name: p.name, path: p.path }))
      );

      // Load saved custom connections
      let saved: DatabaseConnection[] = [];
      try {
        saved = (await window.api?.store?.get('database:connections')) || [];
      } catch {}

      // Deduplicate
      const all = [...saved, ...discovered.filter((d) => !saved.some((s) => s.id === d.id))];
      set({
        connections: all,
        isDiscovering: false,
        selectedConnectionId: get().selectedConnectionId || (all.length > 0 ? all[0].id : null),
        activeConnection: get().activeConnection || (all.length > 0 ? all[0] : null)
      });

      if (all.length > 0 && !get().activeSchema.length) {
        get().loadSchema(all[0]);
      }
    } catch {
      set({ isDiscovering: false });
    }
  },

  selectConnection: async (id) => {
    const conn = get().connections.find((c) => c.id === id) || null;
    set({
      selectedConnectionId: id,
      activeConnection: conn,
      queryResult: null,
      queryText:
        conn?.engine === 'redis'
          ? 'KEYS *'
          : conn?.engine === 'sqlite'
          ? 'SELECT * FROM sqlite_master LIMIT 25;'
          : 'SELECT NOW();'
    });

    if (conn) {
      if (conn.engine === 'redis') {
        get().loadRedisKeys();
      } else {
        get().loadSchema(conn);
      }
    }
  },

  addManualConnection: async (connData) => {
    const newConn: DatabaseConnection = {
      ...connData,
      id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: Date.now()
    };

    const updated = [newConn, ...get().connections];
    set({
      connections: updated,
      selectedConnectionId: newConn.id,
      activeConnection: newConn,
      connectionModalOpen: false
    });

    try {
      if (window.api?.store) {
        await window.api.store.set(
          'database:connections',
          updated.filter((c) => c.source === 'manual')
        );
      }
    } catch {}

    toast.success(`Connected to ${newConn.name}`);
    useNotificationStore.getState().notify({
      title: 'Database Added',
      message: `Registered connection for "${newConn.name}" (${newConn.engine})`,
      type: 'success',
      category: 'projects'
    });

    get().loadSchema(newConn);
  },

  removeConnection: (id) => {
    const remaining = get().connections.filter((c) => c.id !== id);
    set({
      connections: remaining,
      selectedConnectionId: remaining.length > 0 ? remaining[0].id : null,
      activeConnection: remaining.length > 0 ? remaining[0] : null
    });

    try {
      if (window.api?.store) {
        window.api.store.set(
          'database:connections',
          remaining.filter((c) => c.source === 'manual')
        );
      }
    } catch {}
    toast.info('Connection removed');
  },

  setQueryText: (text) => set({ queryText: text }),

  executeQuery: async (customQuery) => {
    const conn = get().activeConnection;
    if (!conn || !window.api?.database) {
      toast.error('No active database connection selected');
      return null;
    }

    const q = customQuery || get().queryText;
    set({ isExecuting: true });

    try {
      const result = await window.api.database.executeQuery(conn, q);
      set({ queryResult: result, isExecuting: false });

      if (result.error) {
        toast.error(`Query Error: ${result.error}`);
      } else {
        toast.success(`Returned ${result.rowCount} rows (${result.durationMs}ms)`);
      }
      return result;
    } catch (err: any) {
      const errResult: QueryResult = {
        columns: ['error'],
        rows: [{ error: err.message }],
        rowCount: 0,
        durationMs: 0,
        error: err.message
      };
      set({ queryResult: errResult, isExecuting: false });
      toast.error(`Execution failed: ${err.message}`);
      return errResult;
    }
  },

  loadSchema: async (conn) => {
    const target = conn || get().activeConnection;
    if (!target || !window.api?.database) return;

    try {
      const schema = await window.api.database.getSchema(target);
      set({ activeSchema: schema || [] });
    } catch {
      set({ activeSchema: [] });
    }
  },

  loadRedisKeys: async (pattern = '*') => {
    const conn = get().activeConnection;
    if (!conn || conn.engine !== 'redis' || !window.api?.database) return;

    try {
      const keys = await window.api.database.getRedisKeys(conn, pattern);
      set({ redisKeys: keys || [] });
    } catch {
      set({ redisKeys: [] });
    }
  },

  setConnectionModalOpen: (open) => set({ connectionModalOpen: open }),

  exportCsv: () => {
    const { queryResult } = get();
    if (!queryResult || queryResult.rows.length === 0) {
      toast.error('No query results to export');
      return;
    }

    const headers = queryResult.columns.join(',');
    const rows = queryResult.rows.map((r) =>
      queryResult.columns.map((col) => `"${(r[col] ?? '').toString().replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  },

  exportJson: () => {
    const { queryResult } = get();
    if (!queryResult || queryResult.rows.length === 0) {
      toast.error('No query results to export');
      return;
    }

    const json = JSON.stringify(queryResult.rows, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_export_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to JSON');
  }
}));
