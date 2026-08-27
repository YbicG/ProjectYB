import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { useGitStore } from '@renderer/stores/useGitStore';

export const GitCommit: React.FC = () => {
  const [message, setMessage] = useState('');
  const [stageAll, setStageAll] = useState(true);
  const { commit } = useGitStore();

  const handleCommit = () => {
    if (message.trim()) {
      commit(message, stageAll);
      setMessage('');
    }
  };

  return (
    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg shadow-sm">
      <h3 className="text-sm font-semibold mb-3 text-zinc-200">Commit Changes</h3>
      
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Commit message (e.g., feat: add new component)"
        className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-md p-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none mb-3"
      />
      
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
          <input 
            type="checkbox" 
            checked={stageAll} 
            onChange={(e) => setStageAll(e.target.checked)}
            className="accent-violet-500 rounded bg-zinc-900 border-zinc-800"
          />
          Stage all changes
        </label>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            disabled={!message.trim()}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Commit
          </Button>
          <Button 
            variant="default" 
            size="sm"
            disabled={!message.trim()}
            onClick={handleCommit}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Commit & Push
          </Button>
        </div>
      </div>
    </div>
  );
};
