import { create } from 'zustand';
import type { GlobalDiskSummary, ProjectDiskUsage, CleanCategory } from '../types/disk';
import { toast } from 'sonner';
import { useNotificationStore } from './useNotificationStore';

interface DiskState {
  summary: GlobalDiskSummary | null;
  selectedProjectUsage: ProjectDiskUsage | null;
  isAnalyzing: boolean;
  isCleaning: boolean;
  activeFilter: 'all' | 'large' | 'reclaimable';
  analyzedCount: number;
  totalToAnalyze: number;
  lastScanTimestamp: number;

  setFilter: (filter: 'all' | 'large' | 'reclaimable') => void;
  analyzeAllProjects: (projects: Array<{ id: string; name: string; path: string }>, force?: boolean) => Promise<void>;
  cancelScan: () => Promise<void>;
  analyzeProject: (projectId: string, projectName: string, projectPath: string) => Promise<ProjectDiskUsage | null>;
  cleanProject: (projectId: string, projectPath: string, categories: CleanCategory[]) => Promise<boolean>;
  cleanAllReclaimable: (categories?: CleanCategory[]) => Promise<void>;
  cleanGlobalCache: (type: 'pnpm' | 'npm' | 'cargo' | 'pip') => Promise<boolean>;
}

let cleanupProjectListener: (() => void) | null = null;

export const useDiskStore = create<DiskState>((set, get) => ({
  summary: null,
  selectedProjectUsage: null,
  isAnalyzing: false,
  isCleaning: false,
  activeFilter: 'all',
  analyzedCount: 0,
  totalToAnalyze: 0,
  lastScanTimestamp: 0,

  setFilter: (activeFilter) => set({ activeFilter }),

  cancelScan: async () => {
    if (window.api?.disk?.cancelScan) {
      await window.api.disk.cancelScan();
    }
    if (cleanupProjectListener) {
      cleanupProjectListener();
      cleanupProjectListener = null;
    }
    set({ isAnalyzing: false });
  },

  analyzeAllProjects: async (projects, force = false) => {
    if (!window.api?.disk || projects.length === 0) return;

    // Cache check: if scanned in last 3 minutes and not forced, keep existing summary
    const state = get();
    if (!force && state.summary && state.summary.projects.length === projects.length && Date.now() - state.lastScanTimestamp < 180000) {
      return;
    }

    // Cancel any in-flight listener
    if (cleanupProjectListener) {
      cleanupProjectListener();
      cleanupProjectListener = null;
    }

    // Initialize progressive state
    set({
      isAnalyzing: true,
      analyzedCount: 0,
      totalToAnalyze: projects.length,
      summary: state.summary ? state.summary : {
        totalAnalyzedBytes: 0,
        totalReclaimableBytes: 0,
        dependenciesBytes: 0,
        buildBytes: 0,
        cachesBytes: 0,
        projects: []
      }
    });

    // Setup progressive stream listener
    if (window.api.disk.onProjectAnalyzed) {
      cleanupProjectListener = window.api.disk.onProjectAnalyzed((projectUsage) => {
        set((s) => {
          const existingProjects = s.summary?.projects || [];
          const idx = existingProjects.findIndex((p) => p.projectId === projectUsage.projectId);
          let updatedProjects: ProjectDiskUsage[];

          if (idx >= 0) {
            updatedProjects = [...existingProjects];
            updatedProjects[idx] = projectUsage;
          } else {
            updatedProjects = [...existingProjects, projectUsage];
          }

          let totalAnalyzed = 0;
          let totalReclaimable = 0;
          let depBytes = 0;
          let bldBytes = 0;
          let cchBytes = 0;

          for (const u of updatedProjects) {
            totalAnalyzed += u.totalBytes;
            totalReclaimable += u.reclaimableBytes;
            depBytes += u.dependenciesBytes;
            bldBytes += u.buildBytes;
            cchBytes += u.cachesBytes;
          }

          return {
            analyzedCount: s.analyzedCount + 1,
            summary: {
              totalAnalyzedBytes: totalAnalyzed,
              totalReclaimableBytes: totalReclaimable,
              dependenciesBytes: depBytes,
              buildBytes: bldBytes,
              cachesBytes: cchBytes,
              projects: updatedProjects
            }
          };
        });
      });
    }

    try {
      const summary = await window.api.disk.analyzeProjects(projects);
      if (summary) {
        set({ summary, lastScanTimestamp: Date.now() });
      }
    } catch {
      // Keep existing partial summary if aborted
    } finally {
      if (cleanupProjectListener) {
        cleanupProjectListener();
        cleanupProjectListener = null;
      }
      set({ isAnalyzing: false });
    }
  },

  analyzeProject: async (projectId, projectName, projectPath) => {
    if (!window.api?.disk) return null;
    try {
      const usage = await window.api.disk.analyzeProject(projectId, projectName, projectPath);
      set({ selectedProjectUsage: usage });
      return usage;
    } catch {
      return null;
    }
  },

  cleanProject: async (projectId, projectPath, categories) => {
    if (!window.api?.disk || categories.length === 0) return false;
    set({ isCleaning: true });
    try {
      const res = await window.api.disk.cleanProject(projectPath, categories);
      if (res.success) {
        const mb = Math.round(res.freedBytes / (1024 * 1024));
        const formatted = mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
        useNotificationStore.getState().notify({
          title: 'Disk Space Reclaimed',
          message: `Cleaned ${res.cleanedPaths.join(', ')} — Freed ~${formatted}`,
          type: 'success',
          category: 'system',
          actionTab: 'optimizer'
        });

        // Update local state summary
        const summary = get().summary;
        if (summary) {
          const updatedProjects = summary.projects.map(p => {
            if (p.projectId === projectId) {
              const cleanedBytes = res.freedBytes;
              return {
                ...p,
                totalBytes: Math.max(0, p.totalBytes - cleanedBytes),
                reclaimableBytes: Math.max(0, p.reclaimableBytes - cleanedBytes),
                items: p.items.filter(item => !res.cleanedPaths.includes(item.name))
              };
            }
            return p;
          });
          set({
            summary: {
              ...summary,
              totalAnalyzedBytes: Math.max(0, summary.totalAnalyzedBytes - res.freedBytes),
              totalReclaimableBytes: Math.max(0, summary.totalReclaimableBytes - res.freedBytes),
              projects: updatedProjects
            }
          });
        }
        return true;
      } else {
        toast.error('Clean operation encountered errors');
        return false;
      }
    } catch (e: any) {
      toast.error(`Clean error: ${e.message}`);
      return false;
    } finally {
      set({ isCleaning: false });
    }
  },

  cleanAllReclaimable: async (categories = ['build', 'caches']) => {
    const summary = get().summary;
    if (!summary || summary.projects.length === 0) return;

    set({ isCleaning: true });
    let totalFreed = 0;
    try {
      for (const p of summary.projects) {
        if (p.reclaimableBytes > 0) {
          const res = await window.api.disk.cleanProject(p.projectPath, categories);
          if (res.success) totalFreed += res.freedBytes;
        }
      }
      const mb = Math.round(totalFreed / (1024 * 1024));
      const formatted = mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
      useNotificationStore.getState().notify({
        title: 'Batch Cleanup Complete',
        message: `Reclaimed ~${formatted} of disk space across all projects`,
        type: 'success',
        category: 'system',
        actionTab: 'optimizer'
      });

      // Refresh disk analysis across projects
      await get().analyzeAllProjects(
        summary.projects.map((p) => ({ id: p.projectId, name: p.projectName, path: p.projectPath }))
      );
    } catch (err: any) {
      toast.error(`Batch clean error: ${err.message}`);
    } finally {
      set({ isCleaning: false });
    }
  },

  cleanGlobalCache: async (type: 'pnpm' | 'npm' | 'cargo' | 'pip') => {
    if (!window.api?.disk) return false;
    set({ isCleaning: true });
    try {
      const res = await window.api.disk.cleanGlobalCache(type);
      if (res.success) {
        useNotificationStore.getState().notify({
          title: 'Global Cache Cleaned',
          message: `Successfully purged ${type.toUpperCase()} global package cache`,
          type: 'success',
          category: 'system',
          actionTab: 'optimizer'
        });
        return true;
      } else {
        useNotificationStore.getState().notify({
          title: 'Cache Purge Failed',
          message: res.output || `Failed to clean ${type} cache`,
          type: 'error',
          category: 'system',
          actionTab: 'optimizer'
        });
        return false;
      }
    } catch (e: any) {
      toast.error(`Cache clean error: ${e.message}`);
      return false;
    } finally {
      set({ isCleaning: false });
    }
  }
}));
