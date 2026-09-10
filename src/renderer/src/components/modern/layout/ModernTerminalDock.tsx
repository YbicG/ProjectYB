import React, { useRef, useState, useEffect } from 'react';
import {
  Terminal,
  Plus,
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  ChevronUp,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useThemeStore } from '@renderer/stores/useThemeStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { TerminalView } from '../../terminal/TerminalView';
import { Button } from '../../ui/button';
import { cn } from '@renderer/lib/utils';

export const ModernTerminalDock: React.FC = () => {
  const {
    isTerminalDockOpen,
    setTerminalDockOpen,
    terminalDockHeight,
    setTerminalDockHeight
  } = useThemeStore();

  const {
    terminals,
    activeTerminalId,
    setActiveTerminal,
    createTerminal,
    openAdminTerminal,
    removeTerminal,
    restartTerminal
  } = useTerminalStore();

  const { setActiveTab } = useAppStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const [localHeight, setLocalHeight] = useState(terminalDockHeight);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(terminalDockHeight);
  const currentHeightRef = useRef(terminalDockHeight);

  // Sync local height with store on external changes
  useEffect(() => {
    if (!isDraggingRef.current) {
      setLocalHeight(terminalDockHeight);
      currentHeightRef.current = terminalDockHeight;
    }
  }, [terminalDockHeight]);

  // Clean up global drag listeners on unmount
  useEffect(() => {
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = startYRef.current - moveEvent.clientY;
      const newHeight = Math.max(160, Math.min(startHeightRef.current + deltaY, window.innerHeight - 100));
      currentHeightRef.current = newHeight;
      setLocalHeight(newHeight);
    };

    const onMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setTerminalDockHeight(currentHeightRef.current);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [setTerminalDockHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = currentHeightRef.current;
  };

  const handleNewTerminal = async () => {
    const defaultCwd = useAppStore.getState().scanPaths[0] || 'D:\\Code';
    await createTerminal({ name: 'Terminal', cwd: defaultCwd });
  };

  const handleNewAdminTerminal = async () => {
    const defaultCwd = useAppStore.getState().scanPaths[0] || 'D:\\Code';
    await openAdminTerminal({ cwd: defaultCwd, name: 'Admin Terminal' });
  };

  const handleExpandToFullTab = () => {
    setTerminalDockOpen(false);
    setActiveTab('terminals');
  };

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId) || terminals[0];

  return (
    <motion.div
      initial={false}
      animate={{
        y: isTerminalDockOpen ? 0 : '100%',
        opacity: isTerminalDockOpen ? 1 : 0
      }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      style={{
        height: isMaximized ? 'calc(100vh - 56px)' : `${localHeight}px`,
        pointerEvents: isTerminalDockOpen ? 'auto' : 'none'
      }}
      className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-2xl border-t border-zinc-800 shadow-2xl flex flex-col overflow-hidden"
    >
      {/* ── Resizer Drag Bar ── */}
      <div
        onMouseDown={handleMouseDown}
        className="h-2 w-full bg-zinc-900/60 hover:bg-violet-600/40 cursor-row-resize flex items-center justify-center transition-colors group"
      >
        <div className="w-12 h-1 rounded-full bg-zinc-700 group-hover:bg-violet-400 transition-colors" />
      </div>

      {/* ── Dock Header / Tabs Bar ── */}
      <div className="h-10 px-3 bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Terminal Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1 py-1">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold text-violet-300 bg-violet-950/40 border border-violet-800/50 shrink-0">
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">DOCK</span>
          </div>

          {terminals.map((t) => {
            const isActive = t.id === (activeTerminal?.id || activeTerminalId);
            return (
              <button
                key={t.id}
                onClick={() => setActiveTerminal(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all shrink-0 group',
                  isActive
                    ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                    : 'bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
                )}
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    t.status === 'running' ? 'bg-emerald-400' : 'bg-zinc-500'
                  )}
                />
                {t.isAdmin && (
                  <span title="Administrator Terminal">
                    <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                  </span>
                )}
                <span className="truncate max-w-[120px]">{t.name}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTerminal(t.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            );
          })}

          <div className="flex items-center gap-1 shrink-0 ml-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-zinc-400 hover:text-zinc-100 rounded"
              onClick={handleNewTerminal}
              title="New Terminal"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] font-mono text-amber-400 hover:text-amber-300 hover:bg-amber-950/30 rounded gap-1 border border-amber-500/20"
              onClick={handleNewAdminTerminal}
              title="Open Administrator Terminal"
            >
              <Shield className="w-2.5 h-2.5" />
              <span>+ Admin</span>
            </Button>
          </div>
        </div>

        {/* Right: Window Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {activeTerminal && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
              onClick={() => restartTerminal(activeTerminal.id)}
              title="Restart Active Terminal"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restore Height' : 'Maximize Dock'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-violet-300"
            onClick={handleExpandToFullTab}
            title="Open in Full Terminal Page"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-rose-400"
            onClick={() => setTerminalDockOpen(false)}
            title="Close Dock (Ctrl+`)"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Terminal Content Viewport (Preserve All Running Terminals) ── */}
      <div className="flex-1 bg-zinc-950 overflow-hidden relative">
        {terminals.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
            <Terminal className="w-8 h-8 opacity-40" />
            <p className="text-xs">No active terminal sessions</p>
            <Button
              size="sm"
              variant="outline"
              onClick={handleNewTerminal}
              className="h-7 text-xs border-zinc-800 text-zinc-300"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Open Terminal
            </Button>
          </div>
        ) : (
          terminals.map((t) => {
            const isTabActive = t.id === (activeTerminal?.id || activeTerminalId);
            return (
              <div
                key={t.id}
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
                  terminalId={t.id}
                  cwd={t.cwd}
                  isActive={isTabActive && isTerminalDockOpen}
                />
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
