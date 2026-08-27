import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  terminalId: string;
  cwd: string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ terminalId, cwd }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#09090b',
        foreground: '#fafafa',
        cursor: '#fafafa',
        selectionBackground: '#3f3f46',
      },
      fontFamily: '"Fira Code", monospace',
      fontSize: 14,
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    
    try {
      const webgl = new WebglAddon();
      term.loadAddon(webgl);
    } catch (e) {
      console.warn('WebGL addon failed to load, falling back to canvas', e);
    }

    fitAddon.fit();
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    let ptyId: string | null = null;

    const initTerminal = async () => {
      if (window.api?.terminal) {
        ptyId = await window.api.terminal.spawn({ cwd, id: terminalId });
        
        term.onData((data) => {
          if (ptyId) {
            window.api.terminal.write(ptyId, data);
          }
        });

        const onDataListener = (_event: any, id: string, data: string) => {
          if (id === ptyId) {
            term.write(data);
          }
        };

        window.api.terminal.onData(onDataListener);
      }
    };

    initTerminal();

    const handleResize = () => {
      fitAddon.fit();
      if (ptyId && window.api?.terminal) {
        window.api.terminal.resize(ptyId, term.cols, term.rows);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      if (ptyId && window.api?.terminal) {
        window.api.terminal.kill(ptyId);
      }
      term.dispose();
    };
  }, [terminalId, cwd]);

  return <div ref={terminalRef} className="xterm-container bg-zinc-950 h-full w-full overflow-hidden" />;
};
