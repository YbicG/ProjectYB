import React, { useEffect, useState } from 'react';
import { TerminalSquare, Server, GitBranch, Settings, LayoutDashboard, Search, Play, FolderOpen, Code, Sparkles, Radio, Package, HardDrive, Layers } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useTemplateStore } from '@renderer/stores/useTemplateStore';
import { useWorkspaceStore } from '@renderer/stores/useWorkspaceStore';
import { toast } from 'sonner';

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { setActiveTab } = useAppStore();
  const { projects, selectProject } = useProjectStore();
  const { createTerminal } = useTerminalStore();
  const { profiles, startProfile } = useServiceStore();
  const { setDialogOpen: setTemplateDialogOpen } = useTemplateStore();
  const { openEditor: openWorkspaceEditor } = useWorkspaceStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const handleSelectProject = (projectId: string) => {
    runCommand(() => {
      selectProject(projectId);
      setActiveTab('project-detail');
    });
  };

  const handleOpenNewTerminal = () => {
    runCommand(async () => {
      await createTerminal({ name: 'Local', cwd: 'D:\\Code' });
      setActiveTab('terminals');
    });
  };

  const handleStartAllServices = () => {
    runCommand(() => {
      if (profiles.length === 0) {
        toast.info('No service profiles configured. Add profiles in the Services tab.');
        return;
      }
      startProfile(profiles[0].id);
      setActiveTab('services');
    });
  };

  const handleCreateFromTemplate = () => {
    runCommand(() => {
      setTemplateDialogOpen(true);
    });
  };

  const handleManagePorts = () => {
    runCommand(() => {
      setActiveTab('services');
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search projects..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => setActiveTab('dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('terminals'))}>
            <TerminalSquare className="mr-2 h-4 w-4" />
            Terminals
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('git'))}>
            <GitBranch className="mr-2 h-4 w-4" />
            Git & GitHub
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('services'))}>
            <Server className="mr-2 h-4 w-4" />
            Services & Ports
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('dependencies'))}>
            <Package className="mr-2 h-4 w-4 text-violet-400" />
            Dependencies & Security
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('optimizer'))}>
            <HardDrive className="mr-2 h-4 w-4 text-amber-400" />
            Disk Space Optimizer
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Projects">
          {projects.map((project) => (
            <CommandItem key={project.id} onSelect={() => handleSelectProject(project.id)}>
              <FolderOpen className="mr-2 h-4 w-4" />
              {project.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={handleCreateFromTemplate}>
            <Sparkles className="mr-2 h-4 w-4 text-violet-400" />
            Create Project from Template...
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => openWorkspaceEditor())}>
            <Layers className="mr-2 h-4 w-4 text-violet-400" />
            Create Workspace Stack...
          </CommandItem>
          <CommandItem onSelect={handleManagePorts}>
            <Radio className="mr-2 h-4 w-4 text-cyan-400" />
            Manage Active Network Ports
          </CommandItem>
          <CommandItem onSelect={handleOpenNewTerminal}>
            <TerminalSquare className="mr-2 h-4 w-4" />
            Open New Terminal
          </CommandItem>
          <CommandItem onSelect={handleStartAllServices}>
            <Play className="mr-2 h-4 w-4" />
            Start All Services
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
