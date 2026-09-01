import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Radio, Activity, Clock, ShieldCheck, FolderGit2, Server, Globe, Sparkles } from 'lucide-react';
import { SystemSparklineWidget } from '../components/overview/SystemSparklineWidget';
import { LiveServicesWidget } from '../components/overview/LiveServicesWidget';
import { GitActivityFeedWidget } from '../components/overview/GitActivityFeedWidget';
import { DockerRadarWidget } from '../components/overview/DockerRadarWidget';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useOverviewStore } from '@renderer/stores/useOverviewStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { usePortStore } from '@renderer/stores/usePortStore';
import { useSystemStore } from '@renderer/stores/useSystemStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { cn } from '@renderer/lib/utils';

export const OverviewPage: React.FC = () => {
  const { isFullscreen, toggleFullscreen, addTelemetryPoint } = useOverviewStore();
  const { projects } = useProjectStore();
  const { runningServices } = useServiceStore();
  const { ports, fetchPorts } = usePortStore();
  const { metrics } = useSystemStore();

  const [time, setTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll ports & buffer telemetry points every 2 seconds
  useEffect(() => {
    fetchPorts();
    if (metrics) {
      addTelemetryPoint({
        cpu: metrics.cpu.usage,
        ramPercent: metrics.memory.percentage,
        ramGB: metrics.memory.used / 1024 / 1024 / 1024,
        rxKB: metrics.network.rxSec / 1024,
        txKB: metrics.network.txSec / 1024
      });
    }
  }, [metrics]);

  const localTimeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const localDateStr = time.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const utcTimeStr = `${time.getUTCHours().toString().padStart(2, '0')}:${time.getUTCMinutes().toString().padStart(2, '0')}:${time.getUTCSeconds().toString().padStart(2, '0')} UTC`;

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden select-none">
      {/* ── Wallboard HUD Header ── */}
      <div className="px-4 sm:px-6 py-3 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-600/10 border border-violet-500/30 text-violet-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                Mission Control <span className="text-xs font-mono font-normal text-violet-400 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded-full">WALLBOARD</span>
              </h1>
            </div>
            <p className="text-xs text-zinc-500">
              Live telemetry, service health & multi-repo activity feed for secondary displays
            </p>
          </div>
        </div>

        {/* HUD Center Digital Clock */}
        <div className="flex items-center gap-4 bg-zinc-900/90 border border-zinc-800 px-4 py-1.5 rounded-xl font-mono shadow-inner">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-zinc-100">{localTimeStr}</span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">({localDateStr})</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>{utcTimeStr}</span>
          </div>
        </div>

        {/* Quick HUD Metrics & Fullscreen Button */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 hidden md:flex">
            <Badge variant="outline" className="text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-300">
              <FolderGit2 className="w-3 h-3 mr-1 text-violet-400" />
              {projects.length} Repos
            </Badge>
            <Badge variant="outline" className="text-xs font-mono bg-zinc-900 border-zinc-800 text-emerald-300">
              <Server className="w-3 h-3 mr-1 text-emerald-400" />
              {runningServices.length} Services
            </Badge>
            <Badge variant="outline" className="text-xs font-mono bg-zinc-900 border-zinc-800 text-cyan-300">
              <Radio className="w-3 h-3 mr-1 text-cyan-400" />
              {ports.length} Ports
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-zinc-800 gap-1.5 hover:bg-zinc-900 text-zinc-300"
            onClick={() => useAppStore.getState().setSecretVaultModalOpen(true)}
            title="Open Global Secrets & Credentials Vault"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden sm:inline">Secrets Vault</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-zinc-800 gap-1.5 hover:bg-zinc-900 text-zinc-300"
            onClick={() => useAppStore.getState().setAssetForgeModalOpen(true)}
            title="Open Developer Asset Forge & Favicon Suite"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Asset Forge</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-zinc-800 gap-1.5 hover:bg-zinc-900"
            onClick={toggleFullscreen}
            title="Toggle Fullscreen Wallboard Mode (F11)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-violet-400" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Bigscreen Mode'}</span>
          </Button>
        </div>
      </div>

      {/* ── Wallboard Main Viewport ── */}
      <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-4 bg-zinc-950/60">
        {/* Row 1: Rolling Telemetry Sparklines */}
        <SystemSparklineWidget />

        {/* Row 2: 3-Column Wallboard Command Center */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[460px]">
          {/* Column 1: Live Running Services */}
          <div className="h-full min-h-[360px]">
            <LiveServicesWidget />
          </div>

          {/* Column 2: Cross-Project Git Stream */}
          <div className="h-full min-h-[360px]">
            <GitActivityFeedWidget />
          </div>

          {/* Column 3: Ports & Container Radar */}
          <div className="h-full min-h-[360px]">
            <DockerRadarWidget />
          </div>
        </div>
      </div>
    </div>
  );
};
