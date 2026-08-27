import React, { useEffect } from 'react';
import { GitStatus } from '../components/git/GitStatus';
import { GitCommit } from '../components/git/GitCommit';
import { GitBranches } from '../components/git/GitBranches';
import { GitHubPanel } from '../components/git/GitHubPanel';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useGitStore } from '@renderer/stores/useGitStore';

export const GitPage: React.FC = () => {
  const { projects } = useProjectStore();
  const { selectedProjectId, selectProject, fetchStatus } = useGitStore();

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      const first = projects[0];
      selectProject(first.id);
      fetchStatus(first.id, first.path);
    } else if (selectedProjectId) {
      const current = projects.find(p => p.id === selectedProjectId);
      if (current) {
        fetchStatus(current.id, current.path);
      }
    }
  }, [projects, selectedProjectId]);

  const handleSelectChange = (projectId: string) => {
    selectProject(projectId);
    const p = projects.find(proj => proj.id === projectId);
    if (p) {
      fetchStatus(p.id, p.path);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Git Source Control</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Manage branches, staging, and commits</p>
        </div>
        <select
          value={selectedProjectId || ''}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-md px-3 py-1.5 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-violet-500 w-64"
        >
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
