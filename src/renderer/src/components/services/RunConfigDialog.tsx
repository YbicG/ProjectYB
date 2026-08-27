import React, { useState, useEffect } from 'react'
import { Plus, Trash2, X, Terminal, Layers } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import type { RunConfig, CommandEntry, ExecutionMode } from '@renderer/stores/useRunConfigStore'
import { generateId, cn } from '@renderer/lib/utils'

interface EnvVar { key: string; value: string }

interface RunConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  projectPath: string
  existing?: RunConfig
  onSave: (config: Omit<RunConfig, 'id' | 'createdAt'>) => void
}

export const RunConfigDialog: React.FC<RunConfigDialogProps> = ({
  open, onOpenChange, projectId, projectName, projectPath, existing, onSave,
}) => {
  const [name, setName] = useState('')
  const [commands, setCommands] = useState<CommandEntry[]>([{ id: generateId(), name: '', command: '' }])
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('sequential')
  const [cwd, setCwd] = useState('')
  const [autoRestart, setAutoRestart] = useState(false)
  const [envVars, setEnvVars] = useState<EnvVar[]>([])

  useEffect(() => {
    if (!open) return
    if (existing) {
      setName(existing.name)
      const cmds = existing.commands?.length
        ? existing.commands
        : existing.command
          ? [{ id: generateId(), name: '', command: existing.command }]
          : [{ id: generateId(), name: '', command: '' }]
      setCommands(cmds)
      setExecutionMode(existing.executionMode ?? 'sequential')
      setCwd(existing.cwd ?? '')
      setAutoRestart(existing.autoRestart ?? false)
      setEnvVars(Object.entries(existing.env ?? {}).map(([key, value]) => ({ key, value })))
    } else {
      setName('')
      setCommands([{ id: generateId(), name: '', command: '' }])
      setExecutionMode('sequential')
      setCwd('')
      setAutoRestart(false)
      setEnvVars([])
    }
  }, [existing, open])

  const addCommand = () => setCommands(c => [...c, { id: generateId(), name: '', command: '' }])
  const removeCommand = (id: string) => setCommands(c => c.filter(e => e.id !== id))
  const updateCommand = (id: string, val: string) =>
    setCommands(c => c.map(e => e.id === id ? { ...e, command: val } : e))
  const updateCommandName = (id: string, val: string) =>
    setCommands(c => c.map(e => e.id === id ? { ...e, name: val } : e))

  const addEnvVar = () => setEnvVars(v => [...v, { key: '', value: '' }])
  const removeEnvVar = (i: number) => setEnvVars(v => v.filter((_, idx) => idx !== i))
  const updateEnvVar = (i: number, field: 'key' | 'value', val: string) =>
    setEnvVars(v => v.map((e, idx) => idx === i ? { ...e, [field]: val } : e))

  const isValid = name.trim() && commands.some(c => c.command.trim())

  const handleSave = () => {
    if (!isValid) return
    const env = envVars
      .filter(e => e.key.trim())
      .reduce<Record<string, string>>((acc, e) => { acc[e.key.trim()] = e.value; return acc }, {})

    onSave({
      projectId,
      projectName,
      projectPath,
      name: name.trim(),
      commands: commands.filter(c => c.command.trim()),
      executionMode: commands.filter(c => c.command.trim()).length > 1 ? executionMode : 'sequential',
      cwd: cwd.trim() || projectPath,
      autoRestart,
      env: Object.keys(env).length > 0 ? env : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">
            {existing ? 'Edit Run Config' : 'New Run Config'}
          </DialogTitle>
          <p className="text-xs text-zinc-500">{projectName}</p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Config name */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-xs font-medium">Config Name</Label>
            <Input
              placeholder="e.g. Full Dev Stack"
              value={name}
              onChange={e => setName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 focus-visible:ring-violet-500"
            />
          </div>

          {/* Commands */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-zinc-300 text-xs font-medium">Commands</Label>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Configure commands to execute for this configuration.
                </p>
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-xs text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                onClick={addCommand}
              >
                <Plus className="w-3 h-3 mr-1" /> Add Command
              </Button>
            </div>

            <div className="space-y-2">
              {commands.map((entry, idx) => (
                <div key={entry.id} className="flex flex-col gap-1.5 p-2 rounded-md bg-zinc-900/70 border border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-mono w-4 text-right shrink-0">
                      #{idx + 1}
                    </span>
                    <Input
                      placeholder="Optional label (e.g. Server, Client)"
                      value={entry.name || ''}
                      onChange={e => updateCommandName(entry.id, e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-zinc-300 text-xs h-7 w-40 focus-visible:ring-violet-500"
                    />
                    <div className="flex-1 flex items-center gap-1">
                      <code className="text-[11px] text-zinc-500 shrink-0">$</code>
                      <Input
                        placeholder={idx === 0 ? 'e.g. pnpm install' : idx === 1 ? 'e.g. pnpm dev' : 'e.g. pnpm build'}
                        value={entry.command}
                        onChange={e => updateCommand(entry.id, e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-violet-300 font-mono text-xs h-7 focus-visible:ring-violet-500 flex-1"
                      />
                    </div>
                    {commands.length > 1 && (
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 shrink-0 text-zinc-600 hover:text-red-400"
                        onClick={() => removeCommand(entry.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Multi-Command Execution Mode Option ── */}
            {commands.length > 1 && (
              <div className="pt-2 space-y-2">
                <Label className="text-zinc-300 text-xs font-medium">Multiple Commands Execution Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExecutionMode('sequential')}
                    className={cn(
                      'flex flex-col items-start p-2.5 rounded-md border text-left transition-all',
                      executionMode === 'sequential'
                        ? 'bg-violet-950/40 border-violet-500 text-white shadow-sm ring-1 ring-violet-500/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-xs">
                      <Terminal className="w-3.5 h-3.5 text-violet-400" />
                      Run sequentially in 1 terminal
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                      Executes top-to-bottom in a single terminal tab (<code>{commands.map(c => c.command || '…').join(' ; ')}</code>).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExecutionMode('parallel')}
                    className={cn(
                      'flex flex-col items-start p-2.5 rounded-md border text-left transition-all',
                      executionMode === 'parallel'
                        ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-sm ring-1 ring-cyan-500/50'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-medium text-xs">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      Run each in a new terminal
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">
                      Spawns {commands.filter(c => c.command.trim()).length || 2} separate in-app terminal tabs running concurrently.
                    </p>
                  </button>
                </div>
              </div>
            )}
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
              className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs focus-visible:ring-violet-500"
            />
          </div>

          {/* Env vars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300 text-xs font-medium">Environment Variables</Label>
              <Button
                variant="ghost" size="sm"
                className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-50"
                onClick={addEnvVar}
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {envVars.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {envVars.map((ev, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      placeholder="KEY"
                      value={ev.key}
                      onChange={e => updateEnvVar(i, 'key', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs h-8 focus-visible:ring-violet-500 w-1/3"
                    />
                    <span className="text-zinc-600 text-xs">=</span>
                    <Input
                      placeholder="value"
                      value={ev.value}
                      onChange={e => updateEnvVar(i, 'value', e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-zinc-100 font-mono text-xs h-8 focus-visible:ring-violet-500 flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600 hover:text-red-400" onClick={() => removeEnvVar(i)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">No env vars — click Add to set one.</p>
            )}
          </div>

          {/* Auto-restart */}
          <div className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-md">
            <div>
              <p className="text-sm font-medium text-zinc-200">Auto-restart on crash</p>
              <p className="text-xs text-zinc-500">Restart the terminal if the process exits unexpectedly.</p>
            </div>
            <input
              type="checkbox"
              checked={autoRestart}
              onChange={e => setAutoRestart(e.target.checked)}
              className="w-4 h-4 accent-violet-500 rounded"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" className="text-zinc-400" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-violet-600 hover:bg-violet-700"
            disabled={!isValid}
            onClick={handleSave}
          >
            {existing ? 'Save Changes' : 'Create Config'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
