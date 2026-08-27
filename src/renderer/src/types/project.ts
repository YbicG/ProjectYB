export type ProjectType = 'node' | 'python' | 'rust' | 'go' | 'dotnet' | 'unknown'
export type ProjectStatus = 'running' | 'stopped' | 'error' | 'idle'

export interface ProjectInfo {
  id: string
  name: string
  path: string
  type: ProjectType
  category: string
  scripts?: Record<string, string>
  gitBranch?: string
  lastCommitMessage?: string
  lastCommitDate?: string
  isGitRepo: boolean
  tags: string[]
  status: ProjectStatus
  runningServices: string[]
}

export interface ProjectConfig {
  services: ServiceConfig[]
  quickActions: QuickAction[]
  tags: string[]
  notes?: string
}

export interface ServiceConfig {
  id: string
  name: string
  command: string
  cwd?: string
  autoRestart: boolean
  env?: Record<string, string>
}

export interface QuickAction {
  name: string
  command: string
  icon?: string
}
