export type TerminalStatus = 'running' | 'stopped' | 'starting' | 'error'
export type TerminalLayout = 'tabs' | 'grid' | 'list'
export type TerminalFilter = 'all' | 'user' | 'service'

export interface TerminalInstance {
  id: string
  name: string
  cwd: string
  projectId?: string
  projectName?: string
  serviceId?: string
  isService?: boolean
  status: TerminalStatus
  pid?: number
  createdAt: number
  command?: string
}

export interface TerminalGridLayout {
  columns: number
  rows: number
  terminalIds: string[][]
}
