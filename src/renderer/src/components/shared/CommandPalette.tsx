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
  Maximize2,
  CloudLightning,
  Database,
  Workflow,
  Bot
} from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import { useTemplateStore } from '@renderer/stores/useTemplateStore';
import { useWorkspaceStore } from '@renderer/stores/useWorkspaceStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useHealthStore } from '@renderer/stores/useHealthStore';
import { useThemeStore } from '@renderer/stores/useThemeStore';
import { useSearchStore } from '@renderer/stores/useSearchStore';
import { useSnippetStore } from '@renderer/stores/useSnippetStore';
import { useOverviewStore } from '@renderer/stores/useOverviewStore';
import { useAiStore } from '@renderer/stores/useAiStore';
import { useDatabaseStore } from '@renderer/stores/useDatabaseStore';
import { usePipelineStore } from '@renderer/stores/usePipelineStore';
import { useMockServerStore } from '@renderer/stores/useMockServerStore';
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
  const { setCreateModalOpen } = useCloudflareStore();
  const { setChatModalOpen } = useAiStore();
  const { openEditor: openPipelineEditor } = usePipelineStore();

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
            Background Services
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('tunnels'))}>
            <CloudLightning className="mr-2 h-4 w-4 text-orange-400" />
            Cloudflare Tunnels (TryCloudflare & Zero Trust)
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('database'))}>
            <Database className="mr-2 h-4 w-4 text-blue-400" />
            Database Studio (SQLite, Postgres, Redis, MySQL)
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('pipelines'))}>
            <Workflow className="mr-2 h-4 w-4 text-violet-400" />
            Workflow Automation Pipelines & CI
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('mock-server'))}>
            <Radio className="mr-2 h-4 w-4 text-cyan-400" />
            Mock REST API & Inbound Webhooks
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('ai-hub'))}>
            <Bot className="mr-2 h-4 w-4 text-emerald-400" />
            AI Copilot Studio & Diagnostics
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('dependencies'))}>
            <Package className="mr-2 h-4 w-4 text-cyan-400" />
            Dependencies & Security Hub
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
          <CommandItem onSelect={() => runCommand(() => setChatModalOpen(true))}>
            <Bot className="mr-2 h-4 w-4 text-emerald-400" />
            Open AI Copilot Chat (Ctrl+Space)
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => { setActiveTab('pipelines'); openPipelineEditor(); })}>
            <Workflow className="mr-2 h-4 w-4 text-violet-400" />
            Create Workflow Automation Pipeline...
          </CommandItem>
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
          <CommandItem onSelect={() => runCommand(() => { setActiveTab('tunnels'); setCreateModalOpen(true); })}>
            <CloudLightning className="mr-2 h-4 w-4 text-orange-400" />
            Launch Cloudflare Public Tunnel...
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
