import React, { useState, useEffect } from 'react';
import { Package, ShieldAlert, ArrowUpCircle, Plus, RefreshCw, Layers } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { OutdatedPackagesList } from '../components/dependencies/OutdatedPackagesList';
import { SecurityAuditView } from '../components/dependencies/SecurityAuditView';
import { InstalledPackagesList } from '../components/dependencies/InstalledPackagesList';
import { PackageInstallModal } from '../components/dependencies/PackageInstallModal';
import { useDependencyStore } from '@renderer/stores/useDependencyStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { cn } from '@renderer/lib/utils';

export const DependenciesPage: React.FC = () => {
  const { projects, selectedProjectId, selectProject } = useProjectStore();
  const {
    outdatedPackages,
    auditSummary,
    installedPackages,
    loadAllForProject
  } = useDependencyStore();

  const [activeSubTab, setActiveSubTab] = useState<'outdated' | 'audit' | 'installed'>('outdated');
  const [installModalOpen, setInstallModalOpen] = useState(false);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  useEffect(() => {
    if (currentProject) {
      loadAllForProject(currentProject.path);
    }
  }, [currentProject?.id]);

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-500 text-sm gap-2">
        <Package className="w-8 h-8 text-zinc-600 mb-1" />
        No projects scanned yet. Add or scan projects to manage dependencies.
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-4 overflow-hidden">
      {/* ── Top Header & Project Selector ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-600/10 border border-violet-500/20 text-violet-400">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              Dependency & Security Hub
            </h1>
            <p className="text-xs text-zinc-400">
              Inspect packages, upgrade outdated dependencies, and audit security vulnerabilities.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Project Switcher */}
          <select
            value={currentProject?.id || ''}
            onChange={(e) => selectProject(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>

          <Button
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-xs h-8 gap-1.5"
            onClick={() => setInstallModalOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" /> Add Package
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 border-zinc-800"
            onClick={() => currentProject && loadAllForProject(currentProject.path)}
            title="Refresh dependencies"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Overview Stat Badges ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card
          onClick={() => setActiveSubTab('outdated')}
          className={cn(
            'bg-zinc-950 border-zinc-800 p-3.5 cursor-pointer transition-colors',
            activeSubTab === 'outdated' ? 'border-violet-600/60 bg-zinc-900/30' : 'hover:border-zinc-700'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-amber-950/40 text-amber-400">
                <ArrowUpCircle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 font-medium">Outdated Packages</p>
                <p className="text-base font-bold text-zinc-100">{outdatedPackages.length}</p>
              </div>
            </div>
            {outdatedPackages.length > 0 && (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-900/60">
                Updates Available
              </Badge>
            )}
          </div>
        </Card>

        <Card
          onClick={() => setActiveSubTab('audit')}
          className={cn(
            'bg-zinc-950 border-zinc-800 p-3.5 cursor-pointer transition-colors',
            activeSubTab === 'audit' ? 'border-violet-600/60 bg-zinc-900/30' : 'hover:border-zinc-700'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-red-950/40 text-red-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 font-medium">Vulnerabilities</p>
                <p className="text-base font-bold text-zinc-100">{auditSummary?.total || 0}</p>
              </div>
            </div>
            {auditSummary && auditSummary.total > 0 ? (
              <Badge variant="destructive" className="text-[10px]">
                {auditSummary.critical + auditSummary.high} High/Crit
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-900/60">
                Clean
              </Badge>
            )}
          </div>
        </Card>

        <Card
          onClick={() => setActiveSubTab('installed')}
          className={cn(
            'bg-zinc-950 border-zinc-800 p-3.5 cursor-pointer transition-colors',
            activeSubTab === 'installed' ? 'border-violet-600/60 bg-zinc-900/30' : 'hover:border-zinc-700'
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-cyan-950/40 text-cyan-400">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-500 font-medium">Installed Dependencies</p>
                <p className="text-base font-bold text-zinc-100">{installedPackages.length}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] text-zinc-400">
              {currentProject?.type}
            </Badge>
          </div>
        </Card>
      </div>

      {/* ── Main View Switcher ── */}
      <div className="flex-1 min-h-0">
        {currentProject && activeSubTab === 'outdated' && (
          <OutdatedPackagesList projectPath={currentProject.path} />
        )}
        {currentProject && activeSubTab === 'audit' && (
          <SecurityAuditView projectPath={currentProject.path} />
        )}
        {currentProject && activeSubTab === 'installed' && (
          <InstalledPackagesList projectPath={currentProject.path} />
        )}
      </div>

      {/* ── Add Package Dialog ── */}
      {currentProject && (
        <PackageInstallModal
          open={installModalOpen}
          onOpenChange={setInstallModalOpen}
          projectPath={currentProject.path}
        />
      )}
    </div>
  );
};
