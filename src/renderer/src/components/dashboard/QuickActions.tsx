import React, { useState, useRef } from 'react';
import { TerminalSquare, RefreshCw, Code, FolderPlus, X, Check, Loader2, Sparkles, HardDrive } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useTemplateStore } from '@renderer/stores/useTemplateStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { toast } from 'sonner';

export const QuickActions: React.FC = () => {
  const { scanProjects, isScanning, selectedProjectId, projects, addManualProject } = useProjectStore();
  const { createTerminal } = useTerminalStore();
  const { setDialogOpen: setTemplateDialogOpen } = useTemplateStore();
  const { setActiveTab } = useAppStore();

  const [addingProject, setAddingProject] = useState(false);
  const [projectPath, setProjectPath] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleNewTerminal = async () => {
    await createTerminal({ name: 'Local', cwd: 'D:\\Code' });
    setActiveTab('terminals');
  };

  const handleOpenVSCode = () => {
    if (!selectedProjectId) {
      toast.info('Select a project first');
      return;
    }
    const project = projects.find(p => p.id === selectedProjectId);
    if (project && window.api?.projects) {
      window.api.projects.openInVSCode(project.path);
    }
  };

  const handleShowAddProject = () => {
    setAddingProject(true);
    setProjectPath('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCancelAdd = () => {
    setAddingProject(false);
    setProjectPath('');
  };

  const handleAddProject = async () => {
    const trimmed = projectPath.trim();
    if (!trimmed) return;
    setIsAdding(true);
    try {
      await addManualProject(trimmed);
      // Persist to manual projects store
      const existing = (await window.api?.store?.get('manualProjects') as string[] | undefined) ?? [];
      if (!existing.includes(trimmed)) {
        await window.api?.store?.set('manualProjects', [...existing, trimmed]);
      }
      toast.success(`Added project: ${trimmed.split(/[\\/]/).pop()}`);
      setAddingProject(false);
      setProjectPath('');
    } catch {
      toast.error('Could not find a project at that path');
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddProject();
    if (e.key === 'Escape') handleCancelAdd();
  };

  return (
    <div className="flex flex-col gap-2 w-64 p-4 border-r border-zinc-800 bg-zinc-950/50">
      <h3 className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Quick Actions</h3>

      <Button
        variant="outline"
        className="justify-start h-10 w-full bg-violet-950/20 border-violet-500/30 text-violet-300 hover:bg-violet-900/30 hover:text-white"
        onClick={() => setTemplateDialogOpen(true)}
      >
        <Sparkles className="w-4 h-4 mr-2 text-violet-400" />
        New from Template
      </Button>

      <Button variant="outline" className="justify-start h-10 w-full" onClick={() => scanProjects()}>
        <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
        Scan Projects
      </Button>

      {/* Add Project */}
      {!addingProject ? (
        <Button variant="outline" className="justify-start h-10 w-full" onClick={handleShowAddProject}>
          <FolderPlus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      ) : (
        <div className="flex flex-col gap-1.5 p-2 rounded-md border border-violet-500/40 bg-zinc-900">
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Folder path</p>
          <Input
            ref={inputRef}
            placeholder="e.g. D:\Code\my-app"
            value={projectPath}
            onChange={e => setProjectPath(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 bg-zinc-950 border-zinc-700 text-zinc-100 font-mono text-xs focus-visible:ring-violet-500"
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              className="flex-1 h-7 bg-violet-600 hover:bg-violet-700 text-xs"
              disabled={!projectPath.trim() || isAdding}
              onClick={handleAddProject}
            >
              {isAdding
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Check className="w-3 h-3 mr-1" />}
              {isAdding ? 'Adding…' : 'Add'}
            </Button>
            <Button
              size="sm" variant="ghost"
              className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
              onClick={handleCancelAdd}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      <Button variant="outline" className="justify-start h-10 w-full" onClick={handleNewTerminal}>
        <TerminalSquare className="w-4 h-4 mr-2" />
        New Terminal
      </Button>

      <Button variant="outline" className="justify-start h-10 w-full" onClick={handleOpenVSCode}>
        <Code className="w-4 h-4 mr-2" />
        Open VS Code
      </Button>

      <Button
        variant="outline"
        className="justify-start h-10 w-full text-amber-300/90 border-amber-900/40 bg-amber-950/10 hover:bg-amber-950/30"
        onClick={() => setActiveTab('optimizer')}
      >
        <HardDrive className="w-4 h-4 mr-2 text-amber-400" />
        Disk Optimizer
      </Button>
    </div>
  );
};
