import { create } from 'zustand';
import { TelemetryPoint, WallboardConfig } from '../types/overview';

interface OverviewState {
  history: TelemetryPoint[];
  config: WallboardConfig;
  isFullscreen: boolean;

  // Actions
  addTelemetryPoint: (point: Omit<TelemetryPoint, 'timestamp'>) => void;
  toggleFullscreen: () => void;
  updateConfig: (patch: Partial<WallboardConfig>) => void;
  loadConfig: () => Promise<void>;
}

const DEFAULT_CONFIG: WallboardConfig = {
  kioskMode: false,
  refreshRateSec: 2,
  showSparklines: true,
  showServices: true,
  showGitFeed: true,
  showPorts: true,
  showDocker: true,
  showClock: true,
  gridCols: 3
};

const MAX_HISTORY_POINTS = 60; // 60 data points (2 min window at 2s interval)

export const useOverviewStore = create<OverviewState>((set, get) => ({
  history: [],
  config: DEFAULT_CONFIG,
  isFullscreen: false,

  addTelemetryPoint: (point) => {
    const newPoint: TelemetryPoint = {
      ...point,
      timestamp: Date.now()
    };

    set((state) => {
      const nextHistory = [...state.history, newPoint];
      if (nextHistory.length > MAX_HISTORY_POINTS) {
        nextHistory.shift();
      }
      return { history: nextHistory };
    });
  },

  toggleFullscreen: () => {
    const current = get().isFullscreen;
    if (typeof document !== 'undefined') {
      if (!current) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }
    set({ isFullscreen: !current });
  },

  updateConfig: async (patch) => {
    const updated = { ...get().config, ...patch };
    set({ config: updated });
    try {
      await window.api?.store?.set('wallboard:config', updated);
    } catch {}
  },

  loadConfig: async () => {
    if (!window.api?.store) return;
    try {
      const saved = (await window.api.store.get('wallboard:config')) as WallboardConfig;
      if (saved) {
        set({ config: { ...DEFAULT_CONFIG, ...saved } });
      }
    } catch {}
  }
}));
