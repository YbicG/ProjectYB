import React, { useEffect, useState } from 'react';
import {
  Clock,
  Plus,
  Play,
  Trash2,
  Edit2,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Folder,
  History,
  Terminal,
  Activity,
  Calendar,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useCronStore } from '../stores/useCronStore';
import { CronJobDialog } from '../components/cron/CronJobDialog';
import { cn } from '../lib/utils';
import type { CronJob, CronRunHistoryItem } from '../types/cron';

export const CronPage: React.FC = () => {
  const {
    jobs,
    fetchJobs,
    openEditor,
    deleteJob,
    runNow,
    toggleJob,
    history,
    selectedJobId,
    historyDrawerOpen,
    openHistoryDrawer,
    closeHistoryDrawer
  } = useCronStore();

  const [filter, setFilter] = useState<'all' | 'active' | 'failed'>('all');

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = jobs.filter((j) => j.enabled).length;
  const filteredJobs = jobs.filter((j) => {
    if (filter === 'active') return j.enabled;
    if (filter === 'failed') return j.lastStatus === 'failed';
    return true;
  });

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const selectedHistory = selectedJobId ? history[selectedJobId] || [] : [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Clock className="w-5 h-5" />
            </div>
            Scheduled Cron & Background Automation
            <Badge variant="outline" className="text-xs font-mono border-zinc-800 text-zinc-400">
              {jobs.length} TASKS
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Automate recurring shell scripts, database backups, git pulls, cleanups, and background jobs on custom cron intervals.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => openEditor()}
            className="bg-violet-600 hover:bg-violet-500 text-white text-xs h-9 gap-1.5 font-semibold shadow-md shadow-violet-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            New Scheduled Task
          </Button>
        </div>
      </div>

      {/* ── Metric Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-zinc-950/80 border-zinc-850 p-4">
          <div className="text-xs text-zinc-400 font-medium">Total Scheduled Tasks</div>
          <div className="text-2xl font-black text-zinc-100 mt-1 font-mono">{jobs.length}</div>
        </Card>
        <Card className="bg-zinc-950/80 border-zinc-850 p-4">
          <div className="text-xs text-zinc-400 font-medium">Active (Running/Enabled)</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">{activeCount}</div>
        </Card>
        <Card className="bg-zinc-950/80 border-zinc-850 p-4">
          <div className="text-xs text-zinc-400 font-medium">Cron Engine Status</div>
          <div className="text-sm font-bold text-violet-400 mt-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            ACTIVE (30s Tick)
          </div>
        </Card>
        <Card className="bg-zinc-950/80 border-zinc-850 p-4">
          <div className="text-xs text-zinc-400 font-medium">Next Scheduled Run</div>
          <div className="text-xs font-mono text-zinc-300 mt-2 truncate">
            {jobs.find((j) => j.enabled && j.nextRun)?.nextRun
              ? new Date(jobs.find((j) => j.enabled && j.nextRun)!.nextRun!).toLocaleTimeString()
              : 'None active'}
          </div>
        </Card>
      </div>

      {/* ── Filters & Table Controls ── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-zinc-900/60 p-1 rounded-lg border border-zinc-800/80 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-md font-medium transition-all',
              filter === 'all' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            All Tasks ({jobs.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={cn(
              'px-3 py-1.5 rounded-md font-medium transition-all',
              filter === 'active' ? 'bg-zinc-800 text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={cn(
              'px-3 py-1.5 rounded-md font-medium transition-all',
              filter === 'failed' ? 'bg-zinc-800 text-rose-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Failed ({jobs.filter((j) => j.lastStatus === 'failed').length})
          </button>
        </div>
      </div>

      {/* ── Tasks Table ── */}
      {filteredJobs.length === 0 ? (
        <Card className="border-dashed border-zinc-800 bg-zinc-950/40 p-12 text-center">
          <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-300">No scheduled background tasks</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1 mb-4">
            Create recurring cron jobs to automate git pulls across repositories, backup databases, or run maintenance scripts automatically in the background.
          </p>
          <Button size="sm" onClick={() => openEditor()} className="bg-violet-600 hover:bg-violet-500 text-white text-xs">
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create First Task
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job) => (
            <Card
              key={job.id}
              className={cn(
                'bg-zinc-950/80 border-zinc-850 transition-all hover:border-zinc-750',
                job.lastStatus === 'running' && 'border-violet-500/50 shadow-md shadow-violet-500/10'
              )}
            >
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left: Task Info */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-semibold text-sm text-zinc-100">{job.name}</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-violet-500/30 text-violet-300 bg-violet-950/20"
                    >
                      {job.schedule}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono',
                        job.lastStatus === 'running'
                          ? 'border-violet-500/40 text-violet-300 animate-pulse bg-violet-950/30'
                          : job.lastStatus === 'success'
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                          : job.lastStatus === 'failed'
                          ? 'border-rose-500/40 text-rose-400 bg-rose-950/20'
                          : 'border-zinc-800 text-zinc-500'
                      )}
                    >
                      {job.lastStatus === 'running'
                        ? '● EXECUTING...'
                        : job.lastStatus === 'success'
                        ? '✓ LAST RUN OK'
                        : job.lastStatus === 'failed'
                        ? '✕ FAILED'
                        : '○ NEVER RUN'}
                    </Badge>
                  </div>

                  {/* Command */}
                  <div className="bg-zinc-900 rounded px-2.5 py-1 text-xs font-mono text-zinc-300 border border-zinc-800/80 truncate max-w-2xl">
                    <span className="text-violet-400 mr-1.5">$</span>
                    {job.command}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-mono flex-wrap">
                    {job.cwd && (
                      <span className="truncate max-w-xs text-zinc-500" title={job.cwd}>
                        📁 {job.cwd}
                      </span>
                    )}
                    {job.lastRun && (
                      <span>
                        Last: {new Date(job.lastRun).toLocaleTimeString()} ({job.lastDurationMs}ms)
                      </span>
                    )}
                    {job.enabled && job.nextRun && (
                      <span className="text-zinc-300">
                        Next: {new Date(job.nextRun).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Enable/Disable Switch */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleJob(job.id, !job.enabled)}
                    className={cn(
                      'text-xs h-8 font-medium border-zinc-800',
                      job.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500'
                    )}
                  >
                    {job.enabled ? 'Enabled' : 'Paused'}
                  </Button>

                  {/* Run Now Button */}
                  <Button
                    size="sm"
                    onClick={() => runNow(job.id)}
                    disabled={job.lastStatus === 'running'}
                    className="h-8 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1"
                    title="Execute task now"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Run Now
                  </Button>

                  {/* History Logs */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openHistoryDrawer(job.id)}
                    className="h-8 text-xs border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    title="View execution log history"
                  >
                    <History className="w-3.5 h-3.5" />
                  </Button>

                  {/* Edit */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditor(job)}
                    className="h-8 text-xs border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    title="Edit task"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  {/* Delete */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteJob(job.id)}
                    className="h-8 text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Execution History Drawer ── */}
      {historyDrawerOpen && selectedJob && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-zinc-950 border-l border-zinc-800 z-50 p-5 flex flex-col shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 shrink-0">
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <History className="w-4 h-4 text-violet-400" />
                Execution History
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">{selectedJob.name}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={closeHistoryDrawer} className="h-8 w-8 text-zinc-400">
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3 no-scrollbar">
            {selectedHistory.length === 0 ? (
              <div className="text-center text-xs text-zinc-500 py-12">No execution runs recorded yet</div>
            ) : (
              selectedHistory.map((item) => (
                <div key={item.id} className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-mono',
                        item.status === 'success'
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                          : 'border-rose-500/40 text-rose-400 bg-rose-950/20'
                      )}
                    >
                      {item.status === 'success' ? '✓ EXIT 0' : `✕ EXIT ${item.exitCode}`}
                    </Badge>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {new Date(item.timestamp).toLocaleString()} ({item.durationMs}ms)
                    </span>
                  </div>
                  <pre className="bg-zinc-950 rounded p-2 text-[10px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-40 no-scrollbar">
                    {item.output}
                  </pre>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <CronJobDialog />
    </div>
  );
};
