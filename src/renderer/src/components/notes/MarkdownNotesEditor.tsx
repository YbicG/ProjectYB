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
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

interface MarkdownNotesEditorProps {
  projectPath: string;
  projectName: string;
}

export const MarkdownNotesEditor: React.FC<MarkdownNotesEditorProps> = ({ projectPath, projectName }) => {
  const { currentNote, isLoading, isSaving, loadNotes, updateContent, saveCurrentNotes, toggleTask } = useNotesStore();
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadNotes(projectPath);
  }, [projectPath]);

  // Parse tasks from markdown content
  const tasks = React.useMemo(() => {
    if (!currentNote?.content) return [];
    const lines = currentNote.content.split('\n');
    const result: Array<{ lineIndex: number; text: string; completed: boolean }> = [];
    lines.forEach((line, index) => {
      const match = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
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
            {projectName} Scratchpad & Tasks
          </span>
          {tasks.length > 0 && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] font-mono',
                completedTasksCount === tasks.length
                  ? 'border-emerald-800 text-emerald-400 bg-emerald-950/30'
                  : 'border-zinc-800 text-zinc-400'
              )}
            >
              {completedTasksCount}/{tasks.length} tasks completed
            </Badge>
          )}
          {currentNote?.filePath && (
            <span className="text-[10px] text-zinc-500 font-mono hidden md:inline truncate max-w-xs">
              📁 .projectyb-notes.md
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Insert Actions */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-1.5 text-zinc-400 hover:text-zinc-200"
              onClick={() => handleInsert('\n- [ ] ')}
              title="Insert TODO Task"
            >
              <CheckSquare className="w-3 h-3 mr-1 text-violet-400" /> Task
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-1.5 text-zinc-400 hover:text-zinc-200"
              onClick={() => handleInsert(`\n## 📅 ${new Date().toLocaleDateString()} — `)}
              title="Insert Date Stamp"
            >
              <Clock className="w-3 h-3 mr-1 text-cyan-400" /> Timestamp
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[11px] px-1.5 text-zinc-400 hover:text-zinc-200"
              onClick={() => handleInsert('\n```typescript\n\n```\n')}
              title="Insert Code Block"
            >
              <Code className="w-3 h-3 mr-1 text-amber-400" /> Code
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded p-0.5 text-xs">
            <button
              onClick={() => setViewMode('split')}
              className={cn('px-2 py-0.5 rounded text-[11px]', viewMode === 'split' ? 'bg-zinc-800 text-white' : 'text-zinc-400')}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('edit')}
              className={cn('px-2 py-0.5 rounded text-[11px]', viewMode === 'edit' ? 'bg-zinc-800 text-white' : 'text-zinc-400')}
            >
              Edit
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn('px-2 py-0.5 rounded text-[11px]', viewMode === 'preview' ? 'bg-zinc-800 text-white' : 'text-zinc-400')}
            >
              Preview
            </button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-zinc-200"
            onClick={handleCopy}
            title="Copy notes"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </Button>

          <Button
            size="sm"
            className={cn(
              'h-7 text-xs gap-1 font-semibold transition-all',
              currentNote?.isDirty
                ? 'bg-violet-600 hover:bg-violet-700 text-white animate-pulse'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            )}
            disabled={isSaving}
            onClick={() => saveCurrentNotes()}
          >
            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            {currentNote?.isDirty ? 'Save Notes *' : 'Saved'}
          </Button>
        </div>
      </div>

      {/* ── Editor & Preview Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-[360px]">
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
              placeholder="# Project Notes & Ideas&#10;&#10;- [ ] Task 1&#10;- [ ] Task 2&#10;"
              className="flex-1 w-full bg-zinc-950 p-3 text-xs font-mono text-zinc-200 resize-none focus:outline-none leading-relaxed min-h-[300px]"
            />
          </div>
        )}

        {/* Live Interactive Task / Markdown Preview Pane */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={cn('flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden', viewMode === 'preview' && 'lg:col-span-2')}>
            <div className="px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>INTERACTIVE PREVIEW</span>
              <span>Click tasks to toggle</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs text-zinc-200">
              {currentNote?.content.split('\n').map((line, idx) => {
                const taskMatch = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
                if (taskMatch) {
                  const completed = taskMatch[2].toLowerCase() === 'x';
                  const text = taskMatch[3];
                  return (
                    <div
                      key={idx}
                      role="checkbox"
                      tabIndex={0}
                      aria-checked={completed}
                      onClick={() => toggleTask(idx, !completed)}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          e.preventDefault();
                          toggleTask(idx, !completed);
                        }
                      }}
                      className={cn(
                        'flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors hover:bg-zinc-900/80 group outline-none focus-visible:ring-1 focus-visible:ring-violet-500',
                        completed && 'text-zinc-500 line-through'
                      )}
                    >
                      {completed ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-zinc-500 group-hover:text-violet-400 shrink-0" />
                      )}
                      <span className="text-xs">{text}</span>
                    </div>
                  );
                }

                if (line.startsWith('# ')) {
                  return <h1 key={idx} className="text-base font-bold text-violet-300 pt-2 pb-1 border-b border-zinc-800">{line.replace('# ', '')}</h1>;
                }
                if (line.startsWith('## ')) {
                  return <h2 key={idx} className="text-sm font-semibold text-zinc-100 pt-2">{line.replace('## ', '')}</h2>;
                }
                if (line.startsWith('### ')) {
                  return <h3 key={idx} className="text-xs font-semibold text-zinc-300 pt-1">{line.replace('### ', '')}</h3>;
                }
                if (line.startsWith('- ')) {
                  return <li key={idx} className="ml-4 list-disc text-xs text-zinc-300">{line.replace('- ', '')}</li>;
                }
                if (line.startsWith('```')) {
                  return <div key={idx} className="text-[10px] font-mono text-zinc-500">{line}</div>;
                }
                if (!line.trim()) {
                  return <div key={idx} className="h-1.5" />;
                }

                return <p key={idx} className="text-xs text-zinc-300">{line}</p>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
