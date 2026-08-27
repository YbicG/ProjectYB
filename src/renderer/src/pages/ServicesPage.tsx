import React from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ServiceCard } from '../components/services/ServiceCard';
import { StartupProfiles } from '../components/services/StartupProfiles';
import { useServiceStore } from '@renderer/stores/useServiceStore';

export const ServicesPage: React.FC = () => {
  const { runningServices, services, stopService, startService } = useServiceStore();

  const handleStopAll = () => {
    runningServices.forEach(service => stopService(service.id));
  };

  const handleStartAll = () => {
    services.forEach(service => {
      startService(service.projectId, service.projectName, {
        id: service.id,
        name: service.name,
        command: service.command,
        autoRestart: service.autoRestart
      });
    });
  };

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Services</h1>
            <p className="text-sm text-zinc-400 mt-1">{runningServices.length} running services</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-400" onClick={handleStopAll}>
              <Square className="w-4 h-4 mr-2" />
              Stop All
            </Button>
            <Button className="bg-violet-600 hover:bg-violet-700" onClick={handleStartAll}>
              <Play className="w-4 h-4 mr-2" />
              Start All
            </Button>
          </div>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto bg-zinc-950/50">
          {runningServices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <p>No services are currently running.</p>
              <p className="text-sm mt-2">Start a service from a project or use a startup profile.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {runningServices.map(service => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="w-80 border-l border-zinc-800">
        <StartupProfiles />
      </div>
    </div>
  );
};
