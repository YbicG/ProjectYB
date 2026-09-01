import { create } from 'zustand'

export type TabType =
  | 'dashboard'
  | 'overview'
  | 'api'
  | 'logstream'
  | 'cron'
  | 'terminals'
  | 'git'
  | 'services'
  | 'tunnels'
  | 'proxy'
  | 'database'
  | 'pipelines'
  | 'mock-server'
  | 'dependencies'
  | 'optimizer'
  | 'settings'
  | 'project-detail'

interface AppState {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  settingsSubTab: string
  setSettingsSubTab: (subTab: string) => void
  openSettingsTab: (subTab: string) => void
  mobileModalOpen: boolean
  setMobileModalOpen: (open: boolean) => void
  assetForgeModalOpen: boolean
  setAssetForgeModalOpen: (open: boolean) => void
  secretVaultModalOpen: boolean
  setSecretVaultModalOpen: (open: boolean) => void
  projectArchiverModalOpen: boolean
  setProjectArchiverModalOpen: (open: boolean) => void
  scanPaths: string[]
  addScanPath: (path: string) => void
  removeScanPath: (path: string) => void
  githubToken: string | null
  theme: 'dark'
  commandPaletteOpen: boolean
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),
  settingsSubTab: 'general',
  setSettingsSubTab: (subTab) => set({ settingsSubTab: subTab }),
  openSettingsTab: (subTab) => set({ activeTab: 'settings', settingsSubTab: subTab }),
  mobileModalOpen: false,
  setMobileModalOpen: (open) => set({ mobileModalOpen: open }),
  assetForgeModalOpen: false,
  setAssetForgeModalOpen: (open) => set({ assetForgeModalOpen: open }),
  secretVaultModalOpen: false,
  setSecretVaultModalOpen: (open) => set({ secretVaultModalOpen: open }),
  projectArchiverModalOpen: false,
  setProjectArchiverModalOpen: (open) => set({ projectArchiverModalOpen: open }),
  scanPaths: ['D:\\Code'],
  addScanPath: (path) => set((state) => ({ scanPaths: [...new Set([...state.scanPaths, path])] })),
  removeScanPath: (path) => set((state) => ({ scanPaths: state.scanPaths.filter((p) => p !== path) })),
  githubToken: null,
  theme: 'dark',
  commandPaletteOpen: false,
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open })
}))
