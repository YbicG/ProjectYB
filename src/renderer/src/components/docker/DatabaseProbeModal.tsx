import React, { useState } from 'react';
import { Database, Activity, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useDockerStore } from '@renderer/stores/useDockerStore';

interface DatabaseProbeModalProps {
  initialUrl?: string;
}

export const DatabaseProbeModal: React.FC<DatabaseProbeModalProps> = ({ initialUrl = '' }) => {
  const { probeModalOpen, setProbeModalOpen, probeResult, isProbing, probeDatabase } = useDockerStore();
  const [url, setUrl] = useState(initialUrl || 'postgres://postgres:postgres@localhost:5432/mydb');

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      probeDatabase(url.trim());
    }
  };

  return (
    <Dialog open={probeModalOpen} onOpenChange={setProbeModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" /> Database Connection Probe
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Test direct socket connectivity and latency for PostgreSQL, MySQL, Redis, MongoDB, or RabbitMQ.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleTest} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300">Connection URI</label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="e.g. postgres://user:pass@localhost:5432/db or redis://127.0.0.1:6379"
              className="bg-zinc-900 border-zinc-800 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
            <span>Presets:</span>
            <button
              type="button"
              onClick={() => setUrl('postgres://postgres:postgres@localhost:5432/postgres')}
              className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:text-white"
            >
              Postgres
            </button>
            <button
              type="button"
              onClick={() => setUrl('redis://127.0.0.1:6379')}
              className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:text-white"
            >
              Redis
            </button>
            <button
              type="button"
              onClick={() => setUrl('mysql://root:password@localhost:3306/mysql')}
              className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:text-white"
            >
              MySQL
            </button>
          </div>

          {probeResult && (
            <div
              className={`p-3 rounded border text-xs space-y-1.5 ${
                probeResult.success
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-red-950/30 border-red-800/60 text-red-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-1.5">
                  {probeResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  {probeResult.success ? 'Socket Connected Successfully' : 'Connection Failed'}
                </span>
                {probeResult.success && (
                  <Badge variant="outline" className="text-[10px] font-mono border-emerald-700 text-emerald-300">
                    {probeResult.responseTimeMs}ms
                  </Badge>
                )}
              </div>

              <div className="text-[11px] text-zinc-400 font-mono">
                <span>Target: {probeResult.host}:{probeResult.port}</span>
                {probeResult.database && <span> · DB: {probeResult.database}</span>}
              </div>

              {probeResult.error && (
                <p className="text-[11px] text-red-400">{probeResult.error}</p>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-zinc-800 pt-3">
            <Button variant="ghost" size="sm" type="button" onClick={() => setProbeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-700 text-xs gap-1.5" disabled={isProbing || !url.trim()}>
              {isProbing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
              Test Connection
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
