import React, { useState } from 'react';
import {
  Sparkles,
  TerminalSquare,
  Copy,
  Check,
  Plus,
  Trash2,
  Play,
  Search,
  Tag,
  Code2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useSnippetStore } from '@renderer/stores/useSnippetStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { CommandSnippet } from '@renderer/types/snippet';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const SnippetVaultModal: React.FC = () => {
  const {
    snippets,
    searchQuery,
    selectedCategory,
    isModalOpen,
    activeSnippetToRun,
    setSearchQuery,
    setSelectedCategory,
    setModalOpen,
    setActiveSnippetToRun,
    addCustomSnippet,
    deleteCustomSnippet,
    interpolateCommand
  } = useSnippetStore();

  const { createTerminal, activeTerminalId, terminals } = useTerminalStore();
  const { setActiveTab } = useAppStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // New snippet form state
  const [customTitle, setCustomTitle] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customCommand, setCustomCommand] = useState('');
  const [customCategory, setCustomCategory] = useState<'git' | 'docker' | 'npm' | 'python' | 'database' | 'system' | 'custom'>('custom');

  const categories = [
    { label: 'All', value: 'all' },
    { label: 'Git', value: 'git' },
    { label: 'Docker', value: 'docker' },
    { label: 'Node / NPM', value: 'npm' },
    { label: 'Python', value: 'python' },
    { label: 'Database', value: 'database' },
    { label: 'Custom', value: 'custom' }
  ];

  const filteredSnippets = snippets.filter((s) => {
    const matchesCat = selectedCategory === 'all' || s.category === selectedCategory || (selectedCategory === 'custom' && s.isCustom);
    const matchesSearch =
      !searchQuery.trim() ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCopy = (snippet: CommandSnippet) => {
    navigator.clipboard.writeText(snippet.command);
    setCopiedId(snippet.id);
    toast.success('Snippet copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePromptRun = (snippet: CommandSnippet) => {
    if (snippet.parameters && snippet.parameters.length > 0) {
      const initial: Record<string, string> = {};
      snippet.parameters.forEach((p) => {
        initial[p.key] = p.defaultValue;
      });
      setParamValues(initial);
      setActiveSnippetToRun(snippet);
    } else {
      executeInTerminal(snippet.command);
    }
  };

  const executeInTerminal = async (finalCommand: string) => {
    if (activeTerminalId && window.api?.terminal) {
      window.api.terminal.write(activeTerminalId, `${finalCommand}\r`);
      toast.success('Command sent to active terminal');
      setModalOpen(false);
      setActiveSnippetToRun(null);
      setActiveTab('terminals');
    } else {
      await createTerminal({ name: 'Command Runner', cwd: 'D:\\Code' });
      // Give terminal a brief moment to initialize before writing
      setTimeout(() => {
        const latestId = useTerminalStore.getState().activeTerminalId;
        if (latestId && window.api?.terminal) {
          window.api.terminal.write(latestId, `${finalCommand}\r`);
        }
      }, 400);
      toast.success('Command running in new terminal');
      setModalOpen(false);
      setActiveSnippetToRun(null);
      setActiveTab('terminals');
    }
  };

  const handleSaveCustom = async () => {
    if (!customTitle.trim() || !customCommand.trim()) {
      toast.error('Title and command are required');
      return;
    }

    await addCustomSnippet({
      title: customTitle.trim(),
      description: customDesc.trim() || 'Custom command snippet',
      command: customCommand.trim(),
      category: customCategory,
      tags: ['custom', customCategory]
    });

    toast.success('Custom snippet added to vault');
    setIsAddingCustom(false);
    setCustomTitle('');
    setCustomDesc('');
    setCustomCommand('');
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-w-3xl flex flex-col h-[680px] max-h-[92vh] p-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950 space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2 text-zinc-200">
              <Code2 className="w-4 h-4 text-violet-400" />
              Command Snippets & Script Vault
            </DialogTitle>

            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-violet-500/40 text-violet-300 hover:bg-violet-950/30 gap-1"
              onClick={() => setIsAddingCustom(!isAddingCustom)}
            >
              <Plus className="w-3.5 h-3.5" />
              {isAddingCustom ? 'Cancel' : 'New Snippet'}
            </Button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scripts, Docker one-liners, Git commands..."
                className="pl-9 h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 focus-visible:ring-violet-500"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                    selectedCategory === cat.value
                      ? 'bg-violet-600 text-white font-semibold'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Custom Snippet Add Form ── */}
        {isAddingCustom && (
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/60 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Snippet Title (e.g. Purge Redis Cache)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="h-8 bg-zinc-950 border-zinc-700 text-xs font-medium text-zinc-100"
              />
              <select
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value as any)}
                className="h-8 bg-zinc-950 border border-zinc-700 rounded-md text-xs text-zinc-200 px-2 outline-none"
              >
                <option value="custom">Category: Custom</option>
                <option value="git">Category: Git</option>
                <option value="docker">Category: Docker</option>
                <option value="npm">Category: Node/NPM</option>
                <option value="python">Category: Python</option>
                <option value="database">Category: Database</option>
                <option value="system">Category: System</option>
              </select>
            </div>

            <Input
              placeholder="Description (optional)"
              value={customDesc}
              onChange={(e) => setCustomDesc(e.target.value)}
              className="h-8 bg-zinc-950 border-zinc-700 text-xs text-zinc-200"
            />

            <textarea
              placeholder="Command (supports {{param_name}} placeholders)&#10;e.g. docker run -d -p {{port}}:80 nginx"
              value={customCommand}
              onChange={(e) => setCustomCommand(e.target.value)}
              className="w-full h-20 bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs font-mono text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
            />

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setIsAddingCustom(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 bg-violet-600 hover:bg-violet-700 text-xs" onClick={handleSaveCustom}>
                Save Snippet
              </Button>
            </div>
          </div>
        )}

        {/* ── Snippets List ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/60">
          {filteredSnippets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-600 space-y-1">
              <Code2 className="w-8 h-8 opacity-40 mb-1" />
              <p className="text-xs">No matching command snippets found</p>
            </div>
          ) : (
            filteredSnippets.map((snippet) => (
              <div
                key={snippet.id}
                className="p-3.5 rounded-lg bg-zinc-900/70 border border-zinc-800 space-y-2.5 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-100">{snippet.title}</span>
                    <Badge variant="outline" className="text-[9px] uppercase font-mono px-1.5 py-0 border-zinc-700 text-zinc-400">
                      {snippet.category}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {snippet.isCustom && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-zinc-500 hover:text-red-400"
                        onClick={() => deleteCustomSnippet(snippet.id)}
                        title="Delete snippet"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800 px-2 gap-1"
                      onClick={() => handleCopy(snippet)}
                    >
                      {copiedId === snippet.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </Button>

                    <Button
                      size="sm"
                      className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white px-2.5 gap-1 font-semibold"
                      onClick={() => handlePromptRun(snippet)}
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Run
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400">{snippet.description}</p>

                <div className="p-2 rounded bg-zinc-950 border border-zinc-800/80 font-mono text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap select-text">
                  {snippet.command}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Parameter Interpolation Dialog ── */}
        {activeSnippetToRun && (
          <div className="p-4 border-t border-zinc-800 bg-zinc-950 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">
                Configure Parameters for "{activeSnippetToRun.title}"
              </span>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-zinc-400" onClick={() => setActiveSnippetToRun(null)}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {activeSnippetToRun.parameters?.map((param) => (
                <div key={param.key} className="space-y-1">
                  <label className="text-[10px] text-zinc-400 font-mono">{param.label} ({`{{${param.key}}}`})</label>
                  <Input
                    value={paramValues[param.key] || ''}
                    onChange={(e) => setParamValues({ ...paramValues, [param.key]: e.target.value })}
                    className="h-7 text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-100"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-zinc-500 truncate max-w-md">
                Preview: {interpolateCommand(activeSnippetToRun.command, paramValues)}
              </span>

              <Button
                size="sm"
                className="h-7 bg-violet-600 hover:bg-violet-700 text-white text-xs px-4 gap-1.5"
                onClick={() => executeInTerminal(interpolateCommand(activeSnippetToRun.command, paramValues))}
              >
                <Play className="w-3 h-3 fill-current" /> Execute in Terminal
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
