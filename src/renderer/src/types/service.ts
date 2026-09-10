export type ServiceStatus = 'running' | 'stopped' | 'starting' | 'crashed' | 'restarting'

export interface ServiceConfig {
  id?: string
  name: string
  command: string
  cwd?: string
  port?: number
  env?: Record<string, string>
  autoRestart?: boolean
  isAdmin?: boolean
}

export interface RunningService {
  id: string
  name: string
  command: string
  projectId: string
  projectName: string
  terminalId: string
  status: ServiceStatus
  pid?: number
  port?: number
  startedAt: number
  cpuUsage?: number
  memoryUsage?: number
  autoRestart: boolean
  isAdmin?: boolean
}

export interface StartupProfile {
  id: string
  name: string
  icon?: string
  serviceConfigs: { projectId: string; serviceId: string }[]
  serviceIds?: string[]
}
