import { contextBridge, ipcRenderer } from 'electron'

const api = {
  terminal: {
    spawn: (options: { id: string; cwd?: string; cols: number; rows: number }) =>
      ipcRenderer.invoke('terminal:spawn', options),
    write: (id: string, data: string) => ipcRenderer.send('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.send('terminal:resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.send('terminal:kill', id),
    getBuffer: (id: string) => ipcRenderer.invoke('terminal:getBuffer', id),
    list: () => ipcRenderer.invoke('terminal:list'),
    onData: (id: string, callback: (data: string) => void) => {
      const handler = (_event: any, data: string) => callback(data)
      ipcRenderer.on(`terminal:data:${id}`, handler)
      return () => {
        ipcRenderer.removeListener(`terminal:data:${id}`, handler)
      }
    },
    onExit: (id: string, callback: (exitCode: number) => void) => {
      const handler = (_event: any, exitCode: number) => callback(exitCode)
      ipcRenderer.on(`terminal:exit:${id}`, handler)
      return () => {
        ipcRenderer.removeListener(`terminal:exit:${id}`, handler)
      }
    }
  },
  git: {
    status: (repoPath: string) => ipcRenderer.invoke('git:status', repoPath),
    commit: (repoPath: string, message: string, stageAll?: boolean) =>
      ipcRenderer.invoke('git:commit', repoPath, message, stageAll),
    push: (repoPath: string, remote?: string, branch?: string) =>
      ipcRenderer.invoke('git:push', repoPath, remote, branch),
    pull: (repoPath: string, remote?: string, branch?: string) =>
      ipcRenderer.invoke('git:pull', repoPath, remote, branch),
    branches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
    checkout: (repoPath: string, branch: string, createNew?: boolean) =>
      ipcRenderer.invoke('git:checkout', repoPath, branch, createNew),
    deleteBranch: (repoPath: string, branch: string) =>
      ipcRenderer.invoke('git:deleteBranch', repoPath, branch),
    mergeBranch: (repoPath: string, branch: string) =>
      ipcRenderer.invoke('git:mergeBranch', repoPath, branch),
    abortMerge: (repoPath: string) => ipcRenderer.invoke('git:abortMerge', repoPath),
    diff: (repoPath: string, staged?: boolean) => ipcRenderer.invoke('git:diff', repoPath, staged),
    fileDiff: (repoPath: string, filePath: string, staged?: boolean) =>
      ipcRenderer.invoke('git:fileDiff', repoPath, filePath, staged),
    commitDiff: (repoPath: string, commitHash: string) =>
      ipcRenderer.invoke('git:commitDiff', repoPath, commitHash),
    stageAll: (path: string) => ipcRenderer.invoke('git:stageAll', path),
    stageFile: (path: string, filePath: string) =>
      ipcRenderer.invoke('git:stageFile', path, filePath),
    unstageFile: (path: string, filePath: string) =>
      ipcRenderer.invoke('git:unstageFile', path, filePath),
    discardChanges: (path: string, filePath: string) =>
      ipcRenderer.invoke('git:discardChanges', path, filePath),
    stash: (repoPath: string, action: string, message?: string, index?: number) =>
      ipcRenderer.invoke('git:stash', repoPath, action, message, index),
    log: (repoPath: string, limit?: number) => ipcRenderer.invoke('git:log', repoPath, limit),
    isRepo: (path: string) => ipcRenderer.invoke('git:isRepo', path),
    init: (path: string) => ipcRenderer.invoke('git:init', path),
    addRemote: (path: string, name: string, url: string) =>
      ipcRenderer.invoke('git:addRemote', path, name, url),
    getRemoteInfo: (path: string) => ipcRenderer.invoke('git:getRemoteInfo', path),
    getRemotes: (path: string) => ipcRenderer.invoke('git:getRemotes', path)
  },
  github: {
    createRepo: (name: string, isPrivate: boolean, description?: string) =>
      ipcRenderer.invoke('github:createRepo', name, isPrivate, description),
    getRepo: (owner: string, repo: string) =>
      ipcRenderer.invoke('github:getRepo', owner, repo),
    listRepos: () => ipcRenderer.invoke('github:listRepos'),
    createPR: (owner: string, repo: string, title: string, head: string, base: string, body?: string) =>
      ipcRenderer.invoke('github:createPR', owner, repo, title, head, base, body),
    listPRs: (owner: string, repo: string, state?: 'open' | 'closed' | 'all') =>
      ipcRenderer.invoke('github:listPRs', owner, repo, state),
    createIssue: (owner: string, repo: string, title: string, body?: string, labels?: string[]) =>
      ipcRenderer.invoke('github:createIssue', owner, repo, title, body, labels),
    listIssues: (owner: string, repo: string, state?: 'open' | 'closed' | 'all') =>
      ipcRenderer.invoke('github:listIssues', owner, repo, state),
    getUser: () => ipcRenderer.invoke('github:getUser'),
    initAndPush: (localPath: string, repoName: string, isPrivate: boolean, description?: string) =>
      ipcRenderer.invoke('github:initAndPush', localPath, repoName, isPrivate, description)
  },
  projects: {
    scan: (options?: { rootPaths?: string[], mode?: 'git' | 'all' }) => ipcRenderer.invoke('projects:scan', options),
    addManual: (folderPath: string) => ipcRenderer.invoke('projects:addManual', folderPath),
    ignore: (folderPath: string) => ipcRenderer.invoke('projects:ignore', folderPath),
    unignore: (folderPath: string) => ipcRenderer.invoke('projects:unignore', folderPath),
    getConfig: (folderPath: string) => ipcRenderer.invoke('projects:getConfig', folderPath),
    saveConfig: (folderPath: string, config: any, overwrite?: boolean) => ipcRenderer.invoke('projects:saveConfig', folderPath, config, overwrite),
    generateAiContext: (folderPath: string) => ipcRenderer.invoke('projects:generateAiContext', folderPath),
    getAll: () => ipcRenderer.invoke('projects:getAll'),
    openInExplorer: (path: string) => ipcRenderer.invoke('projects:openInExplorer', path),
    openInVSCode: (path: string) => ipcRenderer.invoke('projects:openInVSCode', path),
    openTerminal: (path: string) => ipcRenderer.invoke('projects:openTerminal', path),
    onTriggerScan: (callback: () => void) => {
      const handler = () => callback()
      ipcRenderer.on('projects:triggerScan', handler)
      return () => {
        ipcRenderer.removeListener('projects:triggerScan', handler)
      }
    }
  },
  system: {
    getMetrics: () => ipcRenderer.invoke('system:getMetrics'),
    getProcessStats: (pids: number[]) => ipcRenderer.invoke('system:getProcessStats', pids),
    showNotification: (title: string, body: string) =>
      ipcRenderer.invoke('system:showNotification', { title, body }),
    onMetrics: (callback: (metrics: any) => void) => {
      const handler = (_event: any, metrics: any) => callback(metrics)
      ipcRenderer.on('system:metrics', handler)
      return () => {
        ipcRenderer.removeListener('system:metrics', handler)
      }
    },
    onServiceStats: (callback: (stats: Record<string, { cpu: number; memory: number }>) => void) => {
      const handler = (_event: any, stats: any) => callback(stats)
      ipcRenderer.on('system:service-stats', handler)
      return () => {
        ipcRenderer.removeListener('system:service-stats', handler)
      }
    }
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('store:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    onMaximizedChange: (callback: (maximized: boolean) => void) => {
      const handler = (_event: any, maximized: boolean) => callback(maximized)
      ipcRenderer.on('window:maximizedChange', handler)
      return () => {
        ipcRenderer.removeListener('window:maximizedChange', handler)
      }
    }
  },
  env: {
    listFiles: (projectPath: string) => ipcRenderer.invoke('env:listFiles', projectPath),
    read: (filePath: string) => ipcRenderer.invoke('env:read', filePath),
    write: (filePath: string, entries: any[], rawContent?: string) =>
      ipcRenderer.invoke('env:write', filePath, entries, rawContent),
    generateExample: (sourceFilePath: string, targetFilePath?: string) =>
      ipcRenderer.invoke('env:generateExample', sourceFilePath, targetFilePath),
    compare: (fileAPath: string, fileBPath: string) =>
      ipcRenderer.invoke('env:compare', fileAPath, fileBPath),
    syncKeys: (sourceFilePath: string, targetFilePath: string, keys: string[]) =>
      ipcRenderer.invoke('env:syncKeys', sourceFilePath, targetFilePath, keys)
  },
  ports: {
    list: () => ipcRenderer.invoke('ports:list'),
    check: (port: number) => ipcRenderer.invoke('ports:check', port),
    suggest: (startPort?: number) => ipcRenderer.invoke('ports:suggest', startPort),
    kill: (pid: number) => ipcRenderer.invoke('ports:kill', pid)
  },
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    scaffold: (options: any) => ipcRenderer.invoke('templates:scaffold', options),
    saveCustom: (template: any) => ipcRenderer.invoke('templates:saveCustom', template),
    onLog: (callback: (line: string) => void) => {
      const handler = (_event: any, line: string) => callback(line)
      ipcRenderer.on('templates:log', handler)
      return () => {
        ipcRenderer.removeListener('templates:log', handler)
      }
    }
  },
  dependencies: {
    getInstalled: (projectPath: string) => ipcRenderer.invoke('dependencies:getInstalled', projectPath),
    getOutdated: (projectPath: string) => ipcRenderer.invoke('dependencies:getOutdated', projectPath),
    getAudit: (projectPath: string) => ipcRenderer.invoke('dependencies:getAudit', projectPath),
    upgrade: (options: { projectPath: string; packageName: string; targetVersion?: string; isDev?: boolean }) =>
      ipcRenderer.invoke('dependencies:upgrade', options),
    fixAudit: (projectPath: string) => ipcRenderer.invoke('dependencies:fixAudit', projectPath),
    search: (query: string, limit?: number) => ipcRenderer.invoke('dependencies:search', query, limit),
    install: (options: { projectPath: string; packageName: string; isDev?: boolean }) =>
      ipcRenderer.invoke('dependencies:install', options),
    uninstall: (options: { projectPath: string; packageName: string }) =>
      ipcRenderer.invoke('dependencies:uninstall', options)
  },
  docker: {
    getStatus: () => ipcRenderer.invoke('docker:getStatus'),
    getProjectFiles: (projectPath: string) => ipcRenderer.invoke('docker:getProjectFiles', projectPath),
    getServices: (projectPath: string) => ipcRenderer.invoke('docker:getServices', projectPath),
    up: (projectPath: string, serviceName?: string, build?: boolean) =>
      ipcRenderer.invoke('docker:up', projectPath, serviceName, build),
    stop: (projectPath: string, serviceName?: string) =>
      ipcRenderer.invoke('docker:stop', projectPath, serviceName),
    restart: (projectPath: string, serviceName?: string) =>
      ipcRenderer.invoke('docker:restart', projectPath, serviceName),
    down: (projectPath: string) => ipcRenderer.invoke('docker:down', projectPath),
    getLogs: (projectPath: string, serviceName?: string, tail?: number) =>
      ipcRenderer.invoke('docker:getLogs', projectPath, serviceName, tail),
    probeDb: (connectionUrl: string) => ipcRenderer.invoke('docker:probeDb', connectionUrl)
  },
  disk: {
    analyzeProject: (projectId: string, projectName: string, projectPath: string) =>
      ipcRenderer.invoke('disk:analyzeProject', projectId, projectName, projectPath),
    analyzeProjects: (projects: Array<{ id: string; name: string; path: string }>) =>
      ipcRenderer.invoke('disk:analyzeProjects', projects),
    cleanProject: (projectPath: string, categories: string[]) =>
      ipcRenderer.invoke('disk:cleanProject', projectPath, categories),
    cleanGlobalCache: (type: 'pnpm' | 'npm' | 'cargo' | 'pip') =>
      ipcRenderer.invoke('disk:cleanGlobalCache', type)
  },
  workspaces: {
    getStacks: () => ipcRenderer.invoke('workspaces:getStacks'),
    saveStack: (stack: any) => ipcRenderer.invoke('workspaces:saveStack', stack),
    deleteStack: (stackId: string) => ipcRenderer.invoke('workspaces:deleteStack', stackId)
  },
  notes: {
    read: (projectPath: string) => ipcRenderer.invoke('notes:read', projectPath),
    write: (projectPath: string, content: string) =>
      ipcRenderer.invoke('notes:write', { projectPath, content }),
    getGlobal: () => ipcRenderer.invoke('notes:getGlobal'),
    setGlobal: (content: string) => ipcRenderer.invoke('notes:setGlobal', content)
  },
  health: {
    getOverview: (projects: Array<{ id: string; name: string; path: string; type: string; isGitRepo?: boolean }>) =>
      ipcRenderer.invoke('health:getOverview', projects)
  },
  search: {
    query: (options: any) => ipcRenderer.invoke('search:query', options)
  },
  http: {
    sendRequest: (options: any) => ipcRenderer.invoke('http:sendRequest', options)
  },
  archive: {
    createSnapshot: (options: any) => ipcRenderer.invoke('archive:createSnapshot', options)
  },
  cloudflare: {
    getBinaryStatus: () => ipcRenderer.invoke('cloudflare:getBinaryStatus'),
    installBinary: () => ipcRenderer.invoke('cloudflare:installBinary'),
    startQuickTunnel: (options: any) => ipcRenderer.invoke('cloudflare:startQuickTunnel', options),
    startNamedTunnel: (options: any) => ipcRenderer.invoke('cloudflare:startNamedTunnel', options),
    stopTunnel: (tunnelId: string) => ipcRenderer.invoke('cloudflare:stopTunnel', tunnelId),
    listActiveTunnels: () => ipcRenderer.invoke('cloudflare:listActiveTunnels'),
    getTunnelLogs: (tunnelId: string) => ipcRenderer.invoke('cloudflare:getTunnelLogs', tunnelId),
    testApiToken: (apiToken: string) => ipcRenderer.invoke('cloudflare:testApiToken', apiToken),
    listAccounts: (apiToken: string) => ipcRenderer.invoke('cloudflare:listAccounts', apiToken),
    listRemoteTunnels: (apiToken: string, accountId: string) =>
      ipcRenderer.invoke('cloudflare:listRemoteTunnels', apiToken, accountId),
    createRemoteTunnel: (apiToken: string, accountId: string, name: string) =>
      ipcRenderer.invoke('cloudflare:createRemoteTunnel', apiToken, accountId, name),
    deleteRemoteTunnel: (apiToken: string, accountId: string, tunnelId: string) =>
      ipcRenderer.invoke('cloudflare:deleteRemoteTunnel', apiToken, accountId, tunnelId),
    onDownloadProgress: (callback: (percent: number) => void) => {
      const handler = (_event: any, percent: number) => callback(percent);
      ipcRenderer.on('cloudflare:download-progress', handler);
      return () => {
        ipcRenderer.removeListener('cloudflare:download-progress', handler);
      };
    },
    onStatusUpdate: (callback: (tunnel: any) => void) => {
      const handler = (_event: any, tunnel: any) => callback(tunnel);
      ipcRenderer.on('cloudflare:status-update', handler);
      return () => {
        ipcRenderer.removeListener('cloudflare:status-update', handler);
      };
    },
    onLogLine: (callback: (data: { tunnelId: string; line: string }) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on('cloudflare:log-line', handler);
      return () => {
        ipcRenderer.removeListener('cloudflare:log-line', handler);
      };
    }
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error('Failed to expose api', error)
}
