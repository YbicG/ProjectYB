import React, { useEffect, useState } from 'react';
import {
  Server,
  Play,
  Square,
  Plus,
  Trash2,
  Edit2,
  Radio,
  Copy,
  Check,
  Globe,
  CloudLightning,
  Clock,
  Code2,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { useMockServerStore } from '@renderer/stores/useMockServerStore';
import { useCloudflareStore } from '@renderer/stores/useCloudflareStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { MockRoute, WebhookEvent } from '@renderer/types/mock';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

export const MockServerPage: React.FC = () => {
  const {
    status,
    routes,
    webhooks,
    selectedWebhook,
    serverPort,
    startServer,
    stopServer,
    loadServerState,
    saveRoute,
    deleteRoute,
    toggleRoute,
    clearWebhooks,
    selectWebhook,
    routeEditorOpen,
    editingRoute,
    openRouteEditor,
    closeRouteEditor
  } = useMockServerStore();

  const { startQuickTunnel } = useCloudflareStore();
  const { setActiveTab } = useAppStore();

  // Route editor form state
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL'>('GET');
  const [statusCode, setStatusCode] = useState('200');
  const [responseBody, setResponseBody] = useState('{}');
  const [delayMs, setDelayMs] = useState('0');

  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<'body' | 'headers' | 'query' | 'meta'>('body');
  const [customPort, setCustomPort] = useState<string>(serverPort.toString());

  useEffect(() => {
    loadServerState();
  }, []);

  useEffect(() => {
    setCustomPort(serverPort.toString());
  }, [serverPort]);

  useEffect(() => {
    if (editingRoute) {
      setName(editingRoute.name);
      setPath(editingRoute.path);
      setMethod(editingRoute.method);
      setStatusCode(editingRoute.statusCode.toString());
      setResponseBody(editingRoute.responseBody);
      setDelayMs((editingRoute.delayMs || 0).toString());
    } else {
      setName('');
      setPath('/api/v1/resource');
      setMethod('GET');
      setStatusCode('200');
      setResponseBody(JSON.stringify({ message: 'Hello from ProjectYB Mock API' }, null, 2));
      setDelayMs('0');
    }
  }, [editingRoute, routeEditorOpen]);

  const handleToggleServer = () => {
    if (status.running) {
      stopServer();
    } else {
      const portNum = parseInt(customPort, 10) || 4100;
      startServer(portNum);
    }
  };

  const handleExposeTunnel = async () => {
    if (!status.running) {
      const portNum = parseInt(customPort, 10) || 4100;
      await startServer(portNum);
    }
    const res = await startQuickTunnel({
      localPort: status.port || parseInt(customPort, 10) || 4100,
      name: `Mock Server & Webhook Catcher (Port ${status.port || customPort})`
    });
    if (res) {
      setActiveTab('tunnels');
    }
  };

  const handleSaveRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!path.trim()) {
      toast.error('Path is required');
      return;
    }

    const route: MockRoute = {
      id: editingRoute?.id || `route_${Date.now()}`,
      name: name.trim() || `${method} ${path}`,
      path: path.trim().startsWith('/') ? path.trim() : `/${path.trim()}`,
      method,
      statusCode: parseInt(statusCode, 10) || 200,
      responseBody: responseBody.trim(),
      delayMs: parseInt(delayMs, 10) || 0,
      enabled: editingRoute ? editingRoute.enabled : true
    };

    saveRoute(route);
  };

  const handleCopyPayload = () => {
    if (!selectedWebhook) return;
    navigator.clipboard.writeText(selectedWebhook.body || JSON.stringify(selectedWebhook, null, 2));
    setCopiedPayload(true);
    toast.success('Payload copied to clipboard');
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleCopyCurl = (route: MockRoute) => {
    const port = status.running ? status.port : parseInt(customPort, 10) || 4100;
    const url = `http://localhost:${port}${route.path}`;
    const m = route.method === 'ALL' ? 'GET' : route.method;
    const curl = `curl -X ${m} "${url}" -H "Content-Type: application/json"`;
    navigator.clipboard.writeText(curl);
    setCopiedCurlId(route.id);
    toast.success('Copied cURL command');
    setTimeout(() => setCopiedCurlId(null), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 text-zinc-100 p-6 space-y-6">
      {/* ── Header & Server Controls ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800 shrink-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                Mock REST Server & Webhook Catcher
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-mono uppercase',
                    status.running
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                      : 'border-zinc-700 text-zinc-500'
                  )}
                >
                  {status.running ? `Online (: ${status.port})` : 'Offline'}
                </Badge>
              </h1>
              <p className="text-xs text-zinc-400">
                Simulate backend endpoints with custom JSON responses and capture incoming webhooks in real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Port configuration input */}
          <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
            <span className="text-[11px] font-mono text-zinc-500">Port:</span>
            <input
              type="number"
              disabled={status.running}
              value={customPort}
              onChange={(e) => setCustomPort(e.target.value)}
              className="w-14 bg-transparent text-xs font-mono text-zinc-200 focus:outline-none disabled:opacity-60"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExposeTunnel}
            className="text-xs border-zinc-800 hover:border-orange-500/50 text-orange-300 gap-1.5"
            title="Expose mock server via Cloudflare Tunnel"
          >
            <CloudLightning className="w-3.5 h-3.5 text-orange-400" />
            Public Webhook URL
          </Button>

          <Button
            size="sm"
            onClick={handleToggleServer}
            className={cn(
              'text-xs font-semibold gap-1.5 shadow-md',
              status.running
                ? 'bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            )}
          >
            {status.running ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {status.running ? 'Stop Server' : 'Start Mock Server'}
          </Button>
        </div>
      </div>

      {/* ── Two Column Workspace: Routes vs Webhook Stream ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden min-h-0">
        {/* ── Left Column: Mock Endpoints ── */}
        <div className="lg:col-span-6 flex flex-col h-full overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Mock Endpoints
              <Badge variant="outline" className="text-[10px] font-mono text-zinc-400">
                {routes.length}
              </Badge>
            </h2>

            <Button
              size="sm"
              onClick={() => openRouteEditor()}
              className="h-7 text-xs bg-cyan-600 hover:bg-cyan-500 text-white gap-1 font-semibold"
            >
              <Plus className="w-3 h-3" />
              Add Endpoint
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {routes.map((route) => (
              <Card
                key={route.id}
                className={cn(
                  'bg-zinc-900/60 border-zinc-800 transition-all p-3 flex flex-col gap-2',
                  !route.enabled && 'opacity-50'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge
                      className={cn(
                        'text-[9px] font-mono font-bold px-1.5 py-0 uppercase',
                        route.method === 'GET'
                          ? 'bg-blue-950 border-blue-800 text-blue-300'
                          : route.method === 'POST'
                          ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                          : route.method === 'PUT'
                          ? 'bg-amber-950 border-amber-800 text-amber-300'
                          : 'bg-rose-950 border-rose-800 text-rose-300'
                      )}
                    >
                      {route.method}
                    </Badge>
                    <span className="font-mono text-xs text-zinc-100 font-semibold truncate">
                      {route.path}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className="text-[9px] font-mono border-zinc-700 text-zinc-400">
                      HTTP {route.statusCode}
                    </Badge>
                    {route.delayMs && route.delayMs > 0 ? (
                      <span className="text-[10px] font-mono text-zinc-500">{route.delayMs}ms delay</span>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
                      onClick={() => handleCopyCurl(route)}
                      title="Copy cURL command"
                    >
                      {copiedCurlId === route.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
                      onClick={() => openRouteEditor(route)}
                      title="Edit endpoint"
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-500 hover:text-red-400"
                      onClick={() => deleteRoute(route.id)}
                      title="Delete endpoint"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                <div className="bg-black/50 p-2 rounded text-[11px] font-mono text-zinc-400 truncate max-h-16 overflow-hidden">
                  {route.responseBody}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── Right Column: Inbound Webhook Inspector ── */}
        <div className="lg:col-span-6 flex flex-col h-full overflow-hidden space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Inbound Webhooks Stream
              <Badge variant="outline" className="text-[10px] font-mono text-zinc-400">
                {webhooks.length}
              </Badge>
            </h2>

            {webhooks.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearWebhooks}
                className="h-7 text-xs text-zinc-500 hover:text-red-400 gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </Button>
            )}
          </div>

          <div className="flex-1 grid grid-rows-2 gap-3 overflow-hidden">
            {/* Stream events list */}
            <div className="border border-zinc-800 rounded-lg overflow-y-auto bg-zinc-900/30 divide-y divide-zinc-850">
              {webhooks.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500 italic">
                  Listening for incoming webhook payloads on port {status.running ? status.port : customPort}...
                </div>
              ) : (
                webhooks.map((evt) => {
                  const isSelected = selectedWebhook?.id === evt.id;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => selectWebhook(evt)}
                      className={cn(
                        'p-2.5 text-xs font-mono cursor-pointer transition-colors flex items-center justify-between gap-2',
                        isSelected ? 'bg-emerald-950/20 border-l-2 border-emerald-500' : 'hover:bg-zinc-900/60'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-bold px-1 py-0 uppercase',
                            evt.method === 'POST' ? 'border-emerald-500/40 text-emerald-300' : 'border-blue-500/40 text-blue-300'
                          )}
                        >
                          {evt.method}
                        </Badge>
                        <span className="text-zinc-200 font-semibold truncate">{evt.path}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 shrink-0">
                        <span>{evt.ip}</span>
                        <span>{new Date(evt.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Selected Webhook Payload Details with Tabs */}
            <div className="border border-zinc-800 rounded-lg bg-zinc-950 p-3 flex flex-col overflow-hidden">
              {selectedWebhook ? (
                <div className="flex-1 flex flex-col overflow-hidden space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-850 gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                      <button
                        onClick={() => setActiveInspectorTab('body')}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-mono transition-colors',
                          activeInspectorTab === 'body' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                        )}
                      >
                        Body
                      </button>
                      <button
                        onClick={() => setActiveInspectorTab('headers')}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-mono transition-colors',
                          activeInspectorTab === 'headers' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                        )}
                      >
                        Headers ({Object.keys(selectedWebhook.headers || {}).length})
                      </button>
                      <button
                        onClick={() => setActiveInspectorTab('query')}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-mono transition-colors',
                          activeInspectorTab === 'query' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                        )}
                      >
                        Query ({Object.keys(selectedWebhook.query || {}).length})
                      </button>
                      <button
                        onClick={() => setActiveInspectorTab('meta')}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] font-mono transition-colors',
                          activeInspectorTab === 'meta' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                        )}
                      >
                        Metadata
                      </button>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPayload}
                      className="h-6 text-[10px] border-zinc-800 gap-1 text-zinc-300 shrink-0"
                    >
                      {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedPayload ? 'Copied' : 'Copy'}
                    </Button>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-black/60 rounded p-2.5 font-mono text-xs text-zinc-300 leading-relaxed">
                    {activeInspectorTab === 'body' ? (
                      <pre className="whitespace-pre-wrap break-all text-[11px]">
                        {selectedWebhook.body || '(Empty body)'}
                      </pre>
                    ) : activeInspectorTab === 'headers' ? (
                      <div className="space-y-1 text-[11px]">
                        {Object.entries(selectedWebhook.headers || {}).map(([k, v]) => (
                          <div key={k} className="flex items-start justify-between gap-2 border-b border-zinc-850/60 pb-1">
                            <span className="text-zinc-400 font-semibold">{k}:</span>
                            <span className="text-zinc-200 break-all text-right">{v}</span>
                          </div>
                        ))}
                      </div>
                    ) : activeInspectorTab === 'query' ? (
                      Object.keys(selectedWebhook.query || {}).length === 0 ? (
                        <div className="text-zinc-500 italic text-center py-4">No query parameters</div>
                      ) : (
                        <div className="space-y-1 text-[11px]">
                          {Object.entries(selectedWebhook.query || {}).map(([k, v]) => (
                            <div key={k} className="flex items-center justify-between gap-2 border-b border-zinc-850/60 pb-1">
                              <span className="text-cyan-400 font-semibold">{k}:</span>
                              <span className="text-zinc-200">{v}</span>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex justify-between border-b border-zinc-850/60 pb-1">
                          <span className="text-zinc-500">Timestamp:</span>
                          <span>{new Date(selectedWebhook.timestamp).toISOString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-850/60 pb-1">
                          <span className="text-zinc-500">Client IP:</span>
                          <span>{selectedWebhook.ip}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-850/60 pb-1">
                          <span className="text-zinc-500">Method:</span>
                          <span>{selectedWebhook.method}</span>
                        </div>
                        <div className="flex justify-between border-b border-zinc-850/60 pb-1">
                          <span className="text-zinc-500">Path:</span>
                          <span>{selectedWebhook.path}</span>
                        </div>
                        {selectedWebhook.matchedRoute && (
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Matched Mock Route:</span>
                            <span className="text-emerald-400">{selectedWebhook.matchedRoute}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-zinc-600 italic">
                  Select a webhook request above to inspect its headers, query parameters, and payload
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Route Editor Modal ── */}
      <Dialog open={routeEditorOpen} onOpenChange={(open) => !open && closeRouteEditor()}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-zinc-50 max-w-lg p-5">
          <DialogHeader className="pb-3 border-b border-zinc-800">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              {editingRoute ? 'Edit Mock Endpoint' : 'Create Mock Endpoint'}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Configure HTTP method, path, status code, and JSON payload response.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoute} className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">Endpoint Label</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Fetch Users List"
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Method</Label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="w-full h-9 rounded-md bg-zinc-900 border border-zinc-800 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                  <option value="ALL">ALL</option>
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-zinc-300">Path</Label>
                <Input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/api/v1/resource"
                  required
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">HTTP Status</Label>
                <Input
                  type="number"
                  value={statusCode}
                  onChange={(e) => setStatusCode(e.target.value)}
                  placeholder="200"
                  required
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300">Simulated Latency (ms)</Label>
                <Input
                  type="number"
                  value={delayMs}
                  onChange={(e) => setDelayMs(e.target.value)}
                  placeholder="0"
                  className="bg-zinc-900 border-zinc-800 font-mono text-xs text-zinc-100"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300">JSON Response Body</Label>
              <textarea
                value={responseBody}
                onChange={(e) => setResponseBody(e.target.value)}
                rows={5}
                className="w-full bg-black/60 border border-zinc-800 rounded-md p-2.5 font-mono text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-850">
              <Button type="button" variant="ghost" size="sm" onClick={closeRouteEditor} className="text-xs text-zinc-400">
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">
                Save Endpoint
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
