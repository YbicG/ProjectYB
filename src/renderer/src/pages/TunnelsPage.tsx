import React, { useEffect, useState } from 'react';
import {
  CloudLightning,
  Plus,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Terminal,
  Square,
  RotateCw,
  Globe,
  Sparkles,
  Download,
  AlertCircle,
  Settings,
  Server,
  Zap
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import { usePortStore } from '@renderer/stores/usePortStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { CreateTunnelDialog } from '../components/tunnels/CreateTunnelDialog';
import { TunnelLogsModal } from '../components/tunnels/TunnelLogsModal';
import { TunnelQrModal } from '../components/tunnels/TunnelQrModal';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const TunnelsPage: React.FC = () => {
  const {
    activeTunnels,
    loadActiveTunnels,
    stopTunnel,
    startQuickTunnel,
    binaryStatus,
    checkBinaryStatus,
    installBinary,
    isDownloadingBinary,
    downloadProgress,
    openLogsModal,
    openQrModal,
    setCreateModalOpen
  } = useCloudflareStore();

  const { ports, fetchPorts } = usePortStore();
  const { runningServices } = useServiceStore();
  const { setActiveTab } = useAppStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    checkBinaryStatus();
    loadActiveTunnels();
    fetchPorts();

    const interval = setInterval(() => {
      loadActiveTunnels();
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const handleCopyUrl = (tunnelId: string, url?: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(tunnelId);
    toast.success('Public URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatUptime = (startedAt: number) => {
    const diffSec = Math.floor((Date.now() - startedAt) / 1000);
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h ${diffMin % 60}m`;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-zinc-950 text-zinc-100 p-6 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <CloudLightning className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                Cloudflare Tunnels
                <Badge variant="outline" className="text-[10px] font-mono border-orange-500/30 text-orange-400 bg-orange-950/20">
                  TryCloudflare & Zero Trust
                </Badge>
              </h1>
              <p className="text-xs text-zinc-400">
                Securely expose local services, servers, and ports to public HTTPS URLs without port-forwarding.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('settings')}
            className="text-xs border-zinc-800 text-zinc-300 hover:text-zinc-100 gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            Settings
          </Button>

          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs bg-orange-600 hover:bg-orange-500 text-white font-semibold gap-1.5 shadow-lg shadow-orange-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Launch Tunnel
          </Button>
        </div>
      </div>

      {/* ── Binary Missing Warning Banner ── */}
      {binaryStatus && !binaryStatus.installed && (
        <div className="p-4 bg-orange-950/20 border border-orange-800/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-sm font-semibold text-orange-200">
                cloudflared CLI Not Installed
              </h4>
              <p className="text-xs text-orange-300/80">
                The official Cloudflare daemon is required to establish secure tunnels. Click below to download and set it up automatically.
              </p>
              {isDownloadingBinary && (
                <div className="space-y-1 pt-2 w-64">
                  <div className="flex justify-between text-[10px] font-mono text-orange-300">
                    <span>Downloading...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500" style={{ width: `${downloadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => installBinary()}
            disabled={isDownloadingBinary}
            className="text-xs bg-orange-600 hover:bg-orange-500 text-white shrink-0 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {isDownloadingBinary ? 'Installing...' : '1-Click Install cloudflared'}
          </Button>
        </div>
      )}

      {/* ── Active Tunnels Grid ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <span>Active Tunnels</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
              {activeTunnels.length}
            </span>
          </h2>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadActiveTunnels()}
            className="h-7 text-xs text-zinc-400 hover:text-zinc-200 gap-1"
          >
            <RotateCw className="w-3 h-3" />
            Refresh
          </Button>
        </div>

        {activeTunnels.length === 0 ? (
          <Card className="border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500 flex items-center justify-center mb-3">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-300 mb-1">
              No active Cloudflare tunnels running
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mb-4">
              Select an open port below to create an instant public URL with TryCloudflare, or click Launch Tunnel.
            </p>

            {/* Quick Port Exposure Pills */}
            {(runningServices.length > 0 || ports.length > 0) && (
              <div className="space-y-2 w-full max-w-md">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                  Quick Expose Active Service / Port:
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {runningServices.map((svc) => (
                    <Button
                      key={svc.id}
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        startQuickTunnel({
                          localPort: svc.port || 3000,
                          name: `${svc.projectName}: ${svc.name}`,
                          serviceId: svc.id,
                          projectName: svc.projectName
                        })
                      }
                      className="text-xs border-zinc-800 bg-zinc-900/80 hover:border-orange-500/50 text-zinc-300 gap-1.5"
                    >
                      <Zap className="w-3 h-3 text-orange-400" />
                      <span>{svc.name}</span>
                      {svc.port && <span className="font-mono text-orange-400">:{svc.port}</span>}
                    </Button>
                  ))}

                  {ports
                    .filter((p) => !runningServices.some((s) => s.port === p.port))
                    .slice(0, 4)
                    .map((p) => (
                      <Button
                        key={`${p.port}-${p.pid}`}
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          startQuickTunnel({
                            localPort: p.port,
                            name: p.processName ? `${p.processName} (${p.port})` : `Port ${p.port}`
                          })
                        }
                        className="text-xs border-zinc-800 bg-zinc-900/80 hover:border-orange-500/50 text-zinc-300 gap-1.5"
                      >
                        <Server className="w-3 h-3 text-cyan-400" />
                        <span>Port {p.port}</span>
                        <span className="text-zinc-500 text-[11px]">{p.processName}</span>
                      </Button>
                    ))}
                </div>
              </div>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTunnels.map((tunnel) => {
              const isCopied = copiedId === tunnel.id;

              return (
                <Card
                  key={tunnel.id}
                  className="bg-zinc-900/80 border-zinc-800 hover:border-zinc-700/80 transition-all flex flex-col justify-between shadow-lg"
                >
                  <CardHeader className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              tunnel.status === 'connected'
                                ? 'bg-emerald-400 animate-pulse'
                                : tunnel.status === 'starting'
                                ? 'bg-amber-400 animate-ping'
                                : 'bg-red-400'
                            )}
                          />
                          <h3 className="font-semibold text-sm text-zinc-100 truncate">
                            {tunnel.name}
                          </h3>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <Badge variant="outline" className="text-[9px] font-mono border-zinc-800 uppercase text-zinc-400">
                            {tunnel.type}
                          </Badge>
                          <span className="font-mono text-zinc-400">
                            {tunnel.protocol}://{tunnel.localHost}:{tunnel.localPort}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-mono uppercase shrink-0',
                          tunnel.status === 'connected'
                            ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                            : tunnel.status === 'starting'
                            ? 'border-amber-500/40 text-amber-400 bg-amber-950/20'
                            : 'border-red-500/40 text-red-400 bg-red-950/20'
                        )}
                      >
                        {tunnel.status}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    {/* Public URL Box */}
                    <div className="bg-zinc-950 border border-zinc-800/80 rounded-lg p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        {tunnel.publicUrl ? (
                          <a
                            href={tunnel.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs text-orange-400 hover:text-orange-300 truncate underline-offset-2 hover:underline select-all"
                          >
                            {tunnel.publicUrl}
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-zinc-500 italic">
                            Provisioning public domain...
                          </span>
                        )}
                      </div>

                      {tunnel.publicUrl && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
                            onClick={() => handleCopyUrl(tunnel.id, tunnel.publicUrl)}
                            title="Copy URL"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
                            onClick={() => window.open(tunnel.publicUrl, '_blank')}
                            title="Open in Browser"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Actions */}
                    <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
                      <span className="font-mono text-[11px] text-zinc-500">
                        Uptime: <span className="text-zinc-300">{formatUptime(tunnel.startedAt)}</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        {tunnel.publicUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-zinc-800 gap-1 hover:border-orange-500/50"
                            onClick={() => openQrModal(tunnel)}
                            title="Mobile QR Code"
                          >
                            <QrCode className="w-3 h-3 text-orange-400" />
                            QR
                          </Button>
                        )}

                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-zinc-800 gap-1 text-zinc-400 hover:text-zinc-100"
                          onClick={() => openLogsModal(tunnel)}
                        >
                          <Terminal className="w-3 h-3" />
                          Logs
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/20 gap-1"
                          onClick={() => stopTunnel(tunnel.id)}
                        >
                          <Square className="w-3 h-3 fill-red-400" />
                          Stop
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dialog Modals ── */}
      <CreateTunnelDialog />
      <TunnelLogsModal />
      <TunnelQrModal />
    </div>
  );
};
