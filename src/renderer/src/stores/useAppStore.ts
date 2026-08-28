import { create } from 'zustand'

export type TabType = 'dashboard' | 'overview' | 'api' | 'terminals' | 'git' | 'services' | 'tunnels' | 'proxy' | 'database' | 'pipelines' | 'mock-server' | 'ai-hub' | 'dependencies' | 'optimizer' | 'settings' | 'project-detail'

interface AppState {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
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
  scanPaths: ['D:\\Code'],
  addScanPath: (path) => set((state) => ({ scanPaths: [...new Set([...state.scanPaths, path])] })),
  removeScanPath: (path) => set((state) => ({ scanPaths: state.scanPaths.filter((p) => p !== path) })),
  githubToken: null,
  theme: 'dark',
  commandPaletteOpen: false,
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open })
}))
