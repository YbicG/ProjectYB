import React, { useState, useEffect } from 'react';
import {
  CloudLightning,
  CheckCircle2,
  AlertCircle,
  Download,
  KeyRound,
  ExternalLink,
  Plus,
  Trash2,
  RotateCw,
  Server,
  ShieldCheck,
  Globe,
  Play,
  Square
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const CloudflareSettings: React.FC = () => {
  const {
    binaryStatus,
    checkBinaryStatus,
    installBinary,
    isDownloadingBinary,
    downloadProgress,
    config,
    loadConfig,
    saveConfig,
    testToken,
    isTestingToken,
    tokenVerified,
    accounts,
    remoteTunnels,
    loadRemoteTunnels,
    createRemoteNamedTunnel,
    deleteRemoteNamedTunnel,
    activeTunnels,
    launchRemoteTunnel,
    stopTunnel
  } = useCloudflareStore();

  const [tokenInput, setTokenInput] = useState(config.apiToken || '');
  const [accountIdInput, setAccountIdInput] = useState(config.accountId || '');
  const [newTunnelName, setNewTunnelName] = useState('');
  const [isCreatingTunnel, setIsCreatingTunnel] = useState(false);
  const [tunnelPorts, setTunnelPorts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadConfig();
    checkBinaryStatus();
  }, []);

  useEffect(() => {
    if (config.apiToken) {
      setTokenInput(config.apiToken);
    }
    if (config.accountId) {
      setAccountIdInput(config.accountId);
    }
  }, [config.apiToken, config.accountId]);

  const handleSaveAndTest = async () => {
    if (!tokenInput.trim()) {
      toast.error('Please enter a Cloudflare API Token');
      return;
    }
    await saveConfig({
      apiToken: tokenInput.trim(),
      accountId: accountIdInput.trim() || undefined
    });
    const ok = await testToken(tokenInput.trim(), accountIdInput.trim() || undefined);
    if (ok) {
      toast.success('Cloudflare API Token connected and verified!');
    } else {
      toast.error('Invalid token or connection failed. Please check token permissions (Cloudflare Tunnel: Edit / Read).');
    }
  };

  const handleCreateTunnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTunnelName.trim()) return;

    setIsCreatingTunnel(true);
    try {
      const res = await createRemoteNamedTunnel(newTunnelName.trim());
      if (res.success) {
        setNewTunnelName('');
      }
    } finally {
      setIsCreatingTunnel(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header Overview ── */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
          <CloudLightning className="w-5 h-5 text-orange-400" />
          Cloudflare Tunnels & Zero Trust
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Manage local <code>cloudflared</code> binary, Zero Trust API credentials, and remote named tunnels.
        </p>
      </div>

      {/* ── 1. Cloudflared Binary Status Card ── */}
      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-orange-400" />
                cloudflared CLI Executable
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                The local daemon required to establish secure outbound tunnel connections.
              </CardDescription>
            </div>

            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-mono font-bold uppercase',
                binaryStatus?.installed
                  ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                  : 'border-amber-500/40 text-amber-400 bg-amber-950/20'
              )}
            >
              {binaryStatus?.installed ? 'Ready' : 'Not Installed'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {binaryStatus?.installed ? (
            <div className="space-y-2 bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Version:</span>
                <span className="font-mono text-zinc-200 font-semibold">{binaryStatus.version}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Location:</span>
                <span className="font-mono text-zinc-400 truncate max-w-[280px] sm:max-w-[400px]" title={binaryStatus.binaryPath}>
                  {binaryStatus.binaryPath}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Source:</span>
                <Badge variant="outline" className="text-[9px] font-mono border-zinc-700 text-zinc-400 uppercase">
                  {binaryStatus.source}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-950/20 border border-amber-800/30 rounded-lg text-xs text-amber-300 space-y-2">
              <p>
                The <code>cloudflared</code> binary was not found on your system. ProjectYB can download and set it up automatically in 1 click.
              </p>
              {isDownloadingBinary && (
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-amber-200">
                    <span>Downloading cloudflared executable...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 transition-all duration-200"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => installBinary()}
              disabled={isDownloadingBinary}
              className="text-xs border-zinc-800 gap-1.5 hover:border-orange-500/50"
            >
              <Download className="w-3.5 h-3.5 text-orange-400" />
              {binaryStatus?.installed ? 'Reinstall / Update CLI' : 'Download & Install cloudflared'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => checkBinaryStatus()}
              className="text-xs text-zinc-400 gap-1.5"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Re-check PATH
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. Cloudflare API Token Card ── */}
      <Card className="border-zinc-800 bg-zinc-950/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-violet-400" />
                Cloudflare API Authentication
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Optional for Quick Tunnels. Required for Named Tunnels and Zero Trust management.
              </CardDescription>
            </div>

            {tokenVerified && (
              <Badge variant="outline" className="text-[10px] font-mono font-bold border-emerald-500/40 text-emerald-400 bg-emerald-950/20 uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="api-token" className="text-xs text-zinc-300 flex items-center justify-between">
              <span>Cloudflare API Token</span>
              <a
                href="https://dash.cloudflare.com/profile/api-tokens"
                target="_blank"
                rel="noreferrer"
                className="text-violet-400 hover:text-violet-300 text-[11px] inline-flex items-center gap-1"
              >
                Get Token <ExternalLink className="w-3 h-3" />
              </a>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="api-token"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Cloudflare API Token (Cloudflare Tunnel: Edit / Read permission)"
                className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
              />
              <Button
                size="sm"
                onClick={handleSaveAndTest}
                disabled={isTestingToken}
                className="text-xs bg-violet-600 hover:bg-violet-500 text-white shrink-0"
              >
                {isTestingToken ? 'Verifying...' : 'Save & Verify'}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5 pt-1">
            <Label htmlFor="account-id" className="text-xs text-zinc-300 flex items-center justify-between">
              <span>Cloudflare Account ID (32-character hex ID)</span>
              <span className="text-[11px] text-zinc-500">Auto-detected on verify or copy from Cloudflare dashboard</span>
            </Label>
            <Input
              id="account-id"
              type="text"
              value={accountIdInput}
              onChange={(e) => setAccountIdInput(e.target.value)}
              placeholder="e.g. 1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d"
              className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
            />
          </div>

          {/* Account Selector (if verified) */}
          {accounts.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-zinc-850">
              <Label className="text-xs text-zinc-300">Auto-Detected Cloudflare Accounts</Label>
              <select
                value={config.accountId || ''}
                onChange={(e) => {
                  setAccountIdInput(e.target.value);
                  saveConfig({ accountId: e.target.value });
                  loadRemoteTunnels();
                }}
                className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.id})
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 3. Remote Named Tunnels List (Zero Trust) ── */}
      {tokenVerified && config.accountId && (
        <Card className="border-zinc-800 bg-zinc-950/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  Remote Zero Trust Named Tunnels
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Persistent tunnels managed in your Cloudflare account.
                </CardDescription>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadRemoteTunnels()}
                className="h-7 text-xs border-zinc-800 text-zinc-400 hover:text-zinc-100 gap-1"
              >
                <RotateCw className="w-3 h-3" />
                Refresh
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Create Named Tunnel Bar */}
            <form onSubmit={handleCreateTunnel} className="flex items-center gap-2">
              <Input
                type="text"
                value={newTunnelName}
                onChange={(e) => setNewTunnelName(e.target.value)}
                placeholder="New tunnel name (e.g. dev-staging-tunnel)"
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
              />
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingTunnel || !newTunnelName.trim()}
                className="text-xs bg-orange-600 hover:bg-orange-500 text-white shrink-0 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Tunnel
              </Button>
            </form>

            {/* List */}
            {remoteTunnels.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                No remote named tunnels found in this Cloudflare account.
              </div>
            ) : (
              <div className="divide-y divide-zinc-850 border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/30">
                {remoteTunnels.map((tun) => {
                  const runningInstance = activeTunnels.find((a) => a.id === tun.id || (a.name === tun.name && a.status !== 'stopped'));
                  const portVal = tunnelPorts[tun.id] ?? 3000;

                  return (
                    <div key={tun.id} className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/60 transition-colors">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-zinc-200 truncate">{tun.name}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[9px] font-mono uppercase px-1 py-0',
                              runningInstance
                                ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30'
                                : tun.status === 'healthy' || tun.status === 'active'
                                ? 'border-emerald-500/40 text-emerald-400'
                                : 'border-zinc-700 text-zinc-500'
                            )}
                          >
                            {runningInstance ? 'Running' : tun.status}
                          </Badge>
                        </div>
                        <p className="font-mono text-[10px] text-zinc-500 truncate">ID: {tun.id}</p>
                        {runningInstance?.publicUrl ? (
                          <a
                            href={runningInstance.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            {runningInstance.publicUrl} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : tun.hostname ? (
                          <a
                            href={`https://${tun.hostname}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            https://{tun.hostname} <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {runningInstance ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => stopTunnel(runningInstance.id)}
                            className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-950/30 gap-1"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            Stop
                          </Button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-zinc-500 font-mono">Port</span>
                            <Input
                              type="number"
                              value={portVal}
                              onChange={(e) => setTunnelPorts((prev) => ({ ...prev, [tun.id]: parseInt(e.target.value, 10) || 3000 }))}
                              className="h-7 w-16 px-1.5 text-center text-xs font-mono bg-zinc-900 border-zinc-800"
                              min={1}
                              max={65535}
                            />
                            <Button
                              size="sm"
                              onClick={() => launchRemoteTunnel(tun.id, tun.name, portVal)}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Run
                            </Button>
                          </div>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRemoteNamedTunnel(tun.id)}
                          className="h-7 w-7 text-zinc-500 hover:text-red-400"
                          title="Delete Tunnel"
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
      )}
    </div>
  );
};
