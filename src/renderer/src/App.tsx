import React, { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TerminalsPage } from './pages/TerminalsPage';
import { GitPage } from './pages/GitPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { CommandPalette } from './components/shared/CommandPalette';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';

export const App: React.FC = () => {
  const { activeTab } = useAppStore();
  const { scanProjects } = useProjectStore();

  useEffect(() => {
    // Initial load
    scanProjects();
    
    // Simulate system monitor starting
    const interval = setInterval(() => {
      // Mock system update would go here if not handled in store
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'terminals':
        return <TerminalsPage />;
      case 'git':
        return <GitPage />;
      case 'services':
        return <ServicesPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <>
      <AppLayout>
        {renderPage()}
      </AppLayout>
      <CommandPalette />
    </>
  );
};
