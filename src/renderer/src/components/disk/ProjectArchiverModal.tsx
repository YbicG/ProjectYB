import React, { useState, useEffect } from 'react';
import {
  Archive,
  Snowflake,
  Flame,
  RotateCw,
  CheckCircle2,
  FolderArchive,
  Loader2,
  Sparkles,
  Clock,
  Trash2,
  HardDrive
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface ProjectArchiverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Array<{ id: string; name: string; path: string }>;
}

export const ProjectArchiverModal: React.FC<ProjectArchiverModalProps> = ({
  open,
  onOpenChange,
  projects
}) => {
  const [daysThreshold, setDaysThreshold] = useState<number>(30);
  const [inactiveProjects, setInactiveProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const scanProjects = async () => {
    if (!projects || projects.length === 0) return;
    setIsLoading(true);
    try {
      const res = await window.api.projectArchiver.scanInactiveProjects(projects, daysThreshold);
      setInactiveProjects(res || []);
    } catch (err: any) {
      toast.error('Failed to scan inactive projects: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      scanProjects();
    }
  }, [open, daysThreshold, projects.length]);

  const handleFreeze = async (projectPath: string, id: string) => {
    setProcessingId(id);
    try {
      const res = await window.api.projectArchiver.freezeProject(projectPath);
      if (res.success) {
        toast.success(res.message);
        await scanProjects();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Freeze error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleThaw = async (projectPath: string, id: string) => {
    setProcessingId(id);
    try {
      const res = await window.api.projectArchiver.thawProject(projectPath);
      if (res.success) {
        toast.success(res.message);
        await scanProjects();
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Thaw error: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const totalReclaimableBytes = inactiveProjects.reduce((acc, p) => acc + (p.isFrozen ? 0 : p.reclaimableBytes), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-2xl p-5">
        <DialogHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-zinc-100">
              <Snowflake className="w-4 h-4 text-cyan-400" />
              Project Deep Freeze & Inactive Storage Archiver
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Scans dormant repositories, purges heavy build artifacts and caches, and stores compressed snapshots.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={daysThreshold}
              onChange={(e) => setDaysThreshold(parseInt(e.target.value, 10))}
              className="h-7 text-xs font-mono bg-zinc-900 border border-zinc-800 rounded px-2 text-zinc-200"
            >
              <option value="14">&gt; 14 Days Inactive</option>
              <option value="30">&gt; 30 Days Inactive</option>
              <option value="60">&gt; 60 Days Inactive</option>
              <option value="90">&gt; 90 Days Inactive</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={scanProjects}
              disabled={isLoading}
              className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1"
            >
              <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </DialogHeader>

        {/* Summary HUD Banner */}
        <div className="p-3 rounded-lg border border-cyan-500/20 bg-cyan-950/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <span className="text-zinc-200">
              Found <span className="font-bold text-cyan-300">{inactiveProjects.length}</span> dormant projects
            </span>
          </div>
          <span className="text-zinc-400 font-mono text-[11px]">
            Reclaimable Space: <span className="font-bold text-emerald-400">{Math.round(totalReclaimableBytes / 1024 / 1024)} MB</span>
          </span>
        </div>

        {/* Inactive Projects List */}
        <div className="max-h-80 overflow-y-auto space-y-2 font-mono text-xs pr-1">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-zinc-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              Scanning repositories and measuring directory sizes…
            </div>
          ) : inactiveProjects.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs italic bg-zinc-900/20 rounded-lg border border-zinc-850">
              No inactive projects found past the {daysThreshold}-day threshold.
            </div>
          ) : (
            inactiveProjects.map((p) => {
              const isBusy = processingId === p.projectId;
              return (
                <div
                  key={p.projectId}
                  className="p-2.5 rounded-lg border border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900/70 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-bold text-zinc-100 text-[11px] truncate">{p.projectName}</span>
                      <Badge
                        variant="outline"
                        className={
                          p.isFrozen
                            ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30 text-[9px] uppercase'
                            : 'border-zinc-700 text-zinc-400 text-[9px] uppercase'
                        }
                      >
                        {p.isFrozen ? '🧊 Deep Frozen' : `${p.daysInactive}d inactive`}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                      <span>Last Active: {p.lastActiveDate}</span>
                      <span>·</span>
                      <span className="text-emerald-400 font-semibold">
                        {Math.round(p.reclaimableBytes / 1024 / 1024)} MB Cache
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.isFrozen ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleThaw(p.projectPath, p.projectId)}
                        disabled={isBusy}
                        className="h-7 text-xs border-amber-800/60 bg-amber-950/20 hover:bg-amber-900/40 text-amber-300 gap-1 font-semibold"
                      >
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Flame className="w-3 h-3 text-amber-400" />}
                        Thaw
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFreeze(p.projectPath, p.projectId)}
                        disabled={isBusy}
                        className="h-7 text-xs border-cyan-800/60 bg-cyan-950/20 hover:bg-cyan-900/40 text-cyan-300 gap-1 font-semibold"
                      >
                        {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Snowflake className="w-3 h-3 text-cyan-400" />}
                        Deep Freeze
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};