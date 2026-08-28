import React from 'react';
import { Keyboard, Command } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { useThemeStore } from '@renderer/stores/useThemeStore';

export const ShortcutsCheatSheetModal: React.FC = () => {
  const { shortcutsModalOpen, setShortcutsModalOpen } = useThemeStore();

  const shortcutGroups = [
    {
      title: 'Navigation (Ctrl+1..9)',
      items: [
        { keys: ['Ctrl', '1'], label: 'Dashboard' },
        { keys: ['Ctrl', '2'], label: 'Mission Control Wallboard' },
        { keys: ['Ctrl', '3'], label: 'HTTP API Tester' },
        { keys: ['Ctrl', '4'], label: 'Terminals' },
        { keys: ['Ctrl', '5'], label: 'Git & GitHub' },
        { keys: ['Ctrl', '6'], label: 'Services & Ports' },
        { keys: ['Ctrl', '7'], label: 'Dependencies & Security' },
        { keys: ['Ctrl', '8'], label: 'Disk Optimizer' },
        { keys: ['Ctrl', '9'], label: 'Settings' }
      ]
    },
    {
      title: 'Search, Tools & Vaults',
      items: [
        { keys: ['Ctrl', 'Shift', 'M'], label: 'Mobile Remote Companion (PWA & Tunnel)' },
        { keys: ['Ctrl', 'Shift', 'F'], label: 'Global Cross-Project Search' },
        { keys: ['Ctrl', 'Shift', 'S'], label: 'Command Snippets Vault' },
        { keys: ['F11'], label: 'Toggle Fullscreen Wallboard Mode' },
        { keys: ['Ctrl', 'K'], label: 'Open Command Palette' },
        { keys: ['Ctrl', 'N'], label: 'Open Global Quick Scratchpad' },
        { keys: ['Ctrl', '/'], label: 'Toggle Keyboard Shortcuts' }
      ]
    },
    {
      title: 'Terminals & Workspaces',
      items: [
        { keys: ['Ctrl', 'T'], label: 'New Terminal in active workspace' },
        { keys: ['Ctrl', 'W'], label: 'Close Active Terminal' },
        { keys: ['Ctrl', 'Shift', 'D'], label: 'Docker Compose Dashboard' },
        { keys: ['Ctrl', 'Shift', 'O'], label: 'Disk Space Optimizer' }
      ]
    }
  ];

  return (
    <Dialog open={shortcutsModalOpen} onOpenChange={setShortcutsModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-zinc-800">
          <DialogTitle className="text-base flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-violet-400" />
            Keyboard Navigation & Shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Speed up your workflow with global keyboard hotkeys.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                {group.title}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {group.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-zinc-900/70 border border-zinc-800/80 flex items-center justify-between gap-2"
                  >
                    <span className="text-xs text-zinc-300">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-700 text-[10px] font-mono font-bold text-zinc-200 shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
