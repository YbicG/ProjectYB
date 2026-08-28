import React, { useState, useEffect } from 'react';
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
import { CloudLightning, KeyRound, Sparkles, Globe, Server, ArrowRight, Zap, Settings } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const CreateTunnelDialog: React.FC = () => {
  const {
    createModalOpen,
    setCreateModalOpen,
    startQuickTunnel,
    startNamedTunnel,
    autoCreateAndLaunchNamedTunnel,
    binaryStatus,
    installBinary,
    isDownloadingBinary,
    config,
    zones,
    fetchZones
  } = useCloudflareStore();

  const { ports } = usePortStore();
  const { runningServices } = useServiceStore();

  const [mode, setMode] = useState<'quick' | 'auto' | 'manual'>('quick');

  // Quick Tunnel fields
  const [port, setPort] = useState<string>('5173');
  const [name, setName] = useState<string>('');
  const [protocol, setProtocol] = useState<'http' | 'https' | 'tcp'>('http');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto Named Tunnel (1-Click Cloudflare API)
  const [autoName, setAutoName] = useState<string>('');
  const [autoPort, setAutoPort] = useState<string>('3000');
  const [autoSubdomain, setAutoSubdomain] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  // Manual Named Tunnel (Token)
  const [manualName, setManualName] = useState<string>('');
  const [tunnelToken, setTunnelToken] = useState<string>('');
  const [customHostname, setCustomHostname] = useState<string>('');
  const [manualPort, setManualPort] = useState<string>('3000');

  useEffect(() => {
    if (createModalOpen && config.apiToken && config.accountId) {
      fetchZones();
    }
  }, [createModalOpen, config.apiToken, config.accountId]);

  useEffect(() => {
    if (zones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones]);

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
      } else if (mode === 'auto') {
        if (!config.apiToken || !config.accountId) {
          toast.error('Cloudflare API Token & Account ID required in Settings to use 1-click auto provisioning');
          setIsSubmitting(false);
          return;
        }

        const portNum = parseInt(autoPort, 10);
        if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
          toast.error('Please enter a valid port number');
          setIsSubmitting(false);
          return;
        }

        const selectedZone = zones.find((z) => z.id === selectedZoneId);
        const fullHostname = autoSubdomain.trim() && selectedZone
          ? `${autoSubdomain.trim()}.${selectedZone.name}`
          : undefined;

        const res = await autoCreateAndLaunchNamedTunnel({
          name: autoName.trim() || `tunnel-port-${portNum}`,
          localPort: portNum,
          customHostname: fullHostname,
          zoneId: selectedZoneId || undefined
        });

        if (res.success) {
          setCreateModalOpen(false);
        }
      } else {
        if (!tunnelToken.trim()) {
          toast.error('Please provide a Cloudflare Tunnel Token');
          setIsSubmitting(false);
          return;
        }

        const res = await startNamedTunnel({
          name: manualName.trim() || 'Named Tunnel',
          tunnelToken: tunnelToken.trim(),
          localPort: parseInt(manualPort, 10) || 80,
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

  const selectedZone = zones.find((z) => z.id === selectedZoneId);
  const previewHostname = autoSubdomain && selectedZone ? `${autoSubdomain}.${selectedZone.name}` : '';

  return (
    <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-xl p-5 shadow-2xl">
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

        {/* Mode selector pills (3 modes) */}
        <div className="grid grid-cols-3 gap-1.5 my-1 p-1 bg-zinc-900/80 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => setMode('quick')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all',
              mode === 'quick'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Quick (TryCF)
          </button>

          <button
            type="button"
            onClick={() => setMode('auto')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all',
              mode === 'auto'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            1-Click API Named
          </button>

          <button
            type="button"
            onClick={() => setMode('manual')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all',
              mode === 'manual'
                ? 'bg-orange-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            )}
          >
            <KeyRound className="w-3.5 h-3.5" />
            Manual Token
          </button>
        </div>

        <form onSubmit={handleLaunch} className="space-y-4 pt-1">
          {mode === 'quick' && (
            <div className="space-y-3">
              {/* Quick Port Presets */}
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
                🚀 <strong>Instant Quick Tunnel:</strong> Cloudflare provisions a temporary public HTTPS subdomain at <code>*.trycloudflare.com</code> without any account setup.
              </div>
            </div>
          )}

          {mode === 'auto' && (
            <div className="space-y-3">
              {!config.apiToken || !config.accountId ? (
                <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-lg text-xs text-amber-300 space-y-2">
                  <p>⚠️ Cloudflare API Token & Account ID must be configured to use 1-click automated provisioning.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCreateModalOpen(false);
                      useCloudflareStore.getState().saveConfig({});
                    }}
                    className="text-xs border-amber-600 text-amber-200 hover:bg-amber-900/30"
                  >
                    Configure in Settings
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="auto-name" className="text-xs text-zinc-300">
                        Tunnel Name
                      </Label>
                      <Input
                        id="auto-name"
                        type="text"
                        value={autoName}
                        onChange={(e) => setAutoName(e.target.value)}
                        placeholder="e.g. project-api-tunnel"
                        required
                        className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="auto-port" className="text-xs text-zinc-300">
                        Local Port
                      </Label>
                      <Input
                        id="auto-port"
                        type="number"
                        value={autoPort}
                        onChange={(e) => setAutoPort(e.target.value)}
                        placeholder="3000"
                        required
                        className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  {/* Optional Custom Domain / DNS */}
                  <div className="space-y-1.5 pt-1">
                    <Label className="text-xs text-zinc-300 flex items-center justify-between">
                      <span>Custom Domain Routing (Optional)</span>
                      <span className="text-[10px] text-zinc-500 font-normal">Auto CNAME & Ingress</span>
                    </Label>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="text"
                        value={autoSubdomain}
                        onChange={(e) => setAutoSubdomain(e.target.value)}
                        placeholder="Subdomain (e.g. api, app)"
                        className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                      />

                      <select
                        value={selectedZoneId}
                        onChange={(e) => setSelectedZoneId(e.target.value)}
                        className="h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="">No Custom Domain</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.id}>
                            .{z.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {previewHostname && (
                      <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-1">
                        <Globe className="w-3 h-3" /> Will route: <strong>https://{previewHostname}</strong> ➔ localhost:{autoPort}
                      </p>
                    )}
                  </div>

                  <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-lg text-[11px] text-emerald-300/90 leading-relaxed">
                    ✨ <strong>Automated Zero-Dashboard Flow:</strong> ProjectYB will create the named tunnel on your Cloudflare account, resolve the secure token, configure ingress rules, and start the daemon in 1 click.
                  </div>
                </>
              )}
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="manual-token" className="text-xs text-zinc-300">
                  Cloudflare Tunnel Token
                </Label>
                <Input
                  id="manual-token"
                  type="password"
                  value={tunnelToken}
                  onChange={(e) => setTunnelToken(e.target.value)}
                  placeholder="eyJhIjoi..."
                  required
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                />
                <p className="text-[10px] text-zinc-500">
                  Paste the token generated in your Cloudflare Zero Trust Dashboard.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="manual-hostname" className="text-xs text-zinc-300">
                    Custom Hostname (Optional)
                  </Label>
                  <Input
                    id="manual-hostname"
                    type="text"
                    value={customHostname}
                    onChange={(e) => setCustomHostname(e.target.value)}
                    placeholder="api.yourdomain.com"
                    className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="manual-port" className="text-xs text-zinc-300">
                    Local Target Port
                  </Label>
                  <Input
                    id="manual-port"
                    type="number"
                    value={manualPort}
                    onChange={(e) => setManualPort(e.target.value)}
                    placeholder="3000"
                    className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="manual-name" className="text-xs text-zinc-300">
                  Tunnel Label
                </Label>
                <Input
                  id="manual-name"
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
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
                  <span>{mode === 'auto' ? 'Provision & Launch' : 'Start Tunnel'}</span>
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
