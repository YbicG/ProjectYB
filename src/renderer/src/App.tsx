import React, { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TerminalsPage } from './pages/TerminalsPage';
import { GitPage } from './pages/GitPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { CommandPalette } from './components/shared/CommandPalette';
import { CreateProjectDialog } from './components/templates/CreateProjectDialog';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useSystemStore } from '@renderer/stores/useSystemStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useTemplateStore } from '@renderer/stores/useTemplateStore';
import { useKeyboard } from './hooks/useKeyboard';

export const App: React.FC = () => {
  useKeyboard();
  const { activeTab } = useAppStore();
  const { scanProjects } = useProjectStore();
  const { startMonitoring, stopMonitoring } = useSystemStore();
  const { dialogOpen: templateDialogOpen, setDialogOpen: setTemplateDialogOpen } = useTemplateStore();

  useEffect(() => {
    // Initial load
    scanProjects();
    startMonitoring();

    // Listen for tray re-scan requests
    let unsubScan: (() => void) | undefined;
    if (window.api?.projects?.onTriggerScan) {
      unsubScan = window.api.projects.onTriggerScan(() => {
        scanProjects();
      });
    }

    // Listen for service live process CPU & RAM stats
    let unsubStats: (() => void) | undefined;
    if (window.api?.system?.onServiceStats) {
      unsubStats = window.api.system.onServiceStats((statsMap) => {
        useServiceStore.getState().updateAllServiceStats(statsMap);
      });
    }
    
    return () => {
      stopMonitoring();
      unsubScan?.();
      unsubStats?.();
    };
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
      case 'project-detail':
        return <ProjectDetailPage />;
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
      <CreateProjectDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
    </>
  );
};
