import React from 'react';
import { LayoutDashboard, TerminalSquare, GitBranch, Server, Settings, Search } from 'lucide-react';
import { useAppStore } from '@renderer/stores/useAppStore';
import { cn } from '@renderer/lib/utils';
import { SystemMonitor } from '../shared/SystemMonitor';
import { NotificationCenter } from '../shared/NotificationCenter';
import { Button } from '../ui/button';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'terminals', label: 'Terminals', icon: TerminalSquare },
  { id: 'git', label: 'Git', icon: GitBranch },
  { id: 'services', label: 'Services', icon: Server },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const TopNav: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <div className="h-14 flex items-center justify-between px-4 bg-zinc-950 border-b border-zinc-800">
      <div className="flex h-full gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "relative flex items-center gap-2 px-3 h-full text-sm font-medium transition-colors hover:text-zinc-50",
                isActive ? "text-zinc-50" : "text-zinc-400"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 rounded-t-md" />
              )}
            </button>
          );
        })}
      </div>
      
      <div className="flex items-center gap-4">
        <SystemMonitor />
        <Button variant="ghost" size="icon" onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}>
          <Search className="w-5 h-5" />
        </Button>
        <NotificationCenter />
      </div>
    </div>
  );
};
