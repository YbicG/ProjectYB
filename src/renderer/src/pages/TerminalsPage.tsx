import React from 'react';
import { TerminalToolbar } from '../components/terminal/TerminalToolbar';
import { TerminalTabs } from '../components/terminal/TerminalTabs';
import { TerminalSidebar } from '../components/terminal/TerminalSidebar';
import { TerminalGrid } from '../components/terminal/TerminalGrid';
import { TerminalView } from '../components/terminal/TerminalView';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { TerminalSquare } from 'lucide-react';
import { Button } from '../components/ui/button';

export const TerminalsPage: React.FC = () => {
  const { terminals, layout, activeTerminalId, createTerminal } = useTerminalStore();

  if (terminals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 text-zinc-400">
        <TerminalSquare className="w-16 h-16 mb-4 text-zinc-800" />
        <h2 className="text-lg font-medium text-zinc-300 mb-2">No Terminals Open</h2>
        <p className="text-sm text-zinc-500 mb-6">Create a new terminal to get started.</p>
        <Button onClick={() => createTerminal({ name: 'Local', cwd: '.' })} className="bg-violet-600 hover:bg-violet-700">
          New Terminal
        </Button>
      </div>
    );
  }

  const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950">
      <TerminalToolbar />
      
      <div className="flex-1 flex overflow-hidden">
        {layout === 'tabs' && (
          <div className="flex flex-col flex-1 w-full h-full">
            <TerminalTabs />
            <div className="flex-1 relative">
              {terminals.map(term => (
                <div key={term.id} className={term.id === activeTerminalId ? 'absolute inset-0' : 'hidden'}>
                  <TerminalView terminalId={term.id} cwd={term.cwd} />
                </div>
              ))}
            </div>
          </div>
        )}

        {layout === 'grid' && (
          <div className="flex-1 h-full w-full">
            <TerminalGrid />
          </div>
        )}

        {layout === 'list' && (
          <div className="flex flex-1 w-full h-full">
            <TerminalSidebar />
            <div className="flex-1 relative bg-zinc-950">
              {activeTerminal ? (
                <TerminalView terminalId={activeTerminal.id} cwd={activeTerminal.cwd} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500">Select a terminal</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
