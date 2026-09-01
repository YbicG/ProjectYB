import React, { useState, useEffect } from 'react'
import { Send, CheckCircle2, Loader2, Sparkles, Settings, Bot } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { useAiStore } from '@renderer/stores/useAiStore'
import { useAppStore } from '@renderer/stores/useAppStore'
import { toast } from 'sonner'

export const GitCommit: React.FC = () => {
  const {
    commit,
    push,
    selectedProjectId,
    statuses,
    isLoading,
    commitMessage,
    setCommitMessage
  } = useGitStore()
  const { generateCommitMessage, config, loadConfig } = useAiStore()
  const { openSettingsTab } = useAppStore()
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [commitStyle, setCommitStyle] = useState<'conventional' | 'short' | 'detailed'>('conventional')
  const [stageAll, setStageAll] = useState(false)
  const { projects } = useProjectStore()

  const project = projects.find((p) => p.id === selectedProjectId)
  const status = selectedProjectId ? statuses.get(selectedProjectId) : undefined

  useEffect(() => {
    loadConfig()
  }, [])

  const handleGenerateAiCommit = async () => {
    if (!project) return
    setIsGeneratingAi(true)
    try {
      const summary = [
        ...(status?.staged || []).map((s) => `staged: ${s.path}`),
        ...(status?.unstaged || []).map((u) => `modified: ${u.path}`),
        ...(status?.untracked || []).map((t) => `added: ${typeof t === 'string' ? t : (t as any).path}`)
      ].join('\n')

      let styleInstruction = 'conventional commit format (e.g. feat(scope): message or fix(scope): message)'
      if (commitStyle === 'short') styleInstruction = 'short and concise one-liner summary without prefix'
      if (commitStyle === 'detailed') styleInstruction = 'conventional commit header followed by bullet points detailing key changes'

      let diffSnippet = ''
      if (window.api?.git?.diff && project.path) {
        try {
          const rawDiff = await window.api.git.diff(project.path, (status?.staged || []).length > 0)
          if (rawDiff && typeof rawDiff === 'string' && rawDiff.trim()) {
            diffSnippet = rawDiff.slice(0, 3000)
          }
        } catch {}
      }

      const promptText = `Project: ${project.name}\nStyle: ${styleInstruction}\nChanged Files:\n${summary || `Updated ${project.name}`}${diffSnippet ? `\n\nGit Diff:\n${diffSnippet}` : ''}`
      const msg = await generateCommitMessage(promptText)
      setCommitMessage(msg)
      toast.success('Generated commit message from diff!')
    } catch (err: any) {
      toast.error(`AI generation failed: ${err.message || 'Check AI settings'}`)
    } finally {
      setIsGeneratingAi(false)
    }
  }

  // If no staged changes exist, default stageAll to true; otherwise false
  useEffect(() => {
    if (status && status.staged.length === 0 && (status.unstaged.length > 0 || status.untracked.length > 0)) {
      setStageAll(true)
    } else if (status && status.staged.length > 0) {
      setStageAll(false)
    }
  }, [status?.staged.length, status?.unstaged.length, status?.untracked.length])

  const handleCommit = async () => {
    if (!commitMessage.trim() || !project) return
    try {
      await commit(project.id, project.path, commitMessage.trim(), stageAll)
      toast.success('Commit created successfully')
    } catch (error: any) {
      console.error(error)
      toast.error(`Commit failed: ${error.message || 'Unknown error'}`)
    }
  }

  const handleCommitAndPush = async () => {
    if (!commitMessage.trim() || !project) return
    try {
      await commit(project.id, project.path, commitMessage.trim(), stageAll)
      await push(project.id, project.path)
      toast.success('Committed and pushed to upstream')
    } catch (error: any) {
      console.error(error)
      toast.error(`Failed: ${error.message || 'Unknown error'}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault()
      handleCommit()
    }
  }

  const activeModelDisplay = config.model
    ? `${config.provider === 'ollama' ? '🦙 ' : '⚡ '}${config.model}`
    : `${config.provider.toUpperCase()}`

  return (
    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg shadow-sm space-y-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-zinc-300">Commit Message</h3>
          {/* Active AI model pill */}
          <button
            type="button"
            onClick={() => openSettingsTab('ai')}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-violet-300 hover:border-violet-700/60 transition-colors"
            title="Configure AI model in Settings"
          >
            <Bot className="w-3 h-3 text-violet-400" />
            <span className="truncate max-w-[120px]">{activeModelDisplay}</span>
            <Settings className="w-2.5 h-2.5 opacity-60 ml-0.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Style selector */}
          <select
            value={commitStyle}
            onChange={(e) => setCommitStyle(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            <option value="conventional">Conventional</option>
            <option value="short">Short</option>
            <option value="detailed">Detailed</option>
          </select>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateAiCommit}
            disabled={isGeneratingAi || !selectedProjectId}
            className="h-6 text-[10px] border-violet-500/40 bg-violet-950/20 text-violet-300 hover:bg-violet-900/40 gap-1 px-2"
            title="Generate commit message from diff using AI"
          >
            {isGeneratingAi ? <Loader2 className="w-3 h-3 animate-spin text-violet-400" /> : <Sparkles className="w-3 h-3 text-violet-400" />}
            <span>AI Generate</span>
          </Button>
          <span className="text-[10px] text-zinc-500 hidden sm:inline">Ctrl + Enter</span>
        </div>
      </div>

      <textarea
        value={commitMessage}
        onChange={(e) => setCommitMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Brief summary of changes (e.g., feat: add responsive navigation)…"
        className="w-full h-20 bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none disabled:opacity-50 font-mono"
        disabled={isLoading}
      />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={stageAll}
            onChange={(e) => setStageAll(e.target.checked)}
            className="accent-violet-500 rounded bg-zinc-900 border-zinc-800"
            disabled={isLoading}
          />
          <span>Stage all files on commit</span>
        </label>

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            variant="outline"
            size="sm"
            disabled={!commitMessage.trim() || isLoading || !selectedProjectId}
            onClick={handleCommit}
            className="h-7 text-xs border-zinc-700"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            )}
            Commit
          </Button>

          <Button
            variant="default"
            size="sm"
            disabled={!commitMessage.trim() || isLoading || !selectedProjectId}
            onClick={handleCommitAndPush}
            className="h-7 text-xs bg-violet-600 hover:bg-violet-700"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Commit & Push
          </Button>
        </div>
      </div>
    </div>
  )
}
