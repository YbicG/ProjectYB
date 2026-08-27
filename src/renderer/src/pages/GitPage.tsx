import React from 'react';
import { GitStatus } from '../components/git/GitStatus';
import { GitCommit } from '../components/git/GitCommit';
import { GitBranches } from '../components/git/GitBranches';
import { GitHubPanel } from '../components/git/GitHubPanel';
import { useProjectStore } from '@renderer/stores/useProjectStore';

export const GitPage: React.FC = () => {
  const { projects } = useProjectStore();
  const selectedProject = projects[0]; // mock selection

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Git Source Control</h1>
        <select className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 w-64">
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <GitStatus />
        
        <div className="flex-1 p-6 overflow-y-auto bg-zinc-950/50 space-y-6">
          <GitCommit />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-80">
            <GitBranches />
            <GitHubPanel />
          </div>
        </div>
      </div>
    </div>
  );
};
