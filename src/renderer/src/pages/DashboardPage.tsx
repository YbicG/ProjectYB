import React, { useState } from 'react';
import { Sparkles, Server, X } from 'lucide-react';
import { ProjectGrid } from '../components/dashboard/ProjectGrid';
import { RunningServices } from '../components/dashboard/RunningServices';
import { QuickActions } from '../components/dashboard/QuickActions';
import { HealthOverview } from '../components/dashboard/HealthOverview';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

export const DashboardPage: React.FC = () => {
  const { runningServices } = useServiceStore();
  const [quickActionsModal, setQuickActionsModal] = useState(false);
  const [runningServicesModal, setRunningServicesModal] = useState(false);

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* ── Left Sidebar (Widescreen Only) ── */}
      <div className="hidden xl:flex shrink-0">
        <QuickActions />
      </div>
      
      {/* ── Center Content Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-950 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Overview of your local development workspace</p>
            </div>

            {/* Portrait / Narrow screen quick triggers */}
            <div className="flex items-center gap-2 xl:hidden">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-zinc-800 gap-1.5"
                onClick={() => setQuickActionsModal(true)}
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <span>Actions</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-zinc-800 gap-1.5"
                onClick={() => setRunningServicesModal(true)}
              >
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                <span>Services</span>
                {runningServices.length > 0 && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                    {runningServices.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          <HealthOverview />
        </div>
        
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
          <ProjectGrid />
        </div>
      </div>
      
      {/* ── Right Sidebar (Ultra-Widescreen Only) ── */}
      <div className="hidden 2xl:flex shrink-0">
        <RunningServices />
      </div>

      {/* ── Mobile / Portrait Quick Actions Dialog ── */}
      <Dialog open={quickActionsModal} onOpenChange={setQuickActionsModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-sm p-4">
          <DialogHeader className="pb-2 border-b border-zinc-800">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" /> Quick Actions
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <QuickActions />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Mobile / Portrait Running Services Dialog ── */}
      <Dialog open={runningServicesModal} onOpenChange={setRunningServicesModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-md p-4">
          <DialogHeader className="pb-2 border-b border-zinc-800">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" /> Running Services ({runningServices.length})
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 max-h-[70vh] overflow-y-auto">
            <RunningServices />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
