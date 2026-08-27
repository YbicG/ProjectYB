import { create } from 'zustand';
import { HttpMethod, KeyValuePair, HttpRequestRecord, HttpResponseData, HttpHistoryItem } from '../types/http';

interface HttpState {
  currentMethod: HttpMethod;
  currentUrl: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: string;
  activeSubTab: 'params' | 'headers' | 'body' | 'auth';
  authType: 'none' | 'bearer' | 'basic';
  bearerToken: string;
  basicUser: string;
  basicPass: string;

  isLoading: boolean;
  activeResponse: HttpResponseData | null;
  history: HttpHistoryItem[];
  savedRequests: HttpRequestRecord[];

  // Actions
  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setHeaders: (headers: KeyValuePair[]) => void;
  setParams: (params: KeyValuePair[]) => void;
  setBody: (body: string) => void;
  setActiveSubTab: (tab: 'params' | 'headers' | 'body' | 'auth') => void;
  setAuth: (auth: { authType: 'none' | 'bearer' | 'basic'; bearerToken?: string; basicUser?: string; basicPass?: string }) => void;
  loadSavedRequest: (record: HttpRequestRecord) => void;
  sendRequest: () => Promise<void>;
  saveCurrentRequest: (name: string) => Promise<void>;
  deleteSavedRequest: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadHistoryAndSaved: () => Promise<void>;
}

export const useHttpStore = create<HttpState>((set, get) => ({
  currentMethod: 'GET',
  currentUrl: 'http://localhost:3000/api/health',
  headers: [
    { id: '1', key: 'Accept', value: 'application/json', enabled: true }
  ],
  params: [],
  body: '{\n  "query": "test"\n}',
  activeSubTab: 'params',
  authType: 'none',
  bearerToken: '',
  basicUser: '',
  basicPass: '',

  isLoading: false,
  activeResponse: null,
  history: [],
  savedRequests: [],

  setMethod: (method) => set({ currentMethod: method }),
  setUrl: (url) => set({ currentUrl: url }),
  setHeaders: (headers) => set({ headers }),
  setParams: (params) => set({ params }),
  setBody: (body) => set({ body }),
  setActiveSubTab: (activeSubTab) => set({ activeSubTab }),
  setAuth: (auth) => set((state) => ({ ...state, ...auth })),

  loadSavedRequest: (record) => {
    set({
      currentMethod: record.method,
      currentUrl: record.url,
      headers: record.headers,
      params: record.params,
      body: record.body,
      authType: record.authType,
      bearerToken: record.bearerToken || '',
      basicUser: record.basicUser || '',
      basicPass: record.basicPass || ''
    });
  },

  sendRequest: async () => {
    const { currentMethod, currentUrl, headers, params, body, authType, bearerToken, basicUser, basicPass } = get();
    if (!currentUrl.trim()) return;

    set({ isLoading: true, activeResponse: null });

    // Prepare headers object
    const finalHeaders: Record<string, string> = {};
    headers.forEach((h) => {
      if (h.enabled && h.key.trim()) {
        finalHeaders[h.key.trim()] = h.value;
      }
    });

    // Add Auth header if configured
    if (authType === 'bearer' && bearerToken.trim()) {
      finalHeaders['Authorization'] = `Bearer ${bearerToken.trim()}`;
    } else if (authType === 'basic' && (basicUser || basicPass)) {
      const credentials = btoa(`${basicUser}:${basicPass}`);
      finalHeaders['Authorization'] = `Basic ${credentials}`;
    }

    // Prepare query params
    const queryParams: Record<string, string> = {};
    params.forEach((p) => {
      if (p.enabled && p.key.trim()) {
        queryParams[p.key.trim()] = p.value;
      }
    });

    try {
      const res = await window.api.http.sendRequest({
        method: currentMethod,
        url: currentUrl,
        headers: finalHeaders,
        queryParams,
        body: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(currentMethod) ? body : undefined
      });

      const responseData: HttpResponseData = {
        ...res,
        timestamp: Date.now()
      };

      const requestSnapshot: HttpRequestRecord = {
        id: `req_${Date.now()}`,
        name: `${currentMethod} ${currentUrl.split('?')[0]}`,
        method: currentMethod,
        url: currentUrl,
        headers,
        params,
        body,
        authType,
        bearerToken,
        basicUser,
        basicPass,
        createdAt: Date.now()
      };

      const historyItem: HttpHistoryItem = {
        id: `hist_${Date.now()}`,
        request: requestSnapshot,
        response: responseData
      };

      set((state) => {
        const nextHistory = [historyItem, ...state.history].slice(0, 50);
        return { activeResponse: responseData, history: nextHistory, isLoading: false };
      });

      try {
        await window.api?.store?.set('http:history', get().history);
      } catch {}
    } catch (err: any) {
      set({
        isLoading: false,
        activeResponse: {
          status: 0,
          statusText: 'Client Error',
          headers: {},
          body: '',
          isJson: false,
          durationMs: 0,
          sizeBytes: 0,
          error: err.message || 'Request failed',
          timestamp: Date.now()
        }
      });
    }
  },

  saveCurrentRequest: async (name: string) => {
    const { currentMethod, currentUrl, headers, params, body, authType, bearerToken, basicUser, basicPass } = get();
    const newRecord: HttpRequestRecord = {
      id: `saved_${Date.now()}`,
      name: name || `${currentMethod} ${currentUrl}`,
      method: currentMethod,
      url: currentUrl,
      headers,
      params,
      body,
      authType,
      bearerToken,
      basicUser,
      basicPass,
      createdAt: Date.now()
    };

    const nextSaved = [newRecord, ...get().savedRequests];
    set({ savedRequests: nextSaved });
    try {
      await window.api?.store?.set('http:savedRequests', nextSaved);
    } catch {}
  },

  deleteSavedRequest: async (id: string) => {
    const next = get().savedRequests.filter((r) => r.id !== id);
    set({ savedRequests: next });
    try {
      await window.api?.store?.set('http:savedRequests', next);
    } catch {}
  },

  clearHistory: async () => {
    set({ history: [] });
    try {
      await window.api?.store?.set('http:history', []);
    } catch {}
  },

  loadHistoryAndSaved: async () => {
    if (!window.api?.store) return;
    try {
      const history = (await window.api.store.get('http:history')) as HttpHistoryItem[];
      const saved = (await window.api.store.get('http:savedRequests')) as HttpRequestRecord[];
      if (history) set({ history });
      if (saved) set({ savedRequests: saved });
    } catch {}
  }
}));
