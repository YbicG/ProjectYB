export type TerminalStatus = 'running' | 'stopped' | 'starting' | 'error'
export type TerminalLayout = 'tabs' | 'grid' | 'list'

export interface TerminalInstance {
  id: string
  name: string
  cwd: string
  projectId?: string
  projectName?: string
  serviceId?: string
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
