import React, { useEffect, useState, useMemo } from 'react';
import {
  Send,
  Plus,
  Trash2,
  Bookmark,
  History,
  Copy,
  Check,
  Radio,
  FileCode,
  Sparkles,
  RotateCw,
  Clock,
  HardDrive,
  ListFilter,
  FileText,
  Globe,
  Tag
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { useHttpStore } from '@renderer/stores/useHttpStore';
import { useOpenApiStore } from '@renderer/stores/useOpenApiStore';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useWorkspaceProjects } from '@renderer/hooks/useWorkspaceProjects';
import { usePortStore } from '@renderer/stores/usePortStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { HttpMethod, KeyValuePair } from '@renderer/types/http';
import { OpenApiEndpoint } from '@renderer/types/openapi';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

const STANDARD_HEADER_KEYS = [
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Type',
  'Cookie',
  'Origin',
  'User-Agent',
  'X-API-Key',
  'X-CSRF-Token',
  'X-Requested-With'
];

const STANDARD_HEADER_VALUES = [
  'application/json',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'text/plain',
  'text/html',
  'Bearer ',
  'no-cache'
];

export const ApiTesterPage: React.FC = () => {
  const {
    currentMethod,
    currentUrl,
    headers,
    params,
    body,
    activeSubTab,
    authType,
    bearerToken,
    basicUser,
    basicPass,
    isLoading,
    activeResponse,
    history,
    savedRequests,
    setMethod,
    setUrl,
    setHeaders,
    setParams,
    setBody,
    setActiveSubTab,
    setAuth,
    sendRequest,
    saveCurrentRequest,
    deleteSavedRequest,
    clearHistory,
    loadSavedRequest,
    loadHistoryAndSaved
  } = useHttpStore();

  const {
    currentSpec,
    discoveredSpecs,
    discoverSpecsInProject,
    loadSpecFromFile,
    loadSpecFromUrl
  } = useOpenApiStore();

  const { projects } = useWorkspaceProjects();
  const { ports, fetchPorts } = usePortStore();
  const { runningServices } = useServiceStore();

  const [copiedResponse, setCopiedResponse] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'saved' | 'history' | 'specs'>('saved');
  const [responseSubTab, setResponseSubTab] = useState<'body' | 'headers' | 'raw'>('body');
  const [specUrlInput, setSpecUrlInput] = useState('');
  const [specFilter, setSpecFilter] = useState('');

  useEffect(() => {
    loadHistoryAndSaved();
    fetchPorts();
    if (projects.length > 0) {
      projects.forEach((p) => discoverSpecsInProject(p.path));
    }
  }, [projects]);

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];

  const getMethodColor = (m: HttpMethod | string) => {
    switch (m.toUpperCase()) {
      case 'GET': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'POST': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case 'PUT': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DELETE': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'PATCH': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
    if (status >= 300 && status < 400) return 'text-cyan-400 bg-cyan-950/40 border-cyan-800/60';
    if (status >= 400 && status < 500) return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
    if (status >= 500) return 'text-rose-400 bg-rose-950/40 border-rose-800/60';
    return 'text-zinc-400 bg-zinc-900 border-zinc-800';
  };

  const getStatusText = (status: number, defaultText?: string) => {
    if (defaultText && defaultText !== 'OK') return defaultText;
    switch (status) {
      case 200: return 'OK';
      case 201: return 'Created';
      case 204: return 'No Content';
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 500: return 'Internal Server Error';
      case 502: return 'Bad Gateway';
      case 503: return 'Service Unavailable';
      default: return defaultText || '';
    }
  };

  const handleCopyResponse = () => {
    if (!activeResponse) return;
    const content =
      responseSubTab === 'headers'
        ? JSON.stringify(activeResponse.headers, null, 2)
        : activeResponse.body || '';

    navigator.clipboard.writeText(content);
    setCopiedResponse(true);
    toast.success('Response copied to clipboard');
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(body);
      setBody(JSON.stringify(parsed, null, 2));
      toast.success('JSON formatted');
    } catch {
      toast.error('Invalid JSON syntax');
    }
  };

  const handleTransferEndpoint = (ep: OpenApiEndpoint) => {
    const method = ep.method.toUpperCase() as HttpMethod;
    setMethod(method);

    const baseHost = currentUrl.match(/^https?:\/\/[^\/]+/)?.[0] || 'http://localhost:3000';
    setUrl(baseHost + (ep.path.startsWith('/') ? ep.path : '/' + ep.path));

    const sampleBody = ep.requestBody?.content?.['application/json']?.example;
    if (sampleBody) {
      setBody(JSON.stringify(sampleBody, null, 2));
      setActiveSubTab('body');
    } else if (ep.parameters && ep.parameters.length > 0) {
      const queryParams: KeyValuePair[] = ep.parameters
        .filter((p) => p.in === 'query')
        .map((p) => ({ id: 'p_' + Math.random(), key: p.name, value: '', enabled: true }));
      if (queryParams.length > 0) {
        setParams(queryParams);
        setActiveSubTab('params');
      }
    }

    toast.success('Loaded ' + ep.method.toUpperCase() + ' ' + ep.path + ' into API Tester');
  };

  const addParamRow = () => setParams([...params, { id: 'p_' + Date.now(), key: '', value: '', enabled: true }]);
  const updateParamRow = (id: string, patch: Partial<KeyValuePair>) =>
    setParams(params.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const deleteParamRow = (id: string) => setParams(params.filter((r) => r.id !== id));

  const addHeaderRow = () => setHeaders([...headers, { id: 'h_' + Date.now(), key: '', value: '', enabled: true }]);
  const updateHeaderRow = (id: string, patch: Partial<KeyValuePair>) =>
    setHeaders(headers.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const deleteHeaderRow = (id: string) => setHeaders(headers.filter((r) => r.id !== id));

  const filteredEndpoints = useMemo(() => {
    if (!currentSpec?.endpoints) return [];
    if (!specFilter.trim()) return currentSpec.endpoints;
    const q = specFilter.toLowerCase();
    return currentSpec.endpoints.filter(
      (e) => e.path.toLowerCase().includes(q) || e.method.toLowerCase().includes(q) || (e.summary || '').toLowerCase().includes(q)
    );
  }, [currentSpec, specFilter]);

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden select-none">
      <datalist id="std-header-keys">
        {STANDARD_HEADER_KEYS.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <datalist id="std-header-values">
        {STANDARD_HEADER_VALUES.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>

      {/* ── Left Sidebar (Saved, History & OpenAPI Specs) ── */}
      <div className="w-full md:w-72 lg:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/70 flex flex-col shrink-0">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setSidebarTab('saved')}
              className={cn(
                'px-2 py-1 rounded-md transition-colors flex items-center gap-1.5',
                sidebarTab === 'saved' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Bookmark className="w-3 h-3" /> Saved
            </button>
            <button
              onClick={() => setSidebarTab('history')}
              className={cn(
                'px-2 py-1 rounded-md transition-colors flex items-center gap-1.5',
                sidebarTab === 'history' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <History className="w-3 h-3" /> History
            </button>
            <button
              onClick={() => setSidebarTab('specs')}
              className={cn(
                'px-2 py-1 rounded-md transition-colors flex items-center gap-1.5',
                sidebarTab === 'specs' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <FileText className="w-3 h-3 text-violet-400" /> Specs
            </button>
          </div>

          {sidebarTab === 'history' && history.length > 0 && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-rose-400" onClick={clearHistory} title="Clear history">
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sidebarTab === 'saved' && (
            savedRequests.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-600">No saved requests yet. Click "Save" on any request.</div>
            ) : (
              savedRequests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => loadSavedRequest(req)}
                  className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer flex items-center justify-between group text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('font-mono font-bold text-[10px] px-1 py-0.5 rounded border', getMethodColor(req.method))}>
                      {req.method}
                    </span>
                    <span className="text-zinc-200 font-medium truncate">{req.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-rose-400 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSavedRequest(req.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            )
          )}

          {sidebarTab === 'history' && (
            history.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-600">No request history yet.</div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  onClick={() => loadSavedRequest(item.request)}
                  className="p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('font-mono font-bold text-[10px] px-1 py-0.5 rounded border', getMethodColor(item.request.method))}>
                      {item.request.method}
                    </span>
                    <span className="text-zinc-300 truncate font-mono text-[11px]">{item.request.url.replace(/^https?:\/\//, '')}</span>
                  </div>
                  <Badge variant="outline" className={cn('text-[9px] px-1 py-0 font-mono shrink-0', getStatusColor(item.response.status))}>
                    {item.response.status || 'ERR'}
                  </Badge>
                </div>
              ))
            )
          )}

          {sidebarTab === 'specs' && (
            <div className="space-y-3 p-1">
              <div className="flex gap-1.5">
                <Input
                  placeholder="Remote Swagger URL..."
                  value={specUrlInput}
                  onChange={(e) => setSpecUrlInput(e.target.value)}
                  className="h-7 text-xs bg-zinc-900 border-zinc-800"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (specUrlInput.trim()) loadSpecFromUrl(specUrlInput.trim());
                  }}
                  className="h-7 text-xs border-zinc-800 hover:bg-zinc-800 shrink-0 px-2"
                >
                  Load
                </Button>
              </div>

              {discoveredSpecs.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Discovered Project Specs
                  </span>
                  {discoveredSpecs.map((specPath) => (
                    <button
                      key={specPath}
                      onClick={() => loadSpecFromFile(specPath)}
                      className="w-full text-left p-2 rounded border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-xs flex items-center justify-between"
                    >
                      <span className="font-mono text-zinc-200 truncate text-[11px]">{specPath.split(/[/\\]/).pop()}</span>
                      <Badge variant="outline" className="text-[9px] font-mono border-violet-800/60 text-violet-400">
                        Load
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {currentSpec ? (
                <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                  <Input
                    placeholder="Filter endpoints..."
                    value={specFilter}
                    onChange={(e) => setSpecFilter(e.target.value)}
                    className="h-7 text-xs bg-zinc-900 border-zinc-800"
                  />
                  <div className="space-y-1 pt-1">
                    {filteredEndpoints.map((ep) => (
                      <div
                        key={ep.method + ep.path}
                        onClick={() => handleTransferEndpoint(ep)}
                        className="p-2 rounded bg-zinc-900/50 border border-zinc-800/60 hover:border-violet-600/60 hover:bg-zinc-900 cursor-pointer flex items-center justify-between group text-xs transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={cn('font-mono font-bold text-[9px] px-1 py-0.5 rounded border', getMethodColor(ep.method))}>
                            {ep.method.toUpperCase()}
                          </span>
                          <span className="text-zinc-200 font-mono text-[11px] truncate">{ep.path}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-zinc-600">
                  Load an OpenAPI JSON/YAML or select a discovered project spec above.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Request & Response Workbench ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── URL Bar & Actions ── */}
        <div className="p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Method Select */}
            <select
              value={currentMethod}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className={cn(
                'h-9 px-3 rounded-lg border font-mono font-bold text-xs bg-zinc-900 outline-none focus:ring-2 focus:ring-violet-500 shrink-0',
                getMethodColor(currentMethod)
              )}
            >
              {methods.map((m) => (
                <option key={m} value={m} className="bg-zinc-900 text-zinc-100">
                  {m}
                </option>
              ))}
            </select>

            {/* URL Input */}
            <div className="flex-1 relative min-w-[200px]">
              <Input
                value={currentUrl}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendRequest();
                }}
                placeholder="http://localhost:3000/api/endpoint"
                className="h-9 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100 pl-3 pr-24 focus-visible:ring-violet-500"
              />

              {/* Port Quick Picker */}
              {ports.length > 0 && (
                <div className="absolute right-1 top-1 flex items-center">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const port = e.target.value;
                        const match = currentUrl.match(/^(https?:\/\/[^\/:]+)(:\d+)?(\/.*)?$/);
                        if (match) {
                          const base = match[1];
                          const path = match[3] || '';
                          setUrl(base + ':' + port + path);
                        } else {
                          setUrl('http://localhost:' + port);
                        }
                      }
                    }}
                    className="h-7 text-[10px] font-mono bg-zinc-950/80 border border-zinc-800 text-violet-300 rounded px-1.5 outline-none hover:bg-zinc-900"
                  >
                    <option value="">⚡ Port</option>
                    {ports.map((p) => (
                      <option key={p.port} value={p.port}>
                        :{p.port} ({p.process || 'app'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Send Button */}
            <Button
              onClick={sendRequest}
              disabled={isLoading || !currentUrl.trim()}
              className="h-9 px-5 bg-violet-600 hover:bg-violet-700 text-xs font-bold gap-1.5 shrink-0 shadow-md shadow-violet-950/50"
            >
              {isLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send</span>
            </Button>

            {/* Save Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt('Enter request name:', currentMethod + ' ' + currentUrl);
                if (name) saveCurrentRequest(name);
              }}
              className="h-9 text-xs border-zinc-800 hover:bg-zinc-900 text-zinc-300 gap-1.5 shrink-0"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>

        {/* ── Request & Response Body Split ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800 overflow-hidden">
          {/* Request Configuration Pane */}
          <div className="flex flex-col p-3 sm:p-4 overflow-hidden bg-zinc-950">
            {/* Sub-tabs: Params, Headers, Body, Auth */}
            <div className="flex items-center gap-1 border-b border-zinc-800 pb-2 mb-3 overflow-x-auto text-xs">
              {(['params', 'headers', 'body', 'auth'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSubTab(tab)}
                  className={cn(
                    'px-3 py-1 rounded-md font-medium capitalize transition-colors',
                    activeSubTab === tab ? 'bg-zinc-800 text-violet-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {tab}
                  {tab === 'params' && params.filter((p) => p.enabled && p.key).length > 0 && (
                    <span className="ml-1.5 text-[10px] font-mono text-zinc-400">({params.filter((p) => p.enabled && p.key).length})</span>
                  )}
                  {tab === 'headers' && headers.filter((h) => h.enabled && h.key).length > 0 && (
                    <span className="ml-1.5 text-[10px] font-mono text-zinc-400">({headers.filter((h) => h.enabled && h.key).length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Params Tab */}
            {activeSubTab === 'params' && (
              <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
                <div className="space-y-1.5">
                  {params.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => updateParamRow(row.id, { enabled: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500"
                      />
                      <Input
                        placeholder="Key"
                        value={row.key}
                        onChange={(e) => updateParamRow(row.id, { key: e.target.value })}
                        className="h-7 text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-200"
                      />
                      <Input
                        placeholder="Value"
                        value={row.value}
                        onChange={(e) => updateParamRow(row.id, { value: e.target.value })}
                        className="h-7 text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-200"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-rose-400" onClick={() => deleteParamRow(row.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs border-dashed border-zinc-800 text-zinc-400 hover:text-zinc-200" onClick={addParamRow}>
                    + Add Parameter
                  </Button>
                </div>
              </div>
            )}

            {/* Headers Tab */}
            {activeSubTab === 'headers' && (
              <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
                <div className="space-y-1.5">
                  {headers.map((row) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => updateHeaderRow(row.id, { enabled: e.target.checked })}
                        className="rounded border-zinc-700 bg-zinc-900 text-violet-500 focus:ring-violet-500"
                      />
                      <Input
                        list="std-header-keys"
                        placeholder="Header (e.g. Content-Type)"
                        value={row.key}
                        onChange={(e) => updateHeaderRow(row.id, { key: e.target.value })}
                        className="h-7 text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-200"
                      />
                      <Input
                        list="std-header-values"
                        placeholder="Value (e.g. application/json)"
                        value={row.value}
                        onChange={(e) => updateHeaderRow(row.id, { value: e.target.value })}
                        className="h-7 text-xs font-mono bg-zinc-900 border-zinc-800 text-zinc-200"
                      />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-rose-400" onClick={() => deleteHeaderRow(row.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full h-7 text-xs border-dashed border-zinc-800 text-zinc-400 hover:text-zinc-200" onClick={addHeaderRow}>
                    + Add Header
                  </Button>
                </div>
              </div>
            )}

            {/* Body Tab */}
            {activeSubTab === 'body' && (
              <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
                <div className="flex items-center justify-between text-xs text-zinc-400 pb-1 border-b border-zinc-800">
                  <span>JSON / Raw Request Body</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] text-violet-400 gap-1" onClick={handleFormatJson}>
                    <Sparkles className="w-3 h-3" /> Format JSON
                  </Button>
                </div>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{\n  "key": "value"\n}'
                  className="flex-1 w-full bg-zinc-900/70 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-200 resize-none focus:outline-none leading-relaxed min-h-[220px]"
                />
              </div>
            )}

            {/* Auth Tab */}
            {activeSubTab === 'auth' && (
              <div className="flex-1 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-semibold">Authorization Type</label>
                  <select
                    value={authType}
                    onChange={(e) => setAuth({ authType: e.target.value as any })}
                    className="w-full h-8 bg-zinc-900 border border-zinc-800 rounded-md px-2 text-zinc-200"
                  >
                    <option value="none">No Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth (Username / Password)</option>
                  </select>
                </div>

                {authType === 'bearer' && (
                  <div className="space-y-1">
                    <label className="text-zinc-400 font-semibold">Bearer Token</label>
                    <Input
                      placeholder="eyJhbGciOi..."
                      value={bearerToken}
                      onChange={(e) => setAuth({ authType: 'bearer', bearerToken: e.target.value })}
                      className="bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100"
                    />
                  </div>
                )}

                {authType === 'basic' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Username</label>
                      <Input
                        placeholder="admin"
                        value={basicUser}
                        onChange={(e) => setAuth({ authType: 'basic', basicUser: e.target.value, basicPass })}
                        className="bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-zinc-400 font-semibold">Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={basicPass}
                        onChange={(e) => setAuth({ authType: 'basic', basicUser, basicPass: e.target.value })}
                        className="bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Response Inspector Pane */}
          <div className="flex flex-col overflow-hidden bg-zinc-950/60 p-3 sm:p-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-300 uppercase tracking-wider text-[11px]">Response</span>
                {activeResponse && (
                  <Badge variant="outline" className={cn('text-xs font-mono font-bold', getStatusColor(activeResponse.status))}>
                    {activeResponse.status} {getStatusText(activeResponse.status, activeResponse.statusText)}
                  </Badge>
                )}
              </div>

              {activeResponse && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[10px]">
                    <button
                      onClick={() => setResponseSubTab('body')}
                      className={cn(
                        'px-2 py-0.5 rounded transition-colors',
                        responseSubTab === 'body' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      Body
                    </button>
                    <button
                      onClick={() => setResponseSubTab('headers')}
                      className={cn(
                        'px-2 py-0.5 rounded transition-colors',
                        responseSubTab === 'headers' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      Headers ({Object.keys(activeResponse.headers || {}).length})
                    </button>
                    <button
                      onClick={() => setResponseSubTab('raw')}
                      className={cn(
                        'px-2 py-0.5 rounded transition-colors',
                        responseSubTab === 'raw' ? 'bg-zinc-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                      )}
                    >
                      Raw
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" /> {activeResponse.durationMs}ms
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-zinc-500" /> {(activeResponse.sizeBytes / 1024).toFixed(2)} KB
                    </span>
                  </div>

                  <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-200" onClick={handleCopyResponse} title="Copy response">
                    {copiedResponse ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto pt-3">
              {!activeResponse ? (
                <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-xs gap-2">
                  <Send className="w-8 h-8 opacity-30 text-violet-400" />
                  <p>Send a request to inspect the response payload, headers, and status.</p>
                </div>
              ) : responseSubTab === 'body' ? (
                <pre className="text-xs font-mono text-zinc-300 leading-relaxed overflow-auto p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/80 max-h-full">
                  {activeResponse.body}
                </pre>
              ) : responseSubTab === 'headers' ? (
                <div className="space-y-1.5 p-2 bg-zinc-900/50 rounded-lg border border-zinc-800/80 font-mono text-xs">
                  {Object.entries(activeResponse.headers || {}).map(([k, v]) => (
                    <div key={k} className="flex gap-2 py-0.5 border-b border-zinc-800/40 last:border-0">
                      <span className="font-semibold text-violet-300 shrink-0">{k}:</span>
                      <span className="text-zinc-400 break-all">{v}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="text-xs font-mono text-zinc-400 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/80 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(activeResponse, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
