import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  terminalId: string;
  cwd: string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ terminalId, cwd }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    const container = terminalRef.current;

    const term = new Terminal({
      theme: {
        background: '#09090b',
        foreground: '#fafafa',
        cursor: '#fafafa',
        selectionBackground: '#3f3f46',
      },
      fontFamily: '"Cascadia Code", "Fira Code", Consolas, monospace',
      fontSize: 14,
      cursorBlink: true,
      allowProposedApi: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(container);
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Defer fit until the container has dimensions
    requestAnimationFrame(() => {
      try {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          fitAddon.fit();
          // Sync the pty size with xterm's computed size
          if (window.api?.terminal) {
            window.api.terminal.resize(terminalId, term.cols, term.rows);
          }
        }
      } catch {}
      readyRef.current = true;
    });

    // DO NOT spawn here — the store's createTerminal already spawned the pty.
    // Just wire up the data bridges:

    // xterm → pty: send keystrokes to the backend
    term.onData((data) => {
      if (window.api?.terminal) {
        window.api.terminal.write(terminalId, data);
      }
    });

    // pty → xterm: display output from the backend
    let cleanupOnData: (() => void) | undefined;
    if (window.api?.terminal) {
      cleanupOnData = window.api.terminal.onData(terminalId, (data: string) => {
        term.write(data);
      });
    }

    const handleResize = () => {
      if (!readyRef.current) return;
      try {
        fitAddon.fit();
        if (window.api?.terminal) {
          window.api.terminal.resize(terminalId, term.cols, term.rows);
        }
      } catch {}
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      readyRef.current = false;
      resizeObserver.disconnect();
      if (cleanupOnData) cleanupOnData();
      term.dispose();
    };
  }, [terminalId, cwd]);

  return <div ref={terminalRef} className="xterm-container bg-zinc-950 h-full w-full overflow-hidden" />;
};
