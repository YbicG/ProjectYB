export interface SystemMetrics {
  cpu: { usage: number; cores: number }
  memory: { total: number; used: number; percentage: number }
  network: { txSec: number; rxSec: number }
}

export interface ProcessStats {
  pid: number
  cpu: number
  memory: number
  name: string
}
