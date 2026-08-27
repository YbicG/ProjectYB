import type { ProjectInfo } from '../renderer/src/types/project'
import type { GitStatus, GitLogEntry, GitStashEntry, GitBranch } from '../renderer/src/types/git'
import type { SystemMetrics, ProcessStats } from '../renderer/src/types/system'

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
    getAll(): Promise<ProjectInfo[]>
    openInExplorer(path: string): Promise<void>
    openInVSCode(path: string): Promise<void>
    openTerminal(path: string): Promise<void>
  }
  system: {
    getMetrics(): Promise<SystemMetrics>
    getProcessStats(pids: number[]): Promise<ProcessStats[]>
    onMetrics(callback: (metrics: SystemMetrics) => void): () => void
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
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}
