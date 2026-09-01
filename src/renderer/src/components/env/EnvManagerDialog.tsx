import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import {
  Lock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Copy,
  Check,
  FileCode,
  GitCompare,
  Sparkles,
  Save,
  Search,
  Key,
  Shield,
  KeyRound,
  ArrowUpRight,
  HelpCircle
} from 'lucide-react'
import { useEnvStore } from '@renderer/stores/useEnvStore'
import { useAppStore } from '@renderer/stores/useAppStore'
import { useSecretVaultStore } from '@renderer/stores/useSecretVaultStore'
import { EnvCompareDialog } from './EnvCompareDialog'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'
import type { EnvEntry } from '@renderer/types/env'

interface EnvManagerDialogProps {
  projectPath: string
  projectName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EnvManagerDialog: React.FC<EnvManagerDialogProps> = ({
  projectPath,
  projectName,
  open,
  onOpenChange
}) => {
  const {
    envFiles,
    activeFilePath,
    activeEntries,
    rawContent,
    isLoading,
    isSaving,
    revealedKeys,
    revealAll,
    loadEnvFiles,
    loadEnvFile,
    saveEnvFile,
    generateExample,
    toggleSecretReveal,
    setRevealAll,
    updateEntry,
    addEntry,
    deleteEntry,
    setRawContent
  } = useEnvStore()

  const [activeTab, setActiveTab] = useState<'visual' | 'raw'>('visual')
  const [search, setSearch] = useState('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [compareDialogOpen, setCompareDialogOpen] = useState(false)
  const { secrets, getSecretByKey, bulkSyncToEnv, addSecret: addVaultSecret } = useSecretVaultStore()

  // Format entries to raw string
  const formatEntriesToRaw = (entries: EnvEntry[]): string => {
    return entries
      .map((e) => {
        const comment = e.comment ? `# ${e.comment}\n` : ''
        const val = /[\s#"'\n\r]/.test(e.value) || e.value === '' ? `"${e.value.replace(/"/g, '\\"')}"` : e.value
        return `${comment}${e.key}=${val}`
      })
      .join('\n') + '\n'
  }

  // Parse raw string to entries
  const parseRawToEntries = (raw: string): EnvEntry[] => {
    const lines = raw.split(/\r?\n/)
    const entries: EnvEntry[] = []
    let currentComment: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        currentComment = []
        continue
      }
      if (trimmed.startsWith('#')) {
        currentComment.push(trimmed.replace(/^#\s?/, ''))
        continue
      }

      const match = trimmed.match(/^(?:export\s+)?([A-Za-z_0-9.-]+)\s*=\s*(.*)$/)
      if (match) {
        const key = match[1]
        let val = match[2]
        let inlineComment: string | undefined
        if (!val.startsWith('"') && !val.startsWith("'") && val.includes(' #')) {
          const parts = val.split(' #')
          val = parts[0].trim()
          inlineComment = parts.slice(1).join(' #').trim()
        }
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        const commentParts = [...currentComment]
        if (inlineComment) commentParts.push(inlineComment)

        const isSecret = /secret|password|token|auth|key|jwt|database_url/i.test(key)
        entries.push({
          key,
          value: val,
          comment: commentParts.length > 0 ? commentParts.join(' | ') : undefined,
          isSecret
        })
        currentComment = []
      }
    }
    return entries
  }

  const handleTabSwitch = (tab: 'visual' | 'raw') => {
    if (tab === 'raw' && activeTab === 'visual') {
      const formatted = formatEntriesToRaw(activeEntries)
      setRawContent(formatted)
    } else if (tab === 'visual' && activeTab === 'raw') {
      const parsed = parseRawToEntries(rawContent)
      useEnvStore.setState({ activeEntries: parsed })
    }
    setActiveTab(tab)
  }

  const handleBulkSyncFromVault = () => {
    const syncedMap = bulkSyncToEnv(activeEntries, 'all')
    const keysToSync = Object.keys(syncedMap)
    if (keysToSync.length === 0) {
      toast.info('No matching keys found in Global Vault')
      return
    }

    let updatedCount = 0
    activeEntries.forEach((entry, idx) => {
      if (syncedMap[entry.key] && (!entry.value || entry.value.includes('your_') || entry.value.includes('placeholder'))) {
        updateEntry(idx, { value: syncedMap[entry.key] })
        updatedCount++
      }
    })

    if (updatedCount > 0) {
      toast.success(`✨ Filled ${updatedCount} variable(s) from Global Secrets Vault`)
    } else {
      toast.info('All matched variables are already populated')
    }
  }

  const handlePromoteToVault = async (entry: EnvEntry) => {
    if (!entry.value) {
      toast.error('Variable has no value to save to vault')
      return
    }
    await addVaultSecret({
      key: entry.key,
      value: entry.value,
      category: entry.key.includes('DB') || entry.key.includes('DATABASE') ? 'database' :
                entry.key.includes('KEY') || entry.key.includes('TOKEN') || entry.key.includes('AI') ? 'ai' :
                entry.key.includes('AUTH') || entry.key.includes('SECRET') ? 'auth' : 'custom',
      environment: 'all',
      description: `Imported from ${projectName} .env`
    })
    toast.success(`Promoted ${entry.key} to Global Secrets Vault`)
  }

  // New variable inputs
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const [newComment, setNewComment] = useState('')

  const matchingVaultSecrets = useMemo(() => {
    if (!newKey.trim()) return []
    const q = newKey.trim().toUpperCase()
    return secrets.filter((s) => s.key.includes(q)).slice(0, 3)
  }, [newKey, secrets])

  useEffect(() => {
    if (open && projectPath) {
      loadEnvFiles(projectPath)
    }
  }, [open, projectPath])

  const handleCopyValue = (key: string, val: string) => {
    navigator.clipboard.writeText(val)
    setCopiedKey(key)
    toast.success(`Copied value for ${key}`)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleAddVariable = () => {
    if (!newKey.trim()) {
      toast.error('Variable name is required')
      return
    }
    const cleanKey = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    addEntry({
      key: cleanKey,
      value: newVal,
      comment: newComment.trim() || undefined
    })
    setNewKey('')
    setNewVal('')
    setNewComment('')
    toast.success(`Added ${cleanKey}`)
  }

  const targetPath = activeFilePath || `${projectPath}/.env`

  const handleSave = async () => {
    if (activeTab === 'raw') {
      await saveEnvFile(targetPath, [], rawContent)
    } else {
      await saveEnvFile(targetPath, activeEntries)
    }
    await loadEnvFiles(projectPath)
  }

  const handleGenerateExample = async () => {
    if (!activeFilePath) return
    await generateExample(activeFilePath)
    await loadEnvFiles(projectPath)
  }

  const handleCreateNewFile = async (fileName: string) => {
    const newPath = `${projectPath}/${fileName}`
    await saveEnvFile(newPath, [], '# Environment Variables\n')
    await loadEnvFiles(projectPath)
    await loadEnvFile(newPath)
  }

  const filteredEntries = activeEntries.map((entry, index) => ({ entry, index })).filter(({ entry }) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return entry.key.toLowerCase().includes(q) || (entry.comment && entry.comment.toLowerCase().includes(q))
  })

  const currentFileName = activeFilePath ? activeFilePath.split(/[\\/]/).pop() : '.env'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
          {/* ── Dialog Header ── */}
          <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-violet-400" />
                <div>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    Environment Manager
                    <span className="text-xs font-normal text-zinc-400">· {projectName}</span>
                  </DialogTitle>
                </div>
              </div>

              {/* Mode toggle */}
              <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setActiveTab('visual')}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                    activeTab === 'visual'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  Visual Vault
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                    activeTab === 'raw'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  Raw Editor
                </button>
              </div>
            </div>

            <DialogDescription className="text-xs text-zinc-400">
              Manage secrets and environment variables safely with automatic masking, <code>.env.example</code> generation, and cross-file comparison.
            </DialogDescription>

            {/* Toolbar: file selector + quick actions */}
            <div className="flex items-center justify-between gap-3 pt-3 flex-wrap">
              <div className="flex items-center gap-2">
                <select
                  value={activeFilePath || ''}
                  onChange={(e) => loadEnvFile(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 font-mono outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {envFiles.length === 0 ? (
                    <option value={`${projectPath}/.env`}>.env (new file)</option>
                  ) : (
                    envFiles.map((f) => (
                      <option key={f.path} value={f.path}>
                        {f.relativePath} ({f.entriesCount || 0} vars)
                      </option>
                    ))
                  )}
                </select>

                <Badge variant="outline" className="text-[10px] font-mono">
                  {activeEntries.length} variable{activeEntries.length !== 1 ? 's' : ''}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateExample}
                  disabled={!activeFilePath || isLoading}
                  className="h-8 text-xs border-zinc-700 gap-1.5"
                  title="Generate a sanitized .env.example"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Generate .env.example
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCompareDialogOpen(true)}
                  disabled={!activeFilePath || envFiles.length < 2}
                  className="h-8 text-xs border-zinc-700 gap-1.5"
                  title="Compare with another .env file"
                >
                  <GitCompare className="w-3.5 h-3.5 text-cyan-400" />
                  Compare / Sync
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkSyncFromVault}
                  className="h-8 text-xs border-violet-500/40 bg-violet-950/20 hover:bg-violet-900/40 text-violet-300 gap-1.5 font-semibold"
                  title="Bulk-fill matching variables from Global Secrets Vault"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  Sync Vault
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => useAppStore.getState().setSecretVaultModalOpen(true)}
                  className="h-8 text-xs border-zinc-700 hover:bg-zinc-900 text-zinc-300 gap-1.5"
                  title="Open Global Secrets & Credentials Vault"
                >
                  <Shield className="w-3.5 h-3.5 text-violet-400" />
                  Vault
                </Button>

                {activeTab === 'visual' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setRevealAll(!revealAll)}
                    className="h-8 text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    {revealAll ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                    {revealAll ? 'Mask All' : 'Reveal All'}
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* ── Dialog Body ── */}
          <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-[360px]">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500 text-xs">
                Loading environment variables…
              </div>
            ) : activeTab === 'raw' ? (
              /* ── RAW EDITOR TAB ── */
              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-mono">{currentFileName}</span>
                  <span>{rawContent.split('\n').length} lines</span>
                </div>
                <textarea
                  value={rawContent}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder="# Enter environment variables here&#10;KEY=VALUE"
                  className="w-full flex-1 min-h-[300px] bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none leading-relaxed"
                />
              </div>
            ) : (
              /* ── VISUAL VAULT TAB ── */
              <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                  <Input
                    placeholder="Search variables by name or comment…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-800"
                  />
                </div>

                {/* Variables list */}
                <div className="flex-1 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/40 flex flex-col">
                  <div className="grid grid-cols-12 gap-2 p-2.5 bg-zinc-900 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <span className="col-span-4">Key</span>
                    <span className="col-span-5">Value</span>
                    <span className="col-span-2">Note / Comment</span>
                    <span className="col-span-1 text-right">Actions</span>
                  </div>

                  <ScrollArea className="flex-1 max-h-[260px]">
                    {filteredEntries.length === 0 ? (
                      <div className="p-6 text-center text-zinc-500 text-xs">
                        No environment variables found. Add one below.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-800/60">
                        {filteredEntries.map(({ entry, index }) => {
                          const isRevealed = revealAll || revealedKeys.includes(entry.key)
                          const isCopied = copiedKey === entry.key

                          return (
                            <div
                              key={`${entry.key}-${index}`}
                              className="grid grid-cols-12 gap-2 p-2 text-xs items-center hover:bg-zinc-900/60 transition-colors"
                            >
                              {/* Key */}
                              <div className="col-span-4 flex items-center gap-1.5">
                                {entry.isSecret && (
                                  <span title="Sensitive secret">
                                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                  </span>
                                )}
                                <input
                                  type="text"
                                  value={entry.key}
                                  onChange={(e) => updateEntry(index, { key: e.target.value })}
                                  className="w-full bg-transparent border-none font-mono text-zinc-200 font-semibold focus:outline-none focus:ring-1 focus:ring-violet-500 rounded px-1 py-0.5"
                                />
                              </div>

                              {/* Value (with mask toggle) */}
                              <div className="col-span-5 flex items-center gap-1">
                                <div className="relative flex-1">
                                  <input
                                    type={isRevealed ? 'text' : 'password'}
                                    value={entry.value}
                                    onChange={(e) => updateEntry(index, { value: e.target.value })}
                                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-500 hover:text-zinc-300 shrink-0"
                                  onClick={() => toggleSecretReveal(entry.key)}
                                  title={isRevealed ? 'Mask value' : 'Reveal value'}
                                >
                                  {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-zinc-500 hover:text-zinc-300 shrink-0"
                                  onClick={() => handleCopyValue(entry.key, entry.value)}
                                  title="Copy value"
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </Button>
                              </div>

                              {/* Comment / Note */}
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  placeholder="Optional note…"
                                  value={entry.comment || ''}
                                  onChange={(e) => updateEntry(index, { comment: e.target.value || undefined })}
                                  className="w-full bg-transparent border-none text-[11px] text-zinc-400 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 rounded px-1 py-0.5"
                                />
                              </div>

                              {/* Actions (Promote to Vault & Delete) */}
                              <div className="col-span-1 text-right flex items-center justify-end gap-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePromoteToVault(entry)}
                                  className="h-6 w-6 text-zinc-500 hover:text-violet-400"
                                  title="Promote to Global Secrets Vault"
                                >
                                  <Shield className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteEntry(index)}
                                  className="h-6 w-6 text-zinc-500 hover:text-rose-400"
                                  title="Remove variable"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Add new variable row */}
                <div className="pt-2 border-t border-zinc-800/80 space-y-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400">Add Variable:</span>
                  <div className="grid grid-cols-12 gap-2">
                    <Input
                      placeholder="KEY (e.g. DATABASE_URL)"
                      value={newKey}
                      onChange={(e) => setNewKey(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()}
                      className="col-span-4 h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                    />
                    <Input
                      placeholder="VALUE"
                      value={newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()}
                      className="col-span-5 h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                    />
                    <Input
                      placeholder="Comment (optional)"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()}
                      className="col-span-2 h-8 text-xs bg-zinc-900 border-zinc-800"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddVariable}
                      disabled={!newKey.trim()}
                      className="col-span-1 h-8 bg-violet-600 hover:bg-violet-700 text-white p-0 flex items-center justify-center"
                      title="Add variable"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Dialog Footer ── */}
          <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !activeFilePath}
              className="bg-violet-600 hover:bg-violet-700 gap-1.5 text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving…' : `Save ${currentFileName}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare modal */}
      {compareDialogOpen && (
        <EnvCompareDialog
          open={compareDialogOpen}
          onOpenChange={setCompareDialogOpen}
        />
      )}
    </>
  )
}
