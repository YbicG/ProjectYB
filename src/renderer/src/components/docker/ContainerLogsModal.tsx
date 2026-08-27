import React, { useState } from 'react';
import { Terminal, Copy, RefreshCw, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useDockerStore } from '@renderer/stores/useDockerStore';
import { toast } from 'sonner';

interface ContainerLogsModalProps {
  projectPath: string;
}

export const ContainerLogsModal: React.FC<ContainerLogsModalProps> = ({ projectPath }) => {
  const { logsModalOpen, setLogsModalOpen, activeLogs, selectedServiceName, openLogs } = useDockerStore();
  const [search, setSearch] = useState('');

  const handleCopy = () => {
    navigator.clipboard.writeText(activeLogs);
    toast.success('Logs copied to clipboard');
  };

  const filteredLogs = search
    ? activeLogs.split('\n').filter(line => line.toLowerCase().includes(search.toLowerCase())).join('\n')
    : activeLogs;

  return (
    <Dialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl flex flex-col h-[600px]">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <DialogTitle className="text-sm font-semibold">
              Logs: {selectedServiceName || 'All Compose Services'}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search logs..."
                className="pl-8 h-7.5 bg-zinc-900 border-zinc-800 text-xs"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-7.5 w-7.5 border-zinc-800"
              onClick={() => openLogs(projectPath, selectedServiceName || undefined)}
              title="Refresh logs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-7.5 w-7.5 border-zinc-800"
              onClick={handleCopy}
              title="Copy all logs"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-black/80 rounded border border-zinc-800/80 p-3 overflow-auto font-mono text-xs text-zinc-300 whitespace-pre-wrap select-text">
          {filteredLogs || 'No log output.'}
        </div>

        <DialogFooter className="pt-2 border-t border-zinc-800 flex justify-between items-center sm:justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">Showing last 150 log entries</span>
          <Button variant="ghost" size="sm" onClick={() => setLogsModalOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
