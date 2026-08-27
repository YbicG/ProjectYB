import { contextBridge, ipcRenderer } from 'electron'

const api = {
  terminal: {
    spawn: (options: { id: string; cwd?: string; cols: number; rows: number }) =>
      ipcRenderer.invoke('terminal:spawn', options),
    write: (id: string, data: string) => ipcRenderer.send('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number) =>
      ipcRenderer.send('terminal:resize', id, cols, rows),
    kill: (id: string) => ipcRenderer.send('terminal:kill', id),
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
    getAll: () => ipcRenderer.invoke('projects:getAll'),
    openInExplorer: (path: string) => ipcRenderer.invoke('projects:openInExplorer', path),
    openInVSCode: (path: string) => ipcRenderer.invoke('projects:openInVSCode', path),
    openTerminal: (path: string) => ipcRenderer.invoke('projects:openTerminal', path)
  },
  system: {
    getMetrics: () => ipcRenderer.invoke('system:getMetrics'),
    getProcessStats: (pids: number[]) => ipcRenderer.invoke('system:getProcessStats', pids),
    onMetrics: (callback: (metrics: any) => void) => {
      const handler = (_event: any, metrics: any) => callback(metrics)
      ipcRenderer.on('system:metrics', handler)
      return () => {
        ipcRenderer.removeListener('system:metrics', handler)
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
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error('Failed to expose api', error)
}
