import React, { useRef, useState } from 'react';
import {
  Terminal,
  Plus,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  RotateCw,
  Minus,
  ChevronUp,
  GripHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    removeTerminal,
    restartTerminal
  } = useTerminalStore();

  const { setActiveTab } = useAppStore();
  const [isMaximized, setIsMaximized] = useState(false);
  const isDraggingRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const startY = e.clientY;
    const startHeight = terminalDockHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = startY - moveEvent.clientY;
      setTerminalDockHeight(startHeight + deltaY);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleNewTerminal = async () => {
    await createTerminal({ name: 'Terminal', cwd: 'D:\\Code' });
  };

  const handleExpandToFullTab = () => {
    setTerminalDockOpen(false);
    setActiveTab('terminals');
  };

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId) || terminals[0];

  return (
    <AnimatePresence>
      {isTerminalDockOpen && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          style={{
            height: isMaximized ? 'calc(100vh - 56px)' : `${terminalDockHeight}px`
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
                      'flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono transition-all shrink-0 group',
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

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-400 hover:text-zinc-100 rounded shrink-0"
                onClick={handleNewTerminal}
                title="New Terminal"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
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

          {/* ── Terminal Content Viewport ── */}
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
            ) : activeTerminal ? (
              <TerminalView
                key={activeTerminal.id}
                terminalId={activeTerminal.id}
                cwd={activeTerminal.cwd}
                isActive={true}
              />
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
