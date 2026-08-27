import { create } from 'zustand';
import { CommandSnippet } from '../types/snippet';

interface SnippetState {
  snippets: CommandSnippet[];
  searchQuery: string;
  selectedCategory: string; // 'all' | 'git' | 'docker' | etc.
  isModalOpen: boolean;
  activeSnippetToRun: CommandSnippet | null;

  // Actions
  setSearchQuery: (q: string) => void;
  setSelectedCategory: (cat: string) => void;
  setModalOpen: (open: boolean) => void;
  setActiveSnippetToRun: (s: CommandSnippet | null) => void;
  addCustomSnippet: (snippet: Omit<CommandSnippet, 'id' | 'isCustom'>) => Promise<void>;
  deleteCustomSnippet: (id: string) => Promise<void>;
  loadCustomSnippets: () => Promise<void>;
  interpolateCommand: (template: string, params: Record<string, string>) => string;
}

const PRESET_SNIPPETS: CommandSnippet[] = [
  // Git
  {
    id: 'git-clean-branches',
    title: 'Git Prune Merged Branches',
    description: 'Delete all local branches that have already been merged into main/master',
    command: 'git branch --merged | grep -v "\\*" | grep -v "main" | grep -v "master" | xargs -n 1 git branch -d',
    category: 'git',
    tags: ['git', 'cleanup', 'branches']
  },
  {
    id: 'git-undo-commit',
    title: 'Undo Last Commit (Keep Changes Staged)',
    description: 'Soft reset the last commit while preserving changes in staging area',
    command: 'git reset --soft HEAD~1',
    category: 'git',
    tags: ['git', 'undo', 'commit']
  },
  {
    id: 'git-sync-fork',
    title: 'Sync Upstream Remote',
    description: 'Fetch and merge changes from original upstream repository',
    command: 'git fetch upstream && git checkout main && git merge upstream/main',
    category: 'git',
    tags: ['git', 'upstream', 'sync']
  },

  // Docker
  {
    id: 'docker-prune-all',
    title: 'Docker Full System Prune',
    description: 'Remove all stopped containers, unused networks, and dangling images',
    command: 'docker system prune -a --volumes -f',
    category: 'docker',
    tags: ['docker', 'clean', 'disk']
  },
  {
    id: 'docker-exec-bash',
    title: 'Interactive Bash inside Container',
    description: 'Open an interactive shell inside a running container',
    command: 'docker exec -it {{container_name}} sh',
    category: 'docker',
    tags: ['docker', 'shell', 'debug'],
    parameters: [
      { key: 'container_name', label: 'Container Name/ID', defaultValue: 'app' }
    ]
  },

  // NPM / Node
  {
    id: 'npm-fresh-install',
    title: 'Clean Reinstall Node Modules',
    description: 'Nuke node_modules & lockfile and perform a clean install',
    command: 'rm -rf node_modules package-lock.json && npm install',
    category: 'npm',
    tags: ['npm', 'reinstall', 'clean']
  },
  {
    id: 'npm-kill-port',
    title: 'Kill Process on Port',
    description: 'Find and kill any process blocking a specific port',
    command: 'npx kill-port {{port}}',
    category: 'system',
    tags: ['port', 'kill', 'node'],
    parameters: [
      { key: 'port', label: 'Port Number', defaultValue: '3000' }
    ]
  },

  // Python
  {
    id: 'py-fresh-venv',
    title: 'Create & Activate Python venv',
    description: 'Initialize a fresh virtual environment and upgrade pip',
    command: 'python -m venv .venv && .\\.venv\\Scripts\\Activate.ps1 && python -m pip install --upgrade pip',
    category: 'python',
    tags: ['python', 'venv', 'pip']
  },

  // Database
  {
    id: 'pg-dump',
    title: 'PostgreSQL Database Dump',
    description: 'Export database schema and data to SQL file',
    command: 'pg_dump -U {{user}} -h localhost -p {{port}} {{dbname}} > backup.sql',
    category: 'database',
    tags: ['postgres', 'backup', 'sql'],
    parameters: [
      { key: 'user', label: 'DB User', defaultValue: 'postgres' },
      { key: 'port', label: 'Port', defaultValue: '5432' },
      { key: 'dbname', label: 'Database Name', defaultValue: 'postgres' }
    ]
  }
];

export const useSnippetStore = create<SnippetState>((set, get) => ({
  snippets: PRESET_SNIPPETS,
  searchQuery: '',
  selectedCategory: 'all',
  isModalOpen: false,
  activeSnippetToRun: null,

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedCategory: (selectedCategory) => set({ selectedCategory }),
  setModalOpen: (isModalOpen) => set({ isModalOpen }),
  setActiveSnippetToRun: (activeSnippetToRun) => set({ activeSnippetToRun }),

  addCustomSnippet: async (snippetData) => {
    const newSnippet: CommandSnippet = {
      ...snippetData,
      id: `custom_${Date.now()}`,
      isCustom: true
    };

    const nextSnippets = [newSnippet, ...get().snippets];
    set({ snippets: nextSnippets });

    try {
      const customOnly = nextSnippets.filter((s) => s.isCustom);
      await window.api?.store?.set('snippets:custom', customOnly);
    } catch {}
  },

  deleteCustomSnippet: async (id) => {
    const nextSnippets = get().snippets.filter((s) => s.id !== id);
    set({ snippets: nextSnippets });

    try {
      const customOnly = nextSnippets.filter((s) => s.isCustom);
      await window.api?.store?.set('snippets:custom', customOnly);
    } catch {}
  },

  loadCustomSnippets: async () => {
    if (!window.api?.store) return;
    try {
      const customOnly = (await window.api.store.get('snippets:custom')) as CommandSnippet[];
      if (customOnly && customOnly.length > 0) {
        set({ snippets: [...customOnly, ...PRESET_SNIPPETS] });
      }
    } catch {}
  },

  interpolateCommand: (template, params) => {
    let result = template;
    Object.entries(params).forEach(([key, val]) => {
      result = result.replaceAll(`{{${key}}}`, val);
    });
    return result;
  }
}));
