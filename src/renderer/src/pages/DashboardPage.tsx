import React from 'react';
import { ProjectGrid } from '../components/dashboard/ProjectGrid';
import { RunningServices } from '../components/dashboard/RunningServices';
import { QuickActions } from '../components/dashboard/QuickActions';
import { HealthOverview } from '../components/dashboard/HealthOverview';

export const DashboardPage: React.FC = () => {
  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      <QuickActions />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Overview of your local development workspace</p>
          </div>
          <HealthOverview />
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <ProjectGrid />
        </div>
      </div>
      
      <RunningServices />
    </div>
  );
};
