import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import { usePortStore } from '@renderer/stores/usePortStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { CloudLightning, KeyRound, Sparkles, Globe, Server, ArrowRight } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const CreateTunnelDialog: React.FC = () => {
  const {
    createModalOpen,
    setCreateModalOpen,
    startQuickTunnel,
    startNamedTunnel,
    binaryStatus,
    installBinary,
    isDownloadingBinary
  } = useCloudflareStore();

  const { ports } = usePortStore();
  const { runningServices } = useServiceStore();

  const [mode, setMode] = useState<'quick' | 'named'>('quick');

  // Quick Tunnel fields
  const [port, setPort] = useState<string>('5173');
  const [name, setName] = useState<string>('');
  const [protocol, setProtocol] = useState<'http' | 'https' | 'tcp'>('http');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Named Tunnel fields
  const [namedName, setNamedName] = useState<string>('');
  const [tunnelToken, setTunnelToken] = useState<string>('');
  const [customHostname, setCustomHostname] = useState<string>('');
  const [namedPort, setNamedPort] = useState<string>('3000');

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!binaryStatus?.installed) {
      toast.info('Downloading and installing cloudflared first...');
      const ok = await installBinary();
      if (!ok) return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'quick') {
        const portNum = parseInt(port, 10);
        if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
          toast.error('Please enter a valid port number (1 - 65535)');
          setIsSubmitting(false);
          return;
        }

        const res = await startQuickTunnel({
          localPort: portNum,
          protocol,
          name: name.trim() || `Port ${portNum} Public Tunnel`
        });

        if (res) {
          setCreateModalOpen(false);
        }
      } else {
        if (!tunnelToken.trim()) {
          toast.error('Please provide a Cloudflare Tunnel Token');
          setIsSubmitting(false);
          return;
        }

        const res = await startNamedTunnel({
          name: namedName.trim() || 'Named Tunnel',
          tunnelToken: tunnelToken.trim(),
          localPort: parseInt(namedPort, 10) || 80,
          customHostname: customHostname.trim() || undefined
        });

        if (res) {
          setCreateModalOpen(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-lg p-5 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-zinc-800 space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <CloudLightning className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100">
                Launch Cloudflare Tunnel
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Expose your local development port securely to the public web.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode selector pills */}
        <div className="grid grid-cols-2 gap-2 my-1 p-1 bg-zinc-900/80 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all',
              mode === 'quick'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick Tunnel (TryCloudflare)
          </button>

          <button
            type="button"
            onClick={() => setMode('named')}
            className={cn(
              'flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-semibold transition-all',
              mode === 'named'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Named Tunnel (Token)
          </button>
        </div>

        <form onSubmit={handleLaunch} className="space-y-4 pt-1">
          {mode === 'quick' ? (
            <div className="space-y-3">
              {/* Quick Port Presets from Active Services/Ports */}
              {(runningServices.length > 0 || ports.length > 0) && (
                <div>
                  <Label className="text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5 block">
                    Active Local Targets
                  </Label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                    {runningServices.map((svc) => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => {
                          if (svc.port) setPort(svc.port.toString());
                          setName(`${svc.projectName}: ${svc.name}`);
                        }}
                        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 text-[11px] text-zinc-300 flex items-center gap-1.5 transition-colors"
                      >
                        <Server className="w-3 h-3 text-emerald-400" />
                        <span className="font-medium truncate max-w-[120px]">{svc.name}</span>
                        {svc.port && <span className="font-mono text-orange-400">:{svc.port}</span>}
                      </button>
                    ))}

                    {ports
                      .filter((p) => !runningServices.some((s) => s.port === p.port))
                      .slice(0, 6)
                      .map((p) => (
                        <button
                          key={`${p.port}-${p.pid}`}
                          type="button"
                          onClick={() => {
                            setPort(p.port.toString());
                            setName(p.processName ? `${p.processName} (${p.port})` : `Port ${p.port}`);
                          }}
                          className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 text-[11px] text-zinc-300 flex items-center gap-1.5 transition-colors"
                        >
                          <Globe className="w-3 h-3 text-cyan-400" />
                          <span className="font-mono text-orange-400">:{p.port}</span>
                          <span className="text-zinc-500 truncate max-w-[80px]">{p.processName}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Port & Protocol */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="quick-port" className="text-xs text-zinc-300">
                    Local Port Number
                  </Label>
                  <Input
                    id="quick-port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="e.g. 5173, 3000, 8080"
                    required
                    className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-300">Protocol</Label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as any)}
                    className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="tcp">TCP</option>
                  </select>
                </div>
              </div>

              {/* Tunnel Name */}
              <div className="space-y-1.5">
                <Label htmlFor="quick-name" className="text-xs text-zinc-300">
                  Display Label (Optional)
                </Label>
                <Input
                  id="quick-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Next.js App, Vite Web Preview, Express API"
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                />
              </div>

              <div className="p-3 bg-orange-950/20 border border-orange-800/30 rounded-lg text-[11px] text-orange-300/90 leading-relaxed">
                🚀 <strong>Zero Setup Needed:</strong> Cloudflare will automatically provision a public HTTPS subdomain at <code>*.trycloudflare.com</code> and forward requests directly to <code>{protocol}://localhost:{port || '3000'}</code>.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="named-token" className="text-xs text-zinc-300">
                  Cloudflare Tunnel Token
                </Label>
                <Input
                  id="named-token"
                  type="password"
                  value={tunnelToken}
                  onChange={(e) => setTunnelToken(e.target.value)}
                  placeholder="eyJhIjoi..."
                  required
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                />
                <p className="text-[10px] text-zinc-500">
                  Found under Zero Trust Dashboard &gt; Access &gt; Tunnels &gt; Install Connector.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="named-hostname" className="text-xs text-zinc-300">
                    Custom Hostname (Optional)
                  </Label>
                  <Input
                    id="named-hostname"
                    type="text"
                    value={customHostname}
                    onChange={(e) => setCustomHostname(e.target.value)}
                    placeholder="api.yourdomain.com"
                    className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="named-port" className="text-xs text-zinc-300">
                    Local Target Port
                  </Label>
                  <Input
                    id="named-port"
                    type="number"
                    value={namedPort}
                    onChange={(e) => setNamedPort(e.target.value)}
                    placeholder="3000"
                    className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="named-name" className="text-xs text-zinc-300">
                  Tunnel Label
                </Label>
                <Input
                  id="named-name"
                  type="text"
                  value={namedName}
                  onChange={(e) => setNamedName(e.target.value)}
                  placeholder="e.g. Production Staging Connector"
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
              className="text-xs text-zinc-400"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isDownloadingBinary}
              className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-semibold gap-1.5"
            >
              {isSubmitting ? (
                'Connecting...'
              ) : isDownloadingBinary ? (
                'Downloading CLI...'
              ) : (
                <>
                  <span>Start Tunnel</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
