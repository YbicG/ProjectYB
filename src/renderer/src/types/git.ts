export interface GitStatus {
  branch: string
  tracking?: string
  ahead: number
  behind: number
  isClean: boolean
  staged: FileChange[]
  unstaged: FileChange[]
  untracked: string[]
}

export interface FileChange {
  path: string
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied'
}

export interface GitBranch {
  name: string
  current: boolean
  commit: string
  label: string
}

export interface GitLogEntry {
  hash: string
  hashShort: string
  message: string
  author: string
  date: string
  refs: string
}

export interface GitStashEntry {
  index: number
  message: string
  date: string
}
