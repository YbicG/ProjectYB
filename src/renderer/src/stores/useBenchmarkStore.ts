import { create } from 'zustand';

export interface ScriptBenchmarkEntry {
  id: string;
  projectId: string;
  projectName: string;
  scriptName: string;
  command: string;
  durationMs: number;
  timestamp: number;
  exitCode?: number;
}

interface BenchmarkState {
  entries: ScriptBenchmarkEntry[];
  isTracking: boolean;

  loadBenchmarks: () => Promise<void>;
  recordRun: (entry: Omit<ScriptBenchmarkEntry, 'id' | 'timestamp'>) => Promise<void>;
  getAverageDuration: (projectId: string, scriptName: string) => number | null;
  getLastDuration: (projectId: string, scriptName: string) => number | null;
  clearBenchmarks: () => Promise<void>;
}

export const useBenchmarkStore = create<BenchmarkState>((set, get) => ({
  entries: [],
  isTracking: true,

  loadBenchmarks: async () => {
    try {
      if (window.api?.store) {
        const saved = (await window.api.store.get('benchmarks:history')) as ScriptBenchmarkEntry[] | undefined;
        if (saved && Array.isArray(saved)) {
          set({ entries: saved });
        }
      }
    } catch (err) {
      console.error('Failed to load script benchmarks:', err);
    }
  },

  recordRun: async (entry) => {
    const newEntry: ScriptBenchmarkEntry = {
      ...entry,
      id: String(Date.now()) + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: Date.now()
    };

    const updated = [newEntry, ...get().entries].slice(0, 200);
    set({ entries: updated });

    try {
      if (window.api?.store) {
        await window.api.store.set('benchmarks:history', updated);
      }
    } catch (err) {
      console.error('Failed to persist script benchmark:', err);
    }
  },

  getAverageDuration: (projectId: string, scriptName: string) => {
    const matches = get().entries.filter(
      (e) => e.projectId === projectId && e.scriptName.toLowerCase() === scriptName.toLowerCase()
    );
    if (matches.length === 0) return null;
    const sum = matches.reduce((acc, e) => acc + e.durationMs, 0);
    return Math.round(sum / matches.length);
  },

  getLastDuration: (projectId: string, scriptName: string) => {
    const match = get().entries.find(
      (e) => e.projectId === projectId && e.scriptName.toLowerCase() === scriptName.toLowerCase()
    );
    return match ? match.durationMs : null;
  },

  clearBenchmarks: async () => {
    set({ entries: [] });
    try {
      if (window.api?.store) {
        await window.api.store.delete('benchmarks:history');
      }
    } catch {}
  }
}));
