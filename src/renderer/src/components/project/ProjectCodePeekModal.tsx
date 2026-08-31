import React, { useState, useEffect } from 'react';
import {
  FileCode,
  FolderOpen,
  Save,
  Copy,
  Check,
  RotateCw,
  Code,
  FileText,
  Lock,
  Package,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { ProjectInfo } from '@renderer/types/project';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

interface ProjectCodePeekModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectInfo | null;
}

interface PeekFile {
  name: string;
  relativePath: string;
  language: string;
  icon: React.ComponentType<{ className?: string }>;
}

const COMMON_FILES: PeekFile[] = [
  { name: 'package.json', relativePath: 'package.json', language: 'json', icon: Package },
  { name: 'services.json', relativePath: '.ybicg/services.json', language: 'json', icon: Layers },
  { name: '.env', relativePath: '.env', language: 'ini', icon: Lock },
  { name: '.env.example', relativePath: '.env.example', language: 'ini', icon: Lock },
  { name: 'README.md', relativePath: 'README.md', language: 'markdown', icon: FileText },
  { name: 'tsconfig.json', relativePath: 'tsconfig.json', language: 'json', icon: FileCode },
  { name: 'vite.config.ts', relativePath: 'vite.config.ts', language: 'typescript', icon: Code },
  { name: 'Cargo.toml', relativePath: 'Cargo.toml', language: 'ini', icon: Package },
  { name: 'requirements.txt', relativePath: 'requirements.txt', language: 'plaintext', icon: Package },
  { name: 'go.mod', relativePath: 'go.mod', language: 'plaintext', icon: Package },
  { name: 'Dockerfile', relativePath: 'Dockerfile', language: 'dockerfile', icon: FileCode }
];

export const ProjectCodePeekModal: React.FC<ProjectCodePeekModalProps> = ({
  open,
  onOpenChange,
  project
}) => {
  const [availableFiles, setAvailableFiles] = useState<PeekFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<PeekFile | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !project) return;

    const detectFiles = async () => {
      const detected: PeekFile[] = [];
      for (const item of COMMON_FILES) {
        try {
          const filePath = (project.path + '/' + item.relativePath).replace(/\\/g, '/');
          if (window.api?.env?.read) {
            const res = await window.api.env.read(filePath);
            if (res && (res.raw !== undefined || (res.entries && res.entries.length > 0))) {
              detected.push(item);
            }
          }
        } catch {}
      }

      const finalList = detected.length > 0 ? detected : COMMON_FILES.slice(0, 4);
      setAvailableFiles(finalList);
      loadFile(finalList[0]);
    };

    detectFiles();
  }, [open, project?.id]);

  const loadFile = async (file: PeekFile) => {
    if (!project) return;
    setSelectedFile(file);
    setIsLoading(true);

    try {
      const filePath = (project.path + '/' + file.relativePath).replace(/\\/g, '/');
      if (window.api?.env?.read) {
        const res = await window.api.env.read(filePath);
        if (res && res.raw !== undefined) {
          setFileContent(res.raw);
          setOriginalContent(res.raw);
        } else {
          setFileContent('// File not found or empty: ' + file.relativePath);
          setOriginalContent('');
        }
      }
    } catch {
      setFileContent('// Could not read ' + file.relativePath);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!project || !selectedFile) return;
    setIsSaving(true);
    try {
      const filePath = (project.path + '/' + selectedFile.relativePath).replace(/\\/g, '/');
      if (window.api?.env?.write) {
        await window.api.env.write(filePath, [], fileContent);
        setOriginalContent(fileContent);
        toast.success('Saved ' + selectedFile.name + ' successfully');
      }
    } catch (err: any) {
      toast.error('Save error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const isModified = fileContent !== originalContent;
  const lineCount = fileContent.split('\n').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 bg-zinc-950 border-zinc-800 text-zinc-50 flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-violet-600/15 border border-violet-500/30 text-violet-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-bold text-zinc-100">
                  Quick Code Peek
                </DialogTitle>
                {project && (
                  <Badge variant="outline" className="text-[10px] font-mono border-violet-500/40 text-violet-300">
                    {project.name}
                  </Badge>
                )}
                {selectedFile && (
                  <span className="text-xs text-zinc-400 font-mono">
                    / {selectedFile.relativePath}
                  </span>
                )}
                {isModified && (
                  <Badge className="text-[9px] bg-amber-950 text-amber-300 border-amber-700/60 font-mono">
                    Modified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 text-xs border-zinc-800 hover:bg-zinc-800 text-zinc-300 gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>Copy</span>
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isModified || isSaving}
              className={cn(
                'h-7 text-xs gap-1.5',
                isModified ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-zinc-800 text-zinc-400'
              )}
            >
              {isSaving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save</span>
            </Button>
          </div>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* File Picker Sidebar */}
          <div className="w-60 border-r border-zinc-800/80 bg-zinc-950/80 flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-zinc-800/60 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
              Project Files
            </div>
            <ScrollArea className="flex-1 p-2">
              <div className="space-y-1">
                {availableFiles.map((file) => {
                  const isSelected = selectedFile?.relativePath === file.relativePath;
                  const Icon = file.icon;
                  return (
                    <button
                      key={file.relativePath}
                      onClick={() => loadFile(file)}
                      className={cn(
                        'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-mono text-left transition-all',
                        isSelected
                          ? 'bg-violet-950/50 text-violet-200 border border-violet-700/60 font-semibold'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 border border-transparent'
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-violet-400' : 'text-zinc-500')} />
                      <span className="truncate">{file.name}</span>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Editor Container with Line Numbers */}
          <div className="flex-1 flex flex-col bg-zinc-950 overflow-hidden relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-xs font-mono text-zinc-500">
                <RotateCw className="w-4 h-4 animate-spin mr-2 text-violet-400" /> Loading file...
              </div>
            ) : (
              <div className="flex-1 flex overflow-hidden">
                {/* Line number gutter */}
                <div className="w-12 py-3 px-2 text-right bg-zinc-950/90 border-r border-zinc-800/60 font-mono text-[11px] text-zinc-600 select-none overflow-hidden">
                  {Array.from({ length: Math.max(1, lineCount) }).map((_, i) => (
                    <div key={i} className="leading-5">
                      {i + 1}
                    </div>
                  ))}
                </div>

                {/* Textarea Code Input */}
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                  spellCheck={false}
                  className="flex-1 p-3 bg-zinc-950 font-mono text-xs text-zinc-200 leading-5 resize-none focus:outline-none overflow-auto border-none selection:bg-violet-900 selection:text-white whitespace-pre tab-[2]"
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
