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
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'copied' | 'untracked'
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
  hash?: string
}

export interface FileDiffInfo {
  file: string
  diffText: string
  isStaged: boolean
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description?: string
  default_branch: string
  stargazers_count?: number
  forks_count?: number
  open_issues_count?: number
}

export interface GitHubPR {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  html_url: string
  user: {
    login: string
    avatar_url?: string
  }
  head: {
    ref: string
  }
  base: {
    ref: string
  }
  body?: string
  created_at: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  html_url: string
  user: {
    login: string
    avatar_url?: string
  }
  body?: string
  comments: number
  labels: Array<{
    name: string
    color: string
  }>
  created_at: string
}
