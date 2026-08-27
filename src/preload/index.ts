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
    push: (repoPath: string) => ipcRenderer.invoke('git:push', repoPath),
    pull: (repoPath: string) => ipcRenderer.invoke('git:pull', repoPath),
    branches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
    checkout: (repoPath: string, branch: string, createNew?: boolean) =>
      ipcRenderer.invoke('git:checkout', repoPath, branch, createNew),
    deleteBranch: (repoPath: string, branch: string) =>
      ipcRenderer.invoke('git:delete-branch', repoPath, branch),
    diff: (repoPath: string, staged?: boolean) => ipcRenderer.invoke('git:diff', repoPath, staged),
    stash: (repoPath: string, action: string, message?: string) =>
      ipcRenderer.invoke('git:stash', repoPath, action, message),
    log: (repoPath: string, limit?: number) => ipcRenderer.invoke('git:log', repoPath, limit),
    isRepo: (path: string) => ipcRenderer.invoke('git:isRepo', path),
    init: (path: string) => ipcRenderer.invoke('git:init', path),
    addRemote: (path: string, name: string, url: string) =>
      ipcRenderer.invoke('git:addRemote', path, name, url)
  },
  github: {
    createRepo: (name: string, isPrivate: boolean, description?: string) =>
      ipcRenderer.invoke('github:createRepo', name, isPrivate, description),
    listRepos: () => ipcRenderer.invoke('github:listRepos'),
    createPR: (owner: string, repo: string, title: string, head: string, base: string, body?: string) =>
      ipcRenderer.invoke('github:createPR', owner, repo, title, head, base, body),
    listPRs: (owner: string, repo: string) => ipcRenderer.invoke('github:listPRs', owner, repo),
    listIssues: (owner: string, repo: string) =>
      ipcRenderer.invoke('github:listIssues', owner, repo),
    getUser: () => ipcRenderer.invoke('github:getUser'),
    initAndPush: (localPath: string, repoName: string, isPrivate: boolean) =>
      ipcRenderer.invoke('github:initAndPush', localPath, repoName, isPrivate)
  },
  projects: {
    scan: () => ipcRenderer.invoke('projects:scan'),
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
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error('Failed to expose api', error)
}
