import React, { useMemo, useState } from 'react'
import { Plus, Minus, RotateCcw, Copy, X, Check, FileCode, Loader2, Columns, AlignJustify } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { toast } from 'sonner'
import { cn } from '@renderer/lib/utils'

const MAX_INITIAL_LINES = 1000

export const GitDiff: React.FC = () => {
  const {
    selectedProjectId,
    selectedFile,
    activeDiff,
    isDiffLoading,
    stageFile,
    unstageFile,
    discardChanges,
    clearDiff
  } = useGitStore()
  
  const projects = useProjectStore((s) => s.projects)
  const project = projects.find((p) => p.id === selectedProjectId)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified')
  const [showAllLines, setShowAllLines] = useState(false)

  const handleCopy = () => {
    if (activeDiff?.diffText) {
      navigator.clipboard.writeText(activeDiff.diffText)
      setCopied(true)
      toast.success('Diff copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleStageToggle = async () => {
    if (!project || !selectedFile || !activeDiff) return
    if (activeDiff.isStaged) {
      await unstageFile(project.id, project.path, selectedFile)
      toast.info(`Unstaged ${selectedFile}`)
    } else {
      await stageFile(project.id, project.path, selectedFile)
      toast.success(`Staged ${selectedFile}`)
    }
  }

  const handleDiscard = async () => {
    if (!project || !selectedFile) return
    if (window.confirm(`Discard all changes in "${selectedFile}"?\nThis cannot be undone.`)) {
      await discardChanges(project.id, project.path, selectedFile)
      toast.info(`Discarded changes in ${selectedFile}`)
    }
  }

  // Memoized diff line parser
  const parsedDiff = useMemo(() => {
    if (!activeDiff?.diffText) return []
    const lines = activeDiff.diffText.split('\n')
    let oldLine = 0
    let newLine = 0

    return lines.map((line, idx) => {
      let type: 'header' | 'hunk' | 'add' | 'del' | 'context' = 'context'
      let oldNum = ''
      let newNum = ''

      if (line.startsWith('@@')) {
        type = 'hunk'
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
        if (match) {
          oldLine = parseInt(match[1], 10)
          newLine = parseInt(match[2], 10)
        }
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        type = 'add'
        newNum = String(newLine++)
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        type = 'del'
        oldNum = String(oldLine++)
      } else if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
        type = 'header'
      } else if (line.length > 0) {
        type = 'context'
        oldNum = String(oldLine++)
        newNum = String(newLine++)
      }

      return { id: idx, type, line, oldNum, newNum }
    })
  }, [activeDiff?.diffText])

  const visibleLines = showAllLines ? parsedDiff : parsedDiff.slice(0, MAX_INITIAL_LINES)

  if (!selectedFile || !activeDiff) {
    return (
      <Card className="h-full flex flex-col bg-zinc-950 border-zinc-800">
        <CardHeader className="pb-3 border-b border-zinc-800">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-400">
            <FileCode className="w-4 h-4" /> Diff Viewer
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center p-6 text-center text-zinc-500">
          <div className="space-y-2 max-w-xs">
            <FileCode className="w-10 h-10 mx-auto text-zinc-700" />
            <p className="text-sm font-medium text-zinc-300">No file selected</p>
            <p className="text-xs text-zinc-500">
              Click on any modified, staged, or untracked file to view line-by-line syntax diffs.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full flex flex-col bg-zinc-950 border-zinc-800">
      <CardHeader className="py-2 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-violet-400 shrink-0" />
          <span className="font-mono text-xs font-semibold text-zinc-200 truncate" title={activeDiff.file}>
            {activeDiff.file}
          </span>
          <Badge
            variant="outline"
            className={cn(
              'text-[10px] px-1.5 py-0 shrink-0',
              activeDiff.isStaged ? 'border-emerald-500 text-emerald-400' : 'border-amber-500 text-amber-400'
            )}
          >
            {activeDiff.isStaged ? 'Staged' : 'Unstaged'}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[10px]">
            <button
              onClick={() => setViewMode('unified')}
              className={cn(
                'px-2 py-0.5 rounded transition-colors flex items-center gap-1',
                viewMode === 'unified' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              )}
              title="Unified vertical diff"
            >
              <AlignJustify className="w-3 h-3" />
              Unified
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                'px-2 py-0.5 rounded transition-colors flex items-center gap-1',
                viewMode === 'split' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              )}
              title="Side-by-side split diff"
            >
              <Columns className="w-3 h-3" />
              Split
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            className={cn(
              'h-7 text-xs px-2 gap-1 border-zinc-700',
              activeDiff.isStaged ? 'text-amber-300 hover:text-amber-200' : 'text-emerald-300 hover:text-emerald-200'
            )}
            onClick={handleStageToggle}
          >
            {activeDiff.isStaged ? (
              <>
                <Minus className="w-3.5 h-3.5" /> Unstage
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Stage
              </>
            )}
          </Button>

          {!activeDiff.isStaged && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
              title="Discard changes"
              onClick={handleDiscard}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Discard
            </Button>
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
            title="Copy Diff"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
            title="Close Diff"
            onClick={clearDiff}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full w-full p-2">
          {isDiffLoading ? (
            <div className="flex items-center justify-center h-48 text-zinc-500 gap-2 font-mono text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
              <span>Loading syntax diff…</span>
            </div>
          ) : viewMode === 'unified' ? (
            <div className="font-mono">
              {visibleLines.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex font-mono text-xs leading-5 border-l-2 select-text',
                    item.type === 'hunk' && 'bg-violet-950/30 text-violet-300 border-violet-500 font-semibold py-1 my-1',
                    item.type === 'add' && 'bg-emerald-950/35 text-emerald-200 border-emerald-500',
                    item.type === 'del' && 'bg-rose-950/35 text-rose-300 border-rose-500',
                    item.type === 'header' && 'bg-zinc-900 text-zinc-400 border-transparent text-[11px]',
                    item.type === 'context' && 'text-zinc-300 border-transparent hover:bg-zinc-900/60'
                  )}
                >
                  {item.type !== 'header' && item.type !== 'hunk' && (
                    <div className="flex shrink-0 select-none text-zinc-600 w-16 text-right pr-2 space-x-1 border-r border-zinc-800/60">
                      <span className="w-7">{item.oldNum}</span>
                      <span className="w-7 text-zinc-500">{item.newNum}</span>
                    </div>
                  )}
                  <div className="px-2 whitespace-pre overflow-x-auto flex-1">{item.line}</div>
                </div>
              ))}
            </div>
          ) : (
            /* Split Side-by-Side Mode */
            <div className="font-mono text-xs divide-y divide-zinc-800/40">
              {visibleLines.map((item) => (
                <div key={item.id} className="grid grid-cols-2 divide-x divide-zinc-800">
                  {/* Left (Old) */}
                  <div
                    className={cn(
                      'flex items-start px-2 py-0.5 overflow-x-auto whitespace-pre',
                      item.type === 'del' ? 'bg-rose-950/30 text-rose-300' : item.type === 'add' ? 'bg-zinc-950/40 opacity-30' : 'text-zinc-300'
                    )}
                  >
                    <span className="w-7 text-zinc-600 select-none shrink-0 text-right pr-2">{item.oldNum}</span>
                    <span className="flex-1">{item.type === 'del' || item.type === 'context' ? item.line : ''}</span>
                  </div>

                  {/* Right (New) */}
                  <div
                    className={cn(
                      'flex items-start px-2 py-0.5 overflow-x-auto whitespace-pre',
                      item.type === 'add' ? 'bg-emerald-950/30 text-emerald-200' : item.type === 'del' ? 'bg-zinc-950/40 opacity-30' : 'text-zinc-300'
                    )}
                  >
                    <span className="w-7 text-zinc-600 select-none shrink-0 text-right pr-2">{item.newNum}</span>
                    <span className="flex-1">{item.type === 'add' || item.type === 'context' ? item.line : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {parsedDiff.length > MAX_INITIAL_LINES && !showAllLines && (
            <div className="p-4 text-center">
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-zinc-800 bg-zinc-900"
                onClick={() => setShowAllLines(true)}
              >
                Show remaining {parsedDiff.length - MAX_INITIAL_LINES} lines
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
