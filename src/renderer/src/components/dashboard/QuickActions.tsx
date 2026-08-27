import React from 'react';
import { TerminalSquare, RefreshCw, Code, FolderPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { toast } from 'sonner';

export const QuickActions: React.FC = () => {
  const { scanProjects, isScanning, selectedProjectId, projects } = useProjectStore();
  const { createTerminal } = useTerminalStore();
  const { setActiveTab } = useAppStore();

  const handleNewTerminal = async () => {
    await createTerminal({ name: 'Local', cwd: 'D:\\Code' });
    setActiveTab('terminals');
  };

  const handleCreateProject = () => {
    setActiveTab('settings');
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

  return (
    <div className="flex flex-col gap-2 w-64 p-4 border-r border-zinc-800 bg-zinc-950/50">
      <h3 className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Quick Actions</h3>
      
      <Button variant="outline" className="justify-start h-10 w-full" onClick={() => scanProjects()}>
        <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
        Scan Projects
      </Button>
      
      <Button variant="outline" className="justify-start h-10 w-full" onClick={handleCreateProject}>
        <FolderPlus className="w-4 h-4 mr-2" />
        Create Project
      </Button>
      
      <Button variant="outline" className="justify-start h-10 w-full" onClick={handleNewTerminal}>
        <TerminalSquare className="w-4 h-4 mr-2" />
        New Terminal
      </Button>
      
      <Button variant="outline" className="justify-start h-10 w-full" onClick={handleOpenVSCode}>
        <Code className="w-4 h-4 mr-2" />
        Open VS Code
      </Button>
    </div>
  );
};
