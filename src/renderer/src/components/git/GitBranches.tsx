import React, { useEffect, useState } from 'react'
import {
  GitBranch as GitBranchIcon,
  GitCommit,
  GitMerge,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  AlertTriangle,
  Check
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
import { cn } from '@renderer/lib/utils'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { toast } from 'sonner'

interface Branch {
  name: string
  current: boolean
}

export const GitBranches: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([])
  const [search, setSearch] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')

  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [selectedMergeBranch, setSelectedMergeBranch] = useState('')
  const [isMerging, setIsMerging] = useState(false)
  const [mergeConflicts, setMergeConflicts] = useState<string[]>([])

  const { selectedProjectId, mergeBranch, fetchStatus } = useGitStore()
  const { projects } = useProjectStore()

  const project = projects.find((p) => p.id === selectedProjectId)
  const currentBranch = branches.find((b) => b.current)?.name || 'main'

  const loadBranches = async () => {
    if (!project?.path) return
    try {
      const result = await window.api.git.branches(project.path)
      const formattedBranches = (result.all || []).map((name: string) => ({
        name,
        current: name === result.current
      }))
      setBranches(formattedBranches)
    } catch (error) {
      console.error('Failed to load branches', error)
    }
  }

  useEffect(() => {
    if (project) {
      loadBranches()
    } else {
      setBranches([])
    }
  }, [project?.path])

  const handleCheckout = async (name: string) => {
    if (!project) return
    try {
      await window.api.git.checkout(project.path, name)
      await loadBranches()
      await fetchStatus(project.id, project.path)
      toast.success(`Switched to branch "${name}"`)
    } catch (error: any) {
      toast.error(`Checkout failed: ${error.message}`)
    }
  }

  const handleCreate = async () => {
    if (!project || !newBranchName.trim()) return
    const name = newBranchName.trim()
    try {
      await window.api.git.checkout(project.path, name, true)
      await loadBranches()
      await fetchStatus(project.id, project.path)
      setNewBranchName('')
      setCreateDialogOpen(false)
      toast.success(`Created & checked out branch "${name}"`)
    } catch (error: any) {
      toast.error(`Failed to create branch: ${error.message}`)
    }
  }

  const handleDelete = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    if (!project) return
    if (window.confirm(`Delete branch "${name}"?`)) {
      try {
        await window.api.git.deleteBranch(project.path, name)
        await loadBranches()
        toast.info(`Deleted branch "${name}"`)
      } catch (error: any) {
        toast.error(`Failed to delete branch: ${error.message}`)
      }
    }
  }

  const handleExecuteMerge = async () => {
    if (!project || !selectedMergeBranch) return
    setIsMerging(true)
    setMergeConflicts([])
    try {
      const res = await mergeBranch(project.id, project.path, selectedMergeBranch)
      if (res.success) {
        toast.success(`Successfully merged "${selectedMergeBranch}" into "${currentBranch}"`)
        setMergeDialogOpen(false)
        await loadBranches()
      } else {
        if (res.conflicts && res.conflicts.length > 0) {
          setMergeConflicts(res.conflicts)
          toast.error(`Merge conflict in ${res.conflicts.length} files`)
        } else {
          toast.error(res.error || 'Merge failed')
        }
      }
    } catch (err: any) {
      toast.error(`Merge failed: ${err.message}`)
    } finally {
      setIsMerging(false)
    }
  }

  const handleAbortMerge = async () => {
    if (!project) return
    try {
      await window.api.git.abortMerge(project.path)
      setMergeConflicts([])
      setMergeDialogOpen(false)
      await fetchStatus(project.id, project.path)
      toast.info('Merge aborted and working tree restored')
    } catch (err: any) {
      toast.error(`Failed to abort merge: ${err.message}`)
    }
  }

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  const otherBranches = branches.filter((b) => !b.current)

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-950 flex flex-col border-zinc-800">
        <CardHeader className="p-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranchIcon className="w-4 h-4 text-violet-400" />
              <CardTitle className="text-sm font-semibold text-zinc-200">Branches</CardTitle>
              <Badge variant="outline" className="text-[10px] ml-1">
                {branches.length}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1 border-zinc-700 text-violet-300"
                onClick={() => {
                  setSelectedMergeBranch(otherBranches[0]?.name || '')
                  setMergeDialogOpen(true)
                }}
                disabled={!project || otherBranches.length === 0}
              >
                <GitMerge className="w-3.5 h-3.5" /> Merge
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2 gap-1 border-zinc-700 hover:border-violet-500"
                onClick={() => setCreateDialogOpen(true)}
                disabled={!project}
              >
                <Plus className="w-3.5 h-3.5" /> New Branch
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={loadBranches}
                title="Refresh branches"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="relative mt-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <Input
              placeholder="Search branches…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-800"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-64">
            <div className="p-2 space-y-1">
              {filteredBranches.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500">
                  {project ? 'No branches match search' : 'Select a project to view branches'}
                </div>
              ) : (
                filteredBranches.map((branch) => {
                  const isCurrent = branch.current
                  return (
                    <div
                      key={branch.name}
                      onClick={() => !isCurrent && handleCheckout(branch.name)}
                      className={cn(
                        'group flex items-center justify-between p-2 rounded-md transition-colors cursor-pointer text-xs',
                        isCurrent
                          ? 'bg-violet-950/40 text-violet-300 border border-violet-500/30 font-semibold'
                          : 'text-zinc-300 hover:bg-zinc-900 border border-transparent'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {isCurrent ? (
                          <Check className="w-4 h-4 text-violet-400" />
                        ) : (
                          <GitBranchIcon className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
                        )}
                        <span className="font-mono truncate">{branch.name}</span>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-violet-900/60 text-violet-200">
                            current HEAD
                          </Badge>
                        )}
                      </div>

                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-rose-400"
                          title={`Delete branch ${branch.name}`}
                          onClick={(e) => handleDelete(e, branch.name)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ── Create Branch Dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-violet-400" /> New Branch
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Branch off from <code className="text-violet-300 font-mono">{currentBranch}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="feature/auth-provider, bugfix/layout…"
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="bg-zinc-900 border-zinc-800 text-xs font-mono"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newBranchName.trim()}>
              Create & Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Merge Branch Dialog ── */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-violet-400" /> Merge Branch
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Merge changes from another branch into current branch: <strong className="text-violet-300 font-mono">{currentBranch}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Select branch to merge in:</label>
              <select
                value={selectedMergeBranch}
                onChange={(e) => setSelectedMergeBranch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-violet-500 font-mono"
              >
                {otherBranches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {mergeConflicts.length > 0 && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs space-y-1 text-rose-300">
                <div className="flex items-center gap-1.5 font-semibold text-rose-400">
                  <AlertTriangle className="w-4 h-4" /> Merge Conflicts Detected
                </div>
                <p>The following files contain conflicts that require resolution:</p>
                <ul className="list-disc list-inside font-mono text-[11px] pt-1">
                  {mergeConflicts.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between">
            {mergeConflicts.length > 0 ? (
              <Button
                variant="outline"
                size="sm"
                className="border-rose-800 text-rose-400 hover:bg-rose-950/30 text-xs"
                onClick={handleAbortMerge}
              >
                Abort Merge
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMergeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isMerging || !selectedMergeBranch}
                onClick={handleExecuteMerge}
                className="bg-violet-600 hover:bg-violet-700 gap-1.5"
              >
                <GitMerge className="w-3.5 h-3.5" />
                {isMerging ? 'Merging…' : `Merge into ${currentBranch}`}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
