import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';
import { useThemeStore } from '@renderer/stores/useThemeStore';

interface TerminalViewProps {
  terminalId: string;
  cwd: string;
  isActive?: boolean;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ terminalId, cwd, isActive = true }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const webglAddonRef = useRef<WebglAddon | null>(null);
  const readyRef = useRef(false);

  const {
    terminalFontFamily,
    terminalFontSize,
    terminalCursorStyle,
    terminalCursorBlink
  } = useThemeStore();

  useEffect(() => {
    if (!terminalRef.current) return;
    let isCancelled = false;
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
      fontFamily: terminalFontFamily || 'Consolas, Courier New, monospace',
      fontSize: terminalFontSize || 13,
      cursorStyle: terminalCursorStyle || 'block',
      cursorBlink: terminalCursorBlink ?? true,
      lineHeight: 1.2,
      letterSpacing: 0,
      convertEol: true,
      scrollback: 10000,
      allowProposedApi: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    
    // Load WebGL Addon with graceful fallback on context loss
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      term.loadAddon(webglAddon);
      webglAddonRef.current = webglAddon;
    } catch {
      // Graceful fallback to default renderer
    }

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    let resizeDebounceTimer: NodeJS.Timeout | null = null;
    const safeFit = () => {
      if (isCancelled || !container || container.clientWidth <= 0 || container.clientHeight <= 0) return;
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

    const debouncedFit = () => {
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        requestAnimationFrame(safeFit);
      }, 60);
    };

    // Load initial scrollback buffer
    if (window.api?.terminal?.getBuffer) {
      window.api.terminal.getBuffer(terminalId).then((buf) => {
        if (!isCancelled && buf && xtermRef.current) {
          xtermRef.current.write(buf);
        }
      }).catch(() => {});
    }

    requestAnimationFrame(() => {
      safeFit();
      readyRef.current = true;
    });

    term.onData((data) => {
      if (window.api?.terminal) {
        window.api.terminal.write(terminalId, data);
      }
    });

    let cleanupOnData: (() => void) | undefined;
    if (window.api?.terminal) {
      cleanupOnData = window.api.terminal.onData(terminalId, (data: string) => {
        term.write(data);
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      if (!readyRef.current) return;
      debouncedFit();
    });
    resizeObserver.observe(container);

    return () => {
      isCancelled = true;
      readyRef.current = false;
      if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeObserver.disconnect();
      if (cleanupOnData) cleanupOnData();
      try {
        webglAddonRef.current?.dispose();
      } catch {}
      fitAddon.dispose();
      term.dispose();
      xtermRef.current = null;
      fitAddonRef.current = null;
      webglAddonRef.current = null;
    };
  }, [terminalId, cwd]);

  // Refit & Refresh when tab becomes active
  useEffect(() => {
    if (isActive && readyRef.current && fitAddonRef.current && xtermRef.current) {
      requestAnimationFrame(() => {
        try {
          fitAddonRef.current?.fit();
          xtermRef.current?.refresh(0, (xtermRef.current?.rows ?? 24) - 1);
        } catch {}
      });
    }
  }, [isActive]);

  // Options Sync
  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontFamily = terminalFontFamily || 'Consolas, Courier New, monospace';
      xtermRef.current.options.fontSize = terminalFontSize || 13;
      xtermRef.current.options.cursorStyle = terminalCursorStyle || 'block';
      xtermRef.current.options.cursorBlink = terminalCursorBlink ?? true;
      fitAddonRef.current?.fit();
    }
  }, [terminalFontFamily, terminalFontSize, terminalCursorStyle, terminalCursorBlink]);

  return <div ref={terminalRef} className="xterm-container bg-zinc-950 h-full w-full overflow-hidden p-1" />;
};
