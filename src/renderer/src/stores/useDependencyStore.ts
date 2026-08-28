import { create } from 'zustand';
import type { InstalledPackage, OutdatedPackage, AuditSummary, RegistryPackage } from '../types/dependency';
import { toast } from 'sonner';
import { useNotificationStore } from './useNotificationStore';

interface DependencyState {
  selectedProjectId: string | null;
  installedPackages: InstalledPackage[];
  outdatedPackages: OutdatedPackage[];
  auditSummary: AuditSummary | null;
  searchResults: RegistryPackage[];
  isLoadingInstalled: boolean;
  isLoadingOutdated: boolean;
  isLoadingAudit: boolean;
  isSearching: boolean;
  isUpgrading: boolean;
  selectedUpgradePackages: string[];

  setSelectedProject: (projectId: string | null) => void;
  loadAllForProject: (projectPath: string) => Promise<void>;
  loadInstalled: (projectPath: string) => Promise<void>;
  loadOutdated: (projectPath: string) => Promise<void>;
  loadAudit: (projectPath: string) => Promise<void>;
  searchPackages: (query: string) => Promise<void>;
  upgradePackage: (projectPath: string, packageName: string, targetVersion?: string, isDev?: boolean) => Promise<boolean>;
  upgradeSelectedPackages: (projectPath: string) => Promise<void>;
  fixVulnerabilities: (projectPath: string) => Promise<boolean>;
  installPackage: (projectPath: string, packageName: string, isDev?: boolean) => Promise<boolean>;
  uninstallPackage: (projectPath: string, packageName: string) => Promise<boolean>;
  toggleUpgradeSelect: (packageName: string) => void;
  selectAllUpgrades: () => void;
  deselectAllUpgrades: () => void;
}

export const useDependencyStore = create<DependencyState>((set, get) => ({
  selectedProjectId: null,
  installedPackages: [],
  outdatedPackages: [],
  auditSummary: null,
  searchResults: [],
  isLoadingInstalled: false,
  isLoadingOutdated: false,
  isLoadingAudit: false,
  isSearching: false,
  isUpgrading: false,
  selectedUpgradePackages: [],

  setSelectedProject: (projectId) => {
    set({ selectedProjectId: projectId, installedPackages: [], outdatedPackages: [], auditSummary: null, selectedUpgradePackages: [] });
  },

  loadAllForProject: async (projectPath: string) => {
    const { loadInstalled, loadOutdated, loadAudit } = get();
    await Promise.all([
      loadInstalled(projectPath),
      loadOutdated(projectPath),
      loadAudit(projectPath)
    ]);
  },

  loadInstalled: async (projectPath: string) => {
    if (!window.api?.dependencies) return;
    set({ isLoadingInstalled: true });
    try {
      const pkgs = await window.api.dependencies.getInstalled(projectPath);
      set({ installedPackages: pkgs || [] });
    } catch {
      set({ installedPackages: [] });
    } finally {
      set({ isLoadingInstalled: false });
    }
  },

  loadOutdated: async (projectPath: string) => {
    if (!window.api?.dependencies) return;
    set({ isLoadingOutdated: true });
    try {
      const outdated = await window.api.dependencies.getOutdated(projectPath);
      set({ outdatedPackages: outdated || [], selectedUpgradePackages: (outdated || []).map(p => p.name) });
    } catch {
      set({ outdatedPackages: [], selectedUpgradePackages: [] });
    } finally {
      set({ isLoadingOutdated: false });
    }
  },

  loadAudit: async (projectPath: string) => {
    if (!window.api?.dependencies) return;
    set({ isLoadingAudit: true });
    try {
      const summary = await window.api.dependencies.getAudit(projectPath);
      set({ auditSummary: summary || null });
    } catch {
      set({ auditSummary: null });
    } finally {
      set({ isLoadingAudit: false });
    }
  },

  searchPackages: async (query: string) => {
    if (!window.api?.dependencies || !query.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const results = await window.api.dependencies.search(query);
      set({ searchResults: results || [] });
    } catch {
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  upgradePackage: async (projectPath, packageName, targetVersion, isDev) => {
    if (!window.api?.dependencies) return false;
    set({ isUpgrading: true });
    try {
      const res = await window.api.dependencies.upgrade({ projectPath, packageName, targetVersion, isDev });
      if (res.success) {
        toast.success(`Upgraded ${packageName} successfully!`);
        get().loadAllForProject(projectPath);
        return true;
      } else {
        toast.error(`Upgrade failed: ${res.output}`);
        return false;
      }
    } catch (e: any) {
      toast.error(`Upgrade error: ${e.message}`);
      return false;
    } finally {
      set({ isUpgrading: false });
    }
  },

  upgradeSelectedPackages: async (projectPath) => {
    if (!window.api?.dependencies) return;
    const { selectedUpgradePackages, outdatedPackages } = get();
    if (selectedUpgradePackages.length === 0) return;

    set({ isUpgrading: true });
    let successCount = 0;
    try {
      for (const name of selectedUpgradePackages) {
        const pkg = outdatedPackages.find((p) => p.name === name);
        const res = await window.api.dependencies.upgrade({
          projectPath,
          packageName: name,
          targetVersion: pkg?.latest,
          isDev: pkg?.packageType === 'devDependency'
        });
        if (res?.success) successCount++;
      }
      toast.success(`Upgraded ${successCount} packages!`);
      await get().loadAllForProject(projectPath);
    } catch (err: any) {
      toast.error(`Batch upgrade error: ${err.message}`);
    } finally {
      set({ isUpgrading: false });
    }
  },

  fixVulnerabilities: async (projectPath) => {
    if (!window.api?.dependencies) return false;
    set({ isLoadingAudit: true });
    try {
      const res = await window.api.dependencies.fixAudit(projectPath);
      if (res.success) {
        toast.success('Security audit auto-fix applied!');
        get().loadAudit(projectPath);
        get().loadInstalled(projectPath);
        return true;
      } else {
        toast.error(`Audit fix failed: ${res.output}`);
        return false;
      }
    } catch (e: any) {
      toast.error(`Audit fix error: ${e.message}`);
      return false;
    } finally {
      set({ isLoadingAudit: false });
    }
  },

  installPackage: async (projectPath, packageName, isDev) => {
    if (!window.api?.dependencies) return false;
    try {
      const res = await window.api.dependencies.install({ projectPath, packageName, isDev });
      if (res.success) {
        useNotificationStore.getState().notify({
          title: 'Package Installed',
          message: `Installed ${packageName}${isDev ? ' as devDependency' : ''}`,
          type: 'success',
          category: 'dependencies',
          actionTab: 'dependencies'
        });
        get().loadAllForProject(projectPath);
        return true;
      } else {
        useNotificationStore.getState().notify({
          title: 'Package Install Failed',
          message: res.output || `Failed to install ${packageName}`,
          type: 'error',
          category: 'dependencies',
          actionTab: 'dependencies'
        });
        return false;
      }
    } catch (e: any) {
      toast.error(`Install error: ${e.message}`);
      return false;
    }
  },

  uninstallPackage: async (projectPath, packageName) => {
    if (!window.api?.dependencies) return false;
    try {
      const res = await window.api.dependencies.uninstall({ projectPath, packageName });
      if (res.success) {
        useNotificationStore.getState().notify({
          title: 'Package Removed',
          message: `Successfully uninstalled ${packageName}`,
          type: 'info',
          category: 'dependencies',
          actionTab: 'dependencies'
        });
        get().loadAllForProject(projectPath);
        return true;
      } else {
        useNotificationStore.getState().notify({
          title: 'Package Uninstall Failed',
          message: res.output || `Failed to remove ${packageName}`,
          type: 'error',
          category: 'dependencies',
          actionTab: 'dependencies'
        });
        return false;
      }
    } catch (e: any) {
      toast.error(`Uninstall error: ${e.message}`);
      return false;
    }
  },

  toggleUpgradeSelect: (packageName) => {
    set((state) => {
      const exists = state.selectedUpgradePackages.includes(packageName);
      return {
        selectedUpgradePackages: exists
          ? state.selectedUpgradePackages.filter(n => n !== packageName)
          : [...state.selectedUpgradePackages, packageName]
      };
    });
  },

  selectAllUpgrades: () => {
    set((state) => ({
      selectedUpgradePackages: state.outdatedPackages.map(p => p.name)
    }));
  },

  deselectAllUpgrades: () => {
    set({ selectedUpgradePackages: [] });
  }
}));
