import React, { useState, useEffect } from 'react';
import { Github, GitPullRequest, CircleDot, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useGitStore } from '@renderer/stores/useGitStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useAppStore } from '@renderer/stores/useAppStore';

export const GitHubPanel: React.FC = () => {
  const { selectedProjectId } = useGitStore();
  const { projects } = useProjectStore();
  const { setActiveTab } = useAppStore();

  const [githubUser, setGithubUser] = useState<{ login: string; avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [prs, setPrs] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);

  const project = projects.find(p => p.id === selectedProjectId);

  const checkConnection = async () => {
    try {
      setLoading(true);
      if (window.api?.github) {
        const user = await window.api.github.getUser();
        if (user && user.login) {
          setGithubUser(user);
        } else {
          setGithubUser(null);
        }
      }
    } catch {
      setGithubUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const repoName = project ? `${githubUser?.login || 'user'}/${project.name}` : 'No Project Selected';

  if (!githubUser) {
    return (
      <Card className="bg-zinc-950 border-zinc-800 text-center p-6 flex flex-col justify-center items-center h-full">
        <Github className="w-12 h-12 text-zinc-500 mb-3" />
        <h3 className="text-base font-semibold text-zinc-200 mb-1">GitHub Integration</h3>
        <p className="text-xs text-zinc-400 mb-4 max-w-sm">
          Connect your GitHub Personal Access Token in Settings to view repositories, pull requests, and issues.
        </p>
        <Button 
          className="bg-violet-600 hover:bg-violet-700 text-xs h-8"
          onClick={() => setActiveTab('settings')}
        >
          Configure GitHub Token
        </Button>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-950 border-zinc-800 flex flex-col h-full">
      <CardHeader className="p-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <Github className="w-4 h-4 text-violet-400" />
            <span className="truncate">{repoName}</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-50"
              onClick={checkConnection}
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-50"
              onClick={() => window.open(`https://github.com/${repoName}`, '_blank')}
              title="Open on GitHub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 grid grid-cols-2 divide-x divide-zinc-800 h-64 overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-400">Pull Requests</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 text-violet-400"
              onClick={() => window.open(`https://github.com/${repoName}/pulls`, '_blank')}
            >
              View All
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {prs.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">No open pull requests</div>
            ) : (
              <div className="p-2 space-y-1">
                {prs.map(pr => (
                  <div key={pr.id} className="p-2 hover:bg-zinc-900 rounded cursor-pointer group">
                    <div className="flex items-start gap-2">
                      <GitPullRequest className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-zinc-200 line-clamp-2 leading-tight group-hover:text-violet-400">{pr.title}</p>
                        <span className="text-[10px] text-zinc-500">#{pr.number}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        
        <div className="flex flex-col h-full">
          <div className="p-2 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <span className="text-xs font-semibold text-zinc-400">Issues</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] px-2 text-violet-400"
              onClick={() => window.open(`https://github.com/${repoName}/issues`, '_blank')}
            >
              View All
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {issues.length === 0 ? (
              <div className="p-4 text-center text-xs text-zinc-500">No open issues</div>
            ) : (
              <div className="p-2 space-y-1">
                {issues.map(issue => (
                  <div key={issue.id} className="p-2 hover:bg-zinc-900 rounded cursor-pointer group">
                    <div className="flex items-start gap-2">
                      <CircleDot className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-zinc-200 line-clamp-2 leading-tight group-hover:text-violet-400">{issue.title}</p>
                        <span className="text-[10px] text-zinc-500">#{issue.number}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
