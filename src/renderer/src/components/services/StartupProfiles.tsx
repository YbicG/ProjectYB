import React from 'react';
import { Play, Plus, Edit2, Trash } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { ScrollArea } from '../ui/scroll-area';

export const StartupProfiles: React.FC = () => {
  const { profiles: startupProfiles } = useServiceStore();

  return (
    <Card className="flex flex-col h-full bg-zinc-950 border-0 rounded-none border-l border-zinc-800">
      <CardHeader className="p-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Startup Profiles
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-50">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-3 space-y-2">
            {startupProfiles.length === 0 ? (
              <div className="text-center text-sm text-zinc-500 py-8">
                No profiles saved
              </div>
            ) : (
              startupProfiles.map(profile => (
                <div key={profile.id} className="group p-3 rounded-md bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-zinc-100">{profile.name}</span>
                    <Badge variant="secondary" className="text-[10px]">{profile.serviceIds.length} services</Badge>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1 h-7 text-xs bg-violet-600 hover:bg-violet-700">
                      <Play className="w-3 h-3 mr-1" />
                      Start All
                    </Button>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Edit2 className="w-3 h-3 text-zinc-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-red-500">
                        <Trash className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

function Badge({ children, className, ...props }: any) {
  return <div className={`inline-flex items-center rounded-full border border-transparent bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-50 ${className}`} {...props}>{children}</div>;
}
