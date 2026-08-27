import React, { useState } from 'react';
import { Settings, Github, Monitor, TerminalSquare } from 'lucide-react';
import { GeneralSettings } from '../components/settings/GeneralSettings';
import { GitHubSettings } from '../components/settings/GitHubSettings';
import { AppearanceSettings } from '../components/settings/AppearanceSettings';
import { TerminalSettings } from '../components/settings/TerminalSettings';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'github', label: 'GitHub', icon: Github },
    { id: 'appearance', label: 'Appearance', icon: Monitor },
    { id: 'terminal', label: 'Terminal', icon: TerminalSquare },
  ];

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      <div className="w-64 border-r border-zinc-800 bg-zinc-950/50 flex flex-col">
        <div className="px-6 py-4">
          <h2 className="text-lg font-bold tracking-tight">Settings</h2>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                activeTab === tab.id 
                  ? 'bg-zinc-800 text-zinc-50 font-medium' 
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 bg-zinc-950/50">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'github' && <GitHubSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'terminal' && <TerminalSettings />}
      </div>
    </div>
  );
};
