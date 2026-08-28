import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Play,
  Pause,
  Trash2,
  Download,
  Search,
  Copy,
  Terminal,
  Server,
  CloudLightning,
  Radio,
  HardDrive,
  Shield,
  Layers,
  Filter
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { useLogStreamStore } from '../stores/useLogStreamStore';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import type { LogSource, LogLevel } from '../types/logstream';

const SOURCE_ICONS: Record<LogSource, React.FC<{ className?: string }>> = {
  terminal: Terminal,
  service: Server,
  tunnel: CloudLightning,
  docker: Layers,
  mock: Radio,
  system: HardDrive
};

const SOURCE_COLORS: Record<LogSource, string> = {
  terminal: 'text-violet-400 bg-violet-950/30 border-violet-800/40',
  service: 'text-emerald-400 bg-emerald-950/30 border-emerald-800/40',
  tunnel: 'text-orange-400 bg-orange-950/30 border-orange-800/40',
  docker: 'text-cyan-400 bg-cyan-950/30 border-cyan-800/40',
  mock: 'text-pink-400 bg-pink-950/30 border-pink-800/40',
  system: 'text-blue-400 bg-blue-950/30 border-blue-800/40'
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: 'text-rose-400 font-bold',
  warn: 'text-amber-300 font-semibold',
  info: 'text-zinc-300',
  debug: 'text-zinc-500'
};

export const LogStreamPage: React.FC = () => {
  const {
    logs,
    searchQuery,
    selectedSources,
    selectedLevels,
    isPaused,
    loadInitialLogs,
    addLog,
    clearLogs,
    setSearchQuery,
    toggleSource,
    toggleLevel,
    togglePause,
    exportLogs
  } = useLogStreamStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    loadInitialLogs();

    if (window.api?.logstream) {
      const unsub = window.api.logstream.onLog((entry) => {
        addLog(entry);
      });
      return () => unsub();
    }
    return undefined;
  }, []);

  // Auto-scroll to bottom on new logs if autoScroll enabled
  useEffect(() => {
    if (autoScroll && scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll, isPaused]);

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (!selectedSources.includes(log.source)) return false;
    if (!selectedLevels.includes(log.level)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.tag.toLowerCase().includes(q) ||
        log.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyAll = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.tag}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${filteredLogs.length} log lines to clipboard`);
  };

  const sourcesList: LogSource[] = ['terminal', 'service', 'tunnel', 'docker', 'mock', 'system'];
  const levelsList: LogLevel[] = ['error', 'warn', 'info', 'debug'];

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden select-none">
      {/* ── Top Command Bar ── */}
      <div className="p-3 sm:p-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex flex-col gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-zinc-100">Multi-Process LogStream Studio</h1>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-mono border-zinc-800',
                    isPaused
                      ? 'border-amber-500/30 text-amber-400 bg-amber-950/20'
                      : 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                  )}
                >
                  {isPaused ? '⏸ PAUSED' : '● LIVE STREAM'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Consolidated real-time output across terminals, services, tunnels, and webhooks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={togglePause}
              className={cn(
                'text-xs h-8 gap-1.5 border-zinc-800 font-medium',
                isPaused ? 'text-amber-400 bg-amber-950/20' : 'text-zinc-300'
              )}
            >
              {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
              {isPaused ? 'Resume' : 'Freeze'}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyAll}
              disabled={filteredLogs.length === 0}
              className="text-xs h-8 gap-1.5 border-zinc-800 text-zinc-300 hover:text-zinc-100"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={exportLogs}
              disabled={logs.length === 0}
              className="text-xs h-8 gap-1.5 border-zinc-800 text-zinc-300 hover:text-zinc-100"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              Export .log
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={clearLogs}
              disabled={logs.length === 0}
              className="text-xs h-8 gap-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* ── Filters & Search Bar ── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 pt-1">
          {/* Source filters */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mr-1">Sources:</span>
            {sourcesList.map((source) => {
              const active = selectedSources.includes(source);
              const Icon = SOURCE_ICONS[source];
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => toggleSource(source)}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-mono capitalize transition-all border flex items-center gap-1',
                    active ? SOURCE_COLORS[source] : 'text-zinc-600 border-zinc-900 bg-zinc-950 hover:text-zinc-400'
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span>{source}</span>
                </button>
              );
            })}
          </div>

          {/* Level filters & search */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1">
              {levelsList.map((lvl) => {
                const active = selectedLevels.includes(lvl);
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => toggleLevel(lvl)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-mono uppercase transition-colors border',
                      active
                        ? lvl === 'error'
                          ? 'border-rose-500/40 text-rose-300 bg-rose-950/30'
                          : lvl === 'warn'
                          ? 'border-amber-500/40 text-amber-300 bg-amber-950/30'
                          : 'border-zinc-700 text-zinc-200 bg-zinc-900'
                        : 'text-zinc-600 border-zinc-900 bg-zinc-950 hover:text-zinc-400'
                    )}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter logs (regex)..."
                className="h-7 pl-8 pr-2 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Console Output Canvas ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs p-4 space-y-1 bg-zinc-950 selection:bg-violet-900/50"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-2 py-16">
            <Activity className="w-8 h-8 opacity-20" />
            <p className="text-sm font-sans text-zinc-400">No matching log stream events</p>
            <p className="text-xs font-sans text-zinc-600">
              Terminal outputs, services, and tunnels will automatically appear here in real-time.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const timeStr = log.timestamp ? log.timestamp.substring(11, 19) : '--:--:--';
            return (
              <div
                key={log.id}
                className="flex items-start gap-2 hover:bg-zinc-900/50 py-0.5 px-1.5 rounded transition-colors group leading-relaxed"
              >
                <span className="text-zinc-600 shrink-0 select-none text-[11px]">{timeStr}</span>

                <span
                  className={cn(
                    'text-[10px] px-1 py-0.2 rounded border shrink-0 uppercase tracking-wider',
                    SOURCE_COLORS[log.source]
                  )}
                >
                  {log.tag || log.source}
                </span>

                <span className={cn('break-all select-text', LEVEL_COLORS[log.level])}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Bottom Status Bar ── */}
      <div className="px-4 py-1.5 border-t border-zinc-850 bg-zinc-950 text-[11px] font-mono text-zinc-500 flex items-center justify-between shrink-0">
        <div>
          Showing <span className="text-zinc-200 font-semibold">{filteredLogs.length}</span> of{' '}
          <span className="text-zinc-400">{logs.length}</span> entries
        </div>

        <label className="flex items-center gap-1.5 text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded bg-zinc-900 border-zinc-800 text-violet-500 focus:ring-0"
          />
          <span>Auto-Scroll</span>
        </label>
      </div>
    </div>
  );
};
