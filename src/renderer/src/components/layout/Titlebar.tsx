import React, { useEffect, useState } from 'react';
import { Rocket, Minus, Square, Copy, X } from 'lucide-react';

export const Titlebar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Assuming window.api is injected via preload script
    if (window.api?.window) {
      window.api.window.onMaximized?.(() => setIsMaximized(true));
      window.api.window.onUnmaximized?.(() => setIsMaximized(false));
    }
  }, []);

  const handleMinimize = () => window.api?.window?.minimize?.();
  const handleMaximize = () => window.api?.window?.toggleMaximize?.();
  const handleClose = () => window.api?.window?.close?.();

  return (
    <div className="h-9 flex items-center justify-between bg-zinc-950 border-b border-zinc-900 select-none drag-region">
      <div className="flex items-center px-3 gap-2">
        <Rocket className="w-4 h-4 text-violet-500" />
        <span className="text-xs font-semibold text-zinc-300">ProjectYB</span>
      </div>
      
      <div className="flex items-center h-full no-drag">
        <button
          onClick={handleMinimize}
          className="h-full px-4 inline-flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={handleMaximize}
          className="h-full px-4 inline-flex items-center justify-center text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50 transition-colors"
        >
          {isMaximized ? <Copy className="w-4 h-4 scale-90" /> : <Square className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={handleClose}
          className="h-full px-4 inline-flex items-center justify-center text-zinc-400 hover:bg-red-500 hover:text-zinc-50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
