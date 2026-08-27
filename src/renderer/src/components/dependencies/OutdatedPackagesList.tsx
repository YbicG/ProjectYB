import React from 'react';
import { RefreshCw, ArrowUpCircle, CheckSquare, Square, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useDependencyStore } from '@renderer/stores/useDependencyStore';
import { cn } from '@renderer/lib/utils';

interface OutdatedPackagesListProps {
  projectPath: string;
}

export const OutdatedPackagesList: React.FC<OutdatedPackagesListProps> = ({ projectPath }) => {
  const {
    outdatedPackages,
    isLoadingOutdated,
    isUpgrading,
    selectedUpgradePackages,
    loadOutdated,
    upgradePackage,
    upgradeSelectedPackages,
    toggleUpgradeSelect,
    selectAllUpgrades,
    deselectAllUpgrades
  } = useDependencyStore();

  const allSelected = outdatedPackages.length > 0 && selectedUpgradePackages.length === outdatedPackages.length;

  return (
    <Card className="bg-zinc-950 border-zinc-800 flex flex-col h-full">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <ArrowUpCircle className="w-4 h-4 text-violet-400" />
          <CardTitle className="text-xs font-semibold text-zinc-100">Outdated Dependencies</CardTitle>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {outdatedPackages.length}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {outdatedPackages.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-200 gap-1 px-2"
                onClick={allSelected ? deselectAllUpgrades : selectAllUpgrades}
              >
                {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-violet-400" /> : <Square className="w-3.5 h-3.5" />}
                {allSelected ? 'Deselect All' : 'Select All'}
              </Button>

              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-xs h-7 gap-1.5"
                disabled={isUpgrading || selectedUpgradePackages.length === 0}
                onClick={() => upgradeSelectedPackages(projectPath)}
              >
                <Zap className="w-3 h-3" />
                {isUpgrading ? 'Upgrading…' : `Upgrade Selected (${selectedUpgradePackages.length})`}
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => loadOutdated(projectPath)}
            disabled={isLoadingOutdated}
            title="Refresh outdated packages"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoadingOutdated && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoadingOutdated ? (
            <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-violet-400" />
              Scanning package manager for outdated dependencies…
            </div>
          ) : outdatedPackages.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-emerald-500 mb-1" />
              <span className="font-semibold text-zinc-300">All dependencies are up to date!</span>
              <span>No outdated packages were found in this project.</span>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {outdatedPackages.map((pkg) => {
                const isSelected = selectedUpgradePackages.includes(pkg.name);
                return (
                  <div
                    key={pkg.name}
                    className="p-3 hover:bg-zinc-900/50 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleUpgradeSelect(pkg.name)}
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-violet-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-200 truncate">{pkg.name}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 text-zinc-400">
                            {pkg.packageType}
                          </Badge>
                          {pkg.isBreaking && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0 gap-1 bg-red-950/60 text-red-400 border-red-800">
                              <AlertTriangle className="w-2.5 h-2.5" /> Major Update
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-0.5">
                          <span>Current: <strong className="text-zinc-300">{pkg.current}</strong></span>
                          <span>→</span>
                          <span>Wanted: <strong className="text-amber-400">{pkg.wanted}</strong></span>
                          <span>→</span>
                          <span>Latest: <strong className="text-emerald-400">{pkg.latest}</strong></span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 shrink-0 gap-1"
                      disabled={isUpgrading}
                      onClick={() => upgradePackage(projectPath, pkg.name, pkg.latest, pkg.packageType === 'devDependency')}
                    >
                      <ArrowUpCircle className="w-3 h-3 text-violet-400" />
                      Upgrade
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
