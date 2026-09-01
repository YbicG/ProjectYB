import React, { useEffect, useState } from 'react';
import { HardDrive, Sparkles, Trash2, RefreshCw, Layers, ShieldCheck, Filter, Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { ProjectDiskCard } from '../components/disk/ProjectDiskCard';
import { ProjectArchiverModal } from '../components/disk/ProjectArchiverModal';
import { Snowflake } from 'lucide-react';
import { GlobalCacheCleaner } from '../components/disk/GlobalCacheCleaner';
import { useDiskStore } from '@renderer/stores/useDiskStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { cn, formatDiskSize } from '@renderer/lib/utils';

export const OptimizerPage: React.FC = () => {
  const { projects } = useProjectStore();
  const {
    summary,
    isAnalyzing,
    isCleaning,
    activeFilter,
    setFilter,
    analyzeAllProjects,
    cleanAllReclaimable
  } = useDiskStore();

  const [search, setSearch] = useState('');
  const [archiverOpen, setArchiverOpen] = useState(false);

  useEffect(() => {
    if (projects.length > 0) {
      analyzeAllProjects(projects.map(p => ({ id: p.id, name: p.name, path: p.path })));
    }
  }, [projects.length]);

  const formatSize = (bytes: number) => formatDiskSize(bytes);

  const filteredProjects = (summary?.projects || []).filter((p) => {
    if (activeFilter === 'large' && p.totalBytes < 1024 * 1024 * 500) return false;
    if (activeFilter === 'reclaimable' && p.reclaimableBytes === 0) return false;
    if (search && !p.projectName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-hidden">
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-600/10 border border-amber-500/20 text-amber-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              Disk Space Optimizer & Cleaner
            </h1>
            <p className="text-xs text-zinc-400">
              Analyze project storage footprint, purge inactive dependencies, and reclaim gigabytes of cache.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-amber-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing storage ({useDiskStore.getState().analyzedCount}/{useDiskStore.getState().totalToAnalyze || projects.length})...</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => useDiskStore.getState().cancelScan()}
                className="h-5 px-1.5 text-[10px] text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 ml-1"
              >
                Stop
              </Button>
            </div>
          )}
          {summary && ((summary.buildBytes || 0) + (summary.cachesBytes || 0)) > 0 && (
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-xs h-8 gap-1.5 font-semibold"
              disabled={isCleaning}
              onClick={() => cleanAllReclaimable()}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Reclaim All Build & Cache (~{formatSize((summary.buildBytes || 0) + (summary.cachesBytes || 0))})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-cyan-800/60 bg-cyan-950/20 text-cyan-300 hover:bg-cyan-950/40 gap-1.5 font-semibold"
            onClick={() => setArchiverOpen(true)}
            title="Open Inactive Project Deep Freeze Archiver"
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            Deep Freeze Archiver
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-zinc-800"
            disabled={isAnalyzing}
            onClick={() => analyzeAllProjects(projects.map(p => ({ id: p.id, name: p.name, path: p.path })), true)}
            title="Force re-scan all projects"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isAnalyzing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ── Summary Stats Bento Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-zinc-950 border-zinc-800 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Total Storage</span>
            <Layers className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <p className="text-xl font-bold font-mono text-zinc-100">
            {formatSize(summary?.totalAnalyzedBytes || 0)}
          </p>
          <span className="text-[10px] text-zinc-500 font-mono">
            {summary?.projects.length || 0} projects
          </span>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Reclaimable Space</span>
            <Trash2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-400">
            {formatSize(summary?.totalReclaimableBytes || 0)}
          </p>
          <span className="text-[10px] text-zinc-500 font-mono">Builds, caches, node_modules</span>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Dependencies</span>
            <HardDrive className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <p className="text-xl font-bold font-mono text-violet-300">
            {formatSize(summary?.dependenciesBytes || 0)}
          </p>
          <span className="text-[10px] text-zinc-500 font-mono">node_modules, venv</span>
        </Card>

        <Card className="bg-zinc-950 border-zinc-800 p-3.5 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Build & Caches</span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <p className="text-xl font-bold font-mono text-cyan-300">
            {formatSize((summary?.buildBytes || 0) + (summary?.cachesBytes || 0))}
          </p>
          <span className="text-[10px] text-zinc-500 font-mono">dist, target, .next, .cache</span>
        </Card>
      </div>

      {/* ── Global Cache Cleaner (pnpm, npm, cargo, pip) ── */}
      <GlobalCacheCleaner />

      {/* ── Filter Bar & Search ── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                activeFilter === 'all'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              All ({summary?.projects.length || 0})
            </button>
            <button
              onClick={() => setFilter('large')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                activeFilter === 'large'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Large &gt; 500MB
            </button>
            <button
              onClick={() => setFilter('reclaimable')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                activeFilter === 'reclaimable'
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              Has Reclaimable
            </button>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="pl-8 h-8 bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>
        </div>

        <span className="text-xs text-zinc-500 font-mono">
          Showing {filteredProjects.length} projects
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          {isAnalyzing && filteredProjects.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              Analyzing project directories and computing storage breakdown…
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500">
              No projects match the current filter.
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {filteredProjects.map((usage) => (
                <ProjectDiskCard key={usage.projectId} usage={usage} />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <ProjectArchiverModal
        open={archiverOpen}
        onOpenChange={setArchiverOpen}
        projects={projects}
      />
    </div>
  );
};
