import React, { useEffect, useState } from 'react';
import { GitBranch as GitBranchIcon, GitCommit, GitMerge, Plus, Trash2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@renderer/lib/utils';
import { useGitStore } from '@renderer/stores/useGitStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';

interface Branch {
  name: string;
  current: boolean;
}

export const GitBranches: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const { selectedProjectId } = useGitStore();
  const { projects } = useProjectStore();
  
  const project = projects.find(p => p.id === selectedProjectId);
  const currentBranch = branches.find(b => b.current)?.name || 'main';

  const loadBranches = async () => {
    if (!project) return;
    try {
      const result = await window.api.git.branches(project.path);
      const formattedBranches = result.all.map((name: string) => ({
        name,
        current: name === result.current
      }));
      setBranches(formattedBranches);
    } catch (error) {
      console.error('Failed to load branches', error);
    }
  };

  useEffect(() => {
    if (project) {
      loadBranches();
    } else {
      setBranches([]);
    }
  }, [project?.path]);

  const handleCheckout = async (name: string) => {
    if (!project) return;
    try {
      await window.api.git.checkout(project.path, name);
      loadBranches();
    } catch (error) {
      console.error('Failed to checkout branch', error);
    }
  };

  const handleCreate = async () => {
    if (!project) return;
    const name = prompt('Enter new branch name:');
    if (name) {
      try {
        await window.api.git.checkout(project.path, name, true);
        loadBranches();
      } catch (error) {
        console.error('Failed to create branch', error);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (!project) return;
    if (confirm(`Are you sure you want to delete branch '${name}'?`)) {
      try {
        await window.api.git.deleteBranch(project.path, name);
        loadBranches();
      } catch (error) {
        console.error('Failed to delete branch', error);
      }
    }
  };

  return (
    <Card className="bg-zinc-950 flex flex-col h-full border-zinc-800">
      <CardHeader className="p-4 border-b border-zinc-800 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <GitBranchIcon className="w-4 h-4" />
            Branches
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 text-zinc-400 hover:text-zinc-50"
            onClick={handleCreate}
            disabled={!project}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {branches.length === 0 ? (
              <div className="p-4 text-center text-sm text-zinc-500">
                {project ? 'No branches found' : 'Select a project to view branches'}
              </div>
            ) : (
              branches.map(branch => {
                const isCurrent = branch.name === currentBranch;
                return (
                  <div
                    key={branch.name}
                    onClick={() => !isCurrent && handleCheckout(branch.name)}
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-red-500"
                        onClick={(e) => handleDelete(e, branch.name)}
                      >
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
