import React, { useState, useMemo, useDeferredValue } from 'react';
import { Search, X, FolderGit2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ProjectCard } from './ProjectCard';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { cn } from '@renderer/lib/utils';

const TYPE_FILTERS = ['All', 'Node', 'Python', 'Godot', 'Git', 'Rust', 'Go', '.NET', 'Docs'] as const;
type TypeFilter = typeof TYPE_FILTERS[number];

export const ProjectGrid: React.FC = () => {
  const { projects, isScanning, pinnedProjectIds, searchQuery, setSearchQuery } = useProjectStore();
  const [activeType, setActiveType] = useState<TypeFilter>('All');
  const deferredSearch = useDeferredValue(searchQuery);

  const filteredProjects = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();
    return projects
      .filter((p) => {
        const matchesSearch =
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(q))) ||
          (p.subprojects && p.subprojects.some((s) => s.name.toLowerCase().includes(q)));

        let matchesType = activeType === 'All';
        if (activeType === '.NET') {
          matchesType = p.type === 'dotnet';
        } else if (activeType === 'Docs') {
          matchesType = p.type === 'docs' || Boolean(p.subprojects?.some((s) => s.type === 'docs' || s.name.toLowerCase().includes('doc')));
        } else if (activeType !== 'All') {
          matchesType = p.type?.toLowerCase() === activeType.toLowerCase() || Boolean(p.subprojects?.some((s) => s.type?.toLowerCase() === activeType.toLowerCase()));
        }

        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const aPinned = pinnedProjectIds.includes(a.id);
        const bPinned = pinnedProjectIds.includes(b.id);
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [projects, deferredSearch, activeType, pinnedProjectIds]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Search Bar & Stats Header ── */}
      <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search projects by name, category, tag, or subfolder..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 focus-visible:ring-violet-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-100 p-0.5"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-mono text-zinc-400 border-zinc-800 bg-zinc-900">
            Showing <span className="text-zinc-100 font-bold ml-1 mr-1">{filteredProjects.length}</span> of {projects.length}
          </Badge>
        </div>
      </div>

      {/* ── Type Filter Pills ── */}
      <div className="flex items-center gap-1.5 mb-4 overflow-x-auto no-scrollbar flex-nowrap shrink-0">
        {TYPE_FILTERS.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap',
              activeType === type
                ? 'bg-violet-600 border-violet-600 text-white font-semibold shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* ── Projects Grid Viewport ── */}
      {isScanning ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 space-y-3 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 bg-zinc-800 rounded" />
                <div className="h-4 w-12 bg-zinc-800 rounded" />
              </div>
              <div className="h-3 w-48 bg-zinc-800/60 rounded" />
              <div className="flex gap-1 pt-2">
                <div className="h-5 w-16 bg-zinc-800/50 rounded" />
                <div className="h-5 w-16 bg-zinc-800/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-zinc-600 space-y-2">
          <FolderGit2 className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium text-zinc-400">No matching projects found</p>
          <p className="text-xs text-zinc-500">Try clearing filters or search query</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project as any} />
          ))}
        </div>
      )}
    </div>
  );
};
