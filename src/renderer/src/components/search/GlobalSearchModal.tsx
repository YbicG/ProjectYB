import React, { useEffect, useRef } from 'react';
import {
  Search,
  Code,
  FolderOpen,
  TerminalSquare,
  FileText,
  FileCode,
  Sparkles,
  Check,
  X,
  Loader2,
  FolderGit2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useSearchStore } from '@renderer/stores/useSearchStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const GlobalSearchModal: React.FC = () => {
  const {
    query,
    isModalOpen,
    isLoading,
    selectedProjectId,
    isRegex,
    isCaseSensitive,
    fileExtension,
    results,
    totalMatches,
    setQuery,
    setModalOpen,
    setSelectedProjectId,
    setIsRegex,
    setIsCaseSensitive,
    setFileExtension,
    executeSearch,
    clearSearch
  } = useSearchStore();

  const { projects } = useProjectStore();
  const { createTerminal } = useTerminalStore();
  const { setActiveTab } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isModalOpen]);

  const handleOpenVSCode = (filePath: string) => {
    if (window.api?.projects) {
      window.api.projects.openInVSCode(filePath);
      toast.success('Opened file in VSCode');
    }
  };

  const handleOpenExplorer = (filePath: string) => {
    if (window.api?.projects) {
      window.api.projects.openInExplorer(filePath);
    }
  };

  const handleOpenTerminal = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      await createTerminal({ name: project.name, cwd: project.path, projectId: project.id });
      setModalOpen(false);
      setActiveTab('terminals');
    }
  };

  const fileExtensionsList = [
    { label: 'All Files', value: 'all' },
    { label: '.ts / .tsx', value: '.tsx' },
    { label: '.py', value: '.py' },
    { label: '.json', value: '.json' },
    { label: '.env', value: '.env' },
    { label: '.rs', value: '.rs' },
    { label: '.sql', value: '.sql' }
  ];

  return (
    <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl flex flex-col h-[680px] max-h-[92vh] p-0 overflow-hidden">
        {/* ── Search Header & Controls ── */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950 space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
              <Search className="w-4 h-4 text-violet-400" />
              Global Cross-Project Search
            </DialogTitle>
            <span className="text-[11px] font-mono text-zinc-500">Ctrl+Shift+F</span>
          </div>

          {/* Search Input Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') executeSearch();
                }}
                placeholder="Search across all codebase files, configs, scripts..."
                className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 focus-visible:ring-violet-500"
              />
            </div>

            {/* Regex Toggle */}
            <button
              onClick={() => setIsRegex(!isRegex)}
              className={cn(
                'h-9 px-2.5 rounded-lg border font-mono text-xs font-bold transition-colors',
                isRegex ? 'bg-violet-950 border-violet-700 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              )}
              title="Toggle Regular Expression"
            >
              .*
            </button>

            {/* Case Sensitive Toggle */}
            <button
              onClick={() => setIsCaseSensitive(!isCaseSensitive)}
              className={cn(
                'h-9 px-2.5 rounded-lg border font-mono text-xs font-bold transition-colors',
                isCaseSensitive ? 'bg-violet-950 border-violet-700 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              )}
              title="Toggle Match Case"
            >
              Aa
            </button>

            <Button
              className="h-9 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs px-4 gap-1.5"
              onClick={executeSearch}
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search</span>
            </Button>
          </div>

          {/* Filters Row */}
          <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider">Project:</span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-7 text-xs bg-zinc-900 border border-zinc-800 rounded px-2 text-zinc-200 outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="all">All Projects ({projects.length})</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {fileExtensionsList.map((ext) => (
                <button
                  key={ext.value}
                  onClick={() => setFileExtension(ext.value)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono transition-colors whitespace-nowrap',
                    fileExtension === ext.value
                      ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  )}
                >
                  {ext.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Search Results List ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/60">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-xs text-zinc-500 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
              <p>Searching code across {projects.length} local repositories…</p>
            </div>
          ) : results.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-600 space-y-1">
              <Search className="w-8 h-8 opacity-40 mb-1" />
              <p className="text-xs">{query ? 'No matching code or files found' : 'Enter a query above to start searching'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                <span>Found <span className="text-zinc-100 font-bold font-mono">{totalMatches}</span> match{totalMatches !== 1 ? 'es' : ''} in <span className="text-zinc-100 font-bold font-mono">{results.length}</span> file{results.length !== 1 ? 's' : ''}</span>
              </div>

              {results.map((fileRes, idx) => (
                <div
                  key={`${fileRes.filePath}-${idx}`}
                  className="p-3 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-2"
                >
                  {/* File Header */}
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/70 gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="font-semibold text-xs text-zinc-100 truncate">{fileRes.relativePath}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-950 border-zinc-800 text-zinc-400 font-mono">
                        {fileRes.projectName}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-zinc-400 hover:text-zinc-200 px-2"
                        onClick={() => handleOpenVSCode(fileRes.filePath)}
                        title="Open file in VSCode"
                      >
                        <Code className="w-3 h-3 mr-1" /> VSCode
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-zinc-400 hover:text-zinc-200 px-2"
                        onClick={() => handleOpenExplorer(fileRes.filePath)}
                        title="Open in File Explorer"
                      >
                        <FolderOpen className="w-3 h-3 mr-1" /> Folder
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] text-zinc-400 hover:text-zinc-200 px-2"
                        onClick={() => handleOpenTerminal(fileRes.projectId)}
                        title="Open Terminal in project"
                      >
                        <TerminalSquare className="w-3 h-3 mr-1" /> Terminal
                      </Button>
                    </div>
                  </div>

                  {/* Line Matches */}
                  <div className="space-y-1">
                    {fileRes.matches.map((m, mIdx) => (
                      <div
                        key={mIdx}
                        onClick={() => handleOpenVSCode(fileRes.filePath)}
                        className="flex items-start gap-2 p-1.5 rounded bg-zinc-950 hover:bg-zinc-900 border border-zinc-800/40 text-xs font-mono cursor-pointer transition-colors"
                      >
                        <span className="text-[10px] text-zinc-500 w-8 text-right shrink-0 select-none">:{m.lineNumber}</span>
                        <span className="text-zinc-300 truncate font-mono text-[11px]">{m.lineContent}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
