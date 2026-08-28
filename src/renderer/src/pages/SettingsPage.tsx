import React from 'react';
import { Settings, Github, Monitor, TerminalSquare, Bell, CloudLightning, Shield } from 'lucide-react';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { GitHubSettings } from '../components/settings/GitHubSettings';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';
import { TerminalSettings } from '../components/settings/TerminalSettings';
import { NotificationSettings } from '../components/settings/NotificationSettings';
import { CloudflareSettings } from '../components/settings/CloudflareSettings';
import { CloudSyncSettings } from '../components/settings/CloudSyncSettings';
import { useAppStore } from '@renderer/stores/useAppStore';
import { cn } from '@renderer/lib/utils';

export const SettingsPage: React.FC = () => {
  const { settingsSubTab, setSettingsSubTab } = useAppStore();

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'sync', label: 'Cloud Vault & Sync', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'cloudflare', label: 'Cloudflare', icon: CloudLightning },
    { id: 'github', label: 'GitHub', icon: Github },
    { id: 'appearance', label: 'Appearance', icon: Monitor },
    { id: 'terminal', label: 'Terminal', icon: TerminalSquare },
  ];

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* ── Settings Navigation Sidebar / Topbar in Portrait ── */}
      <div className="w-full md:w-56 lg:w-64 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/70 flex flex-col shrink-0">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800/80 md:border-none">
          <h2 className="text-base sm:text-lg font-bold tracking-tight">Settings</h2>
        </div>
        <nav className="p-2 sm:p-3 flex md:flex-col gap-1 overflow-x-auto no-scrollbar flex-nowrap">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSettingsSubTab(tab.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap",
                settingsSubTab === tab.id 
                  ? 'bg-zinc-800 text-zinc-50 font-semibold' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              )}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      {/* ── Settings Content View ── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-zinc-950/50">
        {settingsSubTab === 'general' && <GeneralSettings />}
        {settingsSubTab === 'sync' && <CloudSyncSettings />}
        {settingsSubTab === 'notifications' && <NotificationSettings />}
        {settingsSubTab === 'cloudflare' && <CloudflareSettings />}
        {settingsSubTab === 'github' && <GitHubSettings />}
        {settingsSubTab === 'appearance' && <AppearanceSettings />}
        {settingsSubTab === 'terminal' && <TerminalSettings />}
      </div>
    </div>
  );
};
