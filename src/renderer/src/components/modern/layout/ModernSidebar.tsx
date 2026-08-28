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
  Bot
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
import { WorkspaceSelector } from '../../workspaces/WorkspaceSelector';
import { cn } from '@renderer/lib/utils';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: () => React.ReactNode;
  category: 'core' | 'dev' | 'system';
}

export const ModernSidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();
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
    // Core
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'core' },
    { id: 'overview', label: 'Mission Control', icon: Radio, category: 'core' },
    { id: 'api', label: 'API Tester', icon: Send, category: 'core' },
    // Dev Tools
    {
      id: 'terminals',
      label: 'Terminals',
      icon: TerminalSquare,
      category: 'dev',
      badge: () =>
        terminals.length > 0 ? (
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-violet-950/80 text-violet-300 border border-violet-800/60">
            {terminals.length}
          </span>
        ) : null
    },
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
    {
      id: 'services',
      label: 'Services',
      icon: Server,
      category: 'dev',
      badge: () =>
        runningServices.length > 0 ? (
          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {runningServices.length}
          </span>
        ) : null
    },
    {
      id: 'tunnels',
      label: 'Cloudflare Tunnels',
      icon: CloudLightning,
      category: 'dev',
      badge: () =>
        activeTunnels.length > 0 ? (
          <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-orange-950/80 text-orange-300 border border-orange-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            {activeTunnels.length}
          </span>
        ) : null
    },
    { id: 'proxy', label: 'Local HTTPS Proxy', icon: Globe, category: 'dev' },
    { id: 'database', label: 'Database Studio', icon: Database, category: 'dev' },
    { id: 'pipelines', label: 'Workflows & CI', icon: Workflow, category: 'dev' },
    { id: 'mock-server', label: 'Mock & Webhooks', icon: Radio, category: 'dev' },
    { id: 'ai-hub', label: 'AI Copilot Hub', icon: Bot, category: 'dev' },
    { id: 'dependencies', label: 'Dependencies', icon: Package, category: 'dev' },
    { id: 'optimizer', label: 'Disk Optimizer', icon: HardDrive, category: 'dev' },
    // System
    { id: 'settings', label: 'Settings', icon: Settings, category: 'system' }
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarCollapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="h-full bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between shrink-0 relative z-20 select-none overflow-hidden"
    >
      {/* ── Top Header & Branding ── */}
      <div className="flex flex-col">
        <div className="h-14 px-3.5 border-b border-zinc-800/80 flex items-center justify-between">
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
          <div className="px-3 pt-3 pb-1">
            <div className="p-1 rounded-lg bg-zinc-900/70 border border-zinc-800/80">
              <WorkspaceSelector />
            </div>
          </div>
        )}

        {/* ── Navigation List ── */}
        <div className="px-2 py-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {/* Core Hub */}
          {!isSidebarCollapsed && (
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-600">
              Main
            </div>
          )}
          {navItems
            .filter((item) => item.category === 'core')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative',
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70 border border-transparent'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePill"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-violet-500 rounded-r"
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

          {/* Dev Tools */}
          {!isSidebarCollapsed && (
            <div className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-600">
              Developer Studio
            </div>
          )}
          {navItems
            .filter((item) => item.category === 'dev')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative',
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70 border border-transparent'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePill"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-violet-500 rounded-r"
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

          {/* System */}
          {!isSidebarCollapsed && (
            <div className="px-2 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-zinc-600">
              System
            </div>
          )}
          {navItems
            .filter((item) => item.category === 'system')
            .map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={cn(
                    'w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative',
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/70 border border-transparent'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activePill"
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-violet-500 rounded-r"
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
      </div>

      {/* ── Bottom Dock & Utilities ── */}
      <div className="p-2 border-t border-zinc-800/80 space-y-1.5 bg-zinc-950/80">
        {/* Terminal Dock Toggle Button */}
        <button
          onClick={toggleTerminalDock}
          title="Universal Terminal Canvas (Ctrl+`)"
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border',
            isTerminalDockOpen
              ? 'bg-violet-950/50 border-violet-600/50 text-violet-300'
              : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          )}
        >
          <Terminal className="w-4 h-4 text-violet-400 shrink-0" />
          {!isSidebarCollapsed && (
            <div className="flex-1 flex items-center justify-between min-w-0">
              <span className="truncate">Terminal Dock</span>
              <kbd className="text-[9px] font-mono text-zinc-500 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-800">
                Ctrl+`
              </kbd>
            </div>
          )}
        </button>

        {/* Quick Tools Row (Scratchpad, Snippets, Health) */}
        {!isSidebarCollapsed ? (
          <div className="flex items-center justify-between gap-1 pt-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-amber-300"
              onClick={() => setScratchpadModalOpen(true)}
              title="Global Scratchpad (Ctrl+N)"
            >
              <FileText className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-emerald-300"
              onClick={() => setSnippetModalOpen(true)}
              title="Snippets Vault (Ctrl+Shift+S)"
            >
              <Code2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-cyan-300"
              onClick={() => setHealthModalOpen(true)}
              title="Health Radar"
            >
              <Activity className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
              onClick={toggleSidebar}
              title="Collapse Sidebar (Ctrl+B)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8 text-zinc-400 hover:text-zinc-200"
            onClick={toggleSidebar}
            title="Expand Sidebar (Ctrl+B)"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </div>
    </motion.aside>
  );
};
