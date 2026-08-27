import React, { useState, useEffect, useMemo } from 'react'
import {
  FileCode,
  Sliders,
  Code2,
  Plus,
  Trash2,
  Save,
  Folder,
  Tag,
  Terminal,
  AlertCircle,
  FileCheck,
  Copy,
  Check,
  CheckCircle2
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { ScrollArea } from '../ui/scroll-area'
import type { ProjectInfo, ProjectConfig, ProjectType } from '@renderer/types/project'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { toast } from 'sonner'
import { cn } from '@renderer/lib/utils'

interface ProjectConfigDialogProps {
  project: ProjectInfo | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PROJECT_TYPES: ProjectType[] = [
  'node',
  'python',
  'rust',
  'go',
  'dotnet',
  'godot',
  'docs',
  'git',
  'unknown'
]

export const ProjectConfigDialog: React.FC<ProjectConfigDialogProps> = ({
  project,
  open,
  onOpenChange
}) => {
  const { saveProjectConfig, loadProjectConfig } = useProjectStore()

  const [activeTab, setActiveTab] = useState<'visual' | 'json'>('visual')
  const [configPath, setConfigPath] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectType>('node')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [subprojects, setSubprojects] = useState<
    Array<{ name: string; path: string; type: ProjectType; scripts?: Record<string, string> }>
  >([])
  const [newSubName, setNewSubName] = useState('')
  const [newSubPath, setNewSubPath] = useState('')
  const [newSubType, setNewSubType] = useState<ProjectType>('node')

  const [scripts, setScripts] = useState<Array<{ key: string; command: string }>>([])
  const [newScriptKey, setNewScriptKey] = useState('')
  const [newScriptCmd, setNewScriptCmd] = useState('')

  const [ignore, setIgnore] = useState(false)
  const [notes, setNotes] = useState('')

  // Raw JSON editor text
  const [rawJson, setRawJson] = useState('')

  useEffect(() => {
    if (project && open) {
      loadProjectConfig(project.path).then(({ config, filePath }) => {
        setConfigPath(filePath)
        const initialName = config?.name || project.name
        const initialType = (config?.type || project.type) as ProjectType
        const initialTags = config?.tags || project.tags || []
        const initialIgnore = Boolean(config?.ignore || config?.ignored || project.ignored)
        const initialNotes = config?.notes || ''

        setName(initialName)
        setType(initialType)
        setTags(initialTags)
        setIgnore(initialIgnore)
        setNotes(initialNotes)

        // Subprojects
        if (config?.subprojects && Array.isArray(config.subprojects)) {
          setSubprojects(
            config.subprojects.map((s) => ({
              name: s.name,
              path: s.path,
              type: (s.type || 'node') as ProjectType,
              scripts: s.scripts
            }))
          )
        } else if (project.subprojects && project.subprojects.length > 0) {
          setSubprojects(
            project.subprojects.map((s) => ({
              name: s.name,
              path: s.relativePath || s.name,
              type: s.type,
              scripts: s.scripts
            }))
          )
        } else {
          setSubprojects([])
        }

        // Scripts
        const scriptsObj = config?.scripts || project.scripts || {}
        setScripts(
          Object.entries(scriptsObj).map(([k, v]) => ({
            key: k,
            command: typeof v === 'string' ? v : String(v)
          }))
        )

        // Initial Raw JSON
        const fullConfig = config || {
          name: initialName,
          type: initialType,
          tags: initialTags,
          subprojects: project.subprojects?.map((s) => ({
            name: s.name,
            path: s.relativePath || s.name,
            type: s.type
          })),
          scripts: scriptsObj
        }
        setRawJson(JSON.stringify(fullConfig, null, 2))
        setJsonError(null)
      })
    }
  }, [project?.path, open])

  // Compute lines and character counts
  const jsonMeta = useMemo(() => {
    const lines = rawJson.split('\n').length
    const chars = rawJson.length
    return { lines, chars }
  }, [rawJson])

  // Sync from Visual form to JSON tab when switching
  const handleTabChange = (val: string) => {
    if (val === 'json') {
      const scriptsObj: Record<string, string> = {}
      scripts.forEach((s) => {
        if (s.key.trim()) scriptsObj[s.key.trim()] = s.command.trim()
      })

      const currentConfig: ProjectConfig = {
        name: name.trim(),
        type,
        tags: tags.length > 0 ? tags : undefined,
        ignore: ignore ? true : undefined,
        subprojects:
          subprojects.length > 0
            ? subprojects.map((s) => ({
                name: s.name,
                path: s.path,
                type: s.type
              }))
            : undefined,
        scripts: Object.keys(scriptsObj).length > 0 ? scriptsObj : undefined,
        notes: notes.trim() ? notes.trim() : undefined
      }
      setRawJson(JSON.stringify(currentConfig, null, 2))
      setJsonError(null)
    } else if (val === 'visual') {
      try {
        const parsed = JSON.parse(rawJson)
        if (parsed.name) setName(parsed.name)
        if (parsed.type) setType(parsed.type)
        if (Array.isArray(parsed.tags)) setTags(parsed.tags)
        if (parsed.ignore !== undefined) setIgnore(Boolean(parsed.ignore))
        if (parsed.notes) setNotes(parsed.notes)
        if (Array.isArray(parsed.subprojects)) {
          setSubprojects(parsed.subprojects)
        }
        if (parsed.scripts && typeof parsed.scripts === 'object') {
          setScripts(
            Object.entries(parsed.scripts).map(([k, v]) => ({
              key: k,
              command: String(v)
            }))
          )
        }
        setJsonError(null)
      } catch (err: any) {
        setJsonError(err.message)
        toast.error('Invalid JSON syntax: cannot switch to visual form until fixed')
        return
      }
    }
    setActiveTab(val as any)
  }

  // Tags handlers
  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  // Subprojects handlers
  const handleAddSubproject = () => {
    if (!newSubName.trim() || !newSubPath.trim()) {
      toast.error('Subproject name and folder path are required')
      return
    }
    setSubprojects([
      ...subprojects,
      {
        name: newSubName.trim(),
        path: newSubPath.trim(),
        type: newSubType
      }
    ])
    setNewSubName('')
    setNewSubPath('')
  }

  const handleRemoveSubproject = (idx: number) => {
    setSubprojects(subprojects.filter((_, i) => i !== idx))
  }

  // Scripts handlers
  const handleAddScript = () => {
    if (!newScriptKey.trim() || !newScriptCmd.trim()) {
      toast.error('Script name and command are required')
      return
    }
    setScripts([...scripts, { key: newScriptKey.trim(), command: newScriptCmd.trim() }])
    setNewScriptKey('')
    setNewScriptCmd('')
  }

  const handleRemoveScript = (idx: number) => {
    setScripts(scripts.filter((_, i) => i !== idx))
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJson)
    setCopied(true)
    toast.success('JSON copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFormatJson = () => {
    try {
      setRawJson(JSON.stringify(JSON.parse(rawJson), null, 2))
      setJsonError(null)
      toast.info('Formatted JSON')
    } catch (e: any) {
      setJsonError(e.message)
      toast.error(`Cannot format: ${e.message}`)
    }
  }

  // Save Config
  const handleSave = async () => {
    if (!project) return
    setIsSaving(true)

    try {
      let finalConfig: Partial<ProjectConfig>

      if (activeTab === 'json') {
        try {
          finalConfig = JSON.parse(rawJson)
        } catch (err: any) {
          toast.error(`Invalid JSON: ${err.message}`)
          setIsSaving(false)
          return
        }
      } else {
        const scriptsObj: Record<string, string> = {}
        scripts.forEach((s) => {
          if (s.key.trim()) scriptsObj[s.key.trim()] = s.command.trim()
        })

        finalConfig = {
          name: name.trim() || project.name,
          type,
          tags: tags.length > 0 ? tags : undefined,
          ignore: ignore ? true : undefined,
          subprojects:
            subprojects.length > 0
              ? subprojects.map((s) => ({
                  name: s.name,
                  path: s.path,
                  type: s.type
                }))
              : undefined,
          scripts: Object.keys(scriptsObj).length > 0 ? scriptsObj : undefined,
          notes: notes.trim() ? notes.trim() : undefined
        }
      }

      await saveProjectConfig(project.path, finalConfig, activeTab === 'json')
      toast.success(`Config saved to .ybicg/config.json for "${finalConfig.name || project.name}"`)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(`Failed to save config: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!project) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl w-[90vw] h-[640px] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        {/* ── Dialog Header ── */}
        <DialogHeader className="p-4 pb-3 border-b border-zinc-800 shrink-0 bg-zinc-950 pr-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-violet-950/60 border border-violet-800/60 flex items-center justify-center text-violet-400 shrink-0">
                <FileCode className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  Project Configuration
                  <Badge variant="outline" className="text-[10px] font-mono border-zinc-700">
                    {project.name}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 font-mono truncate max-w-md" title={project.path}>
                  {project.path}
                </DialogDescription>
              </div>
            </div>

            <div className="text-right shrink-0">
              {configPath ? (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded" title={configPath}>
                  <FileCheck className="w-3 h-3" /> .ybicg/config.json
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500 font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                  Will create .ybicg/config.json
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ── Tabs: Visual vs JSON ── */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between shrink-0 h-10">
            <TabsList className="bg-zinc-900 border border-zinc-800 h-8 p-0.5">
              <TabsTrigger value="visual" className="text-xs px-3 h-7 gap-1.5 data-[state=active]:bg-zinc-800">
                <Sliders className="w-3.5 h-3.5" /> Visual Editor
              </TabsTrigger>
              <TabsTrigger value="json" className="text-xs px-3 h-7 gap-1.5 data-[state=active]:bg-zinc-800">
                <Code2 className="w-3.5 h-3.5" /> Raw JSON Code
              </TabsTrigger>
            </TabsList>

            {activeTab === 'json' && (
              <div className="flex items-center gap-2">
                <div className="text-[11px] font-mono text-zinc-500 mr-1 hidden sm:block">
                  {jsonMeta.lines} lines · {jsonMeta.chars} chars
                </div>

                {!jsonError ? (
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-800/60 bg-emerald-950/30 gap-1 px-1.5 py-0">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Valid
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-rose-400 border-rose-800/60 bg-rose-950/30 gap-1 px-1.5 py-0">
                    <AlertCircle className="w-2.5 h-2.5" /> Syntax Error
                  </Badge>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-zinc-400 hover:text-zinc-200 px-2 gap-1"
                  onClick={handleCopyJson}
                  title="Copy JSON"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-violet-400 hover:text-violet-300 px-2 font-medium"
                  onClick={handleFormatJson}
                >
                  Format JSON
                </Button>
              </div>
            )}
          </div>

          {/* ── Tab Content: Visual ── */}
          <TabsContent value="visual" className="flex-1 p-0 m-0 overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
            <ScrollArea className="flex-1 h-full p-4">
              <div className="space-y-4 max-w-2xl mx-auto pb-4">
                {/* ── General Section ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Project Display Name</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. E-Commerce Platform"
                      className="h-8 text-xs bg-zinc-900 border-zinc-800 font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Primary Project Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as ProjectType)}
                      className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded px-2.5 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-violet-500 font-mono"
                    >
                      {PROJECT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Tags Section ── */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-violet-400" /> Tags
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((t) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 gap-1 pl-2 pr-1 py-0.5"
                      >
                        {t}
                        <button
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-rose-400 p-0.5 rounded"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add tag (e.g. backend, fullstack, client-work)…"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      className="h-8 text-xs bg-zinc-900 border-zinc-800 flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddTag}
                      className="h-8 text-xs border-zinc-800 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* ── Subprojects / Subfolders Section ── */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-violet-400" /> Subfolders & Subprojects
                      </label>
                      <p className="text-[11px] text-zinc-500">
                        Group sub-modules (e.g. <code>client</code>, <code>server</code>, <code>src</code>) under this top-level project.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {subprojects.length}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    {subprojects.map((sub, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-zinc-900/60 border border-zinc-800/60 rounded text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Folder className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span className="font-semibold text-zinc-200">{sub.name}</span>
                          <span className="font-mono text-[11px] text-zinc-500">({sub.path})</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase text-zinc-400">
                            {sub.type}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-zinc-500 hover:text-rose-400"
                          onClick={() => handleRemoveSubproject(idx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-12 gap-2 pt-1">
                    <Input
                      placeholder="Name (e.g. client)"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="col-span-4 h-8 text-xs bg-zinc-900 border-zinc-800"
                    />
                    <Input
                      placeholder="Folder Path (e.g. client)"
                      value={newSubPath}
                      onChange={(e) => setNewSubPath(e.target.value)}
                      className="col-span-4 h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                    />
                    <select
                      value={newSubType}
                      onChange={(e) => setNewSubType(e.target.value as ProjectType)}
                      className="col-span-2 h-8 bg-zinc-900 border border-zinc-800 rounded px-2 text-xs text-zinc-200 outline-none font-mono"
                    >
                      {PROJECT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddSubproject}
                      className="col-span-2 h-8 text-xs border-zinc-800"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* ── Custom Scripts Section ── */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                  <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-violet-400" /> Custom Scripts & Run Commands
                  </label>

                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {scripts.map((sc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-1.5 bg-zinc-900/60 border border-zinc-800/60 rounded text-xs gap-2"
                      >
                        <span className="font-mono text-violet-300 font-semibold w-28 truncate">{sc.key}</span>
                        <span className="font-mono text-zinc-400 flex-1 truncate text-[11px]">{sc.command}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-zinc-500 hover:text-rose-400 shrink-0"
                          onClick={() => handleRemoveScript(idx)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-12 gap-2 pt-1">
                    <Input
                      placeholder="Script Name (e.g. dev)"
                      value={newScriptKey}
                      onChange={(e) => setNewScriptKey(e.target.value)}
                      className="col-span-4 h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                    />
                    <Input
                      placeholder="Command (e.g. npm run dev)"
                      value={newScriptCmd}
                      onChange={(e) => setNewScriptCmd(e.target.value)}
                      className="col-span-6 h-8 text-xs bg-zinc-900 border-zinc-800 font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddScript}
                      className="col-span-2 h-8 text-xs border-zinc-800"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* ── Ignore & Notes Section ── */}
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ignore}
                      onChange={(e) => setIgnore(e.target.checked)}
                      className="accent-violet-500 w-4 h-4 rounded"
                    />
                    <span>Ignore this project (hide from dashboard)</span>
                  </label>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ── Tab Content: Raw JSON Code Editor (Full Height Expanded) ── */}
          <TabsContent value="json" className="flex-1 p-0 m-0 flex flex-col overflow-hidden min-h-0 data-[state=active]:flex data-[state=active]:flex-col">
            <div className="p-3 bg-zinc-950 flex-1 flex flex-col min-h-0 h-full">
              <div className="relative flex-1 flex flex-col min-h-0 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/90 focus-within:ring-1 focus-within:ring-violet-500">
                <textarea
                  value={rawJson}
                  onChange={(e) => {
                    setRawJson(e.target.value)
                    try {
                      JSON.parse(e.target.value)
                      setJsonError(null)
                    } catch (err: any) {
                      setJsonError(err.message)
                    }
                  }}
                  className="w-full flex-1 h-full min-h-[420px] bg-transparent p-3.5 text-xs font-mono text-zinc-100 resize-none outline-none leading-5 font-normal tracking-wide overflow-y-auto"
                  placeholder="{ ... }"
                  spellCheck={false}
                />
              </div>

              {jsonError && (
                <div className="mt-2 p-2 bg-rose-950/60 border border-rose-800/60 rounded flex items-center gap-2 text-xs text-rose-300 shrink-0">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span className="truncate font-mono text-[11px]">{jsonError}</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Footer ── */}
        <DialogFooter className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || (activeTab === 'json' && Boolean(jsonError))}
            className="bg-violet-600 hover:bg-violet-700 text-xs gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving…' : 'Save Config'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
