import React, { useState, useEffect } from 'react'
import { Archive, Plus, Trash2, Play, ArrowDownToLine, RefreshCw, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { toast } from 'sonner'

export const GitStash: React.FC = () => {
  const {
    selectedProjectId,
    stashes,
    loadStashes,
    pushStash,
    popStash,
    applyStash,
    dropStash
  } = useGitStore()

  const projects = useProjectStore((s) => s.projects)
  const project = projects.find((p) => p.id === selectedProjectId)

  const [stashMessage, setStashMessage] = useState('')
  const [isStashing, setIsStashing] = useState(false)

  useEffect(() => {
    if (project?.path) {
      loadStashes(project.path)
    }
  }, [project?.id])

  const handleRefresh = () => {
    if (project?.path) {
      loadStashes(project.path)
      toast.info('Refreshed stashes')
    }
  }

  const handleCreateStash = async () => {
    if (!project?.path) return
    setIsStashing(true)
    try {
      await pushStash(project.id, project.path, stashMessage.trim() || undefined)
      setStashMessage('')
      toast.success('Working changes stashed')
    } catch (err: any) {
      toast.error(`Failed to stash: ${err.message}`)
    } finally {
      setIsStashing(false)
    }
  }

  const handlePop = async (index: number) => {
    if (!project?.path) return
    await popStash(project.id, project.path, index)
    toast.success(`Popped stash@{${index}}`)
  }

  const handleApply = async (index: number) => {
    if (!project?.path) return
    await applyStash(project.id, project.path, index)
    toast.success(`Applied stash@{${index}}`)
  }

  const handleDrop = async (index: number) => {
    if (!project?.path) return
    if (window.confirm(`Delete stash@{${index}} permanently?`)) {
      await dropStash(project.path, index)
      toast.info(`Deleted stash@{${index}}`)
    }
  }

  if (!project) {
    return (
      <div className="flex h-48 items-center justify-center text-zinc-500">
        <p className="text-sm">Select a project to manage stashes</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ── Create New Stash ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Archive className="w-4 h-4 text-violet-400" />
            Stash Changes
          </CardTitle>
          <CardDescription className="text-xs">
            Shelve uncommitted changes to work on something else, then re-apply them anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Optional stash message (e.g. WIP on auth layout)…"
              value={stashMessage}
              onChange={(e) => setStashMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateStash()}
              className="h-9 text-xs bg-zinc-900 border-zinc-800 flex-1"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={isStashing}
              onClick={handleCreateStash}
              className="border-zinc-700 hover:border-violet-500 shrink-0 text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Stash
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Stashes List ── */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Archive className="w-4 h-4 text-zinc-400" />
            Saved Stashes
            <Badge variant="outline" className="text-[10px] ml-1">
              {stashes.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            title="Refresh stashes"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-64">
            {stashes.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No stashes found for this repository.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/50">
                {stashes.map((s) => (
                  <div
                    key={s.index}
                    className="p-3 hover:bg-zinc-900/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono text-[10px] bg-violet-950/60 text-violet-300">
                          stash@{`{${s.index}}`}
                        </Badge>
                        <span className="text-xs font-medium text-zinc-200 truncate">
                          {s.message}
                        </span>
                      </div>
                      {s.date && (
                        <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {s.date}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2 border-zinc-800 text-violet-300 hover:text-white"
                        title="Apply stash (keeps stash in list)"
                        onClick={() => handleApply(s.index)}
                      >
                        <Play className="w-3 h-3 mr-1" /> Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] px-2 border-zinc-800 text-emerald-300 hover:text-white"
                        title="Pop stash (applies and deletes from stash list)"
                        onClick={() => handlePop(s.index)}
                      >
                        <ArrowDownToLine className="w-3 h-3 mr-1" /> Pop
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-zinc-500 hover:text-rose-400"
                        title="Delete stash"
                        onClick={() => handleDrop(s.index)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
