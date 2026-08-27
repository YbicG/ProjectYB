import React, { useEffect } from 'react';
import { ProjectGrid } from '../components/dashboard/ProjectGrid';
import { RunningServices } from '../components/dashboard/RunningServices';
import { QuickActions } from '../components/dashboard/QuickActions';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';

export const DashboardPage: React.FC = () => {
  const { projects } = useProjectStore();
  const { runningServices } = useServiceStore();

  const pendingChanges = projects.filter(p => p.status === 'stopped').length; // Mock stat

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      <QuickActions />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-6 mt-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              {projects.length} Projects
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {runningServices.length} Running Services
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500" />
              {pendingChanges} Pending Changes
            </div>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <ProjectGrid />
        </div>
      </div>
      
      <RunningServices />
    </div>
  );
};
