import React from 'react';
import { ModernSidebar } from './ModernSidebar';
import { ModernHeader } from './ModernHeader';
import { ModernTerminalDock } from './ModernTerminalDock';
import { Titlebar } from '../../layout/Titlebar';
import { Toaster } from 'sonner';

interface ModernAppLayoutProps {
  children: React.ReactNode;
}

export const ModernAppLayout: React.FC<ModernAppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-50 font-sans select-none">
      {/* ── Top Frameless Window Titlebar ── */}
      <Titlebar />

      {/* ── Main Workspace Body (Sidebar + Content + Terminal Dock) ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Left Collapsible Activity Rail */}
        <ModernSidebar />

        {/* Center Main Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-zinc-950/60 relative">
          <ModernHeader />

          {/* Viewport Canvas */}
          <main className="flex-1 overflow-auto relative">
            {children}
          </main>

          {/* Universal Bottom Terminal Dock */}
          <ModernTerminalDock />
        </div>
      </div>

      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
};
