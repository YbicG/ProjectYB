import { create } from 'zustand'
import type { SystemMetrics, ProcessStats } from '../types/system'
import { useNotificationStore } from './useNotificationStore'

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
let lastCpuAlertTime = 0
let lastRamAlertTime = 0
const ALERT_COOLDOWN_MS = 90000 // 90 seconds cooldown between hardware spike alerts

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

      const now = Date.now()

      // Check CPU spike
      if (metrics?.cpu?.usage && metrics.cpu.usage > 88 && now - lastCpuAlertTime > ALERT_COOLDOWN_MS) {
        lastCpuAlertTime = now
        useNotificationStore.getState().notify({
          title: 'High CPU Load Alert',
          message: `System CPU load spiked to ${Math.round(metrics.cpu.usage)}%`,
          type: 'warning',
          category: 'system'
        })
      }

      // Check RAM spike
      if (metrics?.memory?.percentage && metrics.memory.percentage > 92 && now - lastRamAlertTime > ALERT_COOLDOWN_MS) {
        lastRamAlertTime = now
        useNotificationStore.getState().notify({
          title: 'High Memory Load Alert',
          message: `System RAM usage is at ${Math.round(metrics.memory.percentage)}%`,
          type: 'warning',
          category: 'system'
        })
      }
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
