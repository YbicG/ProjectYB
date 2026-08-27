import React, { useState } from 'react';
import { TerminalSquare, GitBranch, Code, FolderOpen, Play, Clock, MonitorPlay, ExternalLink, Settings, EyeOff } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { StatusDot } from '../shared/StatusDot';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { RunConfigDialog } from '../services/RunConfigDialog';
import { useRunConfigStore } from '@renderer/stores/useRunConfigStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useGitStore } from '@renderer/stores/useGitStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { toast } from 'sonner';

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  type: string;
  category: string;
  status: 'running' | 'stopped' | 'error';
  tags: string[];
  gitBranch?: string;
  lastCommit?: string;
  lastCommitTime?: string;
}

interface ProjectCardProps {
  project: ProjectInfo;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { setActiveTab } = useAppStore();
  const { selectProject, fetchStatus } = useGitStore();
  const { createTerminal } = useTerminalStore();
  const { addConfig } = useRunConfigStore();
  const { ignoreProject } = useProjectStore();
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const handleOpenTerminal = async () => {
    await createTerminal({ name: project.name, cwd: project.path, projectId: project.id });
    setActiveTab('terminals');
  };

  const handleOpenExternalTerminal = () => {
    if (window.api?.projects) {
      window.api.projects.openTerminal(project.path);
    }
  };

  const handleOpenVSCode = () => {
    if (window.api?.projects) {
      window.api.projects.openInVSCode(project.path);
    }
  };

  const handleOpenFolder = () => {
    if (window.api?.projects) {
      window.api.projects.openInExplorer(project.path);
    }
  };

  const handleGitStatus = () => {
    selectProject(project.id);
    fetchStatus(project.id, project.path);
    setActiveTab('git');
  };

  const handleOpenDetail = () => {
    selectProject(project.id);
    setActiveTab('project-detail');
  };

  const handleIgnoreProject = async () => {
    if (window.confirm(`Ignore project "${project.name}"?\n\nThis will add "ignore": true to its .projectyb.json file and hide it from your dashboard.`)) {
      try {
        await ignoreProject(project.path);
        // Also persist to ignored list in electron-store for recovery
        const ignoredList = (await window.api?.store?.get('ignoredProjects') as string[] | undefined) || [];
        if (!ignoredList.includes(project.path)) {
          await window.api?.store?.set('ignoredProjects', [...ignoredList, project.path]);
        }
        toast.info(`Ignored "${project.name}". Config updated in .projectyb.json.`);
      } catch (err) {
        toast.error(`Failed to ignore project`);
      }
    }
  };

  return (
    <Card className="flex flex-col h-full hover:border-zinc-700 transition-colors group">
      <CardHeader className="pb-3 cursor-pointer" onClick={handleOpenDetail}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base truncate mr-2 hover:text-violet-400 transition-colors" title={project.name}>
            {project.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{project.type}</Badge>
            <StatusDot status={project.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {(project.tags || []).map(tag => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-3 text-sm text-zinc-400 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">{project.category}</span>
          {project.gitBranch && (
            <div className="flex items-center gap-1 text-xs">
              <GitBranch className="w-3 h-3" />
              {project.gitBranch}
            </div>
          )}
        </div>
        
        {project.lastCommit && (
          <div className="bg-zinc-950 p-2 rounded-md text-xs border border-zinc-800/50">
            <div className="truncate text-zinc-300">{project.lastCommit}</div>
            <div className="flex items-center gap-1 text-zinc-500 mt-1">
              <Clock className="w-3 h-3" />
              {project.lastCommitTime}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex items-center justify-between border-t border-zinc-800/50 mt-auto px-4 py-3 opacity-80 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" title="Actions & Terminals">
                <TerminalSquare className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 bg-zinc-900 border-zinc-800">
              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800"
                onClick={handleOpenTerminal}
              >
                <MonitorPlay className="w-4 h-4 text-violet-400" />
                <div>
                  <div className="text-sm font-medium">In-App Terminal</div>
                  <div className="text-[10px] text-zinc-500">Opens in terminal manager</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800"
                onClick={handleOpenExternalTerminal}
              >
                <ExternalLink className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-sm font-medium">External Terminal</div>
                  <div className="text-[10px] text-zinc-500">Opens PowerShell window</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800"
                onClick={() => setConfigDialogOpen(true)}
              >
                <Settings className="w-4 h-4 text-zinc-400" />
                <div>
                  <div className="text-sm font-medium">Add Run Config</div>
                  <div className="text-[10px] text-zinc-500">Save a reusable command</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-800" />
              <DropdownMenuItem
                className="gap-2 cursor-pointer focus:bg-zinc-800 text-red-400 hover:text-red-300"
                onClick={handleIgnoreProject}
              >
                <EyeOff className="w-4 h-4 text-red-400" />
                <div>
                  <div className="text-sm font-medium">Ignore Project</div>
                  <div className="text-[10px] text-zinc-500">Updates .projectyb.json</div>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" title="Git Status" onClick={handleGitStatus}>
            <GitBranch className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" title="Open in VS Code" onClick={handleOpenVSCode}>
            <Code className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" title="Open Folder" onClick={handleOpenFolder}>
            <FolderOpen className="w-4 h-4" />
          </Button>
        </div>
        <Button
          size="sm"
          variant={project.status === 'running' ? 'secondary' : 'default'}
          className="h-8"
          onClick={() => {
            const devCmd = (project as any).scripts?.dev ? 'pnpm dev'
              : (project as any).scripts?.start ? 'pnpm start'
              : null;
            createTerminal({ name: `${project.name} run`, cwd: project.path, projectId: project.id });
            setActiveTab('terminals');
            if (devCmd) setTimeout(() => {
              const store = useTerminalStore.getState();
              const tid = store.activeTerminalId;
              if (tid) window.api?.terminal?.write(tid, devCmd + '\r');
            }, 800);
          }}
        >
          <Play className="w-4 h-4 mr-1" />
          Run
        </Button>
      </CardFooter>

      <RunConfigDialog
        open={configDialogOpen}
        onOpenChange={setConfigDialogOpen}
        projectId={project.id}
        projectName={project.name}
        projectPath={project.path}
        onSave={(data) => addConfig(data)}
      />
    </Card>
  );
};
