import React from 'react';
import { Trash2, Box, Layers, HardDrive, Cpu, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { ProjectDiskUsage, CleanCategory } from '@renderer/types/disk';
import { useDiskStore } from '@renderer/stores/useDiskStore';
import { formatDiskSize } from '@renderer/lib/utils';

interface ProjectDiskCardProps {
  usage: ProjectDiskUsage;
}

export const ProjectDiskCard: React.FC<ProjectDiskCardProps> = ({ usage }) => {
  const { cleanProject, isCleaning } = useDiskStore();

  const formatSize = (bytes: number) => formatDiskSize(bytes);

  const depPct = usage.totalBytes > 0 ? (usage.dependenciesBytes / usage.totalBytes) * 100 : 0;
  const buildPct = usage.totalBytes > 0 ? (usage.buildBytes / usage.totalBytes) * 100 : 0;
  const cachePct = usage.totalBytes > 0 ? (usage.cachesBytes / usage.totalBytes) * 100 : 0;
  const srcPct = usage.totalBytes > 0 ? (usage.sourceBytes / usage.totalBytes) * 100 : 0;

  const handleClean = (category: CleanCategory) => {
    cleanProject(usage.projectId, usage.projectPath, [category]);
  };

  const handleCleanAllReclaimable = () => {
    cleanProject(usage.projectId, usage.projectPath, ['build', 'caches']);
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 hover:border-zinc-700 transition-colors p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-zinc-100">{usage.projectName}</h4>
            <Badge variant="outline" className="text-[10px] font-mono">
              Total: {formatSize(usage.totalBytes)}
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-500 font-mono truncate max-w-md mt-0.5">
            {usage.projectPath}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(usage.buildBytes + usage.cachesBytes) > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-900/60 bg-amber-950/20 text-amber-300 hover:bg-amber-900/30 gap-1"
              disabled={isCleaning}
              onClick={handleCleanAllReclaimable}
            >
              <Trash2 className="w-3 h-3" />
              Clean Build & Cache ({formatSize(usage.buildBytes + usage.cachesBytes)})
            </Button>
          )}
        </div>
      </div>

      {/* ── Multi-Color Stacked Storage Bar ── */}
      <div className="space-y-1.5">
        <div className="w-full h-2 rounded-full bg-zinc-900 overflow-hidden flex">
          <div style={{ width: `${depPct}%` }} className="bg-violet-500 h-full" title={`Dependencies: ${formatSize(usage.dependenciesBytes)}`} />
          <div style={{ width: `${buildPct}%` }} className="bg-amber-500 h-full" title={`Build Artifacts: ${formatSize(usage.buildBytes)}`} />
          <div style={{ width: `${cachePct}%` }} className="bg-cyan-500 h-full" title={`Caches: ${formatSize(usage.cachesBytes)}`} />
          <div style={{ width: `${srcPct}%` }} className="bg-emerald-500 h-full" title={`Source Code: ${formatSize(usage.sourceBytes)}`} />
        </div>

        {/* ── Category Breakdown Badges ── */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Deps: <strong className="text-zinc-200">{formatSize(usage.dependenciesBytes)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Build: <strong className="text-zinc-200">{formatSize(usage.buildBytes)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500" />
              Cache: <strong className="text-zinc-200">{formatSize(usage.cachesBytes)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Source: <strong className="text-zinc-200">{formatSize(usage.sourceBytes)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1">
            {usage.dependenciesBytes > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-zinc-500 hover:text-red-400 px-1.5"
                onClick={() => handleClean('dependencies')}
                title="Purge node_modules"
              >
                Purge Deps
              </Button>
            )}
            {usage.buildBytes > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-zinc-500 hover:text-amber-400 px-1.5"
                onClick={() => handleClean('build')}
                title="Delete dist/build/target/.next"
              >
                Clean Build
              </Button>
            )}
            {usage.cachesBytes > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-zinc-500 hover:text-cyan-400 px-1.5"
                onClick={() => handleClean('caches')}
                title="Clear local compiler caches"
              >
                Clear Cache
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
