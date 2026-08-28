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
    showNotification(title: string, body: string): Promise<boolean>
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
  cloudflare: {
    getBinaryStatus(): Promise<{
      installed: boolean
      version?: string
      binaryPath?: string
      source: 'system' | 'embedded' | 'missing'
    }>
    installBinary(): Promise<{ success: boolean; path?: string; error?: string }>
    startQuickTunnel(options: {
      id?: string
      name?: string
      localPort: number
      localHost?: string
      protocol?: 'http' | 'https' | 'tcp'
    }): Promise<any>
    startNamedTunnel(options: {
      id?: string
      name: string
      tunnelToken: string
      localPort?: number
      customHostname?: string
    }): Promise<any>
    stopTunnel(tunnelId: string): Promise<boolean>
    listActiveTunnels(): Promise<any[]>
    getTunnelLogs(tunnelId: string): Promise<string[]>
    testApiToken(apiToken: string): Promise<{ success: boolean; message: string; user?: any }>
    listAccounts(apiToken: string): Promise<Array<{ id: string; name: string }>>
    listRemoteTunnels(apiToken: string, accountId: string): Promise<any[]>
    createRemoteTunnel(
      apiToken: string,
      accountId: string,
      name: string
    ): Promise<{ success: boolean; tunnel?: any; token?: string; error?: string }>
    deleteRemoteTunnel(apiToken: string, accountId: string, tunnelId: string): Promise<boolean>
    onDownloadProgress(callback: (percent: number) => void): () => void
    onStatusUpdate(callback: (tunnel: any) => void): () => void
    onLogLine(callback: (data: { tunnelId: string; line: string }) => void): () => void
    api: {
      verify(config: { apiToken: string; accountId: string }): Promise<{ success: boolean; accountName?: string; error?: string }>
      listZones(config: { apiToken: string; accountId: string }): Promise<{ success: boolean; zones: Array<{ id: string; name: string; status: string }>; error?: string }>
      createNamedTunnel(name: string, config: { apiToken: string; accountId: string }): Promise<{ success: boolean; tunnelId?: string; name?: string; token?: string; error?: string }>
      getTunnelToken(tunnelId: string, config: { apiToken: string; accountId: string }): Promise<{ success: boolean; token?: string; error?: string }>
      configureIngress(tunnelId: string, hostname: string, localPort: number, config: { apiToken: string; accountId: string }): Promise<{ success: boolean; hostname?: string; error?: string }>
      createDnsCname(zoneId: string, subdomain: string, tunnelId: string, config: { apiToken: string; accountId: string }): Promise<{ success: boolean; recordId?: string; hostname?: string; error?: string }>
    }
  }
  proxy: {
    start(httpPort?: number, httpsPort?: number): Promise<{ success: boolean; error?: string }>
    stop(): Promise<{ success: boolean; error?: string }>
    getStatus(): Promise<{
      running: boolean
      httpPort: number
      httpsPort: number
      routesCount: number
      activeConnections: number
    }>
    setRoutes(routes: any[]): Promise<{ success: boolean }>
    getRoutes(): Promise<any[]>
  }
  sync: {
    exportData(): Promise<any>
    encrypt(payload: any, password: string): Promise<{ success: boolean; bundle?: any; error?: string }>
    decryptAndRestore(bundle: any, password: string): Promise<{ success: boolean; itemsRestored?: number; error?: string }>
    githubGist(bundle: any, githubToken: string, gistId?: string): Promise<{ success: boolean; gistId?: string; htmlUrl?: string; error?: string }>
    restoreFromGist(gistId: string, password: string, githubToken?: string): Promise<{ success: boolean; payload?: any; error?: string }>
    exportToFile(bundle: any): Promise<{ success: boolean; canceled?: boolean; filePath?: string }>
    importFromFile(): Promise<{ success: boolean; canceled?: boolean; bundle?: any; filePath?: string }>
  }
  hosts: {
    checkStatus(domains: string[]): Promise<Record<string, boolean>>
    getMappedDomains(): Promise<string[]>
    syncDomains(domains: string[]): Promise<{ success: boolean; error?: string }>
    clearDomains(): Promise<{ success: boolean; error?: string }>
    readRaw(): Promise<string>
  }
  logstream: {
    getRecent(limit?: number): Promise<any[]>
    clear(): Promise<{ success: boolean }>
    emit(source: string, level: string, tag: string, message: string, projectId?: string): Promise<{ success: boolean }>
    onLog(callback: (entry: any) => void): () => void
  }
  openapi: {
    discover(projectPath: string): Promise<string[]>
    loadFromFile(filePath: string): Promise<{ success: boolean; spec?: any; error?: string }>
    loadFromUrl(url: string): Promise<{ success: boolean; spec?: any; error?: string }>
  }
  gitConflict: {
    getConflictedFiles(repoPath: string): Promise<string[]>
    parseFile(repoPath: string, relativePath: string): Promise<any>
    resolveFile(repoPath: string, relativePath: string, content: string): Promise<{ success: boolean; error?: string }>
    abortMerge(repoPath: string): Promise<{ success: boolean; error?: string }>
  }
  database: {
    discoverConnections(projects: Array<{ id: string; name: string; path: string }>): Promise<any[]>
    testConnection(conn: any): Promise<{ success: boolean; message: string; pingMs?: number }>
    executeQuery(conn: any, query: string): Promise<{
      columns: string[]
      rows: Record<string, any>[]
      rowCount: number
      durationMs: number
      error?: string
    }>
    getSchema(conn: any): Promise<any[]>
    getRedisKeys(conn: any, pattern?: string): Promise<any[]>
  }
  pipelines: {
    run(pipeline: any, cwd?: string): Promise<any>
    stop(pipelineId: string): Promise<boolean>
    onStatusUpdate(callback: (state: any) => void): () => void
    onLogLine(callback: (data: { pipelineId: string; stepId: string; line: string }) => void): () => void
  }
  mockServer: {
    start(port?: number): Promise<{ success: boolean; port: number; error?: string }>
    stop(): Promise<boolean>
    getStatus(): Promise<{
      running: boolean
      port: number
      routesCount: number
      webhooksCount: number
    }>
    saveRoutes(routes: any[]): Promise<boolean>
    getWebhookLogs(): Promise<any[]>
    clearLogs(): Promise<boolean>
    onWebhookReceived(callback: (event: any) => void): () => void
  }
  ai: {
    checkOllamaStatus(baseUrl?: string): Promise<{ running: boolean; models: any[]; error?: string }>
    generateCompletion(
      prompt: string,
      systemPrompt: string,
      config: any
    ): Promise<{ success: boolean; text: string; error?: string }>
    diagnoseError(
      errorLogs: string,
      command: string,
      config: any
    ): Promise<{ success: boolean; explanation: string; suggestedFix: string; error?: string }>
    generateCommitMessage(
      diffText: string,
      config: any
    ): Promise<{ success: boolean; commitMessage: string; error?: string }>
  }
}

declare global {
  interface Window {
    api: IElectronAPI
  }
}
