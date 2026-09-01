import React, { useState } from 'react';
import { Search, Plus, Package, ExternalLink, Loader2, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useDependencyStore } from '@renderer/stores/useDependencyStore';

interface PackageInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectPath: string;
}

export const PackageInstallModal: React.FC<PackageInstallModalProps> = ({ open, onOpenChange, projectPath }) => {
  const { searchResults, isSearching, searchPackages, installPackage } = useDependencyStore();
  const [query, setQuery] = useState('');
  const [isDev, setIsDev] = useState(false);
  const [installingName, setInstallingName] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchPackages(query.trim());
    }
  };

  const handleInstall = async (packageName: string) => {
    setInstallingName(packageName);
    try {
      const ok = await installPackage(projectPath, packageName, isDev);
      if (ok) {
        onOpenChange(false);
      }
    } finally {
      setInstallingName(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-violet-400" /> Search & Install Packages
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Search NPM registry and install packages directly into your project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex items-center gap-2 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search packages (e.g. lucide-react, zustand, tailwindcss)..."
              className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-xs"
              autoFocus
            />
          </div>
          <Button type="submit" size="sm" className="bg-violet-600 hover:bg-violet-700 h-9 px-4 text-xs">
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </Button>
        </form>

        <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isDev}
              onChange={(e) => setIsDev(e.target.checked)}
              className="rounded border-zinc-800 bg-zinc-900 text-violet-600 focus:ring-0"
            />
            <span>Install as Dev Dependency (<code className="text-violet-400 font-mono">-D</code>)</span>
          </label>
        </div>

        <div className="h-72 border border-zinc-800 rounded bg-zinc-900/30 overflow-hidden">
          <ScrollArea className="h-full">
            {isSearching ? (
              <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                Querying NPM registry…
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-12 text-center text-xs text-zinc-500">
                {query ? 'No packages found matching your query.' : 'Type a package name and press Search.'}
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {searchResults.map((pkg) => (
                  <div key={pkg.name} className="p-3 hover:bg-zinc-900/60 transition-colors space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-zinc-100">{pkg.name}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 font-mono text-zinc-400">
                            v{pkg.version}
                          </Badge>
                          {pkg.author && (
                            <span className="text-[10px] text-zinc-500">by {pkg.author}</span>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{pkg.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {pkg.links?.npm && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-zinc-400 hover:text-white"
                            onClick={() => window.open(pkg.links!.npm, '_blank')}
                            title="View on npmjs.com"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="h-7 bg-violet-600 hover:bg-violet-700 text-xs gap-1 px-2.5"
                          disabled={installingName === pkg.name}
                          onClick={() => handleInstall(pkg.name)}
                        >
                          {installingName === pkg.name ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3" />
                          )}
                          Install
                        </Button>
                      </div>
                    </div>

                    {pkg.keywords && pkg.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {pkg.keywords.slice(0, 4).map((kw, kwIdx) => (
                          <span key={`${kw}-${kwIdx}`} className="text-[9px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                            <Tag className="w-2 h-2 text-zinc-500" /> {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
