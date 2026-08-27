import React, { useState } from 'react';
import { Sparkles, Trash2, Package, Terminal, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useDiskStore } from '@renderer/stores/useDiskStore';

export const GlobalCacheCleaner: React.FC = () => {
  const { cleanGlobalCache, isCleaning } = useDiskStore();
  const [cleaningTarget, setCleaningTarget] = useState<string | null>(null);

  const handleClean = async (type: 'pnpm' | 'npm' | 'cargo' | 'pip') => {
    setCleaningTarget(type);
    try {
      await cleanGlobalCache(type);
    } finally {
      setCleaningTarget(null);
    }
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="py-3 px-4 border-b border-zinc-800 flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <CardTitle className="text-xs font-semibold text-zinc-100">Global Package Manager Caches</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* pnpm Store */}
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200">
              <Package className="w-3.5 h-3.5 text-amber-400" /> pnpm Store
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Prunes unreferenced tarballs from global content store</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-zinc-800 hover:bg-zinc-800 w-full gap-1"
            disabled={isCleaning}
            onClick={() => handleClean('pnpm')}
          >
            {cleaningTarget === 'pnpm' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Prune Store
          </Button>
        </div>

        {/* npm Cache */}
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200">
              <Package className="w-3.5 h-3.5 text-red-400" /> npm Cache
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Cleans npm ~/.npm global cache folder</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-zinc-800 hover:bg-zinc-800 w-full gap-1"
            disabled={isCleaning}
            onClick={() => handleClean('npm')}
          >
            {cleaningTarget === 'npm' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Clean Cache
          </Button>
        </div>

        {/* Cargo Cache */}
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200">
              <Terminal className="w-3.5 h-3.5 text-orange-400" /> Cargo Cache
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Removes unreferenced Rust crate tarballs</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-zinc-800 hover:bg-zinc-800 w-full gap-1"
            disabled={isCleaning}
            onClick={() => handleClean('cargo')}
          >
            {cleaningTarget === 'cargo' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Clean Cargo
          </Button>
        </div>

        {/* Pip Cache */}
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-2">
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200">
              <Package className="w-3.5 h-3.5 text-blue-400" /> Pip Cache
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">Purges cached Python wheels from disk</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-zinc-800 hover:bg-zinc-800 w-full gap-1"
            disabled={isCleaning}
            onClick={() => handleClean('pip')}
          >
            {cleaningTarget === 'pip' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            Purge Pip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
