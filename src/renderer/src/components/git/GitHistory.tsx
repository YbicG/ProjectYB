import React, { useEffect, useState } from 'react'
import { GitCommit as GitCommitIcon, Search, RefreshCw, Copy, Check, Clock, User, Hash, FileCode, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { toast } from 'sonner'
import { cn } from '@renderer/lib/utils'

export const GitHistory: React.FC = () => {
  const {
    selectedProjectId,
    commits,
    loadHistory,
    loadCommitDiff,
    activeDiff,
    isDiffLoading
  } = useGitStore()

  const projects = useProjectStore((s) => s.projects)
  const project = projects.find((p) => p.id === selectedProjectId)

  const [search, setSearch] = useState('')
  const [selectedCommitHash, setSelectedCommitHash] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)
  const [limit, setLimit] = useState(50)

  useEffect(() => {
    if (project?.path) {
      loadHistory(project.path, limit)
    }
  }, [project?.id, limit])

  const handleRefresh = () => {
    if (project?.path) {
      loadHistory(project.path, limit)
      toast.info('Refreshed commit history')
    }
  }

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(hash)
    toast.success('Commit hash copied')
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const handleSelectCommit = (hash: string) => {
    setSelectedCommitHash(hash)
    if (project?.path) {
      loadCommitDiff(project.path, hash)
    }
  }

  const filteredCommits = commits.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.message.toLowerCase().includes(q) ||
      c.author.toLowerCase().includes(q) ||
      c.hash.toLowerCase().includes(q) ||
      c.hashShort.toLowerCase().includes(q)
    )
  })

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center text-zinc-500">
        <p className="text-sm">Select a project to view commit history</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
      {/* ── Commit Timeline (Left / 7 cols) ── */}
      <Card className="lg:col-span-6 flex flex-col bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitCommitIcon className="w-4 h-4 text-violet-400" />
              Commit Log
              <Badge variant="outline" className="text-[10px] ml-1">
                {filteredCommits.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-zinc-900 border border-zinc-800 text-xs rounded px-2 py-1 text-zinc-300 outline-none"
              >
                <option value={25}>25 commits</option>
                <option value={50}>50 commits</option>
                <option value={100}>100 commits</option>
                <option value={200}>200 commits</option>
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRefresh}
                title="Refresh history"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="relative mt-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <Input
              placeholder="Filter by message, author, or commit hash…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-800"
            />
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-[520px]">
            {filteredCommits.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No commits found matching query.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {filteredCommits.map((commit) => {
                  const isSelected = selectedCommitHash === commit.hash
                  return (
                    <div
                      key={commit.hash}
                      onClick={() => handleSelectCommit(commit.hash)}
                      className={cn(
                        'p-3 hover:bg-zinc-900/70 transition-colors cursor-pointer flex items-start gap-3 group',
                        isSelected && 'bg-violet-950/25 border-l-2 border-violet-500'
                      )}
                    >
                      <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-violet-400 font-bold text-xs">
                        {commit.author ? commit.author.charAt(0).toUpperCase() : 'G'}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-zinc-200 truncate group-hover:text-violet-300 transition-colors">
                            {commit.message}
                          </p>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0 group-hover:text-zinc-400" />
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 flex-wrap">
                          <span className="flex items-center gap-1 text-zinc-400">
                            <User className="w-3 h-3" />
                            {commit.author}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {commit.date}
                          </span>
                        </div>

                        {commit.refs && (
                          <div className="pt-1 flex flex-wrap gap-1">
                            {commit.refs.split(',').map((ref) => (
                              <Badge key={ref} variant="secondary" className="text-[9px] px-1 py-0 bg-violet-950/50 text-violet-300">
                                {ref.trim()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopyHash(commit.hash)
                        }}
                        className="shrink-0 font-mono text-[10px] bg-zinc-900 hover:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 hover:text-zinc-200 border border-zinc-800 flex items-center gap-1"
                        title="Copy commit hash"
                      >
                        <Hash className="w-2.5 h-2.5 text-zinc-500" />
                        {commit.hashShort}
                        {copiedHash === commit.hash ? (
                          <Check className="w-2.5 h-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-2.5 h-2.5 text-zinc-500 opacity-0 group-hover:opacity-100" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── Commit Diff Inspector (Right / 5 cols) ── */}
      <Card className="lg:col-span-6 flex flex-col bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCode className="w-4 h-4 text-violet-400" />
            Commit Details & Diff
          </CardTitle>
          <CardDescription className="text-xs">
            {selectedCommitHash ? `Inspect changes in commit ${selectedCommitHash.substring(0, 7)}` : 'Select a commit from the log to view changes.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          {selectedCommitHash && activeDiff ? (
            <ScrollArea className="h-[520px] p-3 font-mono text-xs">
              <pre className="text-zinc-300 whitespace-pre-wrap leading-5">
                {activeDiff.diffText.split('\n').map((line, i) => {
                  let cls = 'text-zinc-300'
                  if (line.startsWith('+') && !line.startsWith('+++')) cls = 'text-emerald-300 bg-emerald-950/30'
                  else if (line.startsWith('-') && !line.startsWith('---')) cls = 'text-rose-300 bg-rose-950/30'
                  else if (line.startsWith('@@')) cls = 'text-violet-400 bg-violet-950/40 font-bold'
                  else if (line.startsWith('commit') || line.startsWith('Author:') || line.startsWith('Date:')) cls = 'text-zinc-400 font-semibold'
                  return (
                    <div key={i} className={cls}>
                      {line}
                    </div>
                  )
                })}
              </pre>
            </ScrollArea>
          ) : (
            <div className="h-[520px] flex flex-col items-center justify-center p-6 text-center text-zinc-500">
              <GitCommitIcon className="w-10 h-10 mb-2 text-zinc-800" />
              <p className="text-sm font-medium text-zinc-400">No Commit Selected</p>
              <p className="text-xs text-zinc-600 mt-1 max-w-xs">
                Click any commit on the left to see its full commit message, files changed, and git patch.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
