import React from 'react';
import {
  Search,
  ChevronRight,
  Cpu,
  Radio,
  Server,
  Activity,
  Keyboard,
  Sparkles,
  Command
} from 'lucide-react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useSystemStore } from '@renderer/stores/useSystemStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { usePortStore } from '@renderer/stores/usePortStore';
import { useSearchStore } from '@renderer/stores/useSearchStore';
import { useThemeStore } from '@renderer/stores/useThemeStore';
import { NotificationCenter } from '../../shared/NotificationCenter';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { cn } from '@renderer/lib/utils';

export const ModernHeader: React.FC = () => {
  const { activeTab } = useAppStore();
  const { selectedProjectId, projects } = useProjectStore();
  const { metrics } = useSystemStore();
  const { runningServices } = useServiceStore();
  const { ports } = usePortStore();
  const { setSearchModalOpen } = useSearchStore();
  const { setShortcutsModalOpen } = useThemeStore();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard';
      case 'overview':
        return 'Mission Control Wallboard';
      case 'api':
        return 'HTTP API Tester';
      case 'terminals':
        return 'Terminal Manager';
      case 'git':
        return 'Git Studio';
      case 'services':
        return 'Background Services';
      case 'dependencies':
        return 'Dependencies Hub';
      case 'optimizer':
        return 'Disk Optimizer';
      case 'settings':
        return 'Settings';
      case 'project-detail':
        return selectedProject ? selectedProject.name : 'Project Details';
      default:
        return 'Workspace';
    }
  };

  const cpuUsage = metrics ? Math.round(metrics.cpu.usage) : 0;
  const ramUsage = metrics ? Math.round(metrics.memory.percentage) : 0;

  return (
    <header className="h-14 px-4 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 flex items-center justify-between gap-4 select-none shrink-0 z-10">
      {/* ── Left: Contextual Breadcrumbs ── */}
      <div className="flex items-center gap-1.5 min-w-0 text-xs">
        <span className="font-semibold text-zinc-400 hover:text-zinc-200 transition-colors">
          Workspace
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
        <span className="font-bold text-zinc-100 truncate flex items-center gap-1.5">
          {getSectionTitle()}
        </span>
        {activeTab === 'project-detail' && selectedProject && (
          <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-300 hidden sm:inline-flex">
            {selectedProject.type}
          </Badge>
        )}
      </div>

      {/* ── Center: Omnipresent Search Trigger (Ctrl+K) ── */}
      <div className="flex-1 max-w-md hidden md:block">
        <button
          onClick={() => setSearchModalOpen(true)}
          className="w-full h-8 px-3 rounded-lg bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-400 flex items-center justify-between transition-all group"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-violet-400 transition-colors" />
            <span className="truncate">Search files, symbols, projects...</span>
          </div>
          <kbd className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800 flex items-center gap-0.5">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* ── Right: Live Micro-Telemetry HUD & Notification Center ── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Real-time Telemetry Pill */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1 rounded-lg bg-zinc-900/70 border border-zinc-800 font-mono text-[11px]">
          {/* CPU Gauge */}
          <div className="flex items-center gap-1.5" title={`CPU: ${cpuUsage}%`}>
            <Cpu className={cn('w-3.5 h-3.5', cpuUsage > 80 ? 'text-rose-400' : 'text-violet-400')} />
            <span className="text-zinc-300">{cpuUsage}%</span>
          </div>

          <span className="text-zinc-700">|</span>

          {/* RAM Gauge */}
          <div className="flex items-center gap-1.5" title={`RAM: ${ramUsage}%`}>
            <Activity className={cn('w-3.5 h-3.5', ramUsage > 85 ? 'text-rose-400' : 'text-cyan-400')} />
            <span className="text-zinc-300">{ramUsage}%</span>
          </div>

          <span className="text-zinc-700">|</span>

          {/* Services Active */}
          <div className="flex items-center gap-1.5" title={`${runningServices.length} Active Services`}>
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-300">{runningServices.length}</span>
          </div>

          <span className="text-zinc-700">|</span>

          {/* Open Ports */}
          <div className="flex items-center gap-1.5" title={`${ports.length} Open Ports`}>
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-300">{ports.length}</span>
          </div>
        </div>

        {/* Shortcuts Helper */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-zinc-400 hover:text-zinc-200"
          onClick={() => setShortcutsModalOpen(true)}
          title="Keyboard Shortcuts Cheat Sheet (Ctrl+/)"
        >
          <Keyboard className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <NotificationCenter />
      </div>
    </header>
  );
};
