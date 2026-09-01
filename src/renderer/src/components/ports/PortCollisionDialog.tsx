import React, { useState, useEffect } from 'react';
import { AlertTriangle, Zap, Skull, ArrowRight, RotateCw, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

interface PortCollisionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  port: number;
  projectPath: string;
  projectName: string;
  onResolved?: (newPort?: number) => void;
}

export const PortCollisionDialog: React.FC<PortCollisionDialogProps> = ({
  open,
  onOpenChange,
  port,
  projectPath,
  projectName,
  onResolved
}) => {
  const [collidingProcess, setCollidingProcess] = useState<{ pid?: number; processName?: string } | null>(null);
  const [suggestedPort, setSuggestedPort] = useState<number>(port + 1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && port) {
      setIsLoading(true);
      Promise.all([
        window.api?.portResolver?.getPortProcess(port).catch(() => null),
        window.api?.portResolver?.findAvailablePort(port + 1).catch(() => port + 1)
      ]).then(([proc, freePort]) => {
        setCollidingProcess(proc || null);
        if (freePort) setSuggestedPort(freePort);
      }).finally(() => setIsLoading(false));
    }
  }, [open, port]);

  const handleKillProcess = async () => {
    setIsLoading(true);
    try {
      const res = await window.api.portResolver.killPortProcess(port);
      if (res.success) {
        toast.success(res.message);
        onOpenChange(false);
        if (onResolved) onResolved(port);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Failed to kill process: ' + err.message);
    } finally {
      setIsLoading(false)
    }
  };

  const handleAutoReroute = async () => {
    setIsLoading(true);
    try {
      const res = await window.api.portResolver.updateEnvPort(projectPath, suggestedPort);
      if (res.success) {
        toast.success(`Updated PORT=${suggestedPort} in .env`);
        onOpenChange(false);
        if (onResolved) onResolved(suggestedPort);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error('Failed to update port: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-md p-5">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Port Collision Detected (EADDRINUSE)</span>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Port <span className="font-mono font-bold text-amber-400">:{port}</span> is already in use by another process on your system.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg border border-zinc-800/80 bg-zinc-900/50 space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Occupied Port:</span>
            <Badge variant="outline" className="border-rose-800 text-rose-300 bg-rose-950/30">
              :{port}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Holding Process:</span>
            <span className="text-zinc-200 font-semibold">
              {collidingProcess ? `${collidingProcess.processName || 'Process'} (PID: ${collidingProcess.pid})` : 'Unknown Process'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Next Free Port:</span>
            <Badge variant="outline" className="border-emerald-800 text-emerald-300 bg-emerald-950/30">
              :{suggestedPort}
            </Badge>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            onClick={handleKillProcess}
            disabled={isLoading}
            className="w-full h-9 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-2"
          >
            <Skull className="w-3.5 h-3.5" /> Kill Colliding Process ({collidingProcess?.pid || 'PID'})
          </Button>

          <Button
            variant="outline"
            onClick={handleAutoReroute}
            disabled={isLoading}
            className="w-full h-9 border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-emerald-300 hover:text-emerald-200 font-semibold text-xs flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" /> Auto-Reroute to Port :{suggestedPort} & Update .env
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};