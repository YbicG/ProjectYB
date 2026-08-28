import { create } from 'zustand';
import type { CronJob, CronRunHistoryItem } from '../types/cron';
import { toast } from 'sonner';

interface CronState {
  jobs: CronJob[];
  selectedJobId: string | null;
  history: Record<string, CronRunHistoryItem[]>;
  isLoading: boolean;
  isEditorOpen: boolean;
  editingJob?: CronJob;
  historyDrawerOpen: boolean;

  // Actions
  fetchJobs: () => Promise<void>;
  saveJob: (job: Partial<CronJob> & { name: string; command: string; schedule: string }) => Promise<void>;
  deleteJob: (id: string) => Promise<void>;
  runNow: (id: string) => Promise<void>;
  toggleJob: (id: string, enabled: boolean) => Promise<void>;
  fetchHistory: (jobId: string) => Promise<void>;
  openEditor: (job?: CronJob) => void;
  closeEditor: () => void;
  openHistoryDrawer: (jobId: string) => void;
  closeHistoryDrawer: () => void;
}

export const useCronStore = create<CronState>((set, get) => ({
  jobs: [],
  selectedJobId: null,
  history: {},
  isLoading: false,
  isEditorOpen: false,
  historyDrawerOpen: false,

  fetchJobs: async () => {
    try {
      if (window.api?.cron) {
        const jobs = await window.api.cron.getJobs();
        set({ jobs: jobs || [] });
      }
    } catch (err) {
      console.error('Failed to fetch cron jobs:', err);
    }
  },

  saveJob: async (jobData) => {
    try {
      if (window.api?.cron) {
        await window.api.cron.saveJob(jobData);
        toast.success(`Saved scheduled task "${jobData.name}"`);
        await get().fetchJobs();
        set({ isEditorOpen: false, editingJob: undefined });
      }
    } catch (err: any) {
      toast.error(`Failed to save task: ${err.message}`);
    }
  },

  deleteJob: async (id) => {
    try {
      if (window.api?.cron) {
        await window.api.cron.deleteJob(id);
        toast.info('Scheduled task deleted');
        await get().fetchJobs();
      }
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  },

  runNow: async (id) => {
    try {
      if (window.api?.cron) {
        toast.info('Starting manual execution...');
        set((state) => ({
          jobs: state.jobs.map((j) => (j.id === id ? { ...j, lastStatus: 'running' } : j))
        }));
        const res = await window.api.cron.runNow(id);
        if (res.status === 'success') {
          toast.success(`Task "${res.jobName}" finished successfully (${res.durationMs}ms)`);
        } else {
          toast.error(`Task "${res.jobName}" failed (Exit code ${res.exitCode})`);
        }
        await get().fetchJobs();
        await get().fetchHistory(id);
      }
    } catch (err: any) {
      toast.error(`Run error: ${err.message}`);
    }
  },

  toggleJob: async (id, enabled) => {
    try {
      if (window.api?.cron) {
        await window.api.cron.toggleJob(id, enabled);
        toast.info(enabled ? 'Task enabled' : 'Task paused');
        await get().fetchJobs();
      }
    } catch (err: any) {
      toast.error(`Toggle error: ${err.message}`);
    }
  },

  fetchHistory: async (jobId) => {
    try {
      if (window.api?.cron) {
        const historyList = await window.api.cron.getHistory(jobId);
        set((state) => ({
          history: { ...state.history, [jobId]: historyList || [] }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  },

  openEditor: (job) => set({ isEditorOpen: true, editingJob: job }),
  closeEditor: () => set({ isEditorOpen: false, editingJob: undefined }),

  openHistoryDrawer: (jobId) => {
    set({ historyDrawerOpen: true, selectedJobId: jobId });
    get().fetchHistory(jobId);
  },
  closeHistoryDrawer: () => set({ historyDrawerOpen: false, selectedJobId: null })
}));
