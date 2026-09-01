import { create } from 'zustand';
import { SecretVaultItem, SecretEnvironment, SecretCategory } from '../types/secret';
import { toast } from 'sonner';

interface SecretVaultState {
  secrets: SecretVaultItem[];
  filterCategory: string;
  filterEnvironment: string;
  searchQuery: string;
  isLoaded: boolean;
  vaultModalOpen: boolean;

  // Actions
  setFilterCategory: (cat: string) => void;
  setFilterEnvironment: (env: string) => void;
  setSearchQuery: (q: string) => void;
  setVaultModalOpen: (open: boolean) => void;
  loadSecrets: () => Promise<void>;
  addSecret: (secret: Omit<SecretVaultItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SecretVaultItem>;
  updateSecret: (id: string, updates: Partial<Omit<SecretVaultItem, 'id' | 'createdAt'>>) => Promise<void>;
  deleteSecret: (id: string) => Promise<void>;
  getSecretByKey: (key: string, env?: SecretEnvironment) => SecretVaultItem | undefined;
  bulkSyncToEnv: (envEntries: Array<{ key: string; value: string }>, targetEnv?: SecretEnvironment) => Record<string, string>;
  exportVaultToTemplate: () => string;
  importSecretsFromTemplate: (templateContent: string, defaultCategory?: SecretCategory, defaultEnv?: SecretEnvironment) => Promise<number>;
}

export const useSecretVaultStore = create<SecretVaultState>((set, get) => ({
  secrets: [],
  filterCategory: 'all',
  filterEnvironment: 'all',
  searchQuery: '',
  isLoaded: false,
  vaultModalOpen: false,

  setFilterCategory: (filterCategory) => set({ filterCategory }),
  setFilterEnvironment: (filterEnvironment) => set({ filterEnvironment }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setVaultModalOpen: (vaultModalOpen) => set({ vaultModalOpen }),

  loadSecrets: async () => {
    try {
      if (window.api?.store) {
        const stored = (await window.api.store.get('vault:secrets')) as SecretVaultItem[];
        if (stored && Array.isArray(stored)) {
          set({ secrets: stored, isLoaded: true });
          return;
        }
      }
    } catch {}

    const defaults: SecretVaultItem[] = [
      {
        id: 'sec_sample_openai',
        key: 'OPENAI_API_KEY',
        value: 'sk-proj-example1234567890abcdef',
        category: 'ai',
        environment: 'all',
        description: 'Global OpenAI API Key for AI Agents and Chat',
        tags: ['openai', 'ai', 'llm'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'sec_sample_db',
        key: 'DATABASE_URL',
        value: 'postgresql://postgres:postgres@localhost:5432/my_dev_db',
        category: 'database',
        environment: 'dev',
        description: 'Local development PostgreSQL instance',
        tags: ['postgres', 'local'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      {
        id: 'sec_sample_jwt',
        key: 'JWT_SECRET',
        value: 'super_secure_vault_jwt_secret_key_2026_xyz',
        category: 'auth',
        environment: 'all',
        description: 'Default JWT signing key',
        tags: ['auth', 'jwt'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    set({ secrets: defaults, isLoaded: true });
  },

  addSecret: async (secretData) => {
    const newSecret: SecretVaultItem = {
      ...secretData,
      id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      key: secretData.key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const existingIndex = get().secrets.findIndex((s) => s.key === newSecret.key && s.environment === newSecret.environment);
    let updated: SecretVaultItem[];

    if (existingIndex >= 0) {
      updated = [...get().secrets];
      updated[existingIndex] = { ...updated[existingIndex], ...newSecret, updatedAt: Date.now() };
    } else {
      updated = [newSecret, ...get().secrets];
    }

    set({ secrets: updated });

    try {
      if (window.api?.store) {
        await window.api.store.set('vault:secrets', updated);
      }
    } catch {}

    toast.success('Saved secret: ' + newSecret.key);
    return newSecret;
  },

  updateSecret: async (id, updates) => {
    const updated = get().secrets.map((s) =>
      s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
    );
    set({ secrets: updated });

    try {
      if (window.api?.store) {
        await window.api.store.set('vault:secrets', updated);
      }
    } catch {}
    toast.success('Updated secret in vault');
  },

  deleteSecret: async (id) => {
    const updated = get().secrets.filter((s) => s.id !== id);
    set({ secrets: updated });

    try {
      if (window.api?.store) {
        await window.api.store.set('vault:secrets', updated);
      }
    } catch {}
    toast.info('Secret removed from vault');
  },

  getSecretByKey: (key, env = 'all') => {
    const normalized = key.trim().toUpperCase();
    const secrets = get().secrets;
    return secrets.find((s) => s.key === normalized && (s.environment === env || s.environment === 'all')) ||
           secrets.find((s) => s.key === normalized);
  },

  bulkSyncToEnv: (envEntries, targetEnv = 'all') => {
    const secrets = get().secrets;
    const syncedMap: Record<string, string> = {};

    for (const entry of envEntries) {
      const match = secrets.find(
        (s) =>
          s.key === entry.key &&
          (targetEnv === 'all' || s.environment === targetEnv || s.environment === 'all')
      );
      if (match && match.value) {
        syncedMap[entry.key] = match.value;
      }
    }

    return syncedMap;
  },

  exportVaultToTemplate: () => {
    const secrets = get().secrets;
    return secrets
      .map((s) => '# ' + (s.description || s.category.toUpperCase()) + ' (' + s.environment + ')\n' + s.key + '=' + s.value)
      .join('\n\n');
  },

  importSecretsFromTemplate: async (templateContent: string, defaultCategory: SecretCategory = 'custom', defaultEnv: SecretEnvironment = 'all') => {
    const lines = templateContent.split(/\r?\n/);
    const newItems: SecretVaultItem[] = [];
    let currentComment = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        currentComment = '';
        continue;
      }
      if (trimmed.startsWith('#')) {
        currentComment = trimmed.replace(/^#\s?/, '');
        continue;
      }

      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
        let value = trimmed.substring(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        if (key && value) {
          const category: SecretCategory =
            key.includes('AI') || key.includes('OPENAI') || key.includes('CLAUDE') || key.includes('GEMINI') || key.includes('OLLAMA') ? 'ai' :
            key.includes('DB') || key.includes('DATABASE') || key.includes('POSTGRES') || key.includes('MONGO') || key.includes('REDIS') ? 'database' :
            key.includes('AUTH') || key.includes('JWT') || key.includes('SECRET') || key.includes('PASSWORD') ? 'auth' :
            key.includes('AWS') || key.includes('S3') || key.includes('GCP') || key.includes('AZURE') || key.includes('CLOUDFLARE') ? 'cloud' :
            key.includes('STRIPE') || key.includes('PAYPAL') || key.includes('BILLING') ? 'payments' :
            key.includes('DOCKER') || key.includes('KUBE') || key.includes('CI') || key.includes('GITHUB') ? 'devops' :
            defaultCategory;

          newItems.push({
            id: 'sec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            key,
            value,
            category,
            environment: defaultEnv,
            description: currentComment || undefined,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
          currentComment = '';
        }
      }
    }

    if (newItems.length === 0) {
      toast.info('No valid KEY=VALUE pairs found to import');
      return 0;
    }

    const existing = [...get().secrets];
    for (const item of newItems) {
      const idx = existing.findIndex((s) => s.key === item.key && s.environment === item.environment);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], ...item, updatedAt: Date.now() };
      } else {
        existing.unshift(item);
      }
    }

    set({ secrets: existing });
    if (window.api?.store) {
      await window.api.store.set('vault:secrets', existing);
    }
    toast.success(`Imported ${newItems.length} secret(s) into vault`);
    return newItems.length;
  }
}));