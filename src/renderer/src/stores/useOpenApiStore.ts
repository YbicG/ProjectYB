import { create } from 'zustand';
import type { OpenApiSpec, OpenApiEndpoint } from '../types/openapi';
import { toast } from 'sonner';

interface OpenApiState {
  currentSpec: OpenApiSpec | null;
  discoveredSpecs: string[];
  selectedTag: string | null;
  searchFilter: string;
  selectedEndpoint: OpenApiEndpoint | null;
  isLoading: boolean;
  specUrlInput: string;

  // Actions
  loadSpecFromFile: (filePath: string) => Promise<void>;
  loadSpecFromUrl: (url: string) => Promise<void>;
  discoverSpecsInProject: (projectPath: string) => Promise<void>;
  setSelectedTag: (tag: string | null) => void;
  setSearchFilter: (query: string) => void;
  setSelectedEndpoint: (endpoint: OpenApiEndpoint | null) => void;
  setSpecUrlInput: (url: string) => void;
}

const SAMPLE_SPEC: OpenApiSpec = {
  title: 'ProjectYB API Sandbox',
  version: '1.0.0',
  description: 'Interactive API Explorer sample specification.',
  servers: [{ url: 'http://localhost:3000', description: 'Local Development Server' }],
  tags: [{ name: 'Projects' }, { name: 'Terminals' }, { name: 'Tunnels' }],
  endpoints: [
    {
      path: '/api/v1/projects',
      method: 'get',
      summary: 'List all workspace projects',
      description: 'Returns array of scanned developer projects with metadata.',
      tags: ['Projects'],
      parameters: [{ name: 'limit', in: 'query', required: false, schema: { type: 'number' } }]
    },
    {
      path: '/api/v1/projects',
      method: 'post',
      summary: 'Register a new manual project',
      tags: ['Projects'],
      requestBody: {
        required: true,
        content: { 'application/json': { example: { name: 'My API', path: 'D:\\Code\\MyApi' } } }
      }
    },
    {
      path: '/api/v1/terminals/{id}/exec',
      method: 'post',
      summary: 'Execute command in terminal session',
      tags: ['Terminals'],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: {
        required: true,
        content: { 'application/json': { example: { command: 'npm test' } } }
      }
    },
    {
      path: '/api/v1/tunnels/launch',
      method: 'post',
      summary: 'Spawn a Cloudflare Public Tunnel',
      tags: ['Tunnels'],
      requestBody: {
        required: true,
        content: { 'application/json': { example: { port: 3000, name: 'Web Preview' } } }
      }
    }
  ]
};

export const useOpenApiStore = create<OpenApiState>((set, get) => ({
  currentSpec: SAMPLE_SPEC,
  discoveredSpecs: [],
  selectedTag: null,
  searchFilter: '',
  selectedEndpoint: SAMPLE_SPEC.endpoints[0] || null,
  isLoading: false,
  specUrlInput: '',

  loadSpecFromFile: async (filePath: string) => {
    set({ isLoading: true });
    try {
      if (window.api?.openapi) {
        const res = await window.api.openapi.loadFromFile(filePath);
        if (res.success && res.spec) {
          set({
            currentSpec: res.spec,
            selectedTag: null,
            selectedEndpoint: res.spec.endpoints[0] || null
          });
          toast.success(`Loaded OpenAPI spec: ${res.spec.title}`);
        } else {
          toast.error(`Failed to load spec: ${res.error}`);
        }
      }
    } catch (err: any) {
      toast.error(`Error loading spec: ${err.message}`);
    } finally {
      set({ isLoading: false });
    }
  },

  loadSpecFromUrl: async (url: string) => {
    if (!url.trim()) return;
    set({ isLoading: true });
    try {
      if (window.api?.openapi) {
        const res = await window.api.openapi.loadFromUrl(url.trim());
        if (res.success && res.spec) {
          set({
            currentSpec: res.spec,
            selectedTag: null,
            selectedEndpoint: res.spec.endpoints[0] || null
          });
          toast.success(`Fetched OpenAPI spec: ${res.spec.title}`);
        } else {
          toast.error(`Failed to fetch spec: ${res.error}`);
        }
      }
    } catch (err: any) {
      toast.error(`Error loading spec from URL: ${err.message}`);
    } finally {
      set({ isLoading: false });
    }
  },

  discoverSpecsInProject: async (projectPath: string) => {
    try {
      if (window.api?.openapi) {
        const found = await window.api.openapi.discover(projectPath);
        set({ discoveredSpecs: found || [] });
        if (found && found.length > 0) {
          get().loadSpecFromFile(found[0]);
        }
      }
    } catch (err) {
      console.error('Failed to discover OpenAPI specs in project', err);
    }
  },

  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setSearchFilter: (query) => set({ searchFilter: query }),
  setSelectedEndpoint: (endpoint) => set({ selectedEndpoint: endpoint }),
  setSpecUrlInput: (url) => set({ specUrlInput: url })
}));
