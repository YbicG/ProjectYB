import React, { useEffect, useState } from 'react';
import { GitBranch, GitCommit, ArrowUp, ArrowDown, FolderGit2, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useWorkspaceProjects } from '@renderer/hooks/useWorkspaceProjects';
import { useGitStore } from '@renderer/stores/useGitStore';
import { useAppStore } from '@renderer/stores/useAppStore';

interface CommitFeedEntry {
  projectId: string;
  projectName: string;
  hash: string;
  message: string;
  author: string;
  date: string;
}

export const GitActivityFeedWidget: React.FC = () => {
  const { projects } = useWorkspaceProjects();
  const { statuses, fetchStatus } = useGitStore();
  const { setActiveTab } = useAppStore();

  const [recentCommits, setRecentCommits] = useState<CommitFeedEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFeed = async () => {
    if (!window.api?.git) return;
    setLoading(true);

    const allCommits: CommitFeedEntry[] = [];
    const gitProjects = projects.filter((p) => p.isGitRepo !== false).slice(0, 20);

    try {
      const results = await Promise.all(
        gitProjects.map(async (project) => {
          try {
            const logs = await window.api.git.log(project.path, 3);
            if (logs && Array.isArray(logs)) {
              return logs.map((log) => ({
                projectId: project.id,
                projectName: project.name,
                hash: log.hash ? log.hash.substring(0, 7) : '',
                message: log.message || '',
                author: log.author || '',
                date: log.date || ''
              }));
            }
          } catch {}
          return [];
        })
      );

      results.flat().forEach((entry) => allCommits.push(entry));
      allCommits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentCommits(allCommits.slice(0, 25));
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      loadFeed();
    }
  }, [projects.length]);

  return (
    <Card className="bg-zinc-950/80 border-zinc-800/90 flex flex-col h-full overflow-hidden backdrop-blur-sm">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-violet-400" />
          <CardTitle className="text-xs uppercase tracking-wider text-zinc-300 font-semibold">
            Cross-Project Git Stream
          </CardTitle>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
          onClick={loadFeed}
          disabled={loading}
          title="Refresh Git feed"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent className="p-3 flex-1 overflow-y-auto space-y-2">
        {recentCommits.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-600 space-y-1">
            <GitCommit className="w-8 h-8 opacity-40 mb-1" />
            <p className="text-xs">{loading ? 'Scanning git repositories…' : 'No recent git commits found'}</p>
          </div>
        ) : (
          recentCommits.map((item, idx) => (
            <div
              key={`${item.hash}-${idx}`}
              className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700 transition-colors flex items-start justify-between gap-2"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-violet-950/30 text-violet-300 border-violet-800/40 font-semibold px-1.5 py-0">
                    {item.projectName}
                  </Badge>
                  <span className="font-mono text-[10px] text-zinc-500">{item.hash}</span>
                  <span className="text-[10px] text-zinc-500 truncate">{item.author}</span>
                </div>

                <p className="text-xs text-zinc-200 truncate font-medium">{item.message}</p>
              </div>

              <span className="text-[10px] text-zinc-500 shrink-0 mt-0.5">
                {item.date ? new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
