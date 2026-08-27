import React, { useEffect } from 'react';
import { Sparkles, Copy, Check, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { toast } from 'sonner';

export const GlobalScratchpadModal: React.FC = () => {
  const { globalScratchpad, scratchpadModalOpen, loadGlobalScratchpad, saveGlobalScratchpad, setScratchpadModalOpen } = useNotesStore();
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (scratchpadModalOpen) {
      loadGlobalScratchpad();
    }
  }, [scratchpadModalOpen]);

  const handleCopy = () => {
    navigator.clipboard.writeText(globalScratchpad);
    setCopied(true);
    toast.success('Scratchpad copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={scratchpadModalOpen} onOpenChange={setScratchpadModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-2xl flex flex-col h-[520px] max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-800 space-y-0">
          <div>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Global Quick Scratchpad
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-500">
              Universal notes & clipboard scratchpad across all projects. (Auto-saved)
            </DialogDescription>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-zinc-800 gap-1"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              Copy
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 pt-2">
          <textarea
            value={globalScratchpad}
            onChange={(e) => saveGlobalScratchpad(e.target.value)}
            placeholder="Type quick notes, SQL snippets, curl commands, JSON blobs..."
            className="w-full h-full bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3 text-xs font-mono text-zinc-200 resize-none focus:outline-none leading-relaxed"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
