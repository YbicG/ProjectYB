import React, { useState } from 'react';
import { Package, Trash2, ArrowUpCircle, Search, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useDependencyStore } from '@renderer/stores/useDependencyStore';
import { cn } from '@renderer/lib/utils';

interface InstalledPackagesListProps {
  projectPath: string;
}

export const InstalledPackagesList: React.FC<InstalledPackagesListProps> = ({ projectPath }) => {
  const { installedPackages, isLoadingInstalled, uninstallPackage, upgradePackage } = useDependencyStore();
  const [filterType, setFilterType] = useState<'all' | 'dependency' | 'devDependency'>('all');
  const [search, setSearch] = useState('');
  const [removingName, setRemovingName] = useState<string | null>(null);

  const filtered = installedPackages.filter((pkg) => {
    if (filterType !== 'all' && pkg.type !== filterType) return false;
    if (search && !pkg.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUninstall = async (name: string) => {
    setRemovingName(name);
    try {
      await uninstallPackage(projectPath, name);
    } finally {
      setRemovingName(null);
    }
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800 flex flex-col h-full">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-cyan-400" />
          <CardTitle className="text-xs font-semibold text-zinc-100">Installed Packages</CardTitle>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {installedPackages.length} Total
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter packages..."
              className="pl-8 h-7.5 bg-zinc-900 border-zinc-800 text-xs"
            />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded p-0.5 flex text-[10px]">
            <button
              onClick={() => setFilterType('all')}
              className={cn('px-2 py-0.5 rounded', filterType === 'all' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400')}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('dependency')}
              className={cn('px-2 py-0.5 rounded', filterType === 'dependency' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400')}
            >
              Prod
            </button>
            <button
              onClick={() => setFilterType('devDependency')}
              className={cn('px-2 py-0.5 rounded', filterType === 'devDependency' ? 'bg-zinc-800 text-white font-medium' : 'text-zinc-400')}
            >
              Dev
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoadingInstalled ? (
            <div className="p-12 text-center text-xs text-zinc-500">Loading installed packages…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-zinc-500">
              {search ? 'No packages match filter.' : 'No packages installed.'}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filtered.map((pkg) => (
                <div key={pkg.name} className="p-3 hover:bg-zinc-900/50 transition-colors flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold text-zinc-200 truncate">{pkg.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 text-zinc-400">
                      {pkg.version}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-[9px] px-1 py-0',
                        pkg.type === 'devDependency' ? 'bg-zinc-900 text-zinc-400' : 'bg-violet-950/60 text-violet-300'
                      )}
                    >
                      {pkg.type}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-950/30"
                      title="Uninstall package"
                      disabled={removingName === pkg.name}
                      onClick={() => handleUninstall(pkg.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
