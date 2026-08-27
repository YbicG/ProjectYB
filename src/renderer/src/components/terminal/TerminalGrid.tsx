import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { TerminalView } from './TerminalView';

export const TerminalGrid: React.FC = () => {
  const { terminals, activeTerminalId, setActiveTerminal } = useTerminalStore();

  if (terminals.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">
        No terminals open
      </div>
    );
  }

  if (terminals.length === 1) {
    return (
      <div className="flex-1 h-full w-full">
        <TerminalView terminalId={terminals[0].id} cwd={terminals[0].cwd} isActive={true} />
      </div>
    );
  }

  // 4 terminals: 2x2 grid layout
  if (terminals.length === 4) {
    return (
      <PanelGroup direction="vertical" className="flex-1 h-full w-full">
        <Panel defaultSize={50} minSize={25}>
          <PanelGroup direction="horizontal" className="h-full w-full">
            <Panel defaultSize={50} minSize={20} onClick={() => setActiveTerminal(terminals[0].id)} className="h-full w-full overflow-hidden">
              <TerminalView terminalId={terminals[0].id} cwd={terminals[0].cwd} isActive={true} />
            </Panel>
            <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-violet-500 transition-colors cursor-col-resize" />
            <Panel defaultSize={50} minSize={20} onClick={() => setActiveTerminal(terminals[1].id)} className="h-full w-full overflow-hidden">
              <TerminalView terminalId={terminals[1].id} cwd={terminals[1].cwd} isActive={true} />
            </Panel>
          </PanelGroup>
        </Panel>
        <PanelResizeHandle className="h-1 bg-zinc-800 hover:bg-violet-500 transition-colors cursor-row-resize" />
        <Panel defaultSize={50} minSize={25}>
          <PanelGroup direction="horizontal" className="h-full w-full">
            <Panel defaultSize={50} minSize={20} onClick={() => setActiveTerminal(terminals[2].id)} className="h-full w-full overflow-hidden">
              <TerminalView terminalId={terminals[2].id} cwd={terminals[2].cwd} isActive={true} />
            </Panel>
            <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-violet-500 transition-colors cursor-col-resize" />
            <Panel defaultSize={50} minSize={20} onClick={() => setActiveTerminal(terminals[3].id)} className="h-full w-full overflow-hidden">
              <TerminalView terminalId={terminals[3].id} cwd={terminals[3].cwd} isActive={true} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    );
  }

  // Standard horizontal split with keys and panel focus
  return (
    <PanelGroup direction="horizontal" className="flex-1 h-full w-full">
      {terminals.map((term, index) => (
        <React.Fragment key={term.id}>
          <Panel
            defaultSize={100 / terminals.length}
            minSize={15}
            onClick={() => setActiveTerminal(term.id)}
            className="relative h-full w-full overflow-hidden"
          >
            <TerminalView terminalId={term.id} cwd={term.cwd} isActive={activeTerminalId === term.id} />
          </Panel>
          {index < terminals.length - 1 && (
            <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-violet-500 transition-colors cursor-col-resize" />
          )}
        </React.Fragment>
      ))}
    </PanelGroup>
  );
};
