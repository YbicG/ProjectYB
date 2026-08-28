import React, { useEffect, useState } from 'react';
import {
  Database,
  Play,
  RotateCw,
  Plus,
  Table,
  FileCode,
  Download,
  Trash2,
  CheckCircle2,
  Server,
  Layers,
  Search,
  KeyRound,
  ExternalLink,
  Code
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { useDatabaseStore } from '@renderer/stores/useDatabaseStore';
import { DatabaseEngine, DatabaseConnection } from '@renderer/types/database';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const DatabasePage: React.FC = () => {
  const {
    connections,
    selectedConnectionId,
    activeConnection,
    activeSchema,
    queryText,
    queryResult,
    redisKeys,
    isExecuting,
    isDiscovering,
    discoverConnections,
    selectConnection,
    addManualConnection,
    removeConnection,
    setQueryText,
    executeQuery,
    exportCsv,
    exportJson,
    connectionModalOpen,
    setConnectionModalOpen,
    loadRedisKeys
  } = useDatabaseStore();

  const [filterEngine, setFilterEngine] = useState<string>('all');
  const [redisSearch, setRedisSearch] = useState('');

  // Manual connection form state
  const [newConnName, setNewConnName] = useState('');
  const [newConnEngine, setNewConnEngine] = useState<DatabaseEngine>('sqlite');
  const [newConnPath, setNewConnPath] = useState('');
  const [newConnString, setNewConnString] = useState('');

  useEffect(() => {
    discoverConnections();
  }, []);

  const filteredConnections = connections.filter((c) =>
    filterEngine === 'all' ? true : c.engine === filterEngine
  );

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConnName.trim()) {
      toast.error('Please specify a connection name');
      return;
    }

    await addManualConnection({
      name: newConnName.trim(),
      engine: newConnEngine,
      filePath: newConnEngine === 'sqlite' ? newConnPath.trim() : undefined,
      connectionString: newConnEngine !== 'sqlite' ? newConnString.trim() : undefined,
      source: 'manual'
    });

    setNewConnName('');
    setNewConnPath('');
    setNewConnString('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* ── Left Connections Sidebar ── */}
      <div className="w-64 md:w-72 border-r border-zinc-800 flex flex-col bg-zinc-950/70 shrink-0">
        {/* Header */}
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-violet-400" />
            <span className="font-bold text-sm text-zinc-100">Database Studio</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
              onClick={() => discoverConnections()}
              title="Re-scan Connections"
            >
              <RotateCw className={cn('w-3.5 h-3.5', isDiscovering && 'animate-spin')} />
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1"
              onClick={() => setConnectionModalOpen(true)}
            >
              <Plus className="w-3 h-3" />
              Add
            </Button>
          </div>
        </div>

        {/* Engine filter tabs */}
        <div className="flex items-center gap-1 p-2 border-b border-zinc-850 overflow-x-auto no-scrollbar">
          {['all', 'sqlite', 'postgres', 'mysql', 'redis', 'mongodb'].map((eng) => (
            <button
              key={eng}
              onClick={() => setFilterEngine(eng)}
              className={cn(
                'px-2 py-1 rounded text-[10px] font-mono font-medium capitalize transition-colors whitespace-nowrap',
                filterEngine === eng
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              )}
            >
              {eng}
            </button>
          ))}
        </div>

        {/* Connections List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConnections.length === 0 ? (
            <div className="p-4 text-center text-xs text-zinc-500 italic">
              No database connections found. Click "+ Add" or start a Docker database container.
            </div>
          ) : (
            filteredConnections.map((conn) => {
              const isSelected = selectedConnectionId === conn.id;

              return (
                <div
                  key={conn.id}
                  onClick={() => selectConnection(conn.id)}
                  className={cn(
                    'group p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2',
                    isSelected
                      ? 'bg-violet-950/20 border-violet-500/40 text-zinc-100 shadow-sm'
                      : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 hover:border-zinc-800'
                  )}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] font-mono px-1 py-0 uppercase',
                          conn.engine === 'sqlite'
                            ? 'border-cyan-500/40 text-cyan-300'
                            : conn.engine === 'postgres'
                            ? 'border-blue-500/40 text-blue-300'
                            : conn.engine === 'mysql'
                            ? 'border-amber-500/40 text-amber-300'
                            : conn.engine === 'redis'
                            ? 'border-rose-500/40 text-rose-300'
                            : 'border-emerald-500/40 text-emerald-300'
                        )}
                      >
                        {conn.engine}
                      </Badge>
                      <span className="font-semibold text-zinc-200 truncate">{conn.name}</span>
                    </div>

                    <p className="text-[10px] font-mono text-zinc-500 truncate">
                      {conn.filePath || conn.connectionString || 'localhost'}
                    </p>
                  </div>

                  {conn.source === 'manual' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeConnection(conn.id);
                      }}
                      title="Remove connection"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main Workspace Area ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {activeConnection ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Connection Bar */}
            <div className="h-12 px-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/40 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-zinc-100 truncate">
                  {activeConnection.name}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono uppercase text-zinc-400">
                  {activeConnection.engine}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {queryResult && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                    <span className="text-zinc-500">Rows:</span>
                    <span className="text-emerald-400 font-bold">{queryResult.rowCount}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="text-zinc-500">{queryResult.durationMs}ms</span>
                  </div>
                )}

                {queryResult && queryResult.rows.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-zinc-800 gap-1 text-zinc-300"
                      onClick={exportCsv}
                    >
                      <Download className="w-3 h-3 text-zinc-400" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-zinc-800 gap-1 text-zinc-300"
                      onClick={exportJson}
                    >
                      <Download className="w-3 h-3 text-zinc-400" />
                      JSON
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Redis View vs SQL Editor View */}
            {activeConnection.engine === 'redis' ? (
              <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                    <Input
                      type="text"
                      value={redisSearch}
                      onChange={(e) => setRedisSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && loadRedisKeys(redisSearch || '*')}
                      placeholder="Search Redis keys pattern (e.g. user:*, session:*)..."
                      className="pl-8 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="text-xs bg-rose-600 hover:bg-rose-500 text-white gap-1.5"
                    onClick={() => loadRedisKeys(redisSearch || '*')}
                  >
                    <Play className="w-3 h-3" />
                    Fetch Keys
                  </Button>
                </div>

                {/* Keys list */}
                <div className="flex-1 border border-zinc-800 rounded-lg overflow-y-auto bg-zinc-900/30 p-2 divide-y divide-zinc-850 font-mono text-xs">
                  {redisKeys.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 italic">
                      No keys found for pattern "{redisSearch || '*'}"
                    </div>
                  ) : (
                    redisKeys.map((item) => (
                      <div key={item.key} className="p-2.5 flex items-center justify-between hover:bg-zinc-900/60 transition-colors">
                        <div className="flex items-center gap-2 truncate">
                          <Badge variant="outline" className="text-[9px] border-rose-500/40 text-rose-300">
                            {item.type}
                          </Badge>
                          <span className="text-zinc-200 font-semibold truncate">{item.key}</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-zinc-400 hover:text-zinc-100"
                          onClick={() => executeQuery(`GET ${item.key}`)}
                        >
                          Inspect Value
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Query Editor Box */}
                <div className="p-3 border-b border-zinc-800 bg-zinc-900/40 flex flex-col gap-2 shrink-0">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-mono text-[11px] text-zinc-500">
                      Query Console <span className="text-zinc-600">(Press Ctrl+Enter to execute)</span>
                    </span>
                    <Button
                      size="sm"
                      onClick={() => executeQuery()}
                      disabled={isExecuting}
                      className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-1.5 shadow-md"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      {isExecuting ? 'Running...' : 'Run Query'}
                    </Button>
                  </div>

                  <textarea
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    placeholder="Write SQL query (e.g. SELECT * FROM users LIMIT 25;)..."
                    className="w-full bg-black/60 border border-zinc-800 rounded-md p-2.5 font-mono text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
                  />
                </div>

                {/* Query Result Grid */}
                <div className="flex-1 overflow-auto p-3">
                  {queryResult ? (
                    queryResult.error ? (
                      <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-lg text-xs font-mono text-rose-300">
                        {queryResult.error}
                      </div>
                    ) : queryResult.rows.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-500 italic">
                        Query returned 0 rows.
                      </div>
                    ) : (
                      <div className="border border-zinc-800 rounded-lg overflow-x-auto bg-zinc-900/30">
                        <table className="w-full text-left font-mono text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400 text-[11px]">
                              {queryResult.columns.map((col) => (
                                <th key={col} className="p-2.5 font-semibold">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850">
                            {queryResult.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-zinc-900/50 transition-colors">
                                {queryResult.columns.map((col) => (
                                  <td key={col} className="p-2.5 text-zinc-200 truncate max-w-[280px]">
                                    {row[col] === null ? (
                                      <span className="text-zinc-600 italic">NULL</span>
                                    ) : typeof row[col] === 'object' ? (
                                      JSON.stringify(row[col])
                                    ) : (
                                      row[col].toString()
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    <div className="p-8 text-center text-xs text-zinc-500 italic">
                      Execute a query above to inspect data rows.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-3">
            <Database className="w-12 h-12 text-zinc-700" />
            <h3 className="text-sm font-semibold text-zinc-300">Select a Database Connection</h3>
            <p className="text-xs max-w-sm">
              Choose a detected database from the sidebar or click "+ Add" to connect to a custom SQLite, PostgreSQL, MySQL, Redis, or MongoDB instance.
            </p>
          </div>
        )}
      </div>

      {/* ── Add Connection Modal ── */}
      <Dialog open={connectionModalOpen} onOpenChange={setConnectionModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-md p-5">
          <DialogHeader className="pb-3 border-b border-zinc-800">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-400" />
              Add Database Connection
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Connect to a local file or remote database server.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateConnection} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Connection Name</Label>
              <Input
                type="text"
                value={newConnName}
                onChange={(e) => setNewConnName(e.target.value)}
                placeholder="e.g. Local Dev SQLite, Staging Postgres"
                required
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Database Engine</Label>
              <select
                value={newConnEngine}
                onChange={(e) => setNewConnEngine(e.target.value as any)}
                className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
              >
                <option value="sqlite">SQLite (.sqlite, .db)</option>
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL / MariaDB</option>
                <option value="redis">Redis Key-Value</option>
                <option value="mongodb">MongoDB</option>
              </select>
            </div>

            {newConnEngine === 'sqlite' ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">SQLite File Path</Label>
                <Input
                  type="text"
                  value={newConnPath}
                  onChange={(e) => setNewConnPath(e.target.value)}
                  placeholder="D:\Code\myapp\prisma\dev.db"
                  required
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Connection URI</Label>
                <Input
                  type="text"
                  value={newConnString}
                  onChange={(e) => setNewConnString(e.target.value)}
                  placeholder={
                    newConnEngine === 'postgres'
                      ? 'postgres://user:pass@localhost:5432/mydb'
                      : newConnEngine === 'mysql'
                      ? 'mysql://root:pass@localhost:3306/mydb'
                      : newConnEngine === 'redis'
                      ? 'redis://localhost:6379'
                      : 'mongodb://localhost:27017/mydb'
                  }
                  required
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-850">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConnectionModalOpen(false)}
                className="text-xs text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold"
              >
                Save Connection
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
