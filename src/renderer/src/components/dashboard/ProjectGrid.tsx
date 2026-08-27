import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/input';
import { ProjectCard } from './ProjectCard';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { cn } from '@renderer/lib/utils';

const TYPE_FILTERS = ['All', 'Node', 'Python', 'Godot', 'Git', 'Rust', 'Go', '.NET', 'Docs'] as const;
type TypeFilter = typeof TYPE_FILTERS[number];

export const ProjectGrid: React.FC = () => {
  const { projects, isScanning, pinnedProjectIds } = useProjectStore();
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState<TypeFilter>('All');

  const filteredProjects = projects
    .filter(p => {
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        (p.tags && p.tags.some(t => t.toLowerCase().includes(q))) ||
        (p.subprojects && p.subprojects.some(s => s.name.toLowerCase().includes(q)));
      
      let matchesType = activeType === 'All';
      if (activeType === '.NET') {
        matchesType = p.type === 'dotnet';
      } else if (activeType === 'Docs') {
        matchesType = p.type === 'docs' || Boolean(p.subprojects?.some(s => s.type === 'docs' || s.name.toLowerCase().includes('doc')));
      } else if (activeType !== 'All') {
        matchesType = p.type?.toLowerCase() === activeType.toLowerCase() || Boolean(p.subprojects?.some(s => s.type?.toLowerCase() === activeType.toLowerCase()));
      }

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      const aPinned = pinnedProjectIds.includes(a.id);
      const bPinned = pinnedProjectIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            placeholder="Search projects..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800"
          />
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {TYPE_FILTERS.map(type => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
              activeType === type
                ? "bg-violet-600 border-violet-600 text-white"
                : "bg-transparent border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {isScanning ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-48 rounded-lg border border-zinc-800 bg-zinc-900/50 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
          <p>No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project as any} />
          ))}
        </div>
      )}
    </div>
  );
};
