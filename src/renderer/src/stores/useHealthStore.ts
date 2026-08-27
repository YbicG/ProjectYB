import { create } from 'zustand';
import type { HealthOverview } from '../types/health';

interface HealthState {
  overview: HealthOverview | null;
  isLoading: boolean;
  modalOpen: boolean;

  // Actions
  fetchOverview: (projects: Array<{ id: string; name: string; path: string; type: string; isGitRepo?: boolean }>) => Promise<void>;
  setModalOpen: (open: boolean) => void;
}

export const useHealthStore = create<HealthState>((set) => ({
  overview: null,
  isLoading: false,
  modalOpen: false,

  fetchOverview: async (projects) => {
    if (!window.api?.health || projects.length === 0) return;
    set({ isLoading: true });
    try {
      const data = await window.api.health.getOverview(projects);
      set({ overview: data });
    } catch (err) {
      console.error('[useHealthStore] Failed to fetch overview:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  setModalOpen: (open: boolean) => set({ modalOpen: open })
}));
