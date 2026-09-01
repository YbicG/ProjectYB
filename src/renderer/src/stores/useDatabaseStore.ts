import { create } from 'zustand';
import { DatabaseConnection, QueryResult, TableSchema, RedisKeyItem } from '../types/database';
import { useProjectStore } from './useProjectStore';
import { useNotificationStore } from './useNotificationStore';
import { toast } from 'sonner';

export type DatabaseGroupBy = 'project' | 'engine' | 'flat';

interface DatabaseState {
  connections: DatabaseConnection[];
  selectedConnectionId: string | null;
  activeConnection: DatabaseConnection | null;
  activeSchema: TableSchema[];
  selectedTable: TableSchema | null;
  queryText: string;
  queryResult: QueryResult | null;
  redisKeys: RedisKeyItem[];
  selectedRedisKey: RedisKeyItem | null;
  selectedRedisValue: string | null;
  connectionStatus: Record<string, { success: boolean; message: string; pingMs?: number }>;
  isExecuting: boolean;
  isDiscovering: boolean;
  isSchemaLoading: boolean;
  isPinging: boolean;
  connectionModalOpen: boolean;
  groupBy: DatabaseGroupBy;
  filterEngine: string;
  searchQuery: string;
  schemaSearch: string;
  resultSearch: string;
  page: number;
  pageSize: number;

  // Actions
  setGroupBy: (groupBy: DatabaseGroupBy) => void;
  setFilterEngine: (engine: string) => void;
  setSearchQuery: (q: string) => void;
  setSchemaSearch: (q: string) => void;
  setResultSearch: (q: string) => void;
  setPage: (p: number) => void;
  setPageSize: (size: number) => void;
  discoverConnections: () => Promise<void>;
  selectConnection: (id: string) => Promise<void>;
  selectTable: (table: TableSchema) => void;
  addManualConnection: (conn: Omit<DatabaseConnection, 'id' | 'createdAt'>) => Promise<void>;
  removeConnection: (id: string) => void;
  setQueryText: (text: string) => void;
  executeQuery: (query?: string) => Promise<QueryResult | null>;
  loadSchema: (conn?: DatabaseConnection) => Promise<void>;
  loadRedisKeys: (pattern?: string) => Promise<void>;
  inspectRedisKey: (key: string) => Promise<void>;
  testActiveConnection: () => Promise<void>;
  setConnectionModalOpen: (open: boolean) => void;
  exportCsv: () => void;
  exportJson: () => void;
}

export const useDatabaseStore = create<DatabaseState>((set, get) => ({
  connections: [],
  selectedConnectionId: null,
  activeConnection: null,
  activeSchema: [],
  selectedTable: null,
  queryText: 'SELECT * FROM sqlite_master LIMIT 25;',
  queryResult: null,
  redisKeys: [],
  selectedRedisKey: null,
  selectedRedisValue: null,
  connectionStatus: {},
  isExecuting: false,
  isDiscovering: false,
  isSchemaLoading: false,
  isPinging: false,
  connectionModalOpen: false,
  groupBy: 'project',
  filterEngine: 'all',
  searchQuery: '',
  schemaSearch: '',
  resultSearch: '',
  page: 1,
  pageSize: 25,

  setGroupBy: (groupBy) => set({ groupBy }),
  setFilterEngine: (filterEngine) => set({ filterEngine }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSchemaSearch: (schemaSearch) => set({ schemaSearch }),
  setResultSearch: (resultSearch) => set({ resultSearch, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  discoverConnections: async () => {
    if (!window.api?.database) return;
    set({ isDiscovering: true });
    try {
      const { projects } = useProjectStore.getState();
      const discovered = await window.api.database.discoverConnections(
        projects.map((p) => ({ id: p.id, name: p.name, path: p.path }))
      );

      let saved: DatabaseConnection[] = [];
      try {
        saved = (await window.api?.store?.get('database:connections')) || [];
      } catch {}

      const all = [...saved, ...discovered.filter((d) => !saved.some((s) => s.id === d.id))];
      const currentActive = get().activeConnection;
      const nextActive = currentActive ? all.find((c) => c.id === currentActive.id) || all[0] : all[0] || null;

      set({
        connections: all,
        isDiscovering: false,
        selectedConnectionId: nextActive ? nextActive.id : null,
        activeConnection: nextActive
      });

      if (nextActive) {
        get().selectConnection(nextActive.id);
      }
    } catch {
      set({ isDiscovering: false });
    }
  },

  selectConnection: async (id) => {
    const conn = get().connections.find((c) => c.id === id) || null;
    if (!conn) return;

    const defaultQuery =
      conn.engine === 'redis'
        ? 'KEYS *'
        : conn.engine === 'sqlite'
        ? 'SELECT name, type FROM sqlite_master WHERE type="table";'
        : 'SELECT NOW();';

    set({
      selectedConnectionId: id,
      activeConnection: conn,
      selectedTable: null,
      queryResult: null,
      queryText: defaultQuery,
      page: 1,
      resultSearch: ''
    });

    if (conn.engine === 'redis') {
      get().loadRedisKeys();
    } else {
      get().loadSchema(conn);
    }

    get().testActiveConnection();
  },

  selectTable: (table) => {
    const conn = get().activeConnection;
    set({ selectedTable: table });

    if (conn?.engine === 'sqlite' || conn?.engine === 'postgres' || conn?.engine === 'mysql') {
      const query = 'SELECT * FROM "' + table.name + '" LIMIT 50;';
      set({ queryText: query });
      get().executeQuery(query);
    } else if (conn?.engine === 'mongodb') {
      const query = 'db.' + table.name + '.find().limit(50)';
      set({ queryText: query });
      get().executeQuery(query);
    }
  },

  testActiveConnection: async () => {
    const conn = get().activeConnection;
    if (!conn || !window.api?.database) return;

    set({ isPinging: true });
    try {
      const res = await window.api.database.testConnection(conn);
      set((s) => ({
        isPinging: false,
        connectionStatus: {
          ...s.connectionStatus,
          [conn.id]: res
        }
      }));
    } catch (e: any) {
      set((s) => ({
        isPinging: false,
        connectionStatus: {
          ...s.connectionStatus,
          [conn.id]: { success: false, message: e.message }
        }
      }));
    }
  },

  addManualConnection: async (connData) => {
    const newConn: DatabaseConnection = {
      ...connData,
      id: 'conn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
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

    toast.success('Added ' + newConn.name);
    useNotificationStore.getState().notify({
      title: 'Database Registered',
      message: 'Added connection "' + newConn.name + '" (' + newConn.engine.toUpperCase() + ')',
      type: 'success',
      category: 'projects'
    });

    get().selectConnection(newConn.id);
  },

  removeConnection: (id) => {
    const remaining = get().connections.filter((c) => c.id !== id);
    const nextActive = remaining.length > 0 ? remaining[0] : null;
    set({
      connections: remaining,
      selectedConnectionId: nextActive ? nextActive.id : null,
      activeConnection: nextActive
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
    set({ isExecuting: true, page: 1 });

    try {
      const result = await window.api.database.executeQuery(conn, q);
      set({ queryResult: result, isExecuting: false });

      if (result.error) {
        toast.error('Query Error: ' + result.error);
      } else {
        toast.success('Returned ' + result.rowCount + ' rows (' + result.durationMs + 'ms)');
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
      toast.error('Execution failed: ' + err.message);
      return errResult;
    }
  },

  loadSchema: async (conn) => {
    const target = conn || get().activeConnection;
    if (!target || !window.api?.database) return;

    set({ isSchemaLoading: true });
    try {
      const schema = await window.api.database.getSchema(target);
      set({ activeSchema: schema || [], isSchemaLoading: false });
    } catch {
      set({ activeSchema: [], isSchemaLoading: false });
    }
  },

  loadRedisKeys: async (pattern = '*') => {
    const conn = get().activeConnection;
    if (!conn || conn.engine !== 'redis' || !window.api?.database) return;

    try {
      const keys = await window.api.database.getRedisKeys(conn, pattern);
      set({ redisKeys: keys || [], selectedRedisKey: null, selectedRedisValue: null });
    } catch {
      set({ redisKeys: [] });
    }
  },

  inspectRedisKey: async (key) => {
    const conn = get().activeConnection;
    if (!conn || conn.engine !== 'redis' || !window.api?.database) return;

    const keyItem = get().redisKeys.find((k) => k.key === key) || { key, type: 'string', ttl: -1 };
    set({ selectedRedisKey: keyItem });

    try {
      const res = await window.api.database.executeQuery(conn, 'GET ' + key);
      if (res && res.rows && res.rows[0]) {
        set({ selectedRedisValue: res.rows[0].response || '' });
      }
    } catch {
      set({ selectedRedisValue: 'Error loading value' });
    }
  },

  setConnectionModalOpen: (open) => set({ connectionModalOpen: open }),

  exportCsv: () => {
    const result = get().queryResult;
    if (!result || result.rows.length === 0) {
      toast.error('No rows to export');
      return;
    }

    const headers = result.columns.join(',');
    const rows = result.rows.map((row) =>
      result.columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return '"' + str.replace(/"/g, '""') + '"';
        })
        .join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'query_export_' + Date.now() + '.csv');
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  },

  exportJson: () => {
    const result = get().queryResult;
    if (!result || result.rows.length === 0) {
      toast.error('No rows to export');
      return;
    }

    const jsonStr = JSON.stringify(result.rows, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'query_export_' + Date.now() + '.json');
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to JSON');
  }
}));
