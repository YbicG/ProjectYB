import React, { useState, useEffect } from 'react'
import {
  Github,
  GitPullRequest,
  CircleDot,
  ExternalLink,
  RefreshCw,
  Plus,
  Lock,
  Globe,
  Star,
  GitFork,
  MessageSquare,
  UploadCloud,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { useAppStore } from '@renderer/stores/useAppStore'
import type { GitHubPR, GitHubIssue, GitHubRepo } from '@renderer/types/git'
import { toast } from 'sonner'
import { cn } from '@renderer/lib/utils'

export const GitHubPanel: React.FC = () => {
  const { selectedProjectId } = useGitStore()
  const { projects } = useProjectStore()
  const { setActiveTab } = useAppStore()

  const [githubUser, setGithubUser] = useState<{ login: string; avatar_url?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [repoDetails, setRepoDetails] = useState<GitHubRepo | null>(null)

  // PRs state
  const [prs, setPrs] = useState<GitHubPR[]>([])
  const [prState, setPrState] = useState<'open' | 'closed'>('open')
  const [newPrOpen, setNewPrOpen] = useState(false)
  const [prTitle, setPrTitle] = useState('')
  const [prBody, setPrBody] = useState('')
  const [prHead, setPrHead] = useState('main')
  const [prBase, setPrBase] = useState('main')
  const [isCreatingPr, setIsCreatingPr] = useState(false)

  // Issues state
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [issueState, setIssueState] = useState<'open' | 'closed'>('open')
  const [newIssueOpen, setNewIssueOpen] = useState(false)
  const [issueTitle, setIssueTitle] = useState('')
  const [issueBody, setIssueBody] = useState('')
  const [isCreatingIssue, setIsCreatingIssue] = useState(false)

  // Publish state
  const [publishOpen, setPublishOpen] = useState(false)
  const [publishName, setPublishName] = useState('')
  const [publishDesc, setPublishDesc] = useState('')
  const [publishPrivate, setPublishPrivate] = useState(true)
  const [isPublishing, setIsPublishing] = useState(false)

  const project = projects.find((p) => p.id === selectedProjectId)

  const checkConnection = async () => {
    try {
      setLoading(true)
      if (window.api?.github) {
        const user = await window.api.github.getUser()
        if (user && user.login) {
          setGithubUser(user)
        } else {
          setGithubUser(null)
        }
      }
    } catch {
      setGithubUser(null)
    } finally {
      setLoading(false)
    }
  }

  const loadGitHubData = async () => {
    if (!githubUser || !project) return
    const owner = githubUser.login
    const repoName = project.name

    setLoading(true)
    try {
      // 1. Repo info
      try {
        const details = await window.api.github.getRepo(owner, repoName)
        setRepoDetails(details)
      } catch {
        setRepoDetails(null)
      }

      // 2. PRs
      try {
        const prList = await window.api.github.listPRs(owner, repoName, prState)
        setPrs(prList || [])
      } catch {
        setPrs([])
      }

      // 3. Issues
      try {
        const issueList = await window.api.github.listIssues(owner, repoName, issueState)
        setIssues(issueList || [])
      } catch {
        setIssues([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  useEffect(() => {
    if (githubUser && project) {
      setPublishName(project.name)
      loadGitHubData()
    }
  }, [githubUser?.login, project?.id, prState, issueState])

  const handleCreatePR = async () => {
    if (!githubUser || !project || !prTitle.trim()) return
    setIsCreatingPr(true)
    try {
      await window.api.github.createPR(
        githubUser.login,
        project.name,
        prTitle.trim(),
        prHead,
        prBase,
        prBody.trim() || undefined
      )
      toast.success(`Pull request "${prTitle}" created!`)
      setNewPrOpen(false)
      setPrTitle('')
      setPrBody('')
      loadGitHubData()
    } catch (err: any) {
      toast.error(`Failed to create PR: ${err.message}`)
    } finally {
      setIsCreatingPr(false)
    }
  }

  const handleCreateIssue = async () => {
    if (!githubUser || !project || !issueTitle.trim()) return
    setIsCreatingIssue(true)
    try {
      await window.api.github.createIssue(
        githubUser.login,
        project.name,
        issueTitle.trim(),
        issueBody.trim() || undefined
      )
      toast.success(`Issue "${issueTitle}" opened!`)
      setNewIssueOpen(false)
      setIssueTitle('')
      setIssueBody('')
      loadGitHubData()
    } catch (err: any) {
      toast.error(`Failed to create issue: ${err.message}`)
    } finally {
      setIsCreatingIssue(false)
    }
  }

  const handlePublishRepo = async () => {
    if (!project || !publishName.trim()) return
    setIsPublishing(true)
    try {
      await window.api.github.initAndPush(
        project.path,
        publishName.trim(),
        publishPrivate,
        publishDesc.trim() || undefined
      )
      toast.success(`Repository ${publishName} published & pushed to GitHub!`)
      setPublishOpen(false)
      loadGitHubData()
    } catch (err: any) {
      toast.error(`Failed to publish: ${err.message}`)
    } finally {
      setIsPublishing(false)
    }
  }

  if (!githubUser) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 text-center p-8 flex flex-col justify-center items-center h-full">
        <Github className="w-12 h-12 text-zinc-500 mb-3" />
        <h3 className="text-base font-semibold text-zinc-200 mb-1">Connect to GitHub</h3>
        <p className="text-xs text-zinc-400 mb-4 max-w-sm">
          Add your GitHub Personal Access Token in Settings to unlock automated repository publishing, PR tracking, and issue management.
        </p>
        <Button
          className="bg-violet-600 hover:bg-violet-700 text-xs h-8"
          onClick={() => setActiveTab('settings')}
        >
          Configure GitHub Token
        </Button>
      </Card>
    )
  }

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500 text-sm">
        Select a project from the top dropdown to view its GitHub repository.
      </div>
    )
  }

  const repoFullName = `${githubUser.login}/${project.name}`

  return (
    <div className="space-y-4">
      {/* ── Repo Header & Meta ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-violet-400 font-bold text-xs">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold text-zinc-100">{repoFullName}</CardTitle>
                {repoDetails && (
                  <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0">
                    {repoDetails.private ? (
                      <>
                        <Lock className="w-2.5 h-2.5 text-amber-400" /> Private
                      </>
                    ) : (
                      <>
                        <Globe className="w-2.5 h-2.5 text-emerald-400" /> Public
                      </>
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                Connected as <strong className="text-zinc-300">@{githubUser.login}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!repoDetails ? (
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-xs h-7 gap-1.5"
                onClick={() => setPublishOpen(true)}
              >
                <UploadCloud className="w-3.5 h-3.5" /> Publish to GitHub
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-zinc-800 text-zinc-300 hover:text-white"
                  onClick={() => window.open(repoDetails.html_url, '_blank')}
                >
                  <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Repo
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={loadGitHubData}
              title="Refresh GitHub data"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>

        {repoDetails && (
          <CardContent className="py-2.5 px-4 bg-zinc-900/30 flex items-center gap-6 text-xs text-zinc-400 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              {repoDetails.stargazers_count || 0} stars
            </span>
            <span className="flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-zinc-400" />
              {repoDetails.forks_count || 0} forks
            </span>
            <span className="flex items-center gap-1.5">
              <CircleDot className="w-3.5 h-3.5 text-emerald-400" />
              {repoDetails.open_issues_count || 0} open issues
            </span>
            {repoDetails.description && (
              <span className="text-zinc-300 italic truncate max-w-md">"{repoDetails.description}"</span>
            )}
          </CardContent>
        )}
      </Card>

      {/* ── Two-Column PRs & Issues Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── Pull Requests ── */}
        <Card className="bg-zinc-950 border-zinc-800 flex flex-col h-[420px]">
          <CardHeader className="p-3 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-emerald-400" />
              <CardTitle className="text-xs font-semibold text-zinc-200">Pull Requests</CardTitle>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {prs.length}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <div className="bg-zinc-900 border border-zinc-800 rounded p-0.5 flex text-[10px]">
                <button
                  onClick={() => setPrState('open')}
                  className={cn(
                    'px-1.5 py-0.5 rounded',
                    prState === 'open' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
                  )}
                >
                  Open
                </button>
                <button
                  onClick={() => setPrState('closed')}
                  className={cn(
                    'px-1.5 py-0.5 rounded',
                    prState === 'closed' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
                  )}
                >
                  Closed
                </button>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-violet-400"
                title="New PR"
                onClick={() => setNewPrOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {prs.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No {prState} pull requests found.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {prs.map((pr) => (
                    <div
                      key={pr.id}
                      onClick={() => window.open(pr.html_url, '_blank')}
                      className="p-3 hover:bg-zinc-900/60 transition-colors cursor-pointer space-y-1 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-200 group-hover:text-violet-300 truncate">
                          {pr.title}
                        </p>
                        <span className="font-mono text-[10px] text-zinc-500 shrink-0">#{pr.number}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                        <span>{pr.user?.login}</span>
                        <span>·</span>
                        <span className="font-mono text-zinc-400">{pr.head?.ref} → {pr.base?.ref}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Issues ── */}
        <Card className="bg-zinc-950 border-zinc-800 flex flex-col h-[420px]">
          <CardHeader className="p-3 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-emerald-400" />
              <CardTitle className="text-xs font-semibold text-zinc-200">Issues</CardTitle>
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {issues.length}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <div className="bg-zinc-900 border border-zinc-800 rounded p-0.5 flex text-[10px]">
                <button
                  onClick={() => setIssueState('open')}
                  className={cn(
                    'px-1.5 py-0.5 rounded',
                    issueState === 'open' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
                  )}
                >
                  Open
                </button>
                <button
                  onClick={() => setIssueState('closed')}
                  className={cn(
                    'px-1.5 py-0.5 rounded',
                    issueState === 'closed' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400'
                  )}
                >
                  Closed
                </button>
              </div>

              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-violet-400"
                title="New Issue"
                onClick={() => setNewIssueOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {issues.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No {issueState} issues found.
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/50">
                  {issues.map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => window.open(issue.html_url, '_blank')}
                      className="p-3 hover:bg-zinc-900/60 transition-colors cursor-pointer space-y-1.5 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-200 group-hover:text-violet-300 truncate">
                          {issue.title}
                        </p>
                        <span className="font-mono text-[10px] text-zinc-500 shrink-0">#{issue.number}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Opened by {issue.user?.login}</span>
                        {issue.comments > 0 && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" /> {issue.comments}
                          </span>
                        )}
                      </div>
                      {issue.labels && issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {issue.labels.map((l) => (
                            <span
                              key={l.name}
                              className="text-[9px] px-1.5 py-0.2 rounded font-medium"
                              style={{ backgroundColor: `#${l.color}25`, color: `#${l.color}` }}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* ── New PR Modal ── */}
      <Dialog open={newPrOpen} onOpenChange={setNewPrOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-emerald-400" /> New Pull Request
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Submit a pull request to {repoFullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">PR Title</label>
              <Input
                placeholder="Brief summary of changes…"
                value={prTitle}
                onChange={(e) => setPrTitle(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-zinc-400">Head branch (Source)</label>
                <Input
                  value={prHead}
                  onChange={(e) => setPrHead(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400">Base branch (Target)</label>
                <Input
                  value={prBase}
                  onChange={(e) => setPrBase(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">Description (Optional)</label>
              <textarea
                rows={3}
                placeholder="Explain the background and motivation…"
                value={prBody}
                onChange={(e) => setPrBody(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setNewPrOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isCreatingPr || !prTitle.trim()}
              onClick={handleCreatePR}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs"
            >
              {isCreatingPr ? 'Creating…' : 'Create Pull Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── New Issue Modal ── */}
      <Dialog open={newIssueOpen} onOpenChange={setNewIssueOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <CircleDot className="w-4 h-4 text-emerald-400" /> New Issue
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Create an issue in {repoFullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">Title</label>
              <Input
                placeholder="Issue title…"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">Description (Optional)</label>
              <textarea
                rows={4}
                placeholder="Detailed bug report or feature request…"
                value={issueBody}
                onChange={(e) => setIssueBody(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setNewIssueOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isCreatingIssue || !issueTitle.trim()}
              onClick={handleCreateIssue}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs"
            >
              {isCreatingIssue ? 'Submitting…' : 'Submit Issue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Publish Repository Modal ── */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-violet-400" /> Publish Repository to GitHub
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Initializes a repository on your GitHub account and pushes this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">Repository Name</label>
              <Input
                value={publishName}
                onChange={(e) => setPublishName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <label className="text-zinc-300 font-medium">Description</label>
              <Input
                placeholder="Optional project description…"
                value={publishDesc}
                onChange={(e) => setPublishDesc(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="private-check"
                className="w-4 h-4 accent-violet-500 rounded"
                checked={publishPrivate}
                onChange={(e) => setPublishPrivate(e.target.checked)}
              />
              <label htmlFor="private-check" className="text-xs text-zinc-300 cursor-pointer">
                Private Repository (only visible to you)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={isPublishing || !publishName.trim()}
              onClick={handlePublishRepo}
              className="bg-violet-600 hover:bg-violet-700 text-xs gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              {isPublishing ? 'Publishing…' : 'Publish & Push'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
