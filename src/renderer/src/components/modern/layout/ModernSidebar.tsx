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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Terminal,
  Code2,
  FileText,
  Activity,
  Layers,
  CloudLightning,
  Globe,
  Database,
  Workflow,
  Clock,
  Smartphone
} from 'lucide-react';
import logoUrl from '@renderer/assets/logo.png';

import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, TabType } from '@renderer/stores/useAppStore';
import { useThemeStore } from '@renderer/stores/useThemeStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useGitStore } from '@renderer/stores/useGitStore';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useHealthStore } from '@renderer/stores/useHealthStore';
import { useSnippetStore } from '@renderer/stores/useSnippetStore';
import { useMobileStore } from '@renderer/stores/useMobileStore';
import { WorkspaceSelector } from '../../workspaces/WorkspaceSelector';
import { cn } from '@renderer/lib/utils';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: () => React.ReactNode;
  category: 'core' | 'dev' | 'network' | 'system';
}

export const ModernSidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();
  const { setModalOpen: setMobileModalOpen } = useMobileStore();
  const {
    isSidebarCollapsed,
    toggleSidebar,
    isTerminalDockOpen,
    toggleTerminalDock
  } = useThemeStore();

  const { terminals } = useTerminalStore();
  const { runningServices } = useServiceStore();
  const { statuses } = useGitStore();
  const { activeTunnels } = useCloudflareStore();
  const { setScratchpadModalOpen } = useNotesStore();
  const { setModalOpen: setHealthModalOpen } = useHealthStore();
  const { setModalOpen: setSnippetModalOpen } = useSnippetStore();

  // Count uncommitted git projects
  const dirtyGitCount = Array.from(statuses?.values?.() || []).filter(
    (s) => (s?.staged?.length || 0) + (s?.unstaged?.length || 0) > 0
  ).length;

  const navItems: NavItem[] = [
    // 1. Core Hub
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'core' },
    { id: 'overview', label: 'Mission Control', icon: Radio, category: 'core' },
    {
      id: 'terminals',
      label: 'Terminals',
      icon: TerminalSquare,
      category: 'core',
      badge: () =>
        terminals.length > 0 ? (
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-violet-950/80 text-violet-300 border border-violet-800/60">
            {terminals.length}
          </span>
        ) : null
    },
    {
      id: 'services',
      label: 'Services & Ports',
      icon: Server,
      category: 'core',
      badge: () =>
        runningServices.length > 0 ? (
          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {runningServices.length}
          </span>
        ) : null
    },

    // 2. Dev Studio Hub
    {
      id: 'git',
      label: 'Git Studio',
      icon: GitBranch,
      category: 'dev',
      badge: () =>
        dirtyGitCount > 0 ? (
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/60">
            {dirtyGitCount}
          </span>
        ) : null
    },
    { id: 'api', label: 'API Studio & Specs', icon: Send, category: 'dev' },
    { id: 'database', label: 'Database Studio', icon: Database, category: 'dev' },
    { id: 'pipelines', label: 'Developer Recipes', icon: Workflow, category: 'dev' },
    { id: 'logstream', label: 'LogStream Studio', icon: Activity, category: 'dev' },

    // 3. Network & Cloud Hub
    {
      id: 'tunnels',
      label: 'Cloudflare Tunnels',
      icon: CloudLightning,
      category: 'network',
      badge: () =>
        activeTunnels.length > 0 ? (
          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-orange-950/80 text-orange-300 border border-orange-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            {activeTunnels.length}
          </span>
        ) : null
    },
    { id: 'proxy', label: 'Local HTTPS Proxy', icon: Globe, category: 'network' },
    { id: 'mock-server', label: 'Mock & Webhooks', icon: Radio, category: 'network' },
    { id: 'cron', label: 'Cron Tasks', icon: Clock, category: 'network' },

    // 4. System & Health Hub
    { id: 'dependencies', label: 'Dependencies', icon: Package, category: 'system' },
    { id: 'optimizer', label: 'Disk Optimizer', icon: HardDrive, category: 'system' },
    { id: 'settings', label: 'Settings', icon: Settings, category: 'system' }
  ];

  const categories = [
    { id: 'core', label: 'Core Workspace' },
    { id: 'dev', label: 'Developer Studio' },
    { id: 'network', label: 'Network & Cloud' },
    { id: 'system', label: 'System & Health' }
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarCollapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="h-full bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between shrink-0 relative z-20 select-none overflow-hidden"
    >
      {/* ── Top Header & Branding ── */}
      <div className="flex flex-col min-h-0 flex-1">
        <div className="h-14 px-3.5 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group min-w-0"
          >
            <img
              src={logoUrl}
              alt="ProjectYB"
              className="w-8 h-8 rounded-lg shrink-0 object-cover group-hover:opacity-90 transition-opacity"
            />

            <AnimatePresence>
              {!isSidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15 }}
                  className="min-w-0"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm tracking-tight text-zinc-100 truncate">
                      ProjectYB
                    </span>
                    <span className="text-[9px] font-mono text-violet-400 bg-violet-950/60 border border-violet-800/50 px-1 py-0.2 rounded">
                      V2
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">Dev Workspace Hub</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Workspace Switcher Pill */}
        {!isSidebarCollapsed && (
          <div className="px-3 pt-3 pb-1 shrink-0">
            <div className="p-1 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
              <WorkspaceSelector />
            </div>
          </div>
        )}

        {/* ── Grouped Navigation Hubs ── */}
        <div className="px-2 py-2 space-y-3 overflow-y-auto flex-1">
          {categories.map((cat) => {
            const items = navItems.filter((i) => i.category === cat.id);
            if (items.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-0.5">
                {!isSidebarCollapsed && (
                  <div className="px-2 py-1 text-[9px] uppercase tracking-wider font-bold text-zinc-500">
                    {cat.label}
                  </div>
                )}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      title={isSidebarCollapsed ? item.label : undefined}
                      className={cn(
                        'w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group relative',
                        isActive
                          ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70 border border-transparent'
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activePill"
                          className="absolute left-0 top-1 bottom-1 w-1 bg-violet-500 rounded-r"
                        />
                      )}
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                          isActive ? 'text-violet-400' : 'text-zinc-400'
                        )}
                      />
                      {!isSidebarCollapsed && (
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.badge && item.badge()}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom Dock & Utilities ── */}
      <div className="p-2 border-t border-zinc-800/80 space-y-1.5 bg-zinc-950/80 shrink-0">
        {/* Terminal Dock Toggle Button */}
        <button
          onClick={toggleTerminalDock}
          title="Universal Terminal Canvas (Ctrl+`)"
          className={cn(
            'w-full flex items-center gap-3 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
            isTerminalDockOpen
              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
          )}
        >
          <Terminal
            className={cn('w-4 h-4 shrink-0', isTerminalDockOpen ? 'text-emerald-400' : 'text-zinc-400')}
          />
          {!isSidebarCollapsed && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="truncate">Terminal Dock</span>
              <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 rounded">
                Ctrl+`
              </kbd>
            </div>
          )}
        </button>

        {/* Quick Modal Utilities Row */}
        {!isSidebarCollapsed ? (
          <div className="grid grid-cols-4 gap-1 pt-1 border-t border-zinc-800/60">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScratchpadModalOpen(true)}
              title="Global Scratchpad (Ctrl+Shift+N)"
              className="h-7 w-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            >
              <FileText className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHealthModalOpen(true)}
              title="Project Health Radar (Ctrl+Shift+H)"
              className="h-7 w-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            >
              <Activity className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSnippetModalOpen(true)}
              title="Snippets Vault (Ctrl+Shift+V)"
              className="h-7 w-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            >
              <Code2 className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileModalOpen(true)}
              title="Mobile Companion PWA (Ctrl+Shift+M)"
              className="h-7 w-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 pt-1 border-t border-zinc-800/60">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileModalOpen(true)}
              title="Mobile Companion PWA"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {/* Collapse Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
          title={isSidebarCollapsed ? 'Expand activity rail' : 'Collapse activity rail'}
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Collapse Activity Rail</span>
            </div>
          )}
        </button>
      </div>
    </motion.aside>
  );
};
