import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { GitCompare, ArrowRightLeft, Check, AlertCircle, Plus, Copy, Eye, EyeOff } from 'lucide-react'
import { useEnvStore } from '@renderer/stores/useEnvStore'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'

interface EnvCompareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EnvCompareDialog: React.FC<EnvCompareDialogProps> = ({ open, onOpenChange }) => {
  const {
    envFiles,
    activeFilePath,
    comparisonResult,
    isComparing,
    compareEnvs,
    syncMissingKeys
  } = useEnvStore()

  const [targetFile, setTargetFile] = useState<string>('')
  const [selectedKeysToSync, setSelectedKeysToSync] = useState<string[]>([])
  const [showValues, setShowValues] = useState(false)

  React.useEffect(() => {
    if (open && activeFilePath && envFiles.length > 0) {
      const example = envFiles.find((f) => f.isExample && f.path !== activeFilePath)
      if (example) {
        setTargetFile(example.path)
        compareEnvs(activeFilePath, example.path)
      } else {
        const other = envFiles.find((f) => f.path !== activeFilePath)
        if (other) {
          setTargetFile(other.path)
          compareEnvs(activeFilePath, other.path)
        }
      }
    }
  }, [open, activeFilePath, envFiles])

  const handleStartCompare = () => {
    if (activeFilePath && targetFile) {
      compareEnvs(activeFilePath, targetFile)
    }
  }

  const handleToggleSelectKey = (k: string) => {
    setSelectedKeysToSync((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    )
  }

  const handleSelectAllMissing = () => {
    if (!comparisonResult) return
    setSelectedKeysToSync(comparisonResult.missingInB)
  }

  const handleExecuteSync = async () => {
    if (!comparisonResult || selectedKeysToSync.length === 0) return
    const success = await syncMissingKeys(
      comparisonResult.fileAPath,
      comparisonResult.fileBPath,
      selectedKeysToSync
    )
    if (success) {
      setSelectedKeysToSync([])
    }
  }

  const currentFileName = activeFilePath ? activeFilePath.split(/[\\/]/).pop() : 'Source File'
  const targetFileName = targetFile ? targetFile.split(/[\\/]/).pop() : 'Target File'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-violet-400" />
              <DialogTitle className="text-base font-bold">Compare & Sync .env Files</DialogTitle>
            </div>
            {comparisonResult && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowValues(!showValues)}
                  className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  {showValues ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                  {showValues ? 'Mask Values' : 'Show Values'}
                </Button>
              </div>
            )}
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Compare environment variables between environments (e.g. <code>.env</code> vs <code>.env.example</code>) and sync missing keys with one click.
          </DialogDescription>

          {/* File selector bar */}
          <div className="flex items-center gap-3 pt-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs font-mono bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800">
              <span className="text-zinc-500">Source:</span>
              <span className="font-semibold text-emerald-400">{currentFileName}</span>
            </div>

            <ArrowRightLeft className="w-4 h-4 text-zinc-600" />

            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500 font-mono">Target:</span>
              <select
                value={targetFile}
                onChange={(e) => {
                  setTargetFile(e.target.value)
                  if (activeFilePath && e.target.value) {
                    compareEnvs(activeFilePath, e.target.value)
                  }
                }}
                className="bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="">Select target .env…</option>
                {envFiles
                  .filter((f) => f.path !== activeFilePath)
                  .map((f) => (
                    <option key={f.path} value={f.path}>
                      {f.relativePath} {f.isExample ? '(example)' : ''}
                    </option>
                  ))}
              </select>

              <Button
                size="sm"
                variant="outline"
                disabled={!targetFile || isComparing}
                onClick={handleStartCompare}
                className="h-8 text-xs border-zinc-700 ml-1"
              >
                {isComparing ? 'Comparing…' : 'Run Diff'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-[350px]">
          {!comparisonResult ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-center space-y-2">
              <GitCompare className="w-10 h-10 text-zinc-800" />
              <p className="text-sm font-medium text-zinc-400">Select a target file to view difference</p>
              <p className="text-xs text-zinc-600 max-w-sm">
                Choose another <code>.env</code> file (like <code>.env.example</code> or <code>.env.production</code>) to compare keys.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full space-y-3">
              {/* Summary Stats */}
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <Badge variant="outline" className="bg-emerald-950/40 border-emerald-800 text-emerald-300 font-mono">
                  {comparisonResult.matchingCount} Matched
                </Badge>
                <Badge variant="outline" className="bg-amber-950/40 border-amber-800 text-amber-300 font-mono">
                  {comparisonResult.missingInB.length} Missing in {comparisonResult.fileBName}
                </Badge>
                <Badge variant="outline" className="bg-blue-950/40 border-blue-800 text-blue-300 font-mono">
                  {comparisonResult.missingInA.length} Missing in {comparisonResult.fileAName}
                </Badge>
                {comparisonResult.mismatches.length > 0 && (
                  <Badge variant="outline" className="bg-violet-950/40 border-violet-800 text-violet-300 font-mono">
                    {comparisonResult.mismatches.length} Different Values
                  </Badge>
                )}

                {comparisonResult.missingInB.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSelectAllMissing}
                    className="h-6 text-[11px] text-amber-400 hover:text-amber-300 ml-auto"
                  >
                    Select All Missing ({comparisonResult.missingInB.length})
                  </Button>
                )}
              </div>

              {/* Table of Diff items */}
              <div className="flex-1 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40 flex flex-col">
                <div className="grid grid-cols-12 gap-2 p-2.5 bg-zinc-900 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <span className="col-span-4">Variable Name</span>
                  <span className="col-span-3">{comparisonResult.fileAName}</span>
                  <span className="col-span-3">{comparisonResult.fileBName}</span>
                  <span className="col-span-2 text-right">Status / Action</span>
                </div>

                <ScrollArea className="flex-1 max-h-[300px]">
                  <div className="divide-y divide-zinc-800/60">
                    {comparisonResult.items.map((item) => {
                      const isMissingInB = item.status === 'onlyA'
                      const isSelected = selectedKeysToSync.includes(item.key)

                      return (
                        <div
                          key={item.key}
                          className={cn(
                            'grid grid-cols-12 gap-2 p-2.5 text-xs items-center font-mono transition-colors',
                            isMissingInB ? 'bg-amber-950/15 hover:bg-amber-950/25' : 'hover:bg-zinc-900/60',
                            isSelected && 'bg-violet-950/30'
                          )}
                        >
                          <div className="col-span-4 font-semibold text-zinc-200 flex items-center gap-2 truncate">
                            {isMissingInB && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectKey(item.key)}
                                className="accent-violet-500 rounded bg-zinc-900 border-zinc-800"
                              />
                            )}
                            <span title={item.key} className="truncate">{item.key}</span>
                          </div>

                          <div className="col-span-3 text-zinc-400 truncate font-mono text-[11px]">
                            {item.valA !== undefined ? (
                              showValues ? item.valA : '••••••••'
                            ) : (
                              <span className="text-zinc-600 italic">(missing)</span>
                            )}
                          </div>

                          <div className="col-span-3 text-zinc-400 truncate font-mono text-[11px]">
                            {item.valB !== undefined ? (
                              showValues ? item.valB : '••••••••'
                            ) : (
                              <span className="text-amber-400/80 italic font-semibold">(missing in target)</span>
                            )}
                          </div>

                          <div className="col-span-2 text-right">
                            {item.status === 'match' && (
                              <span className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                                <Check className="w-3 h-3" /> Match
                              </span>
                            )}
                            {item.status === 'mismatch' && (
                              <span className="text-[10px] text-violet-400 font-semibold">
                                Different
                              </span>
                            )}
                            {item.status === 'onlyA' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleSelectKey(item.key)}
                                className={cn(
                                  "h-6 text-[10px] px-2",
                                  isSelected ? "bg-violet-600 text-white" : "text-amber-400 hover:text-amber-300"
                                )}
                              >
                                {isSelected ? 'Selected' : '+ Sync'}
                              </Button>
                            )}
                            {item.status === 'onlyB' && (
                              <span className="text-[10px] text-blue-400">
                                Target only
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {comparisonResult && selectedKeysToSync.length > 0 && (
            <Button
              size="sm"
              onClick={handleExecuteSync}
              className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy {selectedKeysToSync.length} Missing Key(s) to {targetFileName}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
