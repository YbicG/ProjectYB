export type ProjectType = 'node' | 'python' | 'rust' | 'go' | 'dotnet' | 'godot' | 'git' | 'unknown'
export type ProjectStatus = 'running' | 'stopped' | 'error' | 'idle'

export interface SubProject {
  id: string
  name: string
  path: string
  relativePath: string
  type: ProjectType
  scripts?: Record<string, string>
}

export interface ProjectInfo {
  id: string
  name: string
  path: string
  type: ProjectType
  category: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  subprojects?: SubProject[]
  gitBranch?: string
  lastCommit?: string
  lastCommitTime?: string
  lastCommitMessage?: string
  lastCommitDate?: string
  isGitRepo: boolean
  tags: string[]
  status: ProjectStatus
  runningServices: string[]
  ignored?: boolean
  hasConfig?: boolean
}

export interface ProjectConfig {
  name?: string
  type?: ProjectType
  ignore?: boolean
  ignored?: boolean
  subprojects?: Array<{
    name: string
    path: string
    type?: ProjectType
    scripts?: Record<string, string>
  }>
  services?: ServiceConfig[]
  quickActions?: QuickAction[]
  tags?: string[]
  scripts?: Record<string, string>
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
