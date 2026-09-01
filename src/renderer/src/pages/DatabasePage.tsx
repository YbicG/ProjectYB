import React, { useEffect, useState, useMemo } from 'react';
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
  AlertCircle,
  Server,
  Layers,
  Search,
  KeyRound,
  ExternalLink,
  Code,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Eye,
  Copy,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Filter,
  Activity,
  Zap,
  Clock,
  HardDrive
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { useDatabaseStore } from '@renderer/stores/useDatabaseStore';
import { DatabaseEngine, DatabaseConnection, TableSchema } from '@renderer/types/database';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const DatabasePage: React.FC = () => {
  const {
    connections,
    selectedConnectionId,
    activeConnection,
    activeSchema,
    selectedTable,
    queryText,
    queryResult,
    redisKeys,
    selectedRedisKey,
    selectedRedisValue,
    connectionStatus,
    isExecuting,
    isDiscovering,
    isSchemaLoading,
    isPinging,
    connectionModalOpen,
    groupBy,
    filterEngine,
    searchQuery,
    schemaSearch,
    resultSearch,
    page,
    pageSize,
    setGroupBy,
    setFilterEngine,
    setSearchQuery,
    setSchemaSearch,
    setResultSearch,
    setPage,
    setPageSize,
    discoverConnections,
    selectConnection,
    selectTable,
    addManualConnection,
    removeConnection,
    setQueryText,
    executeQuery,
    loadSchema,
    loadRedisKeys,
    inspectRedisKey,
    testActiveConnection,
    setConnectionModalOpen,
    exportCsv,
    exportJson
  } = useDatabaseStore();

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [schemaSidebarOpen, setSchemaSidebarOpen] = useState(true);
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  // Manual connection form state
  const [newConnName, setNewConnName] = useState('');
  const [newConnEngine, setNewConnEngine] = useState<DatabaseEngine>('sqlite');
  const [newConnPath, setNewConnPath] = useState('');
  const [newConnString, setNewConnString] = useState('');

  useEffect(() => {
    discoverConnections();
  }, []);

  // Filtered connection list
  const filteredConnections = useMemo(() => {
    return connections.filter((conn) => {
      if (filterEngine !== 'all' && conn.engine !== filterEngine) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = conn.name.toLowerCase().includes(q);
        const matchesProject = (conn.projectName || '').toLowerCase().includes(q);
        const matchesHost = (conn.host || '').toLowerCase().includes(q);
        const matchesDb = (conn.database || '').toLowerCase().includes(q);
        const matchesPath = (conn.filePath || '').toLowerCase().includes(q);
        if (!matchesName && !matchesProject && !matchesHost && !matchesDb && !matchesPath) return false;
      }
      return true;
    });
  }, [connections, filterEngine, searchQuery]);

  // Group connections by project
  const projectGroups = useMemo(() => {
    const map = new Map<string, DatabaseConnection[]>();
    for (const c of filteredConnections) {
      const pName = c.projectName || 'Standalone / Manual';
      if (!map.has(pName)) map.set(pName, []);
      map.get(pName)!.push(c);
    }
    return map;
  }, [filteredConnections]);

  // Filtered schema tables
  const filteredTables = useMemo(() => {
    if (!schemaSearch) return activeSchema;
    const q = schemaSearch.toLowerCase();
    return activeSchema.filter(
      (t) => t.name.toLowerCase().includes(q) || t.columns.some((c) => c.name.toLowerCase().includes(q))
    );
  }, [activeSchema, schemaSearch]);

  // Filtered & paginated query results
  const processedRows = useMemo(() => {
    if (!queryResult || !queryResult.rows) return { rows: [], total: 0, totalPages: 1 };
    let filtered = queryResult.rows;

    if (resultSearch) {
      const q = resultSearch.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const paginated = filtered.slice(start, start + pageSize);

    return { rows: paginated, total, totalPages };
  }, [queryResult, resultSearch, page, pageSize]);

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folder]: prev[folder] === undefined ? false : !prev[folder]
    }));
  };

  const toggleTableExpand = (tableName: string) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  const handleCopyCell = (val: any) => {
    const text = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val);
    navigator.clipboard.writeText(text);
    setCopiedCell(text);
    toast.success('Copied cell value');
    setTimeout(() => setCopiedCell(null), 2000);
  };

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

  const insertSyntax = (syntax: string) => {
    setQueryText(queryText ? queryText + ' ' + syntax : syntax);
  };

  const activePingStatus = activeConnection ? connectionStatus[activeConnection.id] : null;

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-zinc-950 text-zinc-100">
      {/* ── 1. Left Connections Hierarchy Sidebar ── */}
      <div className="w-72 border-r border-zinc-850 flex flex-col bg-zinc-950/80 shrink-0 select-none">
        {/* Header */}
        <div className="p-3 border-b border-zinc-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-600/10 border border-violet-500/20 text-violet-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-xs text-zinc-100 flex items-center gap-1.5">
                Database Studio
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-violet-500/30 text-violet-300">
                  v2.0
                </Badge>
              </span>
              <p className="text-[10px] text-zinc-500">
                {connections.length} detected instances
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              onClick={() => discoverConnections()}
              title="Re-scan Connections"
            >
              <RotateCw className={cn('w-3.5 h-3.5', isDiscovering && 'animate-spin text-violet-400')} />
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-violet-600 hover:bg-violet-500 text-white gap-1 shadow-sm font-semibold"
              onClick={() => setConnectionModalOpen(true)}
            >
              <Plus className="w-3 h-3" />
              Add
            </Button>
          </div>
        </div>

        {/* Search & Engine Filter */}
        <div className="p-2 space-y-2 border-b border-zinc-850 bg-zinc-900/30">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-500" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search databases, hosts..."
              className="h-7 pl-8 bg-zinc-900 border-zinc-800 text-[11px] placeholder:text-zinc-600"
            />
          </div>

          <div className="flex items-center justify-between">
            {/* Engine filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {['all', 'postgres', 'sqlite', 'redis', 'mysql', 'mongodb'].map((eng) => {
                const count =
                  eng === 'all'
                    ? connections.length
                    : connections.filter((c) => c.engine === eng).length;
                return (
                  <button
                    key={eng}
                    onClick={() => setFilterEngine(eng)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-mono capitalize transition-all flex items-center gap-1 shrink-0',
                      filterEngine === eng
                        ? 'bg-zinc-800 text-zinc-100 font-semibold border border-zinc-700'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/60'
                    )}
                  >
                    <span>{eng}</span>
                    {count > 0 && (
                      <span className="text-[9px] opacity-60">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setGroupBy(groupBy === 'project' ? 'flat' : 'project')}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 shrink-0 text-[10px]"
              title={groupBy === 'project' ? 'Switch to Flat View' : 'Group by Project'}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Connections List / Tree */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-xs">
          {filteredConnections.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 space-y-2">
              <Database className="w-6 h-6 mx-auto opacity-40 text-zinc-600" />
              <p>No databases match filter.</p>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] border-zinc-800 text-zinc-400"
                onClick={() => {
                  setFilterEngine('all');
                  setSearchQuery('');
                }}
              >
                Clear Filter
              </Button>
            </div>
          ) : groupBy === 'project' ? (
            Array.from(projectGroups.entries()).map(([projectName, conns]) => {
              const isCollapsed = expandedFolders[projectName] === false;

              return (
                <div key={projectName} className="space-y-0.5">
                  <div
                    onClick={() => toggleFolder(projectName)}
                    className="flex items-center justify-between px-2 py-1.5 rounded text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                      )}
                      {isCollapsed ? (
                        <Folder className="w-3.5 h-3.5 text-amber-400/80" />
                      ) : (
                        <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span className="font-semibold text-zinc-300 truncate">{projectName}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-800 text-zinc-500">
                      {conns.length}
                    </Badge>
                  </div>

                  {!isCollapsed && (
                    <div className="pl-4 space-y-1">
                      {conns.map((conn) => {
                        const isSelected = selectedConnectionId === conn.id;
                        return (
                          <ConnectionItemCard
                            key={conn.id}
                            conn={conn}
                            isSelected={isSelected}
                            onSelect={() => selectConnection(conn.id)}
                            onRemove={() => removeConnection(conn.id)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            filteredConnections.map((conn) => (
              <ConnectionItemCard
                key={conn.id}
                conn={conn}
                isSelected={selectedConnectionId === conn.id}
                onSelect={() => selectConnection(conn.id)}
                onRemove={() => removeConnection(conn.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── 2. Center Schema / Table Explorer Panel (Collapsible) ── */}
      {activeConnection && schemaSidebarOpen && activeConnection.engine !== 'redis' && (
        <div className="w-64 border-r border-zinc-850 flex flex-col bg-zinc-950/60 shrink-0 select-none">
          {/* Header */}
          <div className="p-3 border-b border-zinc-850 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Table className="w-3.5 h-3.5 text-violet-400" />
              <span className="font-bold text-xs text-zinc-200">
                {activeConnection.engine === 'mongodb' ? 'Collections' : 'Tables & Views'}
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 border-zinc-800 text-zinc-400">
                {activeSchema.length}
              </Badge>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-400 hover:text-zinc-200"
                onClick={() => loadSchema(activeConnection)}
                title="Refresh Schema"
              >
                <RotateCw className={cn('w-3 h-3', isSchemaLoading && 'animate-spin text-violet-400')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-zinc-400 hover:text-zinc-200"
                onClick={() => setSchemaSidebarOpen(false)}
                title="Hide Schema Explorer"
              >
                <PanelLeftClose className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Table Search */}
          <div className="p-2 border-b border-zinc-850 bg-zinc-900/30">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-2 text-zinc-500" />
              <Input
                type="text"
                value={schemaSearch}
                onChange={(e) => setSchemaSearch(e.target.value)}
                placeholder="Search tables / columns..."
                className="h-6.5 pl-7 bg-zinc-900 border-zinc-800 text-[10px] placeholder:text-zinc-600 font-mono"
              />
            </div>
          </div>

          {/* Tables List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
            {isSchemaLoading ? (
              <div className="p-6 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-violet-400" />
                <span>Reading database schema...</span>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 italic">
                {activeSchema.length === 0 ? 'No tables found in database' : 'No matching tables found'}
              </div>
            ) : (
              filteredTables.map((tbl) => {
                const isSelected = selectedTable?.name === tbl.name;
                const isExpanded = expandedTables[tbl.name] ?? false;

                return (
                  <div key={tbl.name} className="space-y-0.5">
                    <div
                      onClick={() => selectTable(tbl)}
                      className={cn(
                        'group px-2 py-1.5 rounded-md border text-[11px] cursor-pointer transition-all flex items-center justify-between gap-1.5',
                        isSelected
                          ? 'bg-violet-950/30 border-violet-500/50 text-zinc-100'
                          : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      )}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTableExpand(tbl.name);
                          }}
                          className="p-0.5 text-zinc-500 hover:text-zinc-200"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </button>
                        <Table className="w-3 h-3 text-cyan-400/80 shrink-0" />
                        <span className="font-semibold text-zinc-200 truncate">{tbl.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {tbl.rowCount !== undefined && (
                          <span className="text-[9px] text-zinc-500">{tbl.rowCount} rows</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-violet-400"
                          title="Inspect top 50 rows"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectTable(tbl);
                          }}
                        >
                          <Play className="w-2.5 h-2.5 fill-current" />
                        </Button>
                      </div>
                    </div>

                    {/* Expandable column tree */}
                    {isExpanded && (
                      <div className="pl-6 pr-1 py-1 space-y-1 bg-zinc-900/20 border-l border-zinc-800 ml-2 text-[10px]">
                        {tbl.columns.map((col) => (
                          <div
                            key={col.name}
                            className="flex items-center justify-between text-zinc-400 hover:text-zinc-200 py-0.5"
                          >
                            <div className="flex items-center gap-1 truncate">
                              {col.isPrimary && (
                                <Badge className="text-[8px] px-1 py-0 bg-amber-500/20 text-amber-300 border-amber-500/30">
                                  PK
                                </Badge>
                              )}
                              <span className="truncate">{col.name}</span>
                            </div>
                            <span className="text-[9px] text-zinc-600 font-mono truncate max-w-[80px]">
                              {col.type}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── 3. Main Database Studio Canvas ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
        {activeConnection ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top Connection HUD & Control Bar */}
            <div className="h-12 px-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-950/70 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {!schemaSidebarOpen && activeConnection.engine !== 'redis' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-200 mr-1"
                    onClick={() => setSchemaSidebarOpen(true)}
                    title="Open Schema Explorer"
                  >
                    <PanelLeftOpen className="w-3.5 h-3.5" />
                  </Button>
                )}

                <div className="flex items-center gap-2 truncate">
                  <EngineBadge engine={activeConnection.engine} />
                  <span className="font-bold text-xs text-zinc-100 truncate">
                    {activeConnection.projectName ? activeConnection.projectName + ': ' : ''}
                    {activeConnection.name}
                  </span>
                </div>

                <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800 truncate max-w-sm">
                  <Server className="w-3 h-3 text-zinc-600 shrink-0" />
                  <span className="truncate">
                    {activeConnection.filePath ||
                      activeConnection.maskedUri ||
                      (activeConnection.host + ':' + (activeConnection.port || 5432))}
                  </span>
                </div>

                {/* Connection Ping Status Badge */}
                {activePingStatus && (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-mono flex items-center gap-1',
                      activePingStatus.success
                        ? 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
                        : 'border-rose-500/30 text-rose-400 bg-rose-950/20'
                    )}
                  >
                    {activePingStatus.success ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    <span>
                      {activePingStatus.success
                        ? activePingStatus.pingMs !== undefined
                          ? `${activePingStatus.pingMs}ms`
                          : 'Connected'
                        : 'Offline'}
                    </span>
                  </Badge>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPinging}
                  onClick={testActiveConnection}
                  className="h-7 text-xs border-zinc-800 hover:bg-zinc-900 gap-1 text-zinc-300"
                >
                  <Activity className={cn('w-3 h-3 text-violet-400', isPinging && 'animate-spin')} />
                  Test Ping
                </Button>

                {queryResult && queryResult.rows && queryResult.rows.length > 0 && (
                  <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-zinc-800 gap-1 text-zinc-300 hover:bg-zinc-900"
                      onClick={exportCsv}
                    >
                      <Download className="w-3 h-3 text-zinc-400" />
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-zinc-800 gap-1 text-zinc-300 hover:bg-zinc-900"
                      onClick={exportJson}
                    >
                      <Download className="w-3 h-3 text-zinc-400" />
                      JSON
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Redis Studio vs SQL Studio */}
            {activeConnection.engine === 'redis' ? (
              <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-3">
                {/* Redis Search Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                    <Input
                      type="text"
                      defaultValue="*"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          loadRedisKeys((e.target as HTMLInputElement).value || '*');
                        }
                      }}
                      placeholder="Redis key pattern (e.g. user:*, session:*, cache:*)..."
                      className="pl-8 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 h-8"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="text-xs bg-rose-600 hover:bg-rose-500 text-white gap-1.5 h-8 font-semibold"
                    onClick={(e) => {
                      const input = (e.currentTarget.previousElementSibling?.querySelector('input') as HTMLInputElement);
                      loadRedisKeys(input?.value || '*');
                    }}
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Scan Keys
                  </Button>
                </div>

                {/* Redis Keys Split Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-hidden">
                  {/* Left: Keys List */}
                  <Card className="bg-zinc-950 border-zinc-850 flex flex-col overflow-hidden">
                    <CardHeader className="py-2.5 px-3 border-b border-zinc-850 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                        <CardTitle className="text-xs font-semibold text-zinc-200">
                          Keys ({redisKeys.length})
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2 flex-1 overflow-y-auto space-y-1 font-mono text-xs">
                      {redisKeys.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 italic">
                          No Redis keys matching pattern. Click "Scan Keys".
                        </div>
                      ) : (
                        redisKeys.map((item) => {
                          const isSelected = selectedRedisKey?.key === item.key;
                          return (
                            <div
                              key={item.key}
                              onClick={() => inspectRedisKey(item.key)}
                              className={cn(
                                'p-2 rounded border cursor-pointer transition-all flex items-center justify-between gap-2',
                                isSelected
                                  ? 'bg-rose-950/20 border-rose-500/40 text-zinc-100'
                                  : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Badge className="text-[8px] uppercase px-1 py-0 bg-rose-500/20 text-rose-300 border-rose-500/30">
                                  {item.type}
                                </Badge>
                                <span className="font-semibold text-zinc-200 truncate">{item.key}</span>
                              </div>
                              <span className="text-[10px] text-zinc-500 shrink-0">
                                {item.ttl === -1 ? 'Persistent' : `${item.ttl}s`}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>

                  {/* Right: Key Value Inspector */}
                  <Card className="bg-zinc-950 border-zinc-850 flex flex-col overflow-hidden">
                    <CardHeader className="py-2.5 px-3 border-b border-zinc-850 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                        <CardTitle className="text-xs font-semibold text-zinc-200 truncate">
                          {selectedRedisKey ? `Value: ${selectedRedisKey.key}` : 'Value Inspector'}
                        </CardTitle>
                      </div>
                      {selectedRedisValue && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] text-zinc-400 hover:text-zinc-100 gap-1"
                          onClick={() => handleCopyCell(selectedRedisValue)}
                        >
                          <Copy className="w-3 h-3" />
                          Copy Value
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="p-3 flex-1 overflow-auto bg-black/40 font-mono text-xs text-zinc-200">
                      {selectedRedisValue !== null ? (
                        <pre className="whitespace-pre-wrap word-break-all text-[11px] leading-relaxed">
                          {selectedRedisValue}
                        </pre>
                      ) : (
                        <div className="p-8 text-center text-zinc-500 italic">
                          Select a key from the left list to inspect its value.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              /* SQL / MongoDB Studio View */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Query Console Box */}
                <div className="p-3 border-b border-zinc-850 bg-zinc-900/30 flex flex-col gap-2 shrink-0">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-zinc-400 font-semibold flex items-center gap-1.5">
                        <Code className="w-3.5 h-3.5 text-violet-400" />
                        Query Console
                      </span>
                      <span className="text-zinc-600 text-[10px]">(Press Ctrl+Enter to run)</span>
                    </div>

                    {/* Quick Syntax Insertion Chips */}
                    <div className="hidden sm:flex items-center gap-1">
                      {['SELECT * FROM', 'WHERE', 'ORDER BY', 'LIMIT 50', 'COUNT(*)'].map((snip) => (
                        <button
                          key={snip}
                          onClick={() => insertSyntax(snip)}
                          className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors border border-zinc-800"
                        >
                          {snip}
                        </button>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      onClick={() => executeQuery()}
                      disabled={isExecuting}
                      className="h-7 text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-1.5 shadow-md"
                    >
                      <Play className={cn('w-3 h-3 fill-current', isExecuting && 'animate-spin')} />
                      {isExecuting ? 'Executing...' : 'Run Query'}
                    </Button>
                  </div>

                  <textarea
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    placeholder="Write SQL query (e.g. SELECT * FROM users LIMIT 50;)..."
                    className="w-full bg-black/60 border border-zinc-800 rounded-md p-2.5 font-mono text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
                  />
                </div>

                {/* Query Result Grid & Table HUD */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-3 space-y-2">
                  {/* Results Control Bar */}
                  {queryResult && !queryResult.error && (
                    <div className="flex items-center justify-between text-xs gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-zinc-400 text-[11px]">
                          Returned <strong className="text-emerald-400">{queryResult.rowCount}</strong> rows
                          <span className="text-zinc-600 mx-1.5">·</span>
                          <span className="text-zinc-500">{queryResult.durationMs}ms</span>
                        </span>

                        <div className="relative w-48">
                          <Search className="w-3 h-3 absolute left-2 top-2 text-zinc-500" />
                          <Input
                            type="text"
                            value={resultSearch}
                            onChange={(e) => setResultSearch(e.target.value)}
                            placeholder="Filter rows..."
                            className="h-6.5 pl-6 bg-zinc-900 border-zinc-800 text-[10px] font-mono"
                          />
                        </div>
                      </div>

                      {/* Pagination Controls */}
                      {processedRows.totalPages > 1 && (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage(page - 1)}
                            className="h-6 px-2 text-[10px] border-zinc-800"
                          >
                            Prev
                          </Button>
                          <span className="text-zinc-500 px-1">
                            {page} / {processedRows.totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= processedRows.totalPages}
                            onClick={() => setPage(page + 1)}
                            className="h-6 px-2 text-[10px] border-zinc-800"
                          >
                            Next
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Results Table */}
                  <div className="flex-1 border border-zinc-850 rounded-lg overflow-auto bg-zinc-900/20 min-h-0">
                    {queryResult ? (
                      queryResult.error ? (
                        <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-lg text-xs font-mono text-rose-300 space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-rose-400">
                            <AlertCircle className="w-4 h-4" /> Query Execution Error
                          </p>
                          <p>{queryResult.error}</p>
                        </div>
                      ) : queryResult.rows.length === 0 ? (
                        <div className="p-12 text-center text-xs text-zinc-500 italic">
                          Query returned 0 rows.
                        </div>
                      ) : (
                        <table className="w-full text-left font-mono text-xs border-collapse">
                          <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur z-10 border-b border-zinc-800">
                            <tr className="text-zinc-400 text-[11px]">
                              <th className="p-2.5 w-12 text-zinc-600 font-semibold text-center border-r border-zinc-850">
                                #
                              </th>
                              {queryResult.columns.map((col) => (
                                <th key={col} className="p-2.5 font-semibold text-zinc-300 whitespace-nowrap border-r border-zinc-850/60 last:border-0">
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-850">
                            {processedRows.rows.map((row, rIdx) => {
                              const absoluteIndex = (page - 1) * pageSize + rIdx + 1;
                              return (
                                <tr key={rIdx} className="hover:bg-zinc-900/60 transition-colors">
                                  <td className="p-2.5 text-center text-zinc-600 text-[10px] border-r border-zinc-850">
                                    {absoluteIndex}
                                  </td>
                                  {queryResult.columns.map((col) => {
                                    const val = row[col];
                                    const isNull = val === null || val === undefined;
                                    const isBool = typeof val === 'boolean';
                                    const isObj = typeof val === 'object' && val !== null;

                                    return (
                                      <td
                                        key={col}
                                        onClick={() => handleCopyCell(val)}
                                        className="p-2.5 text-zinc-200 truncate max-w-[320px] cursor-pointer hover:bg-zinc-800/40 transition-colors border-r border-zinc-850/40 last:border-0"
                                        title="Click to copy cell value"
                                      >
                                        {isNull ? (
                                          <span className="text-zinc-600 italic text-[10px]">NULL</span>
                                        ) : isBool ? (
                                          <Badge className={cn('text-[9px] px-1 py-0', val ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300')}>
                                            {val ? 'TRUE' : 'FALSE'}
                                          </Badge>
                                        ) : isObj ? (
                                          <span className="text-cyan-300 text-[11px]">{JSON.stringify(val)}</span>
                                        ) : (
                                          String(val)
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )
                    ) : (
                      <div className="p-12 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
                        <Code className="w-8 h-8 text-zinc-700 opacity-50" />
                        <p>Execute a query or select a table from the left schema tree to view data rows.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty / Welcome State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-violet-400">
              <Database className="w-10 h-10" />
            </div>
            <div className="space-y-1 max-w-md">
              <h3 className="text-sm font-bold text-zinc-200">Welcome to Database Studio</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Inspect local SQLite databases, explore table schemas, run real SQL queries, or browse Redis key-values with sub-millisecond execution.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setConnectionModalOpen(true)}
              className="bg-violet-600 hover:bg-violet-500 text-white text-xs gap-1.5 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Database Connection
            </Button>
          </div>
        )}
      </div>

      {/* ── 4. Add Connection Modal ── */}
      <Dialog open={connectionModalOpen} onOpenChange={setConnectionModalOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-md p-5">
          <DialogHeader className="pb-3 border-b border-zinc-800">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-violet-400" />
              Add Database Connection
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Register a local file or remote database server instance.
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
                className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
              >
                <option value="sqlite">SQLite (.sqlite, .db, .sqlite3)</option>
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL / MariaDB</option>
                <option value="redis">Redis Key-Value</option>
                <option value="mongodb">MongoDB</option>
              </select>
            </div>

            {newConnEngine === 'sqlite' ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">SQLite Database File Path</Label>
                <Input
                  type="text"
                  value={newConnPath}
                  onChange={(e) => setNewConnPath(e.target.value)}
                  placeholder="D:/Code/my-project/database.db"
                  required
                  className="bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100"
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
                      ? 'postgresql://user:password@localhost:5432/dbname'
                      : newConnEngine === 'mysql'
                      ? 'mysql://root:password@localhost:3306/dbname'
                      : newConnEngine === 'redis'
                      ? 'redis://localhost:6379'
                      : 'mongodb://localhost:27017/dbname'
                  }
                  required
                  className="bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConnectionModalOpen(false)}
                className="text-xs border-zinc-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-semibold"
              >
                Connect
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Subcomponent: Connection Item Card
interface ConnectionItemCardProps {
  conn: DatabaseConnection;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const ConnectionItemCard: React.FC<ConnectionItemCardProps> = ({
  conn,
  isSelected,
  onSelect,
  onRemove
}) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-1.5 relative overflow-hidden',
        isSelected
          ? 'bg-violet-950/20 border-violet-500/40 text-zinc-100 shadow-sm'
          : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 hover:border-zinc-800'
      )}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-violet-500" />
      )}

      <div className="space-y-0.5 min-w-0 flex-1 pl-1">
        <div className="flex items-center gap-1.5">
          <EngineBadge engine={conn.engine} />
          <span className="font-semibold text-zinc-200 truncate text-[11px]">{conn.name}</span>
        </div>

        <p className="text-[10px] font-mono text-zinc-500 truncate">
          {conn.filePath
            ? conn.filePath.split(/[\\/]/).pop()
            : conn.host
            ? `${conn.host}:${conn.port || 5432}`
            : 'localhost'}
        </p>
      </div>

      {conn.source === 'manual' && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Remove connection"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

// Subcomponent: Engine Badge
const EngineBadge: React.FC<{ engine: DatabaseEngine }> = ({ engine }) => {
  const styles = {
    sqlite: 'border-cyan-500/40 text-cyan-300 bg-cyan-950/20',
    postgres: 'border-blue-500/40 text-blue-300 bg-blue-950/20',
    mysql: 'border-amber-500/40 text-amber-300 bg-amber-950/20',
    redis: 'border-rose-500/40 text-rose-300 bg-rose-950/20',
    mongodb: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20'
  };

  return (
    <Badge
      variant="outline"
      className={cn('text-[9px] font-mono px-1 py-0 uppercase shrink-0 font-bold', styles[engine])}
    >
      {engine === 'sqlite' ? 'SQLite' : engine === 'postgres' ? 'PG' : engine}
    </Badge>
  );
};
