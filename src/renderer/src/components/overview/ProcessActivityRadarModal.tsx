import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  HardDrive,
  Trash2,
  RefreshCw,
  Search,
  Terminal,
  CheckCircle2,
  Flame
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';

interface DeveloperProcessItem {
  pid: number;
  parentPid: number;
  name: string;
  command: string;
  cpu: number;
  memoryMb: number;
  terminalId?: string;
  terminalTitle?: string;
}

interface ProcessActivityRadarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProcessActivityRadarModal: React.FC<ProcessActivityRadarModalProps> = ({
  open,
  onOpenChange
}) => {
  const [processes, setProcesses] = useState<DeveloperProcessItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isKilling, setIsKilling] = useState<number | null>(null);

  const fetchProcesses = async () => {
    if (!window.api?.system?.getDeveloperProcesses) return;
    setIsLoading(true);
    try {
      const list = await window.api.system.getDeveloperProcesses();
      setProcesses(list || []);
    } catch {
      setProcesses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchProcesses();
      const interval = setInterval(fetchProcesses, 3000);
      return () => clearInterval(interval);
    }
  }, [open]);

  const handleKillProcess = async (pid: number, name: string) => {
    setIsKilling(pid);
    try {
      if (window.api?.services?.forceKill) {
        await window.api.services.forceKill({ pid });
      } else if (window.api?.ports?.kill) {
        await window.api.ports.kill(pid);
      }
      toast.success(`Terminated ${name} (PID ${pid})`);
      await fetchProcesses();
    } catch (err: any) {
      toast.error(`Failed to kill process: ${err.message}`);
    } finally {
      setIsKilling(null);
    }
  };

  const handleKillAllTerminals = async () => {
    if (!window.confirm('Terminate ALL running background terminal processes?')) return;
    try {
      const terminals = useTerminalStore.getState().terminals;
      for (const t of terminals) {
        useTerminalStore.getState().killTerminal(t.id);
      }
      toast.success('Terminated all active terminal sessions');
      await fetchProcesses();
    } catch (err: any) {
      toast.error(`Error stopping terminals: ${err.message}`);
    }
  };

  const filtered = processes.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.command.toLowerCase().includes(q) ||
      (p.terminalTitle && p.terminalTitle.toLowerCase().includes(q)) ||
      p.pid.toString().includes(q)
    );
  });

  const totalCpu = processes.reduce((acc, p) => acc + p.cpu, 0);
  const totalMem = processes.reduce((acc, p) => acc + p.memoryMb, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  Developer Process & Port Activity Radar
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                  Inspect spawned dev servers, child workers, PTY shells, and resource utilization.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              onClick={fetchProcesses}
              title="Refresh processes"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-zinc-800/80 text-xs">
            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-violet-400" /> Active Dev Procs
              </span>
              <span className="font-mono font-bold text-zinc-100">{processes.length}</span>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" /> Total Dev CPU
              </span>
              <span className="font-mono font-bold text-amber-400">{Math.round(totalCpu * 10) / 10}%</span>
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Total Dev RAM
              </span>
              <span className="font-mono font-bold text-emerald-400">{totalMem} MB</span>
            </div>
          </div>
        </DialogHeader>

        {/* Filter Input */}
        <div className="p-3 border-b border-zinc-800/80 bg-zinc-950/60">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by PID, process name, or command..."
              className="h-8 pl-8 pr-3 text-xs bg-zinc-900 border-zinc-800 focus-visible:ring-1 focus-visible:ring-rose-500 font-mono"
            />
          </div>
        </div>

        {/* Process List */}
        <div className="p-4 space-y-2 max-h-[45vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 text-xs space-y-1">
              <CheckCircle2 className="w-7 h-7 mx-auto text-zinc-600 mb-1" />
              <p>No active background developer processes found.</p>
              <p className="text-[11px] text-zinc-600">Start a terminal or dev service to see live process metrics.</p>
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.pid}
                className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">{p.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-zinc-700 text-zinc-400">
                      PID: {p.pid}
                    </Badge>
                    {p.terminalTitle && (
                      <Badge className="text-[10px] px-1.5 py-0 bg-violet-500/10 text-violet-300 border-violet-500/20 font-mono">
                        {p.terminalTitle}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono truncate" title={p.command}>
                    {p.command || 'Direct PTY process'}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-300">
                      <Cpu className="w-3 h-3 text-amber-400" />
                      <span>{p.cpu}%</span>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
                      <HardDrive className="w-3 h-3 text-emerald-400" />
                      <span>{p.memoryMb} MB</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isKilling === p.pid}
                    onClick={() => handleKillProcess(p.pid, p.name)}
                    className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2 gap-1"
                    title="Force terminate process"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kill</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Close
          </Button>

          {processes.length > 0 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleKillAllTerminals}
              className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 font-semibold"
            >
              <Flame className="w-3.5 h-3.5" /> Emergency Stop All Services
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
