import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, GripVertical, Check, Play, Clock, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useWorkspaceStore } from '@renderer/stores/useWorkspaceStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import type { WorkspaceStack, StackServiceItem } from '@renderer/types/workspace';
import { cn } from '@renderer/lib/utils';

export const WorkspaceEditorDialog: React.FC = () => {
  const { editorOpen, editingStack, closeEditor, saveStack } = useWorkspaceStore();
  const { projects } = useProjectStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('violet');
  const [services, setServices] = useState<StackServiceItem[]>([]);

  // Project selector helper
  const [selectedProjId, setSelectedProjId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [command, setCommand] = useState('');
  const [waitPort, setWaitPort] = useState<string>('');

  useEffect(() => {
    if (editingStack) {
      setName(editingStack.name);
      setDescription(editingStack.description || '');
      setColor(editingStack.color || 'violet');
      setServices(editingStack.services || []);
    } else {
      setName('');
      setDescription('');
      setColor('violet');
      setServices([]);
    }
  }, [editingStack, editorOpen]);

  const handleAddService = () => {
    const proj = projects.find(p => p.id === selectedProjId);
    if (!proj || !command.trim()) return;

    const newItem: StackServiceItem = {
      id: Math.random().toString(36).substring(2, 9),
      projectId: proj.id,
      projectName: proj.name,
      projectPath: proj.path,
      name: serviceName.trim() || `${proj.name} Service`,
      command: command.trim(),
      waitPort: waitPort ? parseInt(waitPort, 10) : undefined,
      delayMs: 1000
    };

    setServices([...services, newItem]);
    setServiceName('');
    setCommand('');
    setWaitPort('');
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter(s => s.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const stack: WorkspaceStack = {
      id: editingStack?.id || `stack-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      services,
      createdAt: editingStack?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    saveStack(stack);
  };

  const colors = ['violet', 'cyan', 'emerald', 'amber', 'rose', 'blue'];

  return (
    <Dialog open={editorOpen} onOpenChange={closeEditor}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl flex flex-col h-[640px]">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400" />
            {editingStack ? `Edit Stack: ${editingStack.name}` : 'Create Workspace Stack'}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Combine multiple projects into a coordinated multi-service launch stack.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs flex-1 min-h-0 flex flex-col">
          {/* ── Stack Meta ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-zinc-300 font-semibold">Stack Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Full-Stack SaaS, Discord Bot + API"
                className="h-8 bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-zinc-300 font-semibold">Theme Color</label>
              <div className="flex items-center gap-2 pt-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center',
                      c === 'violet' && 'bg-violet-600',
                      c === 'cyan' && 'bg-cyan-600',
                      c === 'emerald' && 'bg-emerald-600',
                      c === 'amber' && 'bg-amber-600',
                      c === 'rose' && 'bg-rose-600',
                      c === 'blue' && 'bg-blue-600',
                      color === c ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    {color === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Add Service Row ── */}
          <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-2.5">
            <span className="font-semibold text-zinc-200 block text-[11px]">Add Service to Stack</span>
            <div className="grid grid-cols-12 gap-2">
              <select
                value={selectedProjId}
                onChange={(e) => {
                  setSelectedProjId(e.target.value);
                  const p = projects.find(proj => proj.id === e.target.value);
                  if (p?.scripts && p.scripts.dev) setCommand(`npm run dev`);
                  else if (p?.scripts && p.scripts.start) setCommand(`npm start`);
                }}
                className="col-span-4 bg-zinc-900 border border-zinc-800 rounded px-2.5 h-8 text-xs text-zinc-200 focus:outline-none"
              >
                <option value="">Select Project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <Input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="Service label (e.g. Web Frontend)"
                className="col-span-3 h-8 bg-zinc-900 border-zinc-800 text-xs"
              />

              <Input
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Command (e.g. npm run dev)"
                className="col-span-3 h-8 bg-zinc-900 border-zinc-800 text-xs font-mono"
              />

              <Button
                type="button"
                size="sm"
                className="col-span-2 bg-violet-600 hover:bg-violet-700 h-8 text-xs gap-1"
                disabled={!selectedProjId || !command.trim()}
                onClick={handleAddService}
              >
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
          </div>

          {/* ── Services Sequence List ── */}
          <div className="flex-1 min-h-0 border border-zinc-800 rounded bg-zinc-900/20 overflow-hidden flex flex-col">
            <div className="py-2 px-3 bg-zinc-900/50 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
              <span>Execution Sequence ({services.length} services)</span>
              <span className="text-[10px] text-zinc-500 font-mono">Starts top to bottom</span>
            </div>

            <ScrollArea className="flex-1">
              {services.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  No services added to this stack yet. Add your first service above!
                </div>
              ) : (
                <div className="divide-y divide-zinc-800/60 p-1">
                  {services.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-2.5 hover:bg-zinc-900/50 rounded flex items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-mono text-[10px] text-violet-400 font-bold">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-200 truncate">{item.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 text-zinc-400">
                              {item.projectName}
                            </Badge>
                          </div>
                          <p className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">$ {item.command}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-500 hover:text-red-400"
                          onClick={() => handleRemoveService(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-3">
          <Button variant="ghost" size="sm" onClick={closeEditor}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-xs font-semibold"
            disabled={!name.trim() || services.length === 0}
            onClick={handleSave}
          >
            Save Stack
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
