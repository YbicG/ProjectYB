import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit as CommitIcon,
  GitMerge,
  Tag,
  Clock,
  User,
  Hash,
  Layers,
  ArrowRight,
  Sparkles,
  Archive,
  Eye,
  Check
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useGitStore } from '@renderer/stores/useGitStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { GitLogEntry } from '@renderer/types/git';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

interface Branch {
  name: string;
  current: boolean;
}

export const GitBranchGraph: React.FC = () => {
  const { selectedProjectId, stashes, loadStashes } = useGitStore();
  const { projects } = useProjectStore();
  const project = projects.find((p) => p.id === selectedProjectId);

  const [commits, setCommits] = useState<GitLogEntry[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<GitLogEntry | null>(null);

  useEffect(() => {
    if (!project?.path) return;
    setLoading(true);
    if (window.api?.git?.log) {
      window.api.git
        .log(project.path, 30)
        .then((entries: GitLogEntry[]) => {
          setCommits(entries || []);
          if (entries && entries.length > 0) {
            setSelectedCommit(entries[0]);
          }
        })
        .catch(() => setCommits([]))
        .finally(() => setLoading(false));
    }
    if (window.api?.git?.branches) {
      window.api.git
        .branches(project.path)
        .then((res: any) => {
          if (Array.isArray(res?.all)) {
            setBranches(res.all.map((b: string) => ({ name: b, current: b === res.current })));
          } else if (Array.isArray(res)) {
            setBranches(res.map((b: any) => (typeof b === 'string' ? { name: b, current: false } : b)));
          } else {
            setBranches([]);
          }
        })
        .catch(() => setBranches([]));
    }
    loadStashes(project.path);
  }, [project?.path]);

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-xs">
        Select a project to view the branch graph
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
      {/* Visual Commit DAG List */}
      <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-violet-400" />
            <h3 className="text-xs font-semibold text-zinc-200">Commit DAG & Branch Graph</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] bg-zinc-900 font-mono text-zinc-400 border-zinc-800">
              {branches.length} branches
            </Badge>
            <Badge variant="outline" className="text-[10px] bg-violet-950/60 font-mono text-violet-300 border-violet-800">
              {commits.length} commits
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1 p-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-xs font-mono">
              Loading commit tree...
            </div>
          ) : commits.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-zinc-500 text-xs">
              No commit history found in this repository.
            </div>
          ) : (
            <div className="relative pl-6 space-y-3">
              {/* Continuous vertical timeline connector line */}
              <div className="absolute left-[35px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-violet-500/60 via-zinc-700/60 to-zinc-800" />

              {commits.map((commit, idx) => {
                const isHead = idx === 0;
                const isSelected = selectedCommit?.hash === commit.hash;
                const matchingBranches = branches.filter((b: Branch) => b.current && isHead);

                return (
                  <div
                    key={commit.hash || idx}
                    onClick={() => setSelectedCommit(commit)}
                    className={cn(
                      'relative flex items-start gap-3 p-2.5 rounded-lg border text-left cursor-pointer transition-all',
                      isSelected
                        ? 'bg-violet-950/30 border-violet-500/60 shadow-md ring-1 ring-violet-500/30'
                        : 'bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700'
                    )}
                  >
                    {/* Node Dot */}
                    <div
                      className={cn(
                        'relative z-10 shrink-0 w-4 h-4 rounded-full mt-0.5 flex items-center justify-center border transition-all',
                        isHead
                          ? 'bg-violet-500 border-violet-300 ring-4 ring-violet-500/20'
                          : isSelected
                            ? 'bg-violet-600 border-violet-400 ring-2 ring-violet-500/20'
                            : 'bg-zinc-800 border-zinc-600'
                      )}
                    >
                      {isHead && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                    </div>

                    {/* Commit Meta */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] font-semibold text-violet-400 bg-violet-950/40 px-1.5 py-0.2 rounded border border-violet-800/40">
                          {commit.hashShort || commit.hash?.slice(0, 7)}
                        </span>

                        {isHead && (
                          <Badge className="text-[9px] h-4 bg-emerald-950 text-emerald-300 border-emerald-700/60 font-mono">
                            HEAD
                          </Badge>
                        )}

                        {matchingBranches.map((b: Branch) => (
                          <Badge key={b.name} variant="outline" className="text-[9px] h-4 bg-zinc-900 text-zinc-300 border-zinc-700 font-mono flex items-center gap-1">
                            <GitBranch className="w-2.5 h-2.5 text-violet-400" />
                            {b.name}
                          </Badge>
                        ))}

                        <span className="text-[10px] text-zinc-500 ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-600" /> {commit.date}
                        </span>
                      </div>

                      <p className="text-xs font-medium text-zinc-200 truncate mt-1">
                        {commit.message}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-2.5 h-2.5 text-zinc-600" /> {commit.author}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Selected Commit Details & Stash Inspector Pane */}
      <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
        {/* Selected Commit Inspector */}
        <Card className="bg-zinc-950 border-zinc-800/80">
          <CardHeader className="pb-3 border-b border-zinc-800/60">
            <CardTitle className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
              <CommitIcon className="w-3.5 h-3.5 text-violet-400" /> Commit Details
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-xs space-y-3">
            {selectedCommit ? (
              <>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Message</span>
                  <p className="text-xs font-mono text-zinc-200 mt-0.5 bg-zinc-900/60 p-2 rounded border border-zinc-800/80 break-words">
                    {selectedCommit.message}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-zinc-900/40 p-2 rounded border border-zinc-800/60">
                    <span className="text-zinc-500 block text-[10px]">Author</span>
                    <span className="text-zinc-200 font-medium truncate block">{selectedCommit.author}</span>
                  </div>
                  <div className="bg-zinc-900/40 p-2 rounded border border-zinc-800/60">
                    <span className="text-zinc-500 block text-[10px]">Hash</span>
                    <span className="text-violet-400 font-mono block">{selectedCommit.hashShort || selectedCommit.hash?.slice(0, 7)}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedCommit.hash);
                    toast.success('Commit SHA copied to clipboard');
                  }}
                  className="w-full text-xs h-7 border-zinc-800 hover:bg-zinc-900 text-zinc-300"
                >
                  Copy Full SHA
                </Button>
              </>
            ) : (
              <div className="text-center py-6 text-zinc-600 text-xs">
                Select a commit node to inspect
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stashes Quick Shelf */}
        <Card className="bg-zinc-950 border-zinc-800/80 flex-1 flex flex-col overflow-hidden">
          <CardHeader className="pb-3 border-b border-zinc-800/60">
            <CardTitle className="text-xs font-semibold text-zinc-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Archive className="w-3.5 h-3.5 text-cyan-400" /> Stash Bank
              </span>
              <Badge variant="outline" className="text-[10px] font-mono text-zinc-400 border-zinc-800">
                {stashes.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto space-y-2">
            {stashes.length === 0 ? (
              <div className="text-center py-6 text-zinc-600 text-xs">
                No active stashes saved.
              </div>
            ) : (
              stashes.map((s, idx) => (
                <div
                  key={s.index !== undefined ? s.index : idx}
                  className="p-2 rounded border border-zinc-800 bg-zinc-900/40 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-violet-400 text-[11px] font-semibold">stash@&#123;{s.index}&#125;</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{s.date}</span>
                  </div>
                  <p className="text-zinc-300 text-[11px] truncate">{s.message || 'WIP on branch'}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
