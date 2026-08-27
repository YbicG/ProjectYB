import React from 'react';
import { Github, GitPullRequest, CircleDot, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

export const GitHubPanel: React.FC = () => {
  // Mock data for now
  const isConnected = true;
  const repoName = 'djcoo/ProjectYB';
  const prs = [{ id: 1, title: 'Add terminal component', status: 'open', num: 12 }];
  const issues = [{ id: 1, title: 'Bug: layout shift on resize', status: 'open', num: 15 }];

  if (!isConnected) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 text-center p-6">
        <Github className="w-12 h-12 mx-auto text-zinc-500 mb-4" />
        <h3 className="text-lg font-medium text-zinc-200 mb-2">Connect to GitHub</h3>
        <p className="text-sm text-zinc-400 mb-4">Initialize this repository and push it to GitHub to track issues and pull requests.</p>
        <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
          Initialize & Push to GitHub
        </Button>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800 flex flex-col">
      <CardHeader className="p-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Github className="w-4 h-4" />
            {repoName}
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-50">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 grid grid-cols-2 divide-x divide-zinc-800 h-64">
        <div className="flex flex-col h-full">
          <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-400">Pull Requests</span>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">New PR</Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {prs.map(pr => (
                <div key={pr.id} className="p-2 hover:bg-zinc-900 rounded cursor-pointer group">
                  <div className="flex items-start gap-2">
                    <GitPullRequest className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-zinc-200 line-clamp-2 leading-tight group-hover:text-violet-400">{pr.title}</p>
                      <span className="text-xs text-zinc-500">#{pr.num}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        <div className="flex flex-col h-full">
          <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-400">Issues</span>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2">New Issue</Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {issues.map(issue => (
                <div key={issue.id} className="p-2 hover:bg-zinc-900 rounded cursor-pointer group">
                  <div className="flex items-start gap-2">
                    <CircleDot className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-zinc-200 line-clamp-2 leading-tight group-hover:text-violet-400">{issue.title}</p>
                      <span className="text-xs text-zinc-500">#{issue.num}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
