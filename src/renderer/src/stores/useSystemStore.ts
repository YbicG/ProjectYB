import { create } from 'zustand'
import type { SystemMetrics, ProcessStats } from '../types/system'

interface SystemState {
  metrics: SystemMetrics | null
  processStats: Map<number, ProcessStats>
  isMonitoring: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
  updateMetrics: (metrics: SystemMetrics) => void
  updateProcessStats: (stats: ProcessStats[]) => void
}

let cleanupFn: (() => void) | null = null

export const useSystemStore = create<SystemState>((set) => ({
  metrics: null,
  processStats: new Map(),
  isMonitoring: false,
  
  startMonitoring: () => {
    if (!window.api?.system) return
    set({ isMonitoring: true })
    
    // Subscribe to IPC metrics
    cleanupFn = window.api.system.onMetrics((metrics) => {
      set({ metrics })
    })
  },
  
  stopMonitoring: () => {
    set({ isMonitoring: false })
    if (cleanupFn) {
      cleanupFn()
      cleanupFn = null
    }
  },
  
  updateMetrics: (metrics) => set({ metrics }),
  
  updateProcessStats: (stats) => set((state) => {
    const newStats = new Map(state.processStats)
    stats.forEach(s => newStats.set(s.pid, s))
    return { processStats: newStats }
  })
}))
