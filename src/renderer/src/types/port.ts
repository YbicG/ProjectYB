export interface PortInfo {
  port: number
  protocol: 'tcp' | 'udp'
  pid: number
  processName: string
  localAddress: string
  state: string
  serviceId?: string
  serviceName?: string
  projectName?: string
}

export interface PortKillResult {
  success: boolean
  error?: string
}
