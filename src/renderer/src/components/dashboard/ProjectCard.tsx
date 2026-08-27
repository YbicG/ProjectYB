import React from 'react';
import { TerminalSquare, GitBranch, Code, FolderOpen, Play, Clock } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { StatusDot } from '../shared/StatusDot';

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
  return (
    <Card className="flex flex-col h-full hover:border-zinc-700 transition-colors group">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base truncate mr-2" title={project.name}>
            {project.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{project.type}</Badge>
            <StatusDot status={project.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {project.tags.map(tag => (
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
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" title="Open Terminal">
            <TerminalSquare className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" title="Git Status">
            <GitBranch className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" title="Open in VS Code">
            <Code className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-zinc-800" title="Open Folder">
            <FolderOpen className="w-4 h-4" />
          </Button>
        </div>
        <Button size="sm" variant={project.status === 'running' ? 'secondary' : 'default'} className="h-8">
          <Play className="w-4 h-4 mr-1" />
          Run
        </Button>
      </CardFooter>
    </Card>
  );
};
