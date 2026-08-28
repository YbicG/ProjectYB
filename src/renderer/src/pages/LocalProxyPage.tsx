import React, { useEffect, useState } from 'react';
import {
  Globe,
  Plus,
  Play,
  Square,
  ShieldCheck,
  ExternalLink,
  Trash2,
  Edit2,
  RefreshCw,
  Server,
  Activity,
  Lock,
  FileCode,
  Info,
  ShieldAlert,
  CheckCircle2,
  Shield
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../components/ui/dialog';
import { useProxyStore } from '../stores/useProxyStore';
import { useServiceStore } from '../stores/useServiceStore';
import { usePortStore } from '../stores/usePortStore';
import { cn } from '../lib/utils';
import type { ProxyRoute } from '../types/proxy';

export const LocalProxyPage: React.FC = () => {
  const {
    routes,
    status,
    hostsStatus,
    rootCaStatus,
    installRootCa,
    uninstallRootCa,
    isLoading,
    isSyncingHosts,
    isEditorOpen,
    editingRoute,
    fetchStatus,
    checkHostsStatus,
    syncAllToHosts,
    syncSingleToHosts,
    clearHosts,
    startProxy,
    stopProxy,
    addRoute,
    updateRoute,
    deleteRoute,
    toggleRoute,
    openEditor,
    closeEditor
  } = useProxyStore();

  const { runningServices } = useServiceStore();
  const { ports } = usePortStore();

  const [httpPortInput, setHttpPortInput] = useState('8080');
  const [httpsPortInput, setHttpsPortInput] = useState('8443');

  // Form State for Route Editor
  const [formHostname, setFormHostname] = useState('');
  const [formTargetPort, setFormTargetPort] = useState('3000');
  const [formUseHttps, setFormUseHttps] = useState(true);
  const [formAutoSyncHosts, setFormAutoSyncHosts] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (editingRoute) {
      setFormHostname(editingRoute.hostname);
      setFormTargetPort(editingRoute.targetPort.toString());
      setFormUseHttps(editingRoute.useHttps);
      setFormAutoSyncHosts(false);
    } else {
      setFormHostname('');
      setFormTargetPort('3000');
      setFormUseHttps(true);
      setFormAutoSyncHosts(true);
    }
  }, [editingRoute, isEditorOpen]);

  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formHostname.trim()) return;

    const portNum = parseInt(formTargetPort, 10);
    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) return;

    if (editingRoute) {
      await updateRoute(editingRoute.id, {
        hostname: formHostname.trim().toLowerCase(),
        targetPort: portNum,
        useHttps: formUseHttps
      });
    } else {
      await addRoute(
        {
          hostname: formHostname.trim().toLowerCase(),
          targetPort: portNum,
          targetHost: '127.0.0.1',
          useHttps: formUseHttps,
          enabled: true
        },
        formAutoSyncHosts
      );
    }
  };

  const handleToggleProxy = () => {
    if (status.running) {
      stopProxy();
    } else {
      startProxy(parseInt(httpPortInput, 10) || 8080, parseInt(httpsPortInput, 10) || 8443);
    }
  };

  const allSynced = routes.length > 0 && routes.every((r) => !r.enabled || hostsStatus[r.hostname]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto overflow-y-auto">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Globe className="w-5 h-5" />
            </div>
            Local HTTPS Reverse Proxy
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-mono border-zinc-800',
                status.running
                  ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                  : 'text-zinc-500'
              )}
            >
              {status.running ? '● PROXY ACTIVE' : '○ STOPPED'}
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Map custom development domains (e.g. <code>https://app.test</code>) directly to your project ports with SSL and Hosts file sync.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncAllToHosts()}
            disabled={isSyncingHosts || routes.length === 0}
            className={cn(
              'text-xs h-9 gap-1.5 font-medium border-zinc-800 transition-colors',
              allSynced ? 'text-cyan-400 bg-cyan-950/10' : 'text-amber-400 bg-amber-950/20 border-amber-800/40'
            )}
            title="Update Windows System Hosts file with all active domains"
          >
            <Shield className="w-3.5 h-3.5" />
            {isSyncingHosts ? 'Syncing...' : allSynced ? 'Hosts Synced' : 'Sync All to Hosts'}
          </Button>

          <Button
            size="sm"
            onClick={handleToggleProxy}
            disabled={isLoading}
            className={cn(
              'text-xs h-9 gap-1.5 font-semibold text-white transition-all',
              status.running ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
            )}
          >
            {status.running ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                Stop Proxy
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Start Proxy
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={() => openEditor()}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs h-9 gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Domain Route
          </Button>
        </div>
      </div>

      {/* ── Root CA & SSL Trust Status Banner ── */}
      <div
        className={cn(
          'p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs',
          rootCaStatus?.installed
            ? 'bg-emerald-950/15 border-emerald-800/30 text-emerald-300'
            : 'bg-amber-950/20 border-amber-800/40 text-amber-300'
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-1.5 rounded-lg shrink-0',
              rootCaStatus?.installed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
            )}
          >
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold flex items-center gap-2 flex-wrap">
              <span>{rootCaStatus?.installed ? 'Trusted Local Root CA Active' : 'Untrusted Self-Signed SSL'}</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-mono',
                  rootCaStatus?.installed
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30'
                    : 'border-amber-500/40 text-amber-400 bg-amber-950/30'
                )}
              >
                {rootCaStatus?.installed ? '🔒 GREEN PADLOCK ACTIVE' : '⚠️ BROWSER WARNING SCREEN'}
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {rootCaStatus?.installed
                ? 'ProjectYB Root CA is installed and trusted in your Windows Certificate Store. All *.test and *.local domains display with genuine green padlock in Chrome, Edge, and Firefox.'
                : 'Install the ProjectYB Root CA into your Windows Certificate Store (1-click) to remove all browser warning screens.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {rootCaStatus?.installed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => uninstallRootCa()}
              className="h-8 text-xs border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-800/50"
            >
              Remove Root CA
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => installRootCa()}
              className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-zinc-950 font-semibold gap-1.5 shadow-md"
            >
              <Lock className="w-3.5 h-3.5" />
              Install Trusted Root CA
            </Button>
          )}
        </div>
      </div>

      {/* ── Telemetry HUD ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card className="bg-zinc-950/80 border-zinc-800/80 p-4">
          <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
            <span>Listener Ports (HTTP / HTTPS)</span>
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          {status.running ? (
            <div className="text-xl font-bold font-mono text-zinc-100 mt-2">
              :{status.httpPort} <span className="text-xs text-zinc-500 font-normal">HTTP</span> / :{status.httpsPort}{' '}
              <span className="text-xs text-zinc-500 font-normal">HTTPS</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-500 font-mono">:</span>
                <Input
                  type="number"
                  value={httpPortInput}
                  onChange={(e) => setHttpPortInput(e.target.value)}
                  className="w-16 h-7 bg-zinc-900 border-zinc-800 text-xs font-mono px-1.5 text-zinc-200"
                  placeholder="8080"
                />
                <span className="text-[10px] text-zinc-500 uppercase">HTTP</span>
              </div>
              <span className="text-zinc-600">/</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-zinc-500 font-mono">:</span>
                <Input
                  type="number"
                  value={httpsPortInput}
                  onChange={(e) => setHttpsPortInput(e.target.value)}
                  className="w-16 h-7 bg-zinc-900 border-zinc-800 text-xs font-mono px-1.5 text-zinc-200"
                  placeholder="8443"
                />
                <span className="text-[10px] text-zinc-500 uppercase">HTTPS</span>
              </div>
            </div>
          )}
          <p className="text-[10px] text-zinc-500 mt-1">
            {status.running ? 'Live local listener ports' : 'Custom ports applied on proxy start'}
          </p>
        </Card>

        <Card className="bg-zinc-950/80 border-zinc-800/80 p-4">
          <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
            <span>Active Mappings</span>
            <Globe className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-2">
            {routes.filter((r) => r.enabled).length} <span className="text-xs text-zinc-500 font-normal">of {routes.length} Active</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">SNI SSL domain endpoints</p>
        </Card>

        <Card className="bg-zinc-950/80 border-zinc-800/80 p-4">
          <div className="text-xs text-zinc-400 font-medium flex items-center justify-between">
            <span>Live Connections</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-2">
            {status.activeConnections} <span className="text-xs text-zinc-500 font-normal">Sockets</span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Real-time throughput tracker</p>
        </Card>
      </div>

      {/* ── Routes Table / Card List ── */}
      <Card className="bg-zinc-950/80 border-zinc-800/80 overflow-hidden shadow-xl">
        <CardHeader className="p-4 pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            Configured Domain Routes
            <Badge variant="outline" className="text-[10px] font-mono border-zinc-800">
              {routes.length}
            </Badge>
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => checkHostsStatus()}
            className="text-[11px] h-7 text-zinc-400 hover:text-zinc-200 gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Check Hosts Status
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {routes.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 space-y-2">
              <Globe className="w-8 h-8 opacity-30 mx-auto" />
              <p className="text-sm font-semibold text-zinc-300">No proxy routes configured</p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Add your first custom domain route (e.g. <code>app.test ➔ localhost:3000</code>) to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/80">
              {routes.map((route) => {
                const proxyUrl = `${route.useHttps ? 'https' : 'http'}://${route.hostname}:${
                  route.useHttps ? status.httpsPort : status.httpPort
                }`;
                const isMappedInHosts = hostsStatus[route.hostname];

                return (
                  <div
                    key={route.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm font-mono text-zinc-100">
                          {route.hostname}
                        </span>

                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-mono px-1.5 py-0',
                            route.useHttps
                              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                              : 'border-zinc-800 text-zinc-400'
                          )}
                        >
                          {route.useHttps ? 'HTTPS (SSL)' : 'HTTP'}
                        </Badge>

                        <button
                          type="button"
                          onClick={() => !isMappedInHosts && syncSingleToHosts(route.hostname)}
                          title={
                            isMappedInHosts
                              ? 'Resolved in System Hosts file (127.0.0.1)'
                              : 'Click to add this domain to Windows Hosts file'
                          }
                          className={cn(
                            'text-[9px] font-mono px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1',
                            isMappedInHosts
                              ? 'border-cyan-500/40 text-cyan-300 bg-cyan-950/30'
                              : 'border-amber-500/40 text-amber-300 bg-amber-950/30 hover:bg-amber-900/40 cursor-pointer'
                          )}
                        >
                          {isMappedInHosts ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />
                              <span>IN HOSTS</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-2.5 h-2.5 text-amber-400" />
                              <span>+ ADD TO HOSTS</span>
                            </>
                          )}
                        </button>

                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-mono px-1.5 py-0',
                            route.enabled
                              ? 'border-violet-500/30 text-violet-400'
                              : 'border-zinc-800 text-zinc-600'
                          )}
                        >
                          {route.enabled ? 'ENABLED' : 'DISABLED'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                        <span>
                          ➔ Forwards to: <strong className="text-zinc-200">127.0.0.1:{route.targetPort}</strong>
                        </span>
                        <span>·</span>
                        <span className="text-zinc-500">{route.requestCount || 0} requests</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {status.running && route.enabled && (
                        <a
                          href={proxyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRoute(route.id)}
                        className="text-xs h-8 text-zinc-400 hover:text-zinc-200"
                      >
                        {route.enabled ? 'Disable' : 'Enable'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditor(route)}
                        className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
                        title="Edit Route"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRoute(route.id)}
                        className="h-8 w-8 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
                        title="Delete Route"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── DNS & Hosts Guide Box ── */}
      <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-200 font-bold">
            <Info className="w-4 h-4 text-cyan-400" />
            Automatic System Hosts Resolution
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearHosts()}
            className="text-[10px] h-6 text-zinc-500 hover:text-rose-400"
          >
            Clear ProjectYB Block
          </Button>
        </div>
        <p className="leading-relaxed text-zinc-400">
          Clicking <strong>"Sync All to Hosts"</strong> uses elevated Windows PowerShell to write all active routes into{' '}
          <code>C:\Windows\System32\drivers\etc\hosts</code> wrapped safely inside a ProjectYB managed block, followed by an immediate DNS flush (`ipconfig /flushdns`).
        </p>
      </div>

      {/* ── Route Editor Modal ── */}
      <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-md p-5 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-zinc-800">
            <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              {editingRoute ? 'Edit Proxy Route' : 'Add Custom Domain Route'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Configure a local domain to route to your project port.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoute} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="domain-name" className="text-xs text-zinc-300">
                Custom Domain Name
              </Label>
              <Input
                id="domain-name"
                type="text"
                value={formHostname}
                onChange={(e) => setFormHostname(e.target.value)}
                placeholder="e.g. app.test, api.local, auth.dev"
                required
                className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
              />
            </div>

            {/* Quick target selector from running services */}
            {(runningServices.length > 0 || ports.length > 0) && (
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5 block">
                  Quick Pick Target
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto no-scrollbar">
                  {runningServices.map((svc) => (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => {
                        if (svc.port) setFormTargetPort(svc.port.toString());
                        if (!formHostname) setFormHostname(`${svc.name.toLowerCase().replace(/\s+/g, '-')}.test`);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 flex items-center gap-1 hover:border-cyan-500/50"
                    >
                      <Server className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{svc.name}</span>
                      {svc.port && <span className="font-mono text-cyan-400">:{svc.port}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="target-port" className="text-xs text-zinc-300">
                  Target Port
                </Label>
                <Input
                  id="target-port"
                  type="number"
                  value={formTargetPort}
                  onChange={(e) => setFormTargetPort(e.target.value)}
                  placeholder="3000"
                  required
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Protocol Mode</Label>
                <div className="flex items-center gap-2 h-9">
                  <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formUseHttps}
                      onChange={(e) => setFormUseHttps(e.target.checked)}
                      className="rounded bg-zinc-900 border-zinc-800 text-cyan-500 focus:ring-0"
                    />
                    <span>HTTPS (SSL)</span>
                  </label>
                </div>
              </div>
            </div>

            {!editingRoute && (
              <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAutoSyncHosts}
                    onChange={(e) => setFormAutoSyncHosts(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-800 text-cyan-500 focus:ring-0"
                  />
                  <span>Automatically add to Windows Hosts file on creation</span>
                </label>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button type="button" variant="ghost" size="sm" onClick={closeEditor} className="text-xs text-zinc-400">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold">
                {editingRoute ? 'Save Changes' : 'Create Route'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
