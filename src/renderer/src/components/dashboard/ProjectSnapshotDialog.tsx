import React, { useState } from 'react';
import { Archive, Download, FolderOpen, Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface ProjectSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    name: string;
    path: string;
  };
}

export const ProjectSnapshotDialog: React.FC<ProjectSnapshotDialogProps> = ({ open, onOpenChange, project }) => {
  const [customName, setCustomName] = useState(project.name);
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{
    zipPath: string;
    fileName: string;
    fileSizeBytes: number;
    filesCount: number;
  } | null>(null);

  const handleCreateSnapshot = async () => {
    if (!window.api?.archive) return;
    setIsCreating(true);
    setResult(null);

    try {
      const res = await window.api.archive.createSnapshot({
        projectId: project.id,
        projectName: project.name,
        projectPath: project.path,
        customName: customName.trim() || project.name
      });

      if (res.success) {
        setResult(res);
        toast.success(`Snapshot created: ${res.fileName}`);
      } else {
        toast.error(res.error || 'Failed to create snapshot');
      }
    } catch (err: any) {
      toast.error(`Snapshot failed: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenZipLocation = () => {
    if (result?.zipPath && window.api?.projects) {
      window.api.projects.openInExplorer(result.zipPath);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md p-5">
        <DialogHeader className="pb-2 border-b border-zinc-800">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Archive className="w-4 h-4 text-violet-400" />
            Create Clean Project Snapshot
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Generate a lightweight, portable .zip archive of "{project.name}" excluding heavy dependencies and caches.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Excluded folders notice */}
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-300 font-semibold text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Automatically Excluded from Archive:
            </div>
            <p className="font-mono text-[10px] text-zinc-500 leading-relaxed">
              node_modules, .venv, venv, .git, dist, build, .next, target, .turbo, coverage, cache
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Archive Name Prefix</label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. MyProject_v1.0"
              className="h-8 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100"
            />
            <p className="text-[10px] text-zinc-500">Destination: Saved directly to your Desktop</p>
          </div>

          {result && (
            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Check className="w-4 h-4" /> Snapshot Created Successfully!
              </div>
              <div className="space-y-0.5 text-[11px] font-mono text-zinc-300">
                <p>File: <span className="text-zinc-100">{result.fileName}</span></p>
                <p>Size: <span className="text-zinc-100">{(result.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</span> ({result.filesCount} files)</p>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-emerald-700/60 text-emerald-300 hover:bg-emerald-950/40 w-full gap-1.5"
                onClick={handleOpenZipLocation}
              >
                <FolderOpen className="w-3.5 h-3.5" /> Show in File Explorer
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              className="h-8 bg-violet-600 hover:bg-violet-700 text-white text-xs px-4 gap-1.5 font-semibold"
              disabled={isCreating}
              onClick={handleCreateSnapshot}
            >
              {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {isCreating ? 'Archiving…' : 'Create Snapshot (.zip)'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
