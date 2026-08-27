import type { ProjectInfo } from '../renderer/src/types/project'
import type { GitStatus, GitLogEntry, GitStashEntry, GitBranch } from '../renderer/src/types/git'
import type { SystemMetrics, ProcessStats } from '../renderer/src/types/system'
import type { EnvEntry, EnvFileInfo, EnvComparisonResult } from '../renderer/src/types/env'
import type { PortInfo, PortKillResult } from '../renderer/src/types/port'
import type { ProjectTemplate, ScaffoldOptions, ScaffoldResult } from '../renderer/src/types/template'

export interface TerminalInfo {
  id: string
  pid: number
  cwd: string
}

export interface BranchSummary {
  all: string[]
  current: string
}

export interface IElectronAPI {
  terminal: {
    spawn(options: { id: string; cwd?: string; cols: number; rows: number; shell?: string }): Promise<boolean>
    write(id: string, data: string): void
    resize(id: string, cols: number, rows: number): void
    kill(id: string): void
    getBuffer(id: string): Promise<string>
    list(): Promise<TerminalInfo[]>
    onData(id: string, callback: (data: string) => void): () => void
    onExit(id: string, callback: (exitCode: number) => void): () => void
  }
  git: {
    status(repoPath: string): Promise<GitStatus>
    commit(repoPath: string, message: string, stageAll?: boolean): Promise<any>
    push(repoPath: string, remote?: string, branch?: string): Promise<any>
    pull(repoPath: string, remote?: string, branch?: string): Promise<any>
    branches(repoPath: string): Promise<BranchSummary>
    checkout(repoPath: string, branch: string, createNew?: boolean): Promise<any>
    deleteBranch(repoPath: string, branch: string): Promise<any>
    mergeBranch(repoPath: string, branch: string): Promise<{ success: boolean; result?: any; conflicts: string[]; error?: string }>
    abortMerge(repoPath: string): Promise<{ success: boolean; error?: string }>
    diff(repoPath: string, staged?: boolean): Promise<string>
    fileDiff(repoPath: string, filePath: string, staged?: boolean): Promise<string>
    commitDiff(repoPath: string, commitHash: string): Promise<string>
    stageAll(path: string): Promise<any>
    stageFile(path: string, filePath: string): Promise<any>
    unstageFile(path: string, filePath: string): Promise<any>
    discardChanges(path: string, filePath: string): Promise<any>
    stash(repoPath: string, action: 'push' | 'pop' | 'list' | 'apply' | 'drop', message?: string, index?: number): Promise<any>
    log(repoPath: string, limit?: number): Promise<GitLogEntry[]>
    isRepo(path: string): Promise<boolean>
    init(path: string): Promise<any>
    addRemote(path: string, name: string, url: string): Promise<any>
    getRemoteInfo(path: string): Promise<{ owner: string; repo: string } | null>
    getRemotes(path: string): Promise<Array<{ name: string; refs: { fetch: string; push: string } }>>
  }
  github: {
    createRepo(name: string, isPrivate: boolean, description?: string): Promise<any>
    getRepo(owner: string, repo: string): Promise<any>
    listRepos(): Promise<any>
    createPR(owner: string, repo: string, title: string, head: string, base: string, body?: string): Promise<any>
    listPRs(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<any[]>
    createIssue(owner: string, repo: string, title: string, body?: string, labels?: string[]): Promise<any>
    listIssues(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<any[]>
    getUser(): Promise<any>
    initAndPush(localPath: string, repoName: string, isPrivate: boolean, description?: string): Promise<any>
  }
  projects: {
    scan(options?: { rootPaths?: string[]; mode?: 'git' | 'all' }): Promise<ProjectInfo[]>
    addManual(folderPath: string): Promise<ProjectInfo | null>
    ignore(folderPath: string): Promise<string>
    unignore(folderPath: string): Promise<string>
    getConfig(folderPath: string): Promise<{ config: any; filePath: string | null }>
    saveConfig(folderPath: string, config: any, overwrite?: boolean): Promise<string>
    generateAiContext(folderPath: string): Promise<{ success: boolean; filePath: string; content: string }>
    getAll(): Promise<ProjectInfo[]>
    openInExplorer(path: string): Promise<void>
    openInVSCode(path: string): Promise<void>
    openTerminal(path: string): Promise<void>
    onTriggerScan(callback: () => void): () => void
  }
  system: {
    getMetrics(): Promise<SystemMetrics>
    getProcessStats(pids: number[]): Promise<ProcessStats[]>
    onMetrics(callback: (metrics: SystemMetrics) => void): () => void
    onServiceStats(callback: (stats: Record<string, { cpu: number; memory: number }>) => void): () => void
  }
  store: {
    get(key: string, defaultValue?: any): Promise<any>
    set(key: string, value: any): Promise<void>
    delete(key: string): Promise<void>
  }
  window: {
    minimize(): void
    maximize(): void
    close(): void
    isMaximized(): Promise<boolean>
    onMaximizedChange(callback: (maximized: boolean) => void): () => void
  }
  env: {
    listFiles(projectPath: string): Promise<EnvFileInfo[]>
    read(filePath: string): Promise<{ raw: string; entries: EnvEntry[] }>
    write(filePath: string, entries: EnvEntry[], rawContent?: string): Promise<{ success: boolean }>
    generateExample(sourceFilePath: string, targetFilePath?: string): Promise<{ targetPath: string; content: string }>
    compare(fileAPath: string, fileBPath: string): Promise<EnvComparisonResult>
    syncKeys(sourceFilePath: string, targetFilePath: string, keys: string[]): Promise<{ success: boolean; addedCount: number }>
  }
  ports: {
    list(): Promise<PortInfo[]>
    check(port: number): Promise<{ isFree: boolean; port: number }>
    suggest(startPort?: number): Promise<number>
    kill(pid: number): Promise<PortKillResult>
  }
  templates: {
    list(): Promise<ProjectTemplate[]>
    scaffold(options: ScaffoldOptions): Promise<ScaffoldResult>
    saveCustom(template: ProjectTemplate): Promise<void>
    onLog(callback: (line: string) => void): () => void
  }
  dependencies: {
    getInstalled(projectPath: string): Promise<any[]>
    getOutdated(projectPath: string): Promise<any[]>
    getAudit(projectPath: string): Promise<any>
    upgrade(options: { projectPath: string; packageName: string; targetVersion?: string; isDev?: boolean }): Promise<{ success: boolean; output: string }>
    fixAudit(projectPath: string): Promise<{ success: boolean; output: string }>
    search(query: string, limit?: number): Promise<any[]>
    install(options: { projectPath: string; packageName: string; isDev?: boolean }): Promise<{ success: boolean; output: string }>
    uninstall(options: { projectPath: string; packageName: string }): Promise<{ success: boolean; output: string }>
  }
  docker: {
    getStatus(): Promise<{ available: boolean; running: boolean; version?: string; containers?: number; images?: number }>
    getProjectFiles(projectPath: string): Promise<{ hasDockerfile: boolean; hasCompose: boolean; composeFile?: string }>
    getServices(projectPath: string): Promise<any[]>
    up(projectPath: string, serviceName?: string, build?: boolean): Promise<{ success: boolean; output: string }>
    stop(projectPath: string, serviceName?: string): Promise<{ success: boolean; output: string }>
    restart(projectPath: string, serviceName?: string): Promise<{ success: boolean; output: string }>
    down(projectPath: string): Promise<{ success: boolean; output: string }>
    getLogs(projectPath: string, serviceName?: string, tail?: number): Promise<string>
    probeDb(connectionUrl: string): Promise<{ success: boolean; protocol: string; host: string; port: number; database?: string; responseTimeMs: number; error?: string }>
  }
  disk: {
    analyzeProject(projectId: string, projectName: string, projectPath: string): Promise<any>
    analyzeProjects(projects: Array<{ id: string; name: string; path: string }>): Promise<any>
    cleanProject(projectPath: string, categories: string[]): Promise<{ success: boolean; freedBytes: number; cleanedPaths: string[] }>
    cleanGlobalCache(type: 'pnpm' | 'npm' | 'cargo' | 'pip'): Promise<{ success: boolean; output: string }>
  }
  workspaces: {
    getStacks(): Promise<any[]>
    saveStack(stack: any): Promise<any[]>
    deleteStack(stackId: string): Promise<any[]>
  }
  notes: {
    read(projectPath: string): Promise<{ content: string; updatedAt: number; filePath?: string }>
    write(projectPath: string, content: string): Promise<{ success: boolean; filePath?: string; error?: string }>
    getGlobal(): Promise<string>
    setGlobal(content: string): Promise<boolean>
  }
  health: {
    getOverview(projects: Array<{ id: string; name: string; path: string; type: string; isGitRepo?: boolean }>): Promise<any>
  }
  search: {
    query(options: {
      query: string
      projectPaths: Array<{ id: string; name: string; path: string }>
      isRegex?: boolean
      isCaseSensitive?: boolean
      fileExtensions?: string[]
      maxResultsPerProject?: number
      maxTotalResults?: number
    }): Promise<any[]>
  }
  http: {
    sendRequest(options: {
      method: string
      url: string
      headers?: Record<string, string>
      queryParams?: Record<string, string>
      body?: string
      timeoutMs?: number
    }): Promise<{
      status: number
      statusText: string
      headers: Record<string, string>
      body: string
      isJson: boolean
      durationMs: number
      sizeBytes: number
      error?: string
    }>
  }
  archive: {
    createSnapshot(options: {
      projectId: string
      projectPath: string
      projectName: string
      destinationDir?: string
      customName?: string
    }): Promise<{
      success: boolean
      zipPath: string
      fileName: string
      fileSizeBytes: number
      filesCount: number
      createdAt: string
      error?: string
    }>
  }
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}
