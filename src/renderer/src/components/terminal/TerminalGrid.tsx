import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { TerminalView } from './TerminalView';

export const TerminalGrid: React.FC = () => {
  const { terminals } = useTerminalStore();

  if (terminals.length === 0) {
    return <div className="flex-1 flex items-center justify-center text-zinc-500">No terminals open</div>;
  }

  if (terminals.length === 1) {
    return (
      <div className="flex-1">
        <TerminalView terminalId={terminals[0].id} cwd={terminals[0].cwd} />
      </div>
    );
  }

  // Basic 2-pane vertical split for exactly 2 terminals
  if (terminals.length === 2) {
    return (
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={50} minSize={20}>
          <TerminalView terminalId={terminals[0].id} cwd={terminals[0].cwd} />
        </Panel>
        <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-violet-500 transition-colors" />
        <Panel defaultSize={50} minSize={20}>
          <TerminalView terminalId={terminals[1].id} cwd={terminals[1].cwd} />
        </Panel>
      </PanelGroup>
    );
  }

  // Fallback for > 2 terminals: stack them horizontally (could be more complex, keeping it simple)
  return (
    <PanelGroup direction="horizontal" className="flex-1">
      {terminals.map((term, index) => (
        <React.Fragment key={term.id}>
          <Panel defaultSize={100 / terminals.length} minSize={20}>
            <TerminalView terminalId={term.id} cwd={term.cwd} />
          </Panel>
          {index < terminals.length - 1 && (
            <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-violet-500 transition-colors" />
          )}
        </React.Fragment>
      ))}
    </PanelGroup>
  );
};
