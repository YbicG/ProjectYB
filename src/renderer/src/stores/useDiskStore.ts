import { create } from 'zustand';
import type { GlobalDiskSummary, ProjectDiskUsage, CleanCategory } from '../types/disk';
import { toast } from 'sonner';

interface DiskState {
  summary: GlobalDiskSummary | null;
  selectedProjectUsage: ProjectDiskUsage | null;
  isAnalyzing: boolean;
  isCleaning: boolean;
  activeFilter: 'all' | 'large' | 'reclaimable';

  setFilter: (filter: 'all' | 'large' | 'reclaimable') => void;
  analyzeAllProjects: (projects: Array<{ id: string; name: string; path: string }>) => Promise<void>;
  analyzeProject: (projectId: string, projectName: string, projectPath: string) => Promise<ProjectDiskUsage | null>;
  cleanProject: (projectId: string, projectPath: string, categories: CleanCategory[]) => Promise<boolean>;
  cleanAllReclaimable: (categories?: CleanCategory[]) => Promise<void>;
  cleanGlobalCache: (type: 'pnpm' | 'npm' | 'cargo' | 'pip') => Promise<boolean>;
}

export const useDiskStore = create<DiskState>((set, get) => ({
  summary: null,
  selectedProjectUsage: null,
  isAnalyzing: false,
  isCleaning: false,
  activeFilter: 'all',

  setFilter: (activeFilter) => set({ activeFilter }),

  analyzeAllProjects: async (projects) => {
    if (!window.api?.disk || projects.length === 0) return;
    set({ isAnalyzing: true });
    try {
      const summary = await window.api.disk.analyzeProjects(projects);
      set({ summary });
    } catch {
      set({ summary: null });
    } finally {
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
        toast.success(`Cleaned ${res.cleanedPaths.join(', ')} — Freed ~${mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`}`);

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
      toast.success(`Batch clean complete! Freed ~${mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`}`);

      // Refresh disk analysis across projects
      await get().analyzeAllProjects(
        summary.projects.map((p) => ({ id: p.projectId, name: p.projectName, path: p.projectPath }))
      );
    } finally {
      set({ isCleaning: false });
    }
  },

  cleanGlobalCache: async (type) => {
    if (!window.api?.disk) return false;
    set({ isCleaning: true });
    try {
      const res = await window.api.disk.cleanGlobalCache(type);
      if (res.success) {
        toast.success(`Cleaned ${type.toUpperCase()} package cache!`);
        return true;
      } else {
        toast.error(`Failed to clean ${type} cache: ${res.output}`);
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
