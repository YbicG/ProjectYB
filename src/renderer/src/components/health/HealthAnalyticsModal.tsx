import React, { useEffect } from 'react';
import {
  Activity,
  GitBranch,
  ShieldCheck,
  Clock,
  TerminalSquare,
  Code,
  FolderOpen,
  Sparkles,
  RefreshCw,
  Layers,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useHealthStore } from '@renderer/stores/useHealthStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { cn } from '@renderer/lib/utils';

export const HealthAnalyticsModal: React.FC = () => {
  const { overview, isLoading, modalOpen, setModalOpen, fetchOverview } = useHealthStore();
  const { projects } = useProjectStore();
  const { createTerminal } = useTerminalStore();
  const { setActiveTab } = useAppStore();

  useEffect(() => {
    if (modalOpen && projects.length > 0) {
      fetchOverview(projects);
    }
  }, [modalOpen, projects.length]);

  const handleOpenTerminal = async (path: string, name: string) => {
    setModalOpen(false);
    await createTerminal({ name, cwd: path });
    setActiveTab('terminals');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20';
    if (score >= 50) return 'text-amber-400 border-amber-500/30 bg-amber-950/20';
    return 'text-rose-400 border-rose-500/30 bg-rose-950/20';
  };

  // Find max commit count for scaling the activity chart
  const maxCommits = Math.max(...(overview?.activityTimeline.map((p) => p.count) || [1]), 1);

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl flex flex-col h-[680px]">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800 space-y-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base flex items-center gap-2">
                Project Health & Analytics Command Center
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Aggregated repository health, commit velocity, and stale code detector across {projects.length} projects.
              </DialogDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
            onClick={() => fetchOverview(projects)}
            disabled={isLoading}
            title="Refresh analytics"
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-1 space-y-4">
          {isLoading && !overview ? (
            <div className="p-16 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-violet-400" />
              Scanning git histories and computing repository health scores…
            </div>
          ) : overview ? (
            <div className="space-y-4 pt-1">
              {/* ── Key Metrics Cards ── */}
              <div className="grid grid-cols-4 gap-3">
                {/* Health Score */}
                <div className={cn('p-3.5 rounded-lg border flex flex-col justify-between', getScoreColor(overview.healthScore))}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Health Score</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black">{overview.healthScore}</span>
                    <span className="text-xs opacity-70">/ 100</span>
                  </div>
                  <span className="text-[10px] opacity-75 mt-0.5">Overall repository health</span>
                </div>

                {/* Git Cleanliness */}
                <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Git Status</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-emerald-400">{overview.cleanProjects}</span>
                    <span className="text-xs text-zinc-500">clean / {overview.dirtyProjects} dirty</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-0.5">{overview.gitProjects} tracked repos</span>
                </div>

                {/* Stale Projects */}
                <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Stale Repos</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold text-amber-400">{overview.staleCount}</span>
                    <span className="text-xs text-zinc-500">&gt;30d inactive</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Needs review / archive</span>
                </div>

                {/* Total Projects */}
                <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">Total Repos</span>
                  <div className="text-2xl font-bold text-zinc-100 mt-1">{overview.totalProjects}</div>
                  <span className="text-[10px] text-zinc-500 mt-0.5">Under workspace paths</span>
                </div>
              </div>

              {/* ── 30-Day Commit Cadence Timeline ── */}
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardHeader className="py-2.5 px-4 border-b border-zinc-800/80 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-violet-400" />
                    <CardTitle className="text-xs font-semibold text-zinc-200">
                      Cross-Project Commit Velocity (Last 30 Days)
                    </CardTitle>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Total: {overview.activityTimeline.reduce((sum, d) => sum + d.count, 0)} commits
                  </span>
                </CardHeader>

                <CardContent className="p-4">
                  <div className="h-24 flex items-end gap-1.5 pt-2">
                    {overview.activityTimeline.map((item, idx) => {
                      const heightPct = item.count > 0 ? Math.max((item.count / maxCommits) * 100, 15) : 4;
                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center group relative h-full justify-end"
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-[9px] font-mono text-zinc-200 whitespace-nowrap pointer-events-none transition-opacity z-10">
                            {item.date}: {item.count} commits
                          </div>

                          <div
                            style={{ height: `${heightPct}%` }}
                            className={cn(
                              'w-full rounded-t transition-all',
                              item.count > 0 ? 'bg-violet-500 group-hover:bg-violet-400' : 'bg-zinc-800'
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-500 font-mono pt-2 border-t border-zinc-800/50 mt-1">
                    <span>30 days ago</span>
                    <span>15 days ago</span>
                    <span>Today</span>
                  </div>
                </CardContent>
              </Card>

              {/* ── Stale Repositories Radar ── */}
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardHeader className="py-2.5 px-4 border-b border-zinc-800/80 flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <CardTitle className="text-xs font-semibold text-zinc-200">
                      Inactive Repositories (&gt;30 Days)
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-amber-800 text-amber-400">
                    {overview.staleProjects.length} inactive
                  </Badge>
                </CardHeader>

                <CardContent className="p-0">
                  {overview.staleProjects.length === 0 ? (
                    <div className="p-6 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" /> All your repositories have active commits in the last 30 days!
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/60 max-h-48 overflow-y-auto">
                      {overview.staleProjects.slice(0, 10).map((stale) => (
                        <div
                          key={stale.id}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/80 transition-colors"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-zinc-200">{stale.name}</span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase">
                                {stale.type}
                              </Badge>
                              <span className="text-[10px] font-mono text-amber-400">
                                {stale.daysInactive}d inactive
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 truncate" title={stale.lastCommitMessage}>
                              Last commit: {stale.lastCommitMessage || 'No commit message'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[10px] px-2 gap-1 border-zinc-800 hover:text-white"
                              onClick={() => handleOpenTerminal(stale.path, stale.name)}
                            >
                              <TerminalSquare className="w-3 h-3" /> Terminal
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 text-zinc-400 hover:text-zinc-200"
                              onClick={() => window.api?.projects?.openInVSCode(stale.path)}
                            >
                              <Code className="w-3 h-3" /> VSCode
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Framework & Ecosystem Breakdown ── */}
              <div className="p-3.5 rounded-lg bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" /> Ecosystem Breakdown
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(overview.ecosystemBreakdown).map(([eco, count]) => (
                    <div
                      key={eco}
                      className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs flex items-center gap-2"
                    >
                      <span className="capitalize font-medium text-zinc-200">{eco}</span>
                      <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0">
                        {count} ({Math.round((count / overview.totalProjects) * 100)}%)
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
