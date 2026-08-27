import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useThemeStore } from '@renderer/stores/useThemeStore';

interface TerminalViewProps {
  terminalId: string;
  cwd: string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ terminalId, cwd }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const readyRef = useRef(false);

  const {
    terminalFontFamily,
    terminalFontSize,
    terminalCursorStyle,
    terminalCursorBlink
  } = useThemeStore();

  useEffect(() => {
    if (!terminalRef.current) return;

    const container = terminalRef.current;

    const term = new Terminal({
      theme: {
        background: '#09090b',
        foreground: '#fafafa',
        cursor: '#a1a1aa',
        selectionBackground: '#3f3f46',
        black: '#09090b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f4f4f5',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fde047',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      fontFamily: terminalFontFamily,
      fontSize: terminalFontSize,
      cursorStyle: terminalCursorStyle,
      cursorBlink: terminalCursorBlink,
      lineHeight: 1.2,
      letterSpacing: 0,
      convertEol: true, // Fixes skewed/staircase terminal output across CLI tools
      scrollback: 10000,
      allowProposedApi: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(container);
    
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const safeFit = () => {
      if (!container || container.clientWidth <= 0 || container.clientHeight <= 0) return;
      try {
        const dims = fitAddon.proposeDimensions();
        if (dims && dims.cols > 10 && dims.rows > 3) {
          fitAddon.fit();
          if (window.api?.terminal) {
            window.api.terminal.resize(terminalId, dims.cols, dims.rows);
          }
        }
      } catch {}
    };

    // Load initial scrollback buffer from backend
    if (window.api?.terminal?.getBuffer) {
      window.api.terminal.getBuffer(terminalId).then(buf => {
        if (buf && xtermRef.current) {
          xtermRef.current.write(buf);
        }
      }).catch(() => {});
    }

    // Initial safe fit after container layout settles
    requestAnimationFrame(() => {
      safeFit();
      readyRef.current = true;
    });

    // xterm → pty: send keystrokes to the backend
    term.onData((data) => {
      if (window.api?.terminal) {
        window.api.terminal.write(terminalId, data);
      }
    });

    // pty → xterm: display real-time output from the backend
    let cleanupOnData: (() => void) | undefined;
    if (window.api?.terminal) {
      cleanupOnData = window.api.terminal.onData(terminalId, (data: string) => {
        term.write(data);
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!readyRef.current) return;
      requestAnimationFrame(safeFit);
    });
    resizeObserver.observe(container);

    return () => {
      readyRef.current = false;
      resizeObserver.disconnect();
      if (cleanupOnData) cleanupOnData();
      term.dispose();
    };
  }, [terminalId, cwd]);

  return <div ref={terminalRef} className="xterm-container bg-zinc-950 h-full w-full overflow-hidden p-1" />;
};
