import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import { Terminal, Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const TunnelLogsModal: React.FC = () => {
  const {
    logsModalOpen,
    closeLogsModal,
    activeLogsTunnel,
    tunnelLogs,
    fetchTunnelLogs
  } = useCloudflareStore();

  const [copied, setCopied] = React.useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const logs = activeLogsTunnel ? tunnelLogs[activeLogsTunnel.id] || [] : [];

  useEffect(() => {
    if (activeLogsTunnel && logsModalOpen) {
      fetchTunnelLogs(activeLogsTunnel.id);
      const interval = setInterval(() => {
        fetchTunnelLogs(activeLogsTunnel.id);
      }, 1500);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [activeLogsTunnel, logsModalOpen]);

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    navigator.clipboard.writeText(logs.join('\n'));
    setCopied(true);
    toast.success('Logs copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={logsModalOpen} onOpenChange={(open) => !open && closeLogsModal()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-3xl h-[75vh] flex flex-col p-4 shadow-2xl">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800/80 space-y-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-orange-400">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-sm font-semibold text-zinc-100 truncate flex items-center gap-2">
                <span>{activeLogsTunnel?.name || 'Cloudflare Tunnel Logs'}</span>
                {activeLogsTunnel?.publicUrl && (
                  <span className="text-[11px] font-mono text-orange-400 font-normal truncate">
                    {activeLogsTunnel.publicUrl}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Target: {activeLogsTunnel?.protocol}://{activeLogsTunnel?.localHost}:{activeLogsTunnel?.localPort} (PID: {activeLogsTunnel?.pid || 'N/A'})
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mr-6 shrink-0">
            {activeLogsTunnel?.publicUrl && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-zinc-800 gap-1"
                onClick={() => window.open(activeLogsTunnel.publicUrl, '_blank')}
              >
                <ExternalLink className="w-3 h-3 text-zinc-400" />
                Open
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-zinc-800 gap-1"
              onClick={handleCopyLogs}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </DialogHeader>

        {/* Console output */}
        <div className="flex-1 bg-black/80 rounded-lg border border-zinc-850 p-3 font-mono text-xs overflow-hidden flex flex-col mt-2">
          <ScrollArea className="flex-1">
            {logs.length === 0 ? (
              <div className="text-zinc-600 italic p-4 text-center">
                Listening for cloudflared output streams...
              </div>
            ) : (
              <div className="space-y-1 text-zinc-300">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed break-all ${
                      log.includes('ERR') || log.includes('error')
                        ? 'text-rose-400'
                        : log.includes('trycloudflare.com')
                        ? 'text-emerald-400 font-bold bg-emerald-950/20 px-1 py-0.5 rounded'
                        : log.includes('INF')
                        ? 'text-zinc-400'
                        : 'text-zinc-300'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
