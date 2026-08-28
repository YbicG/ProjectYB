import React, { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Check, Folder, Sparkles, Terminal, Play, CheckSquare, Square, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useWorkspaceStore } from '@renderer/stores/useWorkspaceStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import type { Workspace, StackServiceItem } from '@renderer/types/workspace';
import { cn } from '@renderer/lib/utils';

export const WorkspaceEditorDialog: React.FC = () => {
  const { editorOpen, editingStack, closeEditor, saveWorkspace } = useWorkspaceStore();
  const { projects } = useProjectStore();

  const [activeTab, setActiveTab] = useState<'projects' | 'services'>('projects');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('violet');
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [services, setServices] = useState<StackServiceItem[]>([]);
  const [executionMode, setExecutionMode] = useState<'parallel' | 'sequential'>('parallel');

  // Search filter for projects
  const [projectSearch, setProjectSearch] = useState('');

  // Service builder fields
  const [selectedProjId, setSelectedProjId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [command, setCommand] = useState('');
  const [waitPort, setWaitPort] = useState<string>('');
  const [delayMs, setDelayMs] = useState<number>(500);

  useEffect(() => {
    if (editingStack) {
      setName(editingStack.name);
      setDescription(editingStack.description || '');
      setColor(editingStack.color || 'violet');
      setProjectIds(Array.isArray(editingStack.projectIds) ? editingStack.projectIds : []);
      setServices(Array.isArray(editingStack.services) ? editingStack.services : []);
      setExecutionMode(editingStack.executionMode || 'parallel');
    } else {
      setName('');
      setDescription('');
      setColor('violet');
      setProjectIds([]);
      setServices([]);
      setExecutionMode('parallel');
    }
    setActiveTab('projects');
  }, [editingStack, editorOpen]);

  const toggleProject = (pId: string) => {
    if (projectIds.includes(pId)) {
      setProjectIds(projectIds.filter((id) => id !== pId));
    } else {
      setProjectIds([...projectIds, pId]);
    }
  };

  const selectAllProjects = () => {
    setProjectIds(projects.map((p) => p.id));
  };

  const deselectAllProjects = () => {
    setProjectIds([]);
  };

  const handleAddService = () => {
    const proj = projects.find((p) => p.id === selectedProjId);
    if (!proj || !command.trim()) return;

    const newItem: StackServiceItem = {
      id: Math.random().toString(36).substring(2, 9),
      projectId: proj.id,
      projectName: proj.name,
      projectPath: proj.path,
      name: serviceName.trim() || `${proj.name} Service`,
      command: command.trim(),
      waitPort: waitPort ? parseInt(waitPort, 10) : undefined,
      delayMs: delayMs > 0 ? delayMs : undefined
    };

    setServices([...services, newItem]);
    setServiceName('');
    setCommand('');
    setWaitPort('');
  };

  const handleRemoveService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const workspace: Workspace = {
      id: editingStack?.id || `ws-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      projectIds,
      services,
      executionMode,
      createdAt: editingStack?.createdAt || Date.now(),
      updatedAt: Date.now()
    };
    saveWorkspace(workspace);
  };

  const colors = ['violet', 'cyan', 'emerald', 'amber', 'rose', 'blue'];

  const filteredProjects = projects.filter(
    (p) => p.name.toLowerCase().includes(projectSearch.toLowerCase()) || p.path.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <Dialog open={editorOpen} onOpenChange={closeEditor}>
      <DialogContent className="bg-zinc-950/95 border-zinc-800 text-zinc-100 max-w-2xl flex flex-col h-[650px] backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400" />
            {editingStack ? `Edit Workspace: ${editingStack.name}` : 'Create Workspace'}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Group related projects together and orchestrate coordinated startup services.
          </DialogDescription>
        </DialogHeader>

        {/* ── Metadata Row ── */}
        <div className="grid grid-cols-12 gap-3 py-1 shrink-0">
          <div className="col-span-8 space-y-1">
            <label className="text-[11px] text-zinc-400 font-semibold">Workspace Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Core SaaS, Client Work, AI Services"
              className="h-8 bg-zinc-900 border-zinc-800 text-xs focus-visible:ring-violet-500"
            />
          </div>

          <div className="col-span-4 space-y-1">
            <label className="text-[11px] text-zinc-400 font-semibold">Accent Color</label>
            <div className="flex items-center gap-1.5 pt-0.5">
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
                    color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'
                  )}
                >
                  {color === c && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tabbed Body: Projects vs Services ── */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 min-h-0 flex flex-col pt-2">
          <TabsList className="grid grid-cols-2 bg-zinc-900 border border-zinc-800 h-8 p-0.5">
            <TabsTrigger value="projects" className="text-xs data-[state=active]:bg-zinc-800">
              📁 Included Projects ({projectIds.length})
            </TabsTrigger>
            <TabsTrigger value="services" className="text-xs data-[state=active]:bg-zinc-800">
              ⚡ Service Stack ({services.length})
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: PROJECTS PICKER ── */}
          <TabsContent value="projects" className="flex-1 min-h-0 flex flex-col space-y-2 mt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <Input
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  placeholder="Filter scanned projects..."
                  className="h-8 pl-8 bg-zinc-900/80 border-zinc-800 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="outline" size="sm" onClick={selectAllProjects} className="h-7 text-[10px] border-zinc-800">
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllProjects} className="h-7 text-[10px] border-zinc-800">
                  Clear
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 border border-zinc-800/80 rounded-xl bg-zinc-900/30 overflow-hidden">
              <ScrollArea className="h-full p-2">
                {filteredProjects.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">No matching projects found.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {filteredProjects.map((p) => {
                      const isIncluded = projectIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          onClick={() => toggleProject(p.id)}
                          className={cn(
                            'p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 select-none',
                            isIncluded
                              ? 'bg-violet-600/15 border-violet-500/40 text-zinc-100 shadow-sm'
                              : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700 text-zinc-400'
                          )}
                        >
                          <div className="pt-0.5">
                            {isIncluded ? (
                              <CheckSquare className="w-4 h-4 text-violet-400" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-xs text-zinc-100 truncate">{p.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono truncate">{p.path}</div>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono uppercase">
                                {p.type}
                              </span>
                              {p.isGitRepo && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800/60 text-emerald-400 font-mono">
                                  git
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* ── TAB 2: SERVICES STACK ── */}
          <TabsContent value="services" className="flex-1 min-h-0 flex flex-col space-y-2 mt-2">
            {/* Add Service Box */}
            <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800 space-y-2">
              <span className="font-semibold text-zinc-300 block text-[11px]">Add Service to Launch Stack</span>
              <div className="grid grid-cols-12 gap-2">
                <select
                  value={selectedProjId}
                  onChange={(e) => {
                    setSelectedProjId(e.target.value);
                    const p = projects.find((proj) => proj.id === e.target.value);
                    if (p?.scripts?.dev) setCommand('npm run dev');
                    else if (p?.scripts?.start) setCommand('npm start');
                    else if (p?.scripts?.build) setCommand('npm run build');
                  }}
                  className="col-span-4 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 h-8 text-xs text-zinc-200 focus:outline-none font-mono"
                >
                  <option value="">Select Project...</option>
                  {(projectIds.length > 0 ? projects.filter((p) => projectIds.includes(p.id)) : projects).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <Input
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Label (e.g. Frontend)"
                  className="col-span-3 h-8 bg-zinc-950 border-zinc-800 text-xs"
                />

                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Command (npm run dev)"
                  className="col-span-3 h-8 bg-zinc-950 border-zinc-800 text-xs font-mono"
                />

                <Button
                  type="button"
                  size="sm"
                  className="col-span-2 bg-violet-600 hover:bg-violet-500 h-8 text-xs font-semibold"
                  disabled={!selectedProjId || !command.trim()}
                  onClick={handleAddService}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
              </div>
            </div>

            {/* Services List */}
            <div className="flex-1 min-h-0 border border-zinc-800/80 rounded-xl bg-zinc-900/30 overflow-hidden flex flex-col">
              <div className="py-2 px-3 bg-zinc-900/60 border-b border-zinc-800 text-[11px] font-semibold text-zinc-400 flex items-center justify-between">
                <span>Coordinated Launch Sequence ({services.length} services)</span>
                <span className="text-[10px] text-zinc-500 font-mono">1-Click Multi-Process Launch</span>
              </div>

              <ScrollArea className="flex-1">
                {services.length === 0 ? (
                  <div className="py-10 text-center text-xs text-zinc-500">
                    No services in this workspace stack yet. Add commands above!
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60 p-1 space-y-1">
                    {services.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-2.5 hover:bg-zinc-900/50 rounded-xl flex items-center justify-between gap-3 transition-colors bg-zinc-950/40 border border-zinc-850"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-violet-950/60 border border-violet-500/40 flex items-center justify-center font-mono text-[10px] text-violet-300 font-bold">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-zinc-100 truncate">{item.name}</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-800 text-zinc-400">
                                {item.projectName}
                              </Badge>
                            </div>
                            <p className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">$ {item.command}</p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-500 hover:text-rose-400"
                          onClick={() => handleRemoveService(item.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="border-t border-zinc-800 pt-3">
          <Button variant="ghost" size="sm" onClick={closeEditor} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-500 text-xs font-semibold shadow-md"
            disabled={!name.trim()}
            onClick={handleSave}
          >
            Save Workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
