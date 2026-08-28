import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useAiStore } from '@renderer/stores/useAiStore';
import { Bot, Sparkles, Copy, Check, Terminal, RotateCw } from 'lucide-react';
import { toast } from 'sonner';

export const AiErrorDiagnosisDialog: React.FC = () => {
  const {
    errorDiagnosisModalOpen,
    closeErrorDiagnosis,
    activeErrorLogs,
    activeErrorCommand,
    activeDiagnosis,
    isDiagnosing
  } = useAiStore();

  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (!activeDiagnosis) return;
    navigator.clipboard.writeText(activeDiagnosis);
    setCopied(true);
    toast.success('Diagnosis copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={errorDiagnosisModalOpen} onOpenChange={(open) => !open && closeErrorDiagnosis()}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-2xl max-h-[85vh] flex flex-col p-5 shadow-2xl">
        <DialogHeader className="pb-3 border-b border-zinc-800 space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>AI Crash Diagnosis</span>
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-400">
                Automated stack trace and root-cause analysis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 pt-2">
          {/* Command box */}
          {activeErrorCommand && (
            <div className="p-2.5 bg-black/60 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300">
              <span className="text-zinc-500 mr-2">$</span>
              {activeErrorCommand}
            </div>
          )}

          {/* AI Output */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <span className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Root Cause & Recommended Fix:
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                disabled={!activeDiagnosis}
                className="h-6 text-[10px] text-zinc-400 hover:text-zinc-100 gap-1"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>

            {isDiagnosing ? (
              <div className="py-8 text-center text-xs text-zinc-400 space-y-2">
                <RotateCw className="w-5 h-5 animate-spin mx-auto text-violet-400" />
                <p>Analyzing stack trace with AI...</p>
              </div>
            ) : (
              <div className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed font-sans">
                {activeDiagnosis || 'No diagnosis available.'}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-850">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={closeErrorDiagnosis}
            className="text-xs text-zinc-400"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
