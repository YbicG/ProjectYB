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
  ListFilter
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { useHttpStore } from '@renderer/stores/useHttpStore';
import { usePortStore } from '@renderer/stores/usePortStore';
import { useServiceStore } from '@renderer/stores/useServiceStore';
import { HttpMethod, KeyValuePair } from '@renderer/types/http';
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

  const { ports, fetchPorts } = usePortStore();
  const { runningServices } = useServiceStore();

  const [copiedResponse, setCopiedResponse] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'saved' | 'history'>('saved');
  const [responseSubTab, setResponseSubTab] = useState<'body' | 'headers' | 'raw'>('body');

  useEffect(() => {
    loadHistoryAndSaved();
    fetchPorts();
  }, []);

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'];

  const getMethodColor = (m: HttpMethod) => {
    switch (m) {
      case 'GET': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'POST': return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case 'PUT': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'DELETE': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      case 'PATCH': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    if (status >= 300 && status < 400) return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    if (status >= 400 && status < 500) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
  };

  const getStatusText = (status: number, defaultText?: string) => {
    if (defaultText && defaultText !== 'OK') return defaultText;
    switch (status) {
      case 200: return 'OK';
      case 201: return 'Created';
      case 204: return 'No Content';
      case 301: return 'Moved Permanently';
      case 302: return 'Found';
      case 304: return 'Not Modified';
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 409: return 'Conflict';
      case 422: return 'Unprocessable Entity';
      case 429: return 'Too Many Requests';
      case 500: return 'Internal Server Error';
      case 502: return 'Bad Gateway';
      case 503: return 'Service Unavailable';
      default: return defaultText || 'Status';
    }
  };

  const safeFormattedBody = useMemo(() => {
    if (!activeResponse?.body) return '<Empty Response Body>';
    if (activeResponse.isJson) {
      try {
        return JSON.stringify(JSON.parse(activeResponse.body), null, 2);
      } catch {
        return activeResponse.body;
      }
    }
    return activeResponse.body;
  }, [activeResponse?.body, activeResponse?.isJson]);

  // Header / Param Row Helpers
  const addHeaderRow = () => {
    setHeaders([...headers, { id: `h_${Date.now()}`, key: '', value: '', enabled: true }]);
  };

  const updateHeaderRow = (id: string, patch: Partial<KeyValuePair>) => {
    setHeaders(headers.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  };

  const deleteHeaderRow = (id: string) => {
    setHeaders(headers.filter((h) => h.id !== id));
  };

  const addParamRow = () => {
    setParams([...params, { id: `p_${Date.now()}`, key: '', value: '', enabled: true }]);
  };

  const updateParamRow = (id: string, patch: Partial<KeyValuePair>) => {
    setParams(params.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const deleteParamRow = (id: string) => {
    setParams(params.filter((p) => p.id !== id));
  };

  const handleCopyResponse = () => {
    if (activeResponse?.body) {
      navigator.clipboard.writeText(activeResponse.body);
      setCopiedResponse(true);
      toast.success('Response copied to clipboard');
      setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const handleCopyCurl = () => {
    let curl = `curl -X ${currentMethod} "${currentUrl}"`;
    headers.forEach((h) => {
      if (h.enabled && h.key) curl += ` \\\n  -H "${h.key}: ${h.value}"`;
    });
    if (authType === 'bearer' && bearerToken) {
      curl += ` \\\n  -H "Authorization: Bearer ${bearerToken}"`;
    }
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(currentMethod) && body) {
      curl += ` \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
    }
    navigator.clipboard.writeText(curl);
    toast.success('cURL command copied to clipboard');
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

  return (
    <div className="flex h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden">
      {/* ── Datalists for Header Key/Value Autocomplete ── */}
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

      {/* ── Left Sidebar: Saved Requests & History ── */}
      <div className="hidden lg:flex w-64 xl:w-72 border-r border-zinc-800 bg-zinc-950/70 flex-col shrink-0 overflow-hidden">
        <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs">
            <button
              onClick={() => setSidebarTab('saved')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5',
                sidebarTab === 'saved' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <Bookmark className="w-3 h-3" />
              Saved ({savedRequests.length})
            </button>
            <button
              onClick={() => setSidebarTab('history')}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5',
                sidebarTab === 'history' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              )}
            >
              <History className="w-3 h-3" />
              History
            </button>
          </div>

          {sidebarTab === 'history' && history.length > 0 && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-red-400" onClick={clearHistory} title="Clear history">
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sidebarTab === 'saved' ? (
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
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 shrink-0"
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
          ) : (
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
                        const match = currentUrl.match(/^(https?:\/\/[^/:]+)(:\d+)?(\/.*)?$/);
                        if (match) {
                          const base = match[1];
                          const path = match[3] || '';
                          setUrl(`${base}:${port}${path}`);
                        } else {
                          setUrl(`http://localhost:${port}/`);
                        }
                      }
                    }}
                    className="h-7 px-1.5 text-[10px] font-mono bg-zinc-800 border border-zinc-700 text-cyan-300 rounded outline-none cursor-pointer"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      :Port ▾
                    </option>
                    {ports.map((p) => (
                      <option key={p.port} value={p.port} className="bg-zinc-900 text-zinc-200">
                        :{p.port} ({p.process || 'app'})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Send Button */}
            <Button
              className="h-9 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs px-4 gap-1.5 shrink-0"
              onClick={sendRequest}
              disabled={isLoading}
            >
              {isLoading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Send</span>
              <span className="text-[10px] opacity-70 hidden sm:inline">(Ctrl+↵)</span>
            </Button>

            {/* Save & Copy cURL Buttons */}
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900 shrink-0"
              onClick={() => {
                const name = prompt('Request name:', `${currentMethod} ${currentUrl}`);
                if (name) saveCurrentRequest(name);
              }}
            >
              <Bookmark className="w-3.5 h-3.5 mr-1" />
              Save
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900 shrink-0 hidden sm:inline-flex"
              onClick={handleCopyCurl}
              title="Copy request as cURL"
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              cURL
            </Button>
          </div>

          {/* Sub-tabs: Params, Headers, Body, Auth */}
          <div className="flex items-center gap-1 border-b border-zinc-800/80 pt-1 text-xs">
            {(['params', 'headers', 'body', 'auth'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={cn(
                  'px-3 py-1.5 font-medium border-b-2 transition-colors uppercase text-[11px] tracking-wider',
                  activeSubTab === tab ? 'border-violet-500 text-violet-300 font-semibold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                )}
              >
                {tab}
                {tab === 'params' && params.filter((p) => p.enabled && p.key).length > 0 && (
                  <span className="ml-1 text-[10px] font-mono text-violet-400">({params.filter((p) => p.enabled && p.key).length})</span>
                )}
                {tab === 'headers' && headers.filter((h) => h.enabled && h.key).length > 0 && (
                  <span className="ml-1 text-[10px] font-mono text-violet-400">({headers.filter((h) => h.enabled && h.key).length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Request Configuration Body / Split View with Response ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
          {/* Request Config Pane */}
          <div className="border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col overflow-hidden bg-zinc-950/40 p-3 sm:p-4">
            {/* Params Tab */}
            {activeSubTab === 'params' && (
              <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
                <div className="flex items-center justify-between text-xs text-zinc-400 pb-1 border-b border-zinc-800">
                  <span>Query Parameters</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] text-violet-400 gap-1" onClick={addParamRow}>
                    <Plus className="w-3 h-3" /> Add Param
                  </Button>
                </div>

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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400" onClick={() => deleteParamRow(row.id)}>
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
                <div className="flex items-center justify-between text-xs text-zinc-400 pb-1 border-b border-zinc-800">
                  <span>Request Headers</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[11px] text-violet-400 gap-1" onClick={addHeaderRow}>
                    <Plus className="w-3 h-3" /> Add Header
                  </Button>
                </div>

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
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400" onClick={() => deleteHeaderRow(row.id)}>
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
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {activeResponse.durationMs}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-zinc-500" />
                      {(activeResponse.sizeBytes / 1024).toFixed(1)} KB
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-200" onClick={handleCopyResponse} title="Copy response">
                      {copiedResponse ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pt-2">
              {!activeResponse ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-600 space-y-1">
                  <Radio className="w-8 h-8 opacity-40 mb-1" />
                  <p className="text-xs">No response yet</p>
                  <p className="text-[10px]">Enter an endpoint and hit Send to test your local API</p>
                </div>
              ) : activeResponse.error ? (
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/40 text-red-300 space-y-2 text-xs">
                  <p className="font-semibold flex items-center gap-1.5 text-red-400">Request Error</p>
                  <p className="font-mono">{activeResponse.error}</p>
                </div>
              ) : responseSubTab === 'headers' ? (
                <div className="space-y-1 p-2">
                  {Object.entries(activeResponse.headers || {}).map(([hk, hv]) => (
                    <div key={hk} className="flex items-start text-xs font-mono py-1 border-b border-zinc-900">
                      <span className="font-semibold text-violet-400 w-48 shrink-0 truncate">{hk}:</span>
                      <span className="text-zinc-300 break-all flex-1">{String(hv)}</span>
                    </div>
                  ))}
                </div>
              ) : responseSubTab === 'raw' ? (
                <pre className="text-xs font-mono text-zinc-200 leading-relaxed overflow-x-auto p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg whitespace-pre-wrap select-text">
                  {activeResponse.body || '<Empty Response Body>'}
                </pre>
              ) : (
                <pre className="text-xs font-mono text-zinc-200 leading-relaxed overflow-x-auto p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg whitespace-pre-wrap select-text">
                  {safeFormattedBody}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
