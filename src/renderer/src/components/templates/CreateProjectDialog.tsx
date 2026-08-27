import React, { useState, useEffect } from 'react'
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
  FolderPlus,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Terminal,
  Code2,
  GitBranch,
  Github,
  Globe,
  Server,
  Bot,
  TerminalSquare,
  BookOpen,
  Cpu,
  RefreshCw,
  ExternalLink
} from 'lucide-react'
import { useTemplateStore } from '@renderer/stores/useTemplateStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { useTerminalStore } from '@renderer/stores/useTerminalStore'
import { useAppStore } from '@renderer/stores/useAppStore'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'
import type { ProjectTemplate, ScaffoldOptions } from '@renderer/types/template'

interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const CATEGORIES = [
  { id: 'all', label: 'All Templates' },
  { id: 'web', label: 'Web Apps' },
  { id: 'backend', label: 'Backend APIs' },
  { id: 'bot', label: 'Bots' },
  { id: 'cli', label: 'CLI Tools' },
  { id: 'docs', label: 'Docs & Static' }
]

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({ open, onOpenChange }) => {
  const {
    templates,
    selectedTemplateId,
    selectedCategory,
    isScaffolding,
    scaffoldLogs,
    lastResult,
    loadTemplates,
    setSelectedTemplateId,
    setSelectedCategory,
    scaffold,
    appendLog,
    clearLogs
  } = useTemplateStore()

  const { scanProjects } = useProjectStore()
  const { createTerminal } = useTerminalStore()
  const { setActiveTab } = useAppStore()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [projectName, setProjectName] = useState('')
  const [destinationPath, setDestinationPath] = useState('D:\\Code')
  const [description, setDescription] = useState('')
  const [packageManager, setPackageManager] = useState<'pnpm' | 'npm' | 'yarn' | 'bun'>('pnpm')
  const [initGit, setInitGit] = useState(true)
  const [initGitHub, setInitGitHub] = useState(false)
  const [githubPrivate, setGithubPrivate] = useState(true)
  const [installDeps, setInstallDeps] = useState(true)
  const [openVsCode, setOpenVsCode] = useState(true)
  const [openTerminal, setOpenTerminal] = useState(false)

  useEffect(() => {
    if (open) {
      loadTemplates()
      setStep(1)
      clearLogs()
    }
  }, [open])

  // Listen for IPC logs
  useEffect(() => {
    if (window.api && (window.api as any).on) {
      const unsub = (window.api as any).on('templates:log', (line: string) => {
        appendLog(line)
      })
      return () => unsub?.()
    }
  }, [])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0]

  const getTemplateIcon = (cat: string) => {
    switch (cat) {
      case 'web': return <Globe className="w-5 h-5 text-blue-400" />
      case 'backend': return <Server className="w-5 h-5 text-emerald-400" />
      case 'bot': return <Bot className="w-5 h-5 text-violet-400" />
      case 'cli': return <TerminalSquare className="w-5 h-5 text-amber-400" />
      case 'docs': return <BookOpen className="w-5 h-5 text-cyan-400" />
      default: return <Code2 className="w-5 h-5 text-zinc-400" />
    }
  }

  const filteredTemplates = templates.filter((t) => {
    if (selectedCategory === 'all') return true
    return t.category === selectedCategory
  })

  const handleNext = () => {
    if (step === 1) {
      if (!projectName) {
        const randomName = `${selectedTemplate?.id || 'app'}-${Math.floor(1000 + Math.random() * 9000)}`
        setProjectName(randomName)
      }
      setStep(2)
    } else if (step === 2) {
      if (!projectName.trim()) {
        toast.error('Project name is required')
        return
      }
      handleStartScaffold()
    }
  }

  const handleStartScaffold = async () => {
    if (!selectedTemplate) return
    setStep(3)

    const opts: ScaffoldOptions = {
      templateId: selectedTemplate.id,
      projectName: projectName.trim(),
      destinationPath: destinationPath.trim(),
      description: description.trim() || undefined,
      packageManager,
      initGit,
      initGitHub,
      githubPrivate,
      installDeps,
      openVsCode,
      openTerminal
    }

    const result = await scaffold(opts)
    if (result?.success) {
      // Re-scan dashboard
      await scanProjects()

      if (openTerminal) {
        createTerminal({
          name: projectName,
          cwd: result.projectPath
        })
      }
    }
  }

  const handleFinish = () => {
    onOpenChange(false)
    if (openTerminal) {
      setActiveTab('terminals')
    } else {
      setActiveTab('dashboard')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <DialogTitle className="text-base font-bold">Create New Project</DialogTitle>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono text-zinc-400">
              <span className={cn('px-2 py-0.5 rounded', step === 1 ? 'bg-violet-600 text-white font-bold' : 'text-zinc-500')}>1. Template</span>
              <span>→</span>
              <span className={cn('px-2 py-0.5 rounded', step === 2 ? 'bg-violet-600 text-white font-bold' : 'text-zinc-500')}>2. Details</span>
              <span>→</span>
              <span className={cn('px-2 py-0.5 rounded', step === 3 ? 'bg-violet-600 text-white font-bold' : 'text-zinc-500')}>3. Scaffold</span>
            </div>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            {step === 1 && 'Select a project starter template to scaffold instantly.'}
            {step === 2 && 'Configure project directory, Git repository, and dependencies.'}
            {step === 3 && 'Scaffolding files and initializing your development environment.'}
          </DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Template Selection ── */}
        {step === 1 && (
          <div className="flex-1 p-6 overflow-hidden flex flex-col space-y-4 min-h-[380px]">
            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-full transition-colors shrink-0',
                    selectedCategory === cat.id
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Template Grid */}
            <ScrollArea className="flex-1 max-h-[320px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredTemplates.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      className={cn(
                        'p-3.5 rounded-lg border text-left cursor-pointer transition-all flex flex-col justify-between space-y-2',
                        isSelected
                          ? 'border-violet-500 bg-violet-950/20 shadow-md shadow-violet-500/10 ring-1 ring-violet-500'
                          : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/80'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                          {getTemplateIcon(tpl.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-zinc-100 truncate">{tpl.name}</h4>
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{tpl.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {tpl.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ── Step 2: Configuration ── */}
        {step === 2 && (
          <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-[380px]">
            {/* Selected summary */}
            <div className="flex items-center gap-3 p-3 bg-violet-950/15 border border-violet-500/30 rounded-lg">
              <div className="h-8 w-8 rounded bg-violet-500/20 flex items-center justify-center">
                {getTemplateIcon(selectedTemplate.category)}
              </div>
              <div>
                <p className="text-xs font-semibold text-violet-300">Template: {selectedTemplate.name}</p>
                <p className="text-[11px] text-zinc-400">{selectedTemplate.description}</p>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Project Name:</label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))}
                  placeholder="e.g. my-awesome-app"
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs h-9"
                />
                <p className="text-[11px] text-zinc-500 font-mono mt-1">
                  Path: {destinationPath}\{projectName || 'my-app'}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Destination Directory:</label>
                <Input
                  value={destinationPath}
                  onChange={(e) => setDestinationPath(e.target.value)}
                  placeholder="D:\Code"
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs h-9"
                />
              </div>

              {selectedTemplate.type === 'node' && (
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Package Manager:</label>
                  <select
                    value={packageManager}
                    onChange={(e) => setPackageManager(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="pnpm">pnpm (Recommended)</option>
                    <option value="npm">npm</option>
                    <option value="yarn">yarn</option>
                    <option value="bun">bun</option>
                  </select>
                </div>
              )}

              {/* Checkbox Options */}
              <div className="pt-2 border-t border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Initialize Git Repository</p>
                      <p className="text-[10px] text-zinc-500">Runs <code>git init</code> and creates initial commit</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={initGit}
                    onChange={(e) => setInitGit(e.target.checked)}
                    className="accent-violet-500 rounded"
                  />
                </div>

                {initGit && (
                  <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded">
                    <div className="flex items-center gap-2">
                      <Github className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-xs font-medium text-zinc-200">Publish to GitHub</p>
                        <p className="text-[10px] text-zinc-500">Creates a remote repository on your GitHub account</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={githubPrivate ? 'private' : 'public'}
                        onChange={(e) => setGithubPrivate(e.target.value === 'private')}
                        disabled={!initGitHub}
                        className="bg-zinc-950 border border-zinc-800 rounded text-[11px] px-2 py-0.5 text-zinc-300"
                      >
                        <option value="private">Private</option>
                        <option value="public">Public</option>
                      </select>
                      <input
                        type="checkbox"
                        checked={initGitHub}
                        onChange={(e) => setInitGitHub(e.target.checked)}
                        className="accent-violet-500 rounded"
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Install Dependencies Automatically</p>
                      <p className="text-[10px] text-zinc-500">Runs install command right after scaffolding</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={installDeps}
                    onChange={(e) => setInstallDeps(e.target.checked)}
                    className="accent-violet-500 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 bg-zinc-900/60 border border-zinc-800/80 rounded">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-zinc-400" />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">Open in VS Code</p>
                      <p className="text-[10px] text-zinc-500">Opens the newly scaffolded project in VS Code editor</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={openVsCode}
                    onChange={(e) => setOpenVsCode(e.target.checked)}
                    className="accent-violet-500 rounded"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Scaffolding Progress ── */}
        {step === 3 && (
          <div className="flex-1 p-6 overflow-hidden flex flex-col space-y-4 min-h-[380px]">
            {isScaffolding ? (
              <div className="flex items-center gap-3 p-3 bg-violet-950/20 border border-violet-500/30 rounded-lg">
                <RefreshCw className="w-5 h-5 animate-spin text-violet-400 shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-100">Generating project "{projectName}"...</h4>
                  <p className="text-[11px] text-zinc-400">Writing files and configuring your workspace.</p>
                </div>
              </div>
            ) : lastResult?.success ? (
              <div className="flex items-center justify-between p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-300">Project ready!</h4>
                    <p className="text-[11px] text-zinc-400 font-mono">{lastResult.projectPath}</p>
                  </div>
                </div>
                {lastResult.githubUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(lastResult.githubUrl, '_blank')}
                    className="h-7 text-xs border-zinc-700 text-zinc-300 gap-1"
                  >
                    <Github className="w-3 h-3" /> View Repo
                  </Button>
                )}
              </div>
            ) : (
              <div className="p-3 bg-rose-950/20 border border-rose-500/30 rounded-lg text-xs text-rose-300">
                Scaffolding encountered an issue: {lastResult?.error}
              </div>
            )}

            {/* Terminal log window */}
            <div className="flex-1 bg-black border border-zinc-800 rounded-lg p-3 font-mono text-xs overflow-y-auto text-zinc-300 space-y-1">
              {scaffoldLogs.map((line, idx) => (
                <div key={idx} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          {step === 1 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                disabled={!selectedTemplate}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
              >
                Configure Details <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" /> Scaffold Project
              </Button>
            </>
          )}

          {step === 3 && (
            <div className="flex justify-end w-full">
              <Button
                size="sm"
                onClick={handleFinish}
                disabled={isScaffolding}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                Done
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
