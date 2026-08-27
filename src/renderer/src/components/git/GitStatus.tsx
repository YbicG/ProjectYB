import React from 'react';
import { FilePlus, FileMinus, FileEdit, HelpCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

import { useGitStore } from '@renderer/stores/useGitStore';

export const GitStatus: React.FC = () => {
  const { status } = useGitStore();

  const getIcon = (status: string) => {
    switch(status) {
      case 'M': return <FileEdit className="w-4 h-4 text-yellow-500" />;
      case 'A': return <FilePlus className="w-4 h-4 text-green-500" />;
      case 'D': return <FileMinus className="w-4 h-4 text-red-500" />;
      default: return <HelpCircle className="w-4 h-4 text-zinc-500" />;
    }
  };

  const renderFile = (file: any, isStaged: boolean) => (
    <div key={file.path} className="flex items-center gap-2 py-1.5 px-2 hover:bg-zinc-800/50 rounded-sm group cursor-pointer">
      <input type="checkbox" className="accent-violet-500" checked={isStaged} onChange={() => {}} />
      {getIcon(file.status)}
      <span className="text-sm text-zinc-300 flex-1 truncate">{file.path}</span>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-800 w-80">
      <div className="p-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200">Changes</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {status.staged.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-xs font-semibold text-zinc-500 uppercase">Staged Changes</span>
                <span className="text-xs text-zinc-500">{status.staged.length}</span>
              </div>
              <div className="space-y-0.5">
                {status.staged.map(f => renderFile(f, true))}
              </div>
            </div>
          )}

          {status.unstaged.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-xs font-semibold text-zinc-500 uppercase">Changes</span>
                <span className="text-xs text-zinc-500">{status.unstaged.length}</span>
              </div>
              <div className="space-y-0.5">
                {status.unstaged.map(f => renderFile(f, false))}
              </div>
            </div>
          )}

          {status.untracked.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-xs font-semibold text-zinc-500 uppercase">Untracked</span>
                <span className="text-xs text-zinc-500">{status.untracked.length}</span>
              </div>
              <div className="space-y-0.5">
                {status.untracked.map(f => renderFile(f, false))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
