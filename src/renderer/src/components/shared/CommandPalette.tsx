import React, { useEffect, useState } from 'react';
import { TerminalSquare, Server, GitBranch, Settings, LayoutDashboard, Search, Play, FolderOpen, Code } from 'lucide-react';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { setActiveTab } = useAppStore();
  const { projects } = useProjectStore();

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
          <CommandItem onSelect={() => runCommand(() => setActiveTab('services'))}>
            <Server className="mr-2 h-4 w-4" />
            Services
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('git'))}>
            <GitBranch className="mr-2 h-4 w-4" />
            Git
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setActiveTab('settings'))}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Projects">
          {projects.map((project) => (
            <CommandItem key={project.id} onSelect={() => runCommand(() => setActiveTab('dashboard'))}>
              <FolderOpen className="mr-2 h-4 w-4" />
              {project.name}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => {})}>
            <TerminalSquare className="mr-2 h-4 w-4" />
            Open New Terminal
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => {})}>
            <Play className="mr-2 h-4 w-4" />
            Start All Services
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};
