import React, { useEffect } from 'react';
import { Titlebar } from './Titlebar';
import { TopNav } from './TopNav';
import { Toaster } from 'sonner';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-50 font-sans">
      <Titlebar />
      <TopNav />
      <main className="flex-1 overflow-auto relative">
        {children}
      </main>
      <Toaster theme="dark" position="bottom-right" />
    </div>
  );
};
