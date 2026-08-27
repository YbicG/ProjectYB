import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Copy,
  Check,
  Code2,
  FolderOpen,
  FileText,
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import type { ProjectInfo } from '@renderer/types/project';

interface AiContextDialogProps {
  project: ProjectInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AiContextDialog: React.FC<AiContextDialogProps> = ({
  project,
  open,
  onOpenChange
}) => {
  const [content, setContent] = useState<string>('');
  const [filePath, setFilePath] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleGenerate = async () => {
    if (!project || !window.api?.projects?.generateAiContext) return;
    setIsLoading(true);
    try {
      const res = await window.api.projects.generateAiContext(project.path);
      if (res.success) {
        setContent(res.content);
        setFilePath(res.filePath);
        toast.success('Generated .ybicg/AI_CONTEXT.md successfully!');
      }
    } catch (err: any) {
      toast.error(`Failed to generate AI context: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (project && open) {
      handleGenerate();
    }
  }, [project?.path, open]);

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('AI Context copied to clipboard! Paste into Claude / ChatGPT / Cursor');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenVSCode = () => {
    if (filePath && window.api?.projects?.openInVSCode) {
      window.api.projects.openInVSCode(filePath);
    }
  };

  const handleOpenFolder = () => {
    if (project && window.api?.projects?.openInExplorer) {
      const ybicgPath = `${project.path}\\.ybicg`;
      window.api.projects.openInExplorer(ybicgPath);
    }
  };

  if (!project) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl w-[90vw] h-[680px] max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl">
        {/* ── Dialog Header ── */}
        <DialogHeader className="p-4 pb-3 border-b border-zinc-800 shrink-0 bg-zinc-950 pr-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold flex items-center gap-2">
                  AI Context & Override Guide
                  <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-300">
                    .ybicg/
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 font-mono truncate max-w-md">
                  {filePath || `${project.path}\\.ybicg\\AI_CONTEXT.md`}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900 gap-1.5"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Context Info Banner ── */}
        <div className="px-4 py-2 bg-violet-950/20 border-b border-violet-900/30 text-xs flex items-center justify-between text-violet-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-violet-400 shrink-0" />
            <span>
              Saved inside <code>{project.name}/.ybicg/</code> along with <code>config.json</code> and <code>notes.md</code>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenVSCode}
              className="text-[11px] hover:underline flex items-center gap-1 text-cyan-400"
            >
              Open in VS Code <ExternalLink className="w-2.5 h-2.5" />
            </button>
            <span className="text-zinc-600">·</span>
            <button
              onClick={handleOpenFolder}
              className="text-[11px] hover:underline flex items-center gap-1 text-cyan-400"
            >
              Open .ybicg folder
            </button>
          </div>
        </div>

        {/* ── Markdown Content Viewer ── */}
        <div className="flex-1 overflow-hidden p-3 bg-zinc-950">
          <ScrollArea className="h-full w-full rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <pre className="text-xs font-mono text-zinc-200 whitespace-pre-wrap leading-relaxed select-text font-normal">
              {content || 'Generating AI context...'}
            </pre>
          </ScrollArea>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="p-3 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between shrink-0">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI agents read <code>.ybicg/config.json</code> for project overrides</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              size="sm"
              onClick={handleCopy}
              className="bg-violet-600 hover:bg-violet-700 text-xs gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard!' : 'Copy AI Context'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
