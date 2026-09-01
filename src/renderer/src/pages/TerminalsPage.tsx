import React from 'react';
import { TerminalToolbar } from '../components/terminal/TerminalToolbar';
import { TerminalTabs } from '../components/terminal/TerminalTabs';
import { TerminalSidebar } from '../components/terminal/TerminalSidebar';
import { TerminalGrid } from '../components/terminal/TerminalGrid';
import { TerminalView } from '../components/terminal/TerminalView';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { TerminalSquare, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';

export const TerminalsPage: React.FC = () => {
  const { terminals, layout, activeTerminalId, createTerminal } = useTerminalStore();

  if (terminals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 text-zinc-400 space-y-4 p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-violet-400 shadow-inner">
          <TerminalSquare className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-zinc-200">No Active Terminals</h2>
          <p className="text-xs text-zinc-500 max-w-sm">
            Launch a local shell, project terminal, or service instance to get started.
          </p>
        </div>
        <Button
          onClick={() => {
            const defaultCwd = useAppStore.getState().scanPaths[0] || 'D:\\Code';
            createTerminal({ name: 'Terminal', cwd: defaultCwd });
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white text-xs gap-1.5 h-8 px-4"
        >
          <Plus className="w-3.5 h-3.5" />
          New Terminal
        </Button>
      </div>
    );
  }

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId) || terminals[0];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 overflow-hidden select-none">
      {/* ── Main Viewport by Layout ── */}
      {layout === 'tabs' ? (
        <div className="flex flex-col flex-1 w-full h-full min-h-0 overflow-hidden">
          {/* Unified High-Contrast Tab Bar */}
          <TerminalTabs />

          {/* Terminal Viewport */}
          <div className="flex-1 relative bg-zinc-950 overflow-hidden">
            {terminals.map((term) => {
              const isTabActive = term.id === (activeTerminal?.id || activeTerminalId);
              return (
                <div
                  key={term.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    visibility: isTabActive ? 'visible' : 'hidden',
                    opacity: isTabActive ? 1 : 0,
                    pointerEvents: isTabActive ? 'auto' : 'none',
                    zIndex: isTabActive ? 1 : 0
                  }}
                >
                  <TerminalView
                    terminalId={term.id}
                    cwd={term.cwd}
                    isActive={isTabActive}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : layout === 'grid' ? (
        <div className="flex flex-col flex-1 w-full h-full min-h-0 overflow-hidden">
          <TerminalToolbar />
          <div className="flex-1 h-full w-full min-h-0 overflow-hidden">
            <TerminalGrid />
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 w-full h-full min-h-0 overflow-hidden">
          <TerminalToolbar />
          <div className="flex flex-1 w-full h-full min-h-0 overflow-hidden">
            <TerminalSidebar />
            <div className="flex-1 relative bg-zinc-950 overflow-hidden">
              {terminals.map((term) => {
                const isTabActive = term.id === (activeTerminal?.id || activeTerminalId);
                return (
                  <div
                    key={term.id}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      visibility: isTabActive ? 'visible' : 'hidden',
                      opacity: isTabActive ? 1 : 0,
                      pointerEvents: isTabActive ? 'auto' : 'none',
                      zIndex: isTabActive ? 1 : 0
                    }}
                  >
                    <TerminalView
                      terminalId={term.id}
                      cwd={term.cwd}
                      isActive={isTabActive}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
