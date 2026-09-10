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
import { useAppStore } from '@renderer/stores/useAppStore';
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
    launchRemoteTunnel,
    remoteTunnels,
    loadRemoteTunnels,
    binaryStatus,
    checkBinaryStatus,
    installBinary,
    isDownloadingBinary,
    config,
    loadConfig,
    zones,
    fetchZones
  } = useCloudflareStore();

  const { ports } = usePortStore();
  const { runningServices } = useServiceStore();
  const { openSettingsTab } = useAppStore();

  const [mode, setMode] = useState<'quick' | 'auto' | 'manual'>('quick');

  // Quick Tunnel fields
  const [port, setPort] = useState<string>('5173');
  const [name, setName] = useState<string>('');
  const [protocol, setProtocol] = useState<'http' | 'https' | 'tcp'>('http');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto Named Tunnel (1-Click Cloudflare API)
  const [autoSubMode, setAutoSubMode] = useState<'existing' | 'new'>('existing');
  const [selectedRemoteTunnelId, setSelectedRemoteTunnelId] = useState<string>('');
  const [autoName, setAutoName] = useState<string>('');
  const [autoPort, setAutoPort] = useState<string>('3000');
  const [autoSubdomain, setAutoSubdomain] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [manualCustomHostname, setManualCustomHostname] = useState<string>('');

  // Manual Named Tunnel (Token)
  const [manualName, setManualName] = useState<string>('');
  const [tunnelToken, setTunnelToken] = useState<string>('');
  const [customHostname, setCustomHostname] = useState<string>('');
  const [manualPort, setManualPort] = useState<string>('3000');

  useEffect(() => {
    if (createModalOpen) {
      loadConfig();
      checkBinaryStatus();
    }
  }, [createModalOpen]);

  useEffect(() => {
    if (createModalOpen && config.apiToken && config.accountId) {
      fetchZones();
      loadRemoteTunnels();
    }
  }, [createModalOpen, config.apiToken, config.accountId]);

  useEffect(() => {
    if (zones.length > 0 && !selectedZoneId) {
      setSelectedZoneId(zones[0].id);
    }
  }, [zones]);

  useEffect(() => {
    if (remoteTunnels.length > 0 && !selectedRemoteTunnelId) {
      setSelectedRemoteTunnelId(remoteTunnels[0].id);
    }
  }, [remoteTunnels, selectedRemoteTunnelId]);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();

    let currentBinary = binaryStatus;
    if (!currentBinary) {
      currentBinary = await checkBinaryStatus();
    }
    if (!currentBinary?.installed) {
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
          toast.error('Please enter a valid port number (1 - 65535)');
          setIsSubmitting(false);
          return;
        }

        if (autoSubMode === 'existing') {
          if (!selectedRemoteTunnelId) {
            toast.error('Please select a Cloudflare Zero Trust Named Tunnel');
            setIsSubmitting(false);
            return;
          }
          const selectedTunnel = remoteTunnels.find((t) => t.id === selectedRemoteTunnelId);
          const res = await launchRemoteTunnel(
            selectedRemoteTunnelId,
            selectedTunnel?.name,
            portNum
          );
          if (res) {
            setCreateModalOpen(false);
          }
        } else {
          const selectedZone = zones.find((z) => z.id === selectedZoneId);
          let fullHostname: string | undefined = undefined;
          if (selectedZone && autoSubdomain.trim()) {
            fullHostname = `${autoSubdomain.trim()}.${selectedZone.name}`;
          } else if (manualCustomHostname.trim()) {
            fullHostname = manualCustomHostname.trim();
          }

          const res = await autoCreateAndLaunchNamedTunnel({
            name: autoName.trim() || `tunnel-port-${portNum}`,
            localPort: portNum,
            customHostname: fullHostname,
            zoneId: selectedZoneId && !selectedZoneId.startsWith('discovered_') ? selectedZoneId : undefined
          });

          if (res.success) {
            setCreateModalOpen(false);
          }
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
                      openSettingsTab('cloudflare');
                    }}
                    className="text-xs border-amber-600 text-amber-200 hover:bg-amber-900/30"
                  >
                    Configure in Settings
                  </Button>
                </div>
              ) : (
                <>
                  {/* Sub-mode selector if remote tunnels exist */}
                  {remoteTunnels.length > 0 && (
                    <div className="flex items-center gap-1.5 p-1 bg-zinc-900 rounded-lg border border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setAutoSubMode('existing')}
                        className={cn(
                          'flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                          autoSubMode === 'existing'
                            ? 'bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                        )}
                      >
                        <CloudLightning className="w-3.5 h-3.5 text-orange-400" />
                        Existing Zero Trust ({remoteTunnels.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoSubMode('new')}
                        className={cn(
                          'flex-1 py-1.5 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1.5',
                          autoSubMode === 'new'
                            ? 'bg-zinc-800 text-orange-400 border border-orange-500/30 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                        )}
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        New Tunnel
                      </button>
                    </div>
                  )}

                  {autoSubMode === 'existing' && remoteTunnels.length > 0 ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="existing-tunnel" className="text-xs text-zinc-300">
                          Select Cloudflare Zero Trust Named Tunnel
                        </Label>
                        <select
                          id="existing-tunnel"
                          value={selectedRemoteTunnelId}
                          onChange={(e) => setSelectedRemoteTunnelId(e.target.value)}
                          className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-orange-500"
                        >
                          {remoteTunnels.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} {t.hostname ? `(${t.hostname})` : ''} [{t.status.toUpperCase()}]
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Selected Tunnel Details Banner */}
                      {(() => {
                        const sel = remoteTunnels.find((t) => t.id === selectedRemoteTunnelId);
                        if (!sel) return null;
                        return (
                          <div className="p-3 bg-zinc-900/90 border border-zinc-800 rounded-lg space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Tunnel Name:</span>
                              <span className="font-semibold text-zinc-100">{sel.name}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Public Domain / Ingress:</span>
                              {sel.hostname ? (
                                <span className="font-mono text-emerald-400 font-medium flex items-center gap-1">
                                  <Globe className="w-3 h-3 text-emerald-400" />
                                  https://{sel.hostname}
                                </span>
                              ) : (
                                <span className="text-zinc-500 italic">No public domain configured (Port Proxy)</span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Local Port */}
                      <div className="space-y-1.5">
                        <Label htmlFor="auto-existing-port" className="text-xs text-zinc-300">
                          Local Service Port to Route To
                        </Label>
                        <Input
                          id="auto-existing-port"
                          type="number"
                          value={autoPort}
                          onChange={(e) => setAutoPort(e.target.value)}
                          placeholder="3000"
                          required
                          className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                        />
                      </div>

                      {/* Quick target chips */}
                      {(runningServices.length > 0 || ports.length > 0) && (
                        <div>
                          <Label className="text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5 block">
                            Active Local Services
                          </Label>
                          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto no-scrollbar">
                            {runningServices.map((svc) => (
                              <button
                                key={svc.id}
                                type="button"
                                onClick={() => {
                                  if (svc.port) setAutoPort(svc.port.toString());
                                }}
                                className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:border-orange-500/50 text-[11px] text-zinc-300 flex items-center gap-1.5 transition-colors"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                <span>{svc.projectName}: {svc.name}</span>
                                {svc.port && <span className="text-zinc-400 font-mono">:{svc.port}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
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

                        {zones.length > 0 ? (
                          <div className="space-y-2">
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
                              <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                                <Globe className="w-3 h-3" /> Will route: <strong>https://{previewHostname}</strong> ➔ localhost:{autoPort}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <Input
                              type="text"
                              value={manualCustomHostname}
                              onChange={(e) => setManualCustomHostname(e.target.value)}
                              placeholder="e.g. dev.yourdomain.com (Optional)"
                              className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100 font-mono"
                            />
                            <p className="text-[10px] text-zinc-400">
                              API Token has Tunnel scope. You can specify your domain here or configure hostnames in Cloudflare Zero Trust.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-lg text-[11px] text-emerald-300/90 leading-relaxed">
                        ✨ <strong>Automated Zero-Dashboard Flow:</strong> ProjectYB will create the named tunnel on your Cloudflare account, resolve the secure token, configure ingress rules, and start the daemon in 1 click.
                      </div>
                    </div>
                  )}
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
                  <span>
                    {mode === 'auto'
                      ? autoSubMode === 'existing' && remoteTunnels.length > 0
                        ? 'Launch Tunnel'
                        : 'Provision & Launch'
                      : 'Start Tunnel'}
                  </span>
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
