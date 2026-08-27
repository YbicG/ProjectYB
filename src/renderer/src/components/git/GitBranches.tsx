import React from 'react';
import { GitBranch as GitBranchIcon, GitCommit, GitMerge, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@renderer/lib/utils';

interface Branch {
  name: string;
  current: boolean;
}

// Standalone component that receives branches as props or manages its own state
export const GitBranches: React.FC = () => {
  // Placeholder branches until git integration is wired
  const [branches] = React.useState<Branch[]>([]);
  const currentBranch = branches.find(b => b.current)?.name || 'main';

  return (
    <Card className="bg-zinc-950 flex flex-col h-full border-zinc-800">
      <CardHeader className="p-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <GitBranchIcon className="w-4 h-4" />
            Branches
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-zinc-50">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {branches.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500">
                Select a project to view branches
              </div>
            ) : (
              branches.map(branch => {
                const isCurrent = branch.name === currentBranch;
                return (
                  <div
                    key={branch.name}
                    className={cn(
                      "group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                      isCurrent 
                        ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" 
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {isCurrent ? <GitCommit className="w-4 h-4" /> : <GitMerge className="w-4 h-4 opacity-50" />}
                      <span className="text-sm truncate font-medium">{branch.name}</span>
                    </div>
                    {!isCurrent && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
