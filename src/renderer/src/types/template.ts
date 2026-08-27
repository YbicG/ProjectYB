import type { ProjectType } from './project'

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: 'web' | 'backend' | 'bot' | 'cli' | 'game' | 'docs' | 'custom'
  type: ProjectType
  icon: string
  tags: string[]
  defaultScripts?: Record<string, string>
  files?: Array<{ path: string; content: string }>
}

export interface ScaffoldOptions {
  templateId: string
  projectName: string
  destinationPath: string
  description?: string
  packageManager?: 'pnpm' | 'npm' | 'yarn' | 'bun' | 'pip' | 'cargo' | 'go'
  initGit?: boolean
  initGitHub?: boolean
  githubPrivate?: boolean
  installDeps?: boolean
  openVsCode?: boolean
  openTerminal?: boolean
}

export interface ScaffoldResult {
  success: boolean
  projectPath: string
  githubUrl?: string
  error?: string
  logs: string[]
}
