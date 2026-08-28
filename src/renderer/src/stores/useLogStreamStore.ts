import { create } from 'zustand';
import type { LogStreamEntry, LogSource, LogLevel } from '../types/logstream';
import { toast } from 'sonner';

function cleanLogText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\x1b\][^\x07\x1b]*(\x07|\x1b\\)/g, '')
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\x1b[@-Z\\-_]/g, '')
    .replace(/\[\?[0-9]+[a-zA-Z]/g, '')
    .replace(/\]0;[^\r\n]*/g, '')
    .trim();
}

interface LogStreamState {
  logs: LogStreamEntry[];
  isStreaming: boolean;
  searchQuery: string;
  selectedSources: LogSource[];
  selectedLevels: LogLevel[];
  isPaused: boolean;

  // Actions
  loadInitialLogs: () => Promise<void>;
  addLog: (entry: LogStreamEntry) => void;
  clearLogs: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  toggleSource: (source: LogSource) => void;
  toggleLevel: (level: LogLevel) => void;
  togglePause: () => void;
  exportLogs: () => void;
}

export const useLogStreamStore = create<LogStreamState>((set, get) => ({
  logs: [],
  isStreaming: true,
  searchQuery: '',
  selectedSources: ['terminal', 'service', 'tunnel', 'docker', 'mock', 'system'],
  selectedLevels: ['info', 'warn', 'error', 'debug'],
  isPaused: false,

  loadInitialLogs: async () => {
    try {
      if (window.api?.logstream) {
        const recent = await window.api.logstream.getRecent(1000);
        const cleaned = (recent || [])
          .map((e: LogStreamEntry) => ({ ...e, message: cleanLogText(e.message) }))
          .filter((e: LogStreamEntry) => e.message && !e.message.startsWith('[?') && !e.message.startsWith(']0;'));
        set({ logs: cleaned });
      }
    } catch (err) {
      console.error('Failed to load initial logstream logs', err);
    }
  },

  addLog: (entry) => {
    if (get().isPaused) return;
    const msg = cleanLogText(entry.message);
    if (!msg || msg.startsWith('[?') || msg.startsWith(']0;')) return;
    set((state) => ({
      logs: [...state.logs.slice(-2000), { ...entry, message: msg }]
    }));
  },

  clearLogs: async () => {
    try {
      if (window.api?.logstream) {
        await window.api.logstream.clear();
      }
      set({ logs: [] });
      toast.info('Cleared LogStream buffer');
    } catch {}
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleSource: (source) => {
    const { selectedSources } = get();
    if (selectedSources.includes(source)) {
      if (selectedSources.length > 1) {
        set({ selectedSources: selectedSources.filter((s) => s !== source) });
      }
    } else {
      set({ selectedSources: [...selectedSources, source] });
    }
  },

  toggleLevel: (level) => {
    const { selectedLevels } = get();
    if (selectedLevels.includes(level)) {
      if (selectedLevels.length > 1) {
        set({ selectedLevels: selectedLevels.filter((l) => l !== level) });
      }
    } else {
      set({ selectedLevels: [...selectedLevels, level] });
    }
  },

  togglePause: () => {
    set((state) => ({ isPaused: !state.isPaused }));
  },

  exportLogs: () => {
    const { logs } = get();
    const formatted = logs
      .map((l) => `[${l.timestamp}] [${l.source.toUpperCase()}] [${l.level.toUpperCase()}] [${l.tag}] ${l.message}`)
      .join('\n');

    const blob = new Blob([formatted], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `projectyb-logstream-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.log`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported LogStream logs to file');
  }
}));
