import React, { useEffect } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { ModernAppLayout } from './components/modern/layout/ModernAppLayout';
import { ModernBentoDashboard } from './components/modern/dashboard/ModernBentoDashboard';
import { ModernProjectWorkbench } from './components/modern/project/ModernProjectWorkbench';
import { DashboardPage } from './pages/DashboardPage';
import { OverviewPage } from './pages/OverviewPage';
import { ApiTesterPage } from './pages/ApiTesterPage';
import { TerminalsPage } from './pages/TerminalsPage';
import { GitPage } from './pages/GitPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { DependenciesPage } from './pages/DependenciesPage';
import { OptimizerPage } from './pages/OptimizerPage';
import { TunnelsPage } from './pages/TunnelsPage';
import { DatabasePage } from './pages/DatabasePage';
import { PipelinesPage } from './pages/PipelinesPage';
import { MockServerPage } from './pages/MockServerPage';
import { AiHubPage } from './pages/AiHubPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { CommandPalette } from './components/shared/CommandPalette';
import { CreateProjectDialog } from './components/templates/CreateProjectDialog';
import { HealthAnalyticsModal } from './components/health/HealthAnalyticsModal';
import { ShortcutsCheatSheetModal } from './components/shared/ShortcutsCheatSheetModal';
import { GlobalScratchpadModal } from './components/notes/GlobalScratchpadModal';
import { GlobalSearchModal } from './components/search/GlobalSearchModal';
import { SnippetVaultModal } from './components/snippets/SnippetVaultModal';
import { AiErrorDiagnosisDialog } from './components/ai/AiErrorDiagnosisDialog';
import { AiChatModal } from './components/ai/AiChatModal';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { useAppStore } from '@renderer/stores/useAppStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useSystemStore } from '@renderer/stores/useSystemStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { useTemplateStore } from '@renderer/stores/useTemplateStore';
import { useThemeStore } from '@renderer/stores/useThemeStore';
import { useSnippetStore } from '@renderer/stores/useSnippetStore';
import { useOverviewStore } from '@renderer/stores/useOverviewStore';
import { useNotificationStore } from '@renderer/stores/useNotificationStore';
import { useKeyboard } from './hooks/useKeyboard';

export const App: React.FC = () => {
  useKeyboard();
  const { activeTab } = useAppStore();
  const { scanProjects } = useProjectStore();
  const { startMonitoring, stopMonitoring } = useSystemStore();
  const { uiMode, loadPreferences } = useThemeStore();
  const { loadCustomSnippets } = useSnippetStore();
  const { loadConfig: loadOverviewConfig } = useOverviewStore();
  const { loadSettings: loadNotificationSettings } = useNotificationStore();
  const { dialogOpen: templateDialogOpen, setDialogOpen: setTemplateDialogOpen } = useTemplateStore();

  useEffect(() => {
    // Initial load
    loadNotificationSettings();
    scanProjects();
    startMonitoring();
    loadPreferences();
    loadCustomSnippets();
    loadOverviewConfig();

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

  const renderClassicPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'overview':
        return <OverviewPage />;
      case 'api':
        return <ApiTesterPage />;
      case 'terminals':
        return <TerminalsPage />;
      case 'git':
        return <GitPage />;
      case 'services':
        return <ServicesPage />;
      case 'tunnels':
        return <TunnelsPage />;
      case 'database':
        return <DatabasePage />;
      case 'pipelines':
        return <PipelinesPage />;
      case 'mock-server':
        return <MockServerPage />;
      case 'ai-hub':
        return <AiHubPage />;
      case 'dependencies':
        return <DependenciesPage />;
      case 'optimizer':
        return <OptimizerPage />;
      case 'settings':
        return <SettingsPage />;
      case 'project-detail':
        return <ProjectDetailPage />;
      default:
        return <DashboardPage />;
    }
  };

  const renderModernPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ModernBentoDashboard />;
      case 'project-detail':
        return <ModernProjectWorkbench />;
      case 'overview':
        return <OverviewPage />;
      case 'api':
        return <ApiTesterPage />;
      case 'terminals':
        return <TerminalsPage />;
      case 'git':
        return <GitPage />;
      case 'services':
        return <ServicesPage />;
      case 'tunnels':
        return <TunnelsPage />;
      case 'database':
        return <DatabasePage />;
      case 'pipelines':
        return <PipelinesPage />;
      case 'mock-server':
        return <MockServerPage />;
      case 'ai-hub':
        return <AiHubPage />;
      case 'dependencies':
        return <DependenciesPage />;
      case 'optimizer':
        return <OptimizerPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <ModernBentoDashboard />;
    }
  };

  return (
    <>
      {uiMode === 'modern' ? (
        <ModernAppLayout>
          <ErrorBoundary fallbackTitle="Modern Workspace Error">
            {renderModernPage()}
          </ErrorBoundary>
        </ModernAppLayout>
      ) : (
        <AppLayout>
          <ErrorBoundary fallbackTitle="Classic Workspace Error">
            {renderClassicPage()}
          </ErrorBoundary>
        </AppLayout>
      )}

      <CommandPalette />
      <CreateProjectDialog
        open={templateDialogOpen}
        onOpenChange={setTemplateDialogOpen}
      />
      <HealthAnalyticsModal />
      <ShortcutsCheatSheetModal />
      <GlobalScratchpadModal />
      <GlobalSearchModal />
      <SnippetVaultModal />
      <AiErrorDiagnosisDialog />
      <AiChatModal />
    </>
  );
};
