import React, { useState, useEffect } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import type { RunConfig } from '@renderer/stores/useRunConfigStore'

interface EnvVar { key: string; value: string }

interface RunConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  projectPath: string
  /** If provided, we're editing an existing config */
  existing?: RunConfig
  onSave: (config: Omit<RunConfig, 'id' | 'createdAt'>) => void
}

export const RunConfigDialog: React.FC<RunConfigDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  projectName,
  projectPath,
  existing,
  onSave,
}) => {
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [cwd, setCwd] = useState('')
  const [autoRestart, setAutoRestart] = useState(false)
  const [envVars, setEnvVars] = useState<EnvVar[]>([])

  // Populate fields when editing
  useEffect(() => {
    if (existing) {
      setName(existing.name)
      setCommand(existing.command)
      setCwd(existing.cwd ?? '')
      setAutoRestart(existing.autoRestart ?? false)
      setEnvVars(
        Object.entries(existing.env ?? {}).map(([key, value]) => ({ key, value }))
      )
    } else {
      setName('')
      setCommand('')
      setCwd('')
      setAutoRestart(false)
      setEnvVars([])
    }
  }, [existing, open])

  const addEnvVar = () => setEnvVars(v => [...v, { key: '', value: '' }])

  const removeEnvVar = (i: number) => setEnvVars(v => v.filter((_, idx) => idx !== i))

  const updateEnvVar = (i: number, field: 'key' | 'value', val: string) =>
    setEnvVars(v => v.map((e, idx) => idx === i ? { ...e, [field]: val } : e))

  const handleSave = () => {
    if (!name.trim() || !command.trim()) return
    const env = envVars
      .filter(e => e.key.trim())
      .reduce<Record<string, string>>((acc, e) => { acc[e.key.trim()] = e.value; return acc }, {})
    onSave({
      projectId,
      projectName,
      projectPath,
      name: name.trim(),
      command: command.trim(),
      cwd: cwd.trim() || projectPath,
      autoRestart,
      env: Object.keys(env).length > 0 ? env : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">
            {existing ? 'Edit Run Config' : 'New Run Config'}
          </DialogTitle>
          <p className="text-xs text-zinc-500">{projectName}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs font-medium">Name</Label>
            <Input
              placeholder="e.g. Dev Server"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-violet-500"
            />
          </div>

          {/* Command */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs font-medium">Command</Label>
            <Input
              placeholder="e.g. pnpm dev"
              value={command}
              onChange={e => setCommand(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono focus-visible:ring-violet-500"
            />
          </div>

          {/* Working directory */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs font-medium">
              Working Directory <span className="text-zinc-600">(defaults to project root)</span>
            </Label>
            <Input
              placeholder={projectPath}
              value={cwd}
              onChange={e => setCwd(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-sm focus-visible:ring-violet-500"
            />
          </div>

          {/* Env vars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300 text-xs font-medium">Environment Variables</Label>
              <Button
                variant="ghost" size="sm"
                className="h-6 px-2 text-xs text-zinc-400 hover:text-zinc-50"
                onClick={addEnvVar}
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {envVars.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {envVars.map((ev, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="KEY"
                      value={ev.key}
                      onChange={e => updateEnvVar(i, 'key', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs h-8 focus-visible:ring-violet-500 w-1/3"
                    />
                    <span className="text-zinc-600 text-sm">=</span>
                    <Input
                      placeholder="value"
                      value={ev.value}
                      onChange={e => updateEnvVar(i, 'value', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs h-8 focus-visible:ring-violet-500 flex-1"
                    />
                    <Button
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-zinc-600 hover:text-red-400"
                      onClick={() => removeEnvVar(i)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {envVars.length === 0 && (
              <p className="text-xs text-zinc-600">No env vars. Click Add to set one.</p>
            )}
          </div>

          {/* Auto-restart */}
          <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md">
            <div>
              <p className="text-sm font-medium text-zinc-200">Auto-restart on crash</p>
              <p className="text-xs text-zinc-500">Restart the process if it exits unexpectedly.</p>
            </div>
            <input
              type="checkbox"
              checked={autoRestart}
              onChange={e => setAutoRestart(e.target.checked)}
              className="w-4 h-4 accent-violet-500 rounded"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" className="text-zinc-400" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            disabled={!name.trim() || !command.trim()}
            onClick={handleSave}
          >
            {existing ? 'Save Changes' : 'Create Config'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
