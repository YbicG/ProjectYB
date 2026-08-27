import React, { useEffect, useState } from 'react';
import {
  TerminalSquare,
  Server,
  GitBranch,
  Settings,
  LayoutDashboard,
  Search,
  Play,
  FolderOpen,
  Code,
  Sparkles,
  Radio,
  Package,
  HardDrive,
  Layers,
  FileText,
  Activity,
  Keyboard,
  Send,
  Code2,
  Maximize2
} from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useTemplateStore } from '@renderer/stores/useTemplateStore';
import { useWorkspaceStore } from '@renderer/stores/useWorkspaceStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useHealthStore } from '@renderer/stores/useHealthStore';
import { useThemeStore } from '@renderer/stores/useThemeStore';
import { useSearchStore } from '@renderer/stores/useSearchStore';
import { useSnippetStore } from '@renderer/stores/useSnippetStore';
import { useOverviewStore } from '@renderer/stores/useOverviewStore';
import { toast } from 'sonner';

export const CommandPalette: React.FC = () => {
  const { setActiveTab, commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const { projects, selectProject } = useProjectStore();
  const { createTerminal } = useTerminalStore();
  const { profiles, startProfile } = useServiceStore();
  const { setDialogOpen: setTemplateDialogOpen } = useTemplateStore();
  const { openEditor: openWorkspaceEditor } = useWorkspaceStore();
  const { setScratchpadModalOpen } = useNotesStore();
  const { setModalOpen: setHealthModalOpen } = useHealthStore();
  const { setShortcutsModalOpen } = useThemeStore();
  const { setModalOpen: setSearchModalOpen } = useSearchStore();
  const { setModalOpen: setSnippetModalOpen } = useSnippetStore();
  const { toggleFullscreen } = useOverviewStore();

  const runCommand = (command: () => void) => {
    setCommandPaletteOpen(false);
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
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Type a command or search projects..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => setActiveTab('dashboard'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('overview'))}>
            <Radio className="mr-2 h-4 w-4 text-cyan-400" />
            Mission Control Wallboard
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('api'))}>
            <Send className="mr-2 h-4 w-4 text-emerald-400" />
            HTTP API Tester
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
          <CommandItem onSelect={() => runCommand(() => setSearchModalOpen(true))}>
            <Search className="mr-2 h-4 w-4 text-violet-400" />
            Global Cross-Project Search (Ctrl+Shift+F)
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setSnippetModalOpen(true))}>
            <Code2 className="mr-2 h-4 w-4 text-emerald-400" />
            Command Snippets Vault (Ctrl+Shift+S)
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { setActiveTab('overview'); toggleFullscreen(); })}>
            <Maximize2 className="mr-2 h-4 w-4 text-cyan-400" />
            Toggle Mission Control Fullscreen (F11)
          </CommandItem>
          <CommandItem onSelect={handleCreateFromTemplate}>
            <Sparkles className="mr-2 h-4 w-4 text-violet-400" />
            Create Project from Template...
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setScratchpadModalOpen(true))}>
            <FileText className="mr-2 h-4 w-4 text-violet-400" />
            Open Global Quick Scratchpad (Ctrl+N)
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setHealthModalOpen(true))}>
            <Activity className="mr-2 h-4 w-4 text-cyan-400" />
            View Project Health & Activity Radar
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setShortcutsModalOpen(true))}>
            <Keyboard className="mr-2 h-4 w-4 text-amber-400" />
            View Keyboard Shortcuts (Ctrl+/)
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
            Open New Terminal (Ctrl+T)
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
