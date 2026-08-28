import { create } from 'zustand'
import type { PortInfo } from '../types/port'
import { toast } from 'sonner'
import { useNotificationStore } from './useNotificationStore'

interface PortState {
  ports: PortInfo[]
  isLoading: boolean
  search: string
  filter: 'all' | 'dev' | 'system'
  suggestedPort: number | null
  isSuggesting: boolean

  // Actions
  fetchPorts: () => Promise<void>
  killPort: (pid: number, port: number) => Promise<boolean>
  findSuggestedPort: (startPort?: number) => Promise<number | null>
  setSearch: (search: string) => void
  setFilter: (filter: 'all' | 'dev' | 'system') => void
}

const COMMON_DEV_PORTS = new Set([
  3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009,
  5173, 5174, 5175, 5176, 5177, // Vite
  8000, 8001, 8080, 8081, 8888, // Common APIs
  4000, 4200, 4321, 4173, // Angular / Astro / Preview
  5000, 5001, 5500, // Flask / LiveServer
  6006, // Storybook
  8443, 9000, 9229, // Node debug / HTTPS
  27017, 5432, 3306, 6379 // Mongo / Postgres / MySQL / Redis
])

export const usePortStore = create<PortState>((set, get) => ({
  ports: [],
  isLoading: false,
  search: '',
  filter: 'all',
  suggestedPort: null,
  isSuggesting: false,

  fetchPorts: async () => {
    set({ isLoading: true })
    try {
      if (!window.api?.ports) return
      const list = await window.api.ports.list()
      set({ ports: list, isLoading: false })
    } catch (err: any) {
      console.error('Failed to fetch ports:', err)
      set({ isLoading: false })
      toast.error(`Failed to scan ports: ${err.message}`)
    }
  },

  killPort: async (pid: number, port: number) => {
    try {
      if (!window.api?.ports) return false
      const res = await window.api.ports.kill(pid)
      if (res.success) {
        useNotificationStore.getState().notify({
          title: 'Port Process Terminated',
          message: `Successfully terminated PID ${pid} running on Port ${port}`,
          type: 'warning',
          category: 'services',
          actionTab: 'services'
        })
        await get().fetchPorts()
        return true
      } else {
        useNotificationStore.getState().notify({
          title: 'Port Kill Failed',
          message: res.error || `Failed to kill process on port ${port}`,
          type: 'error',
          category: 'services',
          actionTab: 'services'
        })
        return false
      }
    } catch (err: any) {
      console.error('Error killing port process:', err)
      useNotificationStore.getState().notify({
        title: 'Port Kill Error',
        message: `Could not kill PID ${pid}: ${err.message}`,
        type: 'error',
        category: 'services'
      })
      return false
    }
  },

  findSuggestedPort: async (startPort: number = 3000) => {
    set({ isSuggesting: true })
    try {
      if (!window.api?.ports) return null
      const port = await window.api.ports.suggest(startPort)
      set({ suggestedPort: port, isSuggesting: false })
      return port
    } catch (err: any) {
      console.error('Failed to suggest port:', err)
      set({ isSuggesting: false })
      return null
    }
  },

  setSearch: (search: string) => set({ search }),
  setFilter: (filter: 'all' | 'dev' | 'system') => set({ filter })
}))

export { COMMON_DEV_PORTS }
