import React from 'react';
import {
  LayoutDashboard,
  Radio,
  Send,
  TerminalSquare,
  GitBranch,
  Server,
  Package,
  HardDrive,
  Settings,
  Search,
  FileText,
  Activity,
  Keyboard,
  Code2,
  CloudLightning,
  Globe,
  Database,
  Workflow,
  Bot,
  Clock,
  Smartphone
} from 'lucide-react';
import { useAppStore, TabType } from '@renderer/stores/useAppStore';
import { cn } from '@renderer/lib/utils';
import { SystemMonitor } from '../shared/SystemMonitor';
import { NotificationCenter } from '../shared/NotificationCenter';
import { WorkspaceSelector } from '../workspaces/WorkspaceSelector';
import { Button } from '../ui/button';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useGitStore } from '@renderer/stores/useGitStore';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useHealthStore } from '@renderer/stores/useHealthStore';
import { useThemeStore } from '@renderer/stores/useThemeStore';
import { useSearchStore } from '@renderer/stores/useSearchStore';
import { useSnippetStore } from '@renderer/stores/useSnippetStore';
import { useMobileStore } from '@renderer/stores/useMobileStore';

const tabs: Array<{ id: TabType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'overview', label: 'Mission Control', icon: Radio },
  { id: 'api', label: 'API Studio', icon: Send },
  { id: 'logstream', label: 'LogStream', icon: Activity },
  { id: 'cron', label: 'Cron', icon: Clock },
  { id: 'terminals', label: 'Terminals', icon: TerminalSquare },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'services', label: 'Services', icon: Server },
  { id: 'tunnels', label: 'Tunnels', icon: CloudLightning },
  { id: 'proxy', label: 'Local Proxy', icon: Globe },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'pipelines', label: 'Recipes', icon: Workflow },
  { id: 'mock-server', label: 'Mock API', icon: Radio },
  { id: 'dependencies', label: 'Dependencies', icon: Package },
  { id: 'optimizer', label: 'Optimizer', icon: HardDrive },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const TopNav: React.FC = () => {
  const { activeTab, setActiveTab, setCommandPaletteOpen } = useAppStore();
  const { terminals } = useTerminalStore();
  const { services } = useServiceStore();
  const { statuses } = useGitStore();
  const { activeTunnels } = useCloudflareStore();
  const { setScratchpadModalOpen } = useNotesStore();
  const { setModalOpen: setHealthModalOpen } = useHealthStore();
  const { setShortcutsModalOpen } = useThemeStore();
  const { setModalOpen: setSearchModalOpen } = useSearchStore();
  const { setModalOpen: setSnippetModalOpen } = useSnippetStore();
  const { setModalOpen: setMobileModalOpen } = useMobileStore();

  const activeTerminalsCount = terminals.filter(t => t.status === 'running').length;
  const runningServicesCount = services.filter(s => s.status === 'running').length;
  const activeTunnelsCount = activeTunnels.length;
  
  let uncommittedProjectsCount = 0;
  statuses.forEach(status => {
    const total = (status.staged?.length || 0) + (status.unstaged?.length || 0) + (status.untracked?.length || 0);
    if (total > 0) uncommittedProjectsCount++;
  });

  const getBadgeCount = (id: string) => {
    switch(id) {
      case 'terminals': return activeTerminalsCount;
      case 'services': return runningServicesCount;
      case 'tunnels': return activeTunnelsCount;
      case 'git': return uncommittedProjectsCount;
      default: return 0;
    }
  };

  return (
    <div className="h-14 flex items-center justify-between px-3 md:px-4 bg-zinc-950 border-b border-zinc-800 gap-2">
      {/* ── Scrollable Tab Bar ── */}
      <div className="flex h-full gap-1 sm:gap-2 overflow-x-auto no-scrollbar flex-nowrap shrink-0 min-w-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const badgeCount = getBadgeCount(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 h-full text-xs sm:text-sm font-medium transition-colors hover:text-zinc-50 shrink-0 whitespace-nowrap",
                isActive ? "text-zinc-50" : "text-zinc-400"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", tab.id === 'overview' && isActive && "text-cyan-400 animate-pulse")} />
              <span className="hidden sm:inline">{tab.label}</span>
              {badgeCount > 0 && (
                <span className="ml-0.5 sm:ml-1 bg-violet-500/20 text-violet-300 py-0.2 sm:py-0.5 px-1.5 sm:px-2 rounded-full text-[9px] sm:text-[10px] font-bold">
                  {badgeCount}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-md" />
              )}
            </button>
          );
        })}
      </div>
      
      {/* ── Right Controls ── */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <div className="hidden xs:block">
          <WorkspaceSelector />
        </div>
        <SystemMonitor />
        
        {/* Mobile Remote Companion (PWA) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-violet-300"
          onClick={() => setMobileModalOpen(true)}
          title="ProjectYB Mobile Remote Companion (PWA & Tunnel)"
        >
          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-400" />
        </Button>

        {/* Global Search (Ctrl+Shift+F) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-violet-300"
          onClick={() => setSearchModalOpen(true)}
          title="Global Cross-Project Search (Ctrl+Shift+F)"
        >
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>

        {/* Snippets Vault (Ctrl+Shift+S) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-emerald-300"
          onClick={() => setSnippetModalOpen(true)}
          title="Command Snippets Vault (Ctrl+Shift+S)"
        >
          <Code2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>

        {/* Scratchpad (Ctrl+N) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-amber-300"
          onClick={() => setScratchpadModalOpen(true)}
          title="Global Scratchpad (Ctrl+N)"
        >
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>

        {/* Health Radar */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-cyan-300 hidden sm:inline-flex"
          onClick={() => setHealthModalOpen(true)}
          title="Health & Activity Radar"
        >
          <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>

        {/* Shortcuts Cheat Sheet (Ctrl+/) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8 text-zinc-400 hover:text-zinc-200 hidden md:inline-flex"
          onClick={() => setShortcutsModalOpen(true)}
          title="Keyboard Shortcuts (Ctrl+/)"
        >
          <Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </Button>

        <NotificationCenter />
      </div>
    </div>
  );
};
