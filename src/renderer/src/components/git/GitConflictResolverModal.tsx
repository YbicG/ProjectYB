import React, { useState, useEffect } from 'react';
import {
  GitMerge,
  AlertTriangle,
  Check,
  Split,
  FileCode,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useGitStore } from '../../stores/useGitStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

interface ConflictBlock {
  id: string;
  type: 'conflict' | 'clean';
  currentContent: string;
  incomingContent: string;
  mergedContent?: string;
  startLine: number;
}

interface ConflictedFile {
  filePath: string;
  relativePath: string;
  conflictCount: number;
  blocks: ConflictBlock[];
}

interface GitConflictResolverModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relativePath?: string;
}

export const GitConflictResolverModal: React.FC<GitConflictResolverModalProps> = ({
  open,
  onOpenChange,
  relativePath
}) => {
  const { selectedProjectId } = useGitStore();
  const { projects } = useProjectStore();

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const repoPath = selectedProject?.path || '';

  const [conflictedFiles, setConflictedFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string>(relativePath || '');
  const [parsedData, setParsedData] = useState<ConflictedFile | null>(null);
  const [blockResolutions, setBlockResolutions] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && repoPath) {
      loadConflictedFiles();
    }
  }, [open, repoPath]);

  useEffect(() => {
    if (relativePath) {
      setActiveFile(relativePath);
    }
  }, [relativePath]);

  useEffect(() => {
    if (activeFile && repoPath) {
      loadConflictFile(activeFile);
    }
  }, [activeFile, repoPath]);

  const loadConflictedFiles = async () => {
    try {
      if (window.api?.gitConflict) {
        const files = await window.api.gitConflict.getConflictedFiles(repoPath);
        setConflictedFiles(files || []);
        if (files && files.length > 0 && !activeFile) {
          setActiveFile(files[0]);
        }
      }
    } catch {}
  };

  const loadConflictFile = async (relPath: string) => {
    setIsLoading(true);
    try {
      if (window.api?.gitConflict) {
        const data = await window.api.gitConflict.parseFile(repoPath, relPath);
        setParsedData(data);

        // Pre-fill clean blocks
        const initialResolutions: Record<string, string> = {};
        if (data?.blocks) {
          for (const block of data.blocks) {
            if (block.type === 'clean') {
              initialResolutions[block.id] = block.currentContent;
            }
          }
        }
        setBlockResolutions(initialResolutions);
      }
    } catch (err: any) {
      toast.error(`Failed to parse conflicts: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChooseBlock = (blockId: string, choice: 'current' | 'incoming' | 'both', block: ConflictBlock) => {
    let resolved = '';
    if (choice === 'current') {
      resolved = block.currentContent;
    } else if (choice === 'incoming') {
      resolved = block.incomingContent;
    } else if (choice === 'both') {
      resolved = `${block.currentContent}\n${block.incomingContent}`;
    }

    setBlockResolutions((prev) => ({ ...prev, [blockId]: resolved }));
  };

  const handleSaveAndStage = async () => {
    if (!parsedData || !repoPath) return;

    // Check if all conflict blocks are resolved
    const unresolved = parsedData.blocks.some(
      (b) => b.type === 'conflict' && blockResolutions[b.id] === undefined
    );

    if (unresolved) {
      toast.error('Please resolve all conflict blocks before saving');
      return;
    }

    // Assemble final content
    const fullContent = parsedData.blocks
      .map((b) => (b.type === 'clean' ? b.currentContent : blockResolutions[b.id] || ''))
      .join('\n');

    try {
      if (window.api?.gitConflict) {
        const res = await window.api.gitConflict.resolveFile(repoPath, activeFile, fullContent);
        if (res.success) {
          toast.success(`Resolved and staged ${activeFile}!`);
          await loadConflictedFiles();
          if (conflictedFiles.length <= 1) {
            onOpenChange(false);
          }
        } else {
          toast.error(`Resolution error: ${res.error}`);
        }
      }
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-5xl h-[85vh] p-0 flex flex-col shadow-2xl overflow-hidden">
        {/* ── Modal Header ── */}
        <DialogHeader className="p-4 border-b border-zinc-800 bg-zinc-950/80 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  Visual Git Conflict Resolver
                  {parsedData && (
                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/40 text-amber-300">
                      {parsedData.conflictCount} Conflict{parsedData.conflictCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-400 font-mono">
                  {activeFile || 'Select a conflicted file'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveAndStage}
                disabled={isLoading || !parsedData}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 font-semibold gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Save &amp; Stage (git add)
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* ── Main Resolver Split ── */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conflicted Files Sidebar */}
          {conflictedFiles.length > 1 && (
            <div className="w-56 border-r border-zinc-800 bg-zinc-950/60 p-2 space-y-1 overflow-y-auto shrink-0">
              <span className="text-[10px] uppercase font-bold text-zinc-500 px-2 block mb-1">
                Conflicted Files ({conflictedFiles.length})
              </span>
              {conflictedFiles.map((file) => (
                <button
                  key={file}
                  onClick={() => setActiveFile(file)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded text-xs font-mono truncate transition-colors flex items-center gap-1.5',
                    activeFile === file
                      ? 'bg-amber-950/40 text-amber-300 border border-amber-800/60 font-semibold'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  )}
                >
                  <FileCode className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{file}</span>
                </button>
              ))}
            </div>
          )}

          {/* Conflict Block Diff & Chooser */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs bg-zinc-950/40">
            {!parsedData || parsedData.blocks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-16 space-y-2">
                <ShieldCheck className="w-8 h-8 opacity-30 text-emerald-400" />
                <p className="text-sm font-sans text-zinc-300">No active conflict markers found</p>
                <p className="text-xs font-sans text-zinc-500">This file is clean or already resolved.</p>
              </div>
            ) : (
              parsedData.blocks.map((block, idx) => {
                if (block.type === 'clean') {
                  return (
                    <div
                      key={block.id}
                      className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-850/80 text-zinc-400 whitespace-pre-wrap leading-relaxed select-text"
                    >
                      {block.currentContent}
                    </div>
                  );
                }

                const currentResolution = blockResolutions[block.id];
                const isResolved = currentResolution !== undefined;

                return (
                  <div
                    key={block.id}
                    className={cn(
                      'rounded-xl border overflow-hidden transition-all shadow-md',
                      isResolved
                        ? 'border-emerald-500/40 bg-zinc-950/90'
                        : 'border-amber-500/60 bg-zinc-950/90'
                    )}
                  >
                    {/* Block Action Header */}
                    <div className="p-2.5 border-b border-zinc-800 bg-zinc-900/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span className="font-sans font-bold text-xs text-zinc-200">
                          Conflict #{idx + 1} (Line {block.startLine})
                        </span>
                        {isResolved && (
                          <Badge variant="outline" className="text-[9px] font-sans border-emerald-500/40 text-emerald-400">
                            RESOLVED
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChooseBlock(block.id, 'current', block)}
                          className={cn(
                            'text-[11px] h-7 px-2 border-zinc-800',
                            currentResolution === block.currentContent
                              ? 'bg-blue-950/40 text-blue-300 border-blue-600'
                              : 'text-zinc-300'
                          )}
                        >
                          Accept Current (HEAD)
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChooseBlock(block.id, 'incoming', block)}
                          className={cn(
                            'text-[11px] h-7 px-2 border-zinc-800',
                            currentResolution === block.incomingContent
                              ? 'bg-purple-950/40 text-purple-300 border-purple-600'
                              : 'text-zinc-300'
                          )}
                        >
                          Accept Incoming (Theirs)
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleChooseBlock(block.id, 'both', block)}
                          className="text-[11px] h-7 px-2 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                        >
                          Accept Both
                        </Button>
                      </div>
                    </div>

                    {/* Side by Side Diff */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                      {/* Current (Ours) */}
                      <div className="p-3 bg-blue-950/10 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-blue-400 flex items-center gap-1">
                          <span>Current Changes (Ours)</span>
                        </div>
                        <pre className="text-xs text-blue-200 whitespace-pre-wrap leading-relaxed select-text">
                          {block.currentContent || <span className="italic text-zinc-600">[Empty]</span>}
                        </pre>
                      </div>

                      {/* Incoming (Theirs) */}
                      <div className="p-3 bg-purple-950/10 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-purple-400 flex items-center gap-1">
                          <span>Incoming Changes (Theirs)</span>
                        </div>
                        <pre className="text-xs text-purple-200 whitespace-pre-wrap leading-relaxed select-text">
                          {block.incomingContent || <span className="italic text-zinc-600">[Empty]</span>}
                        </pre>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
