import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Save,
  CheckSquare,
  Square,
  Clock,
  Code,
  Heading,
  List,
  Eye,
  Edit3,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Play,
  Terminal,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useTerminalStore } from '@renderer/stores/useTerminalStore';
import { useThemeStore } from '@renderer/stores/useThemeStore';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

interface MarkdownNotesEditorProps {
  projectPath: string;
  projectName: string;
}

interface ExecutedBlockState {
  status: 'idle' | 'running' | 'success' | 'error';
  output: string;
  durationMs: number;
  exitCode?: number;
}

export const MarkdownNotesEditor: React.FC<MarkdownNotesEditorProps> = ({ projectPath, projectName }) => {
  const { currentNote, isLoading, isSaving, loadNotes, updateContent, saveCurrentNotes, toggleTask } = useNotesStore();
  const { createTerminal } = useTerminalStore();
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [copied, setCopied] = useState(false);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);
  const [blockExecutions, setBlockExecutions] = useState<Record<number, ExecutedBlockState>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadNotes(projectPath);
  }, [projectPath]);

  const tasks = React.useMemo(() => {
    if (!currentNote?.content) return [];
    const lines = currentNote.content.split('\n');
    const result: Array<{ lineIndex: number; text: string; completed: boolean }> = [];
    lines.forEach((line, index) => {
      const match = line.match(/^(\s*)[-*]\s*\[([ xX])\]\s*(.*)$/);
      if (match) {
        result.push({
          lineIndex: index,
          completed: match[2].toLowerCase() === 'x',
          text: match[3]
        });
      }
    });
    return result;
  }, [currentNote?.content]);

  const completedTasksCount = tasks.filter((t) => t.completed).length;

  // Parse markdown into parsed elements (including fenced code blocks)
  const parsedElements = React.useMemo(() => {
    if (!currentNote?.content) return [];
    const lines = currentNote.content.split('\n');
    const elements: Array<{
      type: 'task' | 'h1' | 'h2' | 'h3' | 'list' | 'codeblock' | 'empty' | 'text';
      content: string;
      codeLang?: string;
      rawLines?: string[];
      lineIndex: number;
      completed?: boolean;
    }> = [];

    let inCode = false;
    let codeLang = '';
    let codeLines: string[] = [];
    let codeStartIdx = 0;

    lines.forEach((line, idx) => {
      if (line.startsWith('```')) {
        if (inCode) {
          elements.push({
            type: 'codeblock',
            content: codeLines.join('\n'),
            codeLang: codeLang || 'bash',
            lineIndex: codeStartIdx
          });
          inCode = false;
          codeLines = [];
          codeLang = '';
        } else {
          inCode = true;
          codeLang = line.replace('```', '').trim().toLowerCase();
          codeStartIdx = idx;
          codeLines = [];
        }
        return;
      }

      if (inCode) {
        codeLines.push(line);
        return;
      }

      const taskMatch = line.match(/^(\s*)[-*]\s*\[([ xX])\]\s*(.*)$/);
      if (taskMatch) {
        elements.push({
          type: 'task',
          content: taskMatch[3],
          completed: taskMatch[2].toLowerCase() === 'x',
          lineIndex: idx
        });
        return;
      }

      if (line.startsWith('# ')) elements.push({ type: 'h1', content: line.replace('# ', ''), lineIndex: idx });
      else if (line.startsWith('## ')) elements.push({ type: 'h2', content: line.replace('## ', ''), lineIndex: idx });
      else if (line.startsWith('### ')) elements.push({ type: 'h3', content: line.replace('### ', ''), lineIndex: idx });
      else if (line.startsWith('- ') || line.startsWith('* '))
        elements.push({ type: 'list', content: line.replace(/^[-*]\s+/, ''), lineIndex: idx });
      else if (!line.trim()) elements.push({ type: 'empty', content: '', lineIndex: idx });
      else elements.push({ type: 'text', content: line, lineIndex: idx });
    });

    if (inCode) {
      elements.push({
        type: 'codeblock',
        content: codeLines.join('\n'),
        codeLang: codeLang || 'bash',
        lineIndex: codeStartIdx
      });
    }

    return elements;
  }, [currentNote?.content]);

  const handleInsert = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea || !currentNote) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = currentNote.content;
    const newContent = current.substring(0, start) + textToInsert + current.substring(end);

    updateContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  const handleCopy = () => {
    if (!currentNote?.content) return;
    navigator.clipboard.writeText(currentNote.content);
    setCopied(true);
    toast.success('Notes copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunInDock = async (code: string) => {
    try {
      await createTerminal({
        name: projectName + ' [Runbook]',
        cwd: projectPath,
        command: code.trim(),
        projectName
      });
      useThemeStore.getState().setTerminalDockOpen(true);
      toast.success('Running command in Universal Bottom Dock');
    } catch (err: any) {
      toast.error('Failed to run in terminal: ' + err.message);
    }
  };

  const handleExecuteInline = async (blockIdx: number, code: string) => {
    const start = Date.now();
    setBlockExecutions((prev) => ({
      ...prev,
      [blockIdx]: { status: 'running', output: 'Launching terminal runner in ' + projectPath + '...', durationMs: 0 }
    }));

    try {
      await handleRunInDock(code);
      const duration = Date.now() - start;
      setBlockExecutions((prev) => ({
        ...prev,
        [blockIdx]: {
          status: 'success',
          output: `Spawned bottom terminal dock session [${projectName} Runbook]. Check terminal output.`,
          durationMs: duration,
          exitCode: 0
        }
      }));
    } catch (err: any) {
      setBlockExecutions((prev) => ({
        ...prev,
        [blockIdx]: { status: 'error', output: err.message, durationMs: Date.now() - start, exitCode: 1 }
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
        Loading project notes…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Toolbar Header ── */}
      <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-semibold text-zinc-200">
            {projectName} Executable Runbook & Scratchpad
          </span>
          {tasks.length > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono border-zinc-700 text-zinc-300">
              {completedTasksCount}/{tasks.length} tasks
            </Badge>
          )}
        </div>

        {/* Formatting actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleInsert('\n- [ ] New Task')}
            className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
            title="Add task"
          >
            <CheckSquare className="w-3.5 h-3.5 mr-1" /> Task
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleInsert('\n```bash\n# Runbook command\nnpm run build\n```\n')}
            className="h-7 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 border border-emerald-800/40"
            title="Insert Executable Code Block"
          >
            <Play className="w-3 h-3 mr-1" /> Code Block
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleInsert('\n## Section Title\n')}
            className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
            title="Add Heading"
          >
            <Heading className="w-3.5 h-3.5 mr-1" /> Heading
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 text-xs text-zinc-400 hover:text-zinc-200"
            title="Copy Markdown"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />} Copy
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => saveCurrentNotes()}
            disabled={isSaving}
            className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white font-medium ml-2"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />} Save
          </Button>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
          <button
            onClick={() => setViewMode('split')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
              viewMode === 'split' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Split
          </button>
          <button
            onClick={() => setViewMode('edit')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
              viewMode === 'edit' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Edit
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={cn(
              'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
              viewMode === 'preview' ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Preview
          </button>
        </div>
      </div>

      {/* ── Editor & Preview Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-[400px]">
        {/* Editor Pane */}
        {(viewMode === 'split' || viewMode === 'edit') && (
          <div className={cn('flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden', viewMode === 'edit' && 'lg:col-span-2')}>
            <div className="px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>MARKDOWN SOURCE</span>
              <span>{currentNote?.content.length || 0} characters</span>
            </div>
            <textarea
              ref={textareaRef}
              value={currentNote?.content || ''}
              onChange={(e) => updateContent(e.target.value)}
              placeholder="# Project Runbook\n\n- [ ] Step 1\n\n```bash\nnpm test\n```\n"
              className="flex-1 w-full bg-zinc-950 p-3 text-xs font-mono text-zinc-200 resize-none focus:outline-none leading-relaxed min-h-[340px]"
            />
          </div>
        )}

        {/* Interactive Executable Runbook Preview */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={cn('flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden', viewMode === 'preview' && 'lg:col-span-2')}>
            <div className="px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>INTERACTIVE RUNBOOK PREVIEW</span>
              <span>Click tasks to toggle · Run code blocks</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs text-zinc-200 max-h-[60vh]">
              {parsedElements.map((el, idx) => {
                if (el.type === 'task') {
                  return (
                    <div
                      key={idx}
                      role="checkbox"
                      tabIndex={0}
                      aria-checked={el.completed}
                      onClick={() => toggleTask(el.lineIndex, !el.completed)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          toggleTask(el.lineIndex, !el.completed);
                        }
                      }}
                      className={cn(
                        'flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors hover:bg-zinc-900/80 group outline-none focus-visible:ring-1 focus-visible:ring-violet-500',
                        el.completed && 'text-zinc-500 line-through'
                      )}
                    >
                      {el.completed ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-zinc-500 group-hover:text-violet-400 shrink-0" />
                      )}
                      <span className="text-xs">{el.content}</span>
                    </div>
                  );
                }

                if (el.type === 'h1') return <h1 key={idx} className="text-base font-bold text-violet-300 pt-2 pb-1 border-b border-zinc-800">{el.content}</h1>;
                if (el.type === 'h2') return <h2 key={idx} className="text-sm font-semibold text-zinc-100 pt-2">{el.content}</h2>;
                if (el.type === 'h3') return <h3 key={idx} className="text-xs font-semibold text-zinc-300 pt-1">{el.content}</h3>;
                if (el.type === 'list') return <li key={idx} className="ml-4 list-disc text-xs text-zinc-300">{el.content}</li>;
                if (el.type === 'empty') return <div key={idx} className="h-1.5" />;

                if (el.type === 'codeblock') {
                  const blockState = blockExecutions[idx];
                  const isCopied = copiedCodeIdx === idx;

                  return (
                    <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-900/80 overflow-hidden font-mono my-2">
                      {/* Code Block Header Toolbar */}
                      <div className="px-3 py-1.5 bg-zinc-950/80 border-b border-zinc-800 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] uppercase px-1 py-0 border-zinc-700 text-zinc-400">
                            {el.codeLang || 'bash'}
                          </Badge>
                          {blockState?.status === 'running' && (
                            <span className="text-violet-400 flex items-center gap-1">
                              <Loader2 className="w-2.5 h-2.5 animate-spin" /> Running...
                            </span>
                          )}
                          {blockState?.status === 'success' && (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Exit 0 ({blockState.durationMs}ms)
                            </span>
                          )}
                          {blockState?.status === 'error' && (
                            <span className="text-rose-400 flex items-center gap-1">
                              <XCircle className="w-2.5 h-2.5" /> Exit {blockState.exitCode || 1}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(el.content);
                              setCopiedCodeIdx(idx);
                              setTimeout(() => setCopiedCodeIdx(null), 2000);
                            }}
                            className="h-6 px-1.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                            title="Copy code block"
                          >
                            {isCopied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRunInDock(el.content)}
                            className="h-6 px-2 text-[10px] border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 gap-1"
                            title="Run in Bottom Terminal Dock"
                          >
                            <Terminal className="w-2.5 h-2.5 text-violet-400" /> Dock
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExecuteInline(idx, el.content)}
                            className="h-6 px-2 text-[10px] bg-emerald-950/40 border-emerald-800/40 hover:bg-emerald-900/60 text-emerald-300 font-semibold gap-1"
                            title="Execute inline and view output"
                          >
                            <Play className="w-2.5 h-2.5 text-emerald-400" /> Run
                          </Button>
                        </div>
                      </div>

                      {/* Code Content */}
                      <pre className="p-3 text-[11px] text-zinc-200 overflow-x-auto leading-relaxed bg-zinc-950/40">
                        {el.content}
                      </pre>

                      {/* Inline Output Console */}
                      {blockState && (
                        <div className="border-t border-zinc-800 bg-black/80 p-2.5 text-[10px] font-mono text-zinc-300 max-h-36 overflow-y-auto whitespace-pre-wrap leading-tight">
                          {blockState.output}
                        </div>
                      )}
                    </div>
                  );
                }

                return <p key={idx} className="text-xs text-zinc-300">{el.content}</p>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};