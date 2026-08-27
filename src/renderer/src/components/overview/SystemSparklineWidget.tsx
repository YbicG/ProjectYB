import React from 'react';
import { Cpu, HardDrive, Wifi } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { useOverviewStore } from '@renderer/stores/useOverviewStore';
import { useSystemStore } from '@renderer/stores/useSystemStore';

interface SparklineProps {
  data: number[];
  maxVal?: number;
  color: string;
  fillColor: string;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ data, maxVal = 100, color, fillColor, height = 48 }) => {
  if (data.length < 2) {
    return (
      <div className="h-12 flex items-center justify-center text-[10px] text-zinc-600 font-mono">
        Buffering telemetry...
      </div>
    );
  }

  const width = 280;
  const padding = 4;
  const effectiveHeight = height - padding * 2;
  const step = width / (data.length - 1);
  const gradId = `grad-${color.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const points = data.map((val, idx) => {
    const clamped = Math.max(0, Math.min(val, maxVal));
    const x = idx * step;
    const y = height - padding - (clamped / maxVal) * effectiveHeight;
    return { x, y };
  });

  // Generate smooth cubic bezier path
  let pathD = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    pathD += ` C ${mx},${p0.y} ${mx},${p1.y} ${p1.x},${p1.y}`;
  }

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const lastPoint = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-12 overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.35" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Latest radar beacon dot with solid center */}
      {lastPoint && (
        <g transform={`translate(${lastPoint.x}, ${lastPoint.y})`}>
          <circle r="6" fill={color} className="animate-ping opacity-60" />
          <circle r="3" fill={color} />
        </g>
      )}
    </svg>
  );
};

export const SystemSparklineWidget: React.FC = () => {
  const { history } = useOverviewStore();
  const { metrics } = useSystemStore();

  const cpuData = history.map((h) => h.cpu);
  const ramData = history.map((h) => h.ramPercent);
  const netRxData = history.map((h) => h.rxKB);

  const currentCpu = metrics?.cpu.usage ?? 0;
  const currentRamPercent = metrics?.memory.percentage ?? 0;
  const currentRamGB = metrics ? (metrics.memory.used / 1024 / 1024 / 1024).toFixed(1) : '0';
  const totalRamGB = metrics ? (metrics.memory.total / 1024 / 1024 / 1024).toFixed(0) : '0';
  const currentRx = metrics ? (metrics.network.rxSec / 1024).toFixed(0) : '0';
  const currentTx = metrics ? (metrics.network.txSec / 1024).toFixed(0) : '0';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* ── CPU Sparkline Card ── */}
      <Card className="bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">CPU Load</span>
                <p className="text-xl font-bold font-mono text-zinc-100">{currentCpu.toFixed(1)}%</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">60s rolling</span>
          </div>

          <Sparkline data={cpuData} maxVal={100} color="#8b5cf6" fillColor="#8b5cf6" />
        </CardContent>
      </Card>

      {/* ── RAM Sparkline Card ── */}
      <Card className="bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Memory</span>
                <p className="text-xl font-bold font-mono text-zinc-100">
                  {currentRamPercent.toFixed(0)}% <span className="text-xs text-zinc-500 font-normal">({currentRamGB}/{totalRamGB} GB)</span>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">60s rolling</span>
          </div>

          <Sparkline data={ramData} maxVal={100} color="#10b981" fillColor="#10b981" />
        </CardContent>
      </Card>

      {/* ── Network Sparkline Card ── */}
      <Card className="bg-zinc-950/80 border-zinc-800/90 relative overflow-hidden backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Network I/O</span>
                <p className="text-xl font-bold font-mono text-zinc-100">
                  ↓{currentRx} <span className="text-xs text-zinc-500 font-normal">KB/s</span> ↑{currentTx} <span className="text-xs text-zinc-500 font-normal">KB/s</span>
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">60s rolling</span>
          </div>

          <Sparkline data={netRxData} maxVal={Math.max(500, ...netRxData)} color="#06b6d4" fillColor="#06b6d4" />
        </CardContent>
      </Card>
    </div>
  );
};
