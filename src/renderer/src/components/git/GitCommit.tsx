import React, { useState, useEffect } from 'react'
import { Send, CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useProjectStore } from '@renderer/stores/useProjectStore'

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
  const [stageAll, setStageAll] = useState(false)
  const { projects } = useProjectStore()

  const project = projects.find((p) => p.id === selectedProjectId)
  const status = selectedProjectId ? statuses.get(selectedProjectId) : undefined

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

  return (
    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-300">Commit Message</h3>
        <span className="text-[10px] text-zinc-500">Ctrl + Enter to commit</span>
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
