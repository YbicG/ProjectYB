import React, { useEffect, useState } from 'react';
import {
  FileCode,
  Globe,
  Search,
  ExternalLink,
  Send,
  Code2,
  FolderOpen,
  RefreshCw,
  Tag,
  Check,
  Play
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useOpenApiStore } from '../stores/useOpenApiStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useHttpStore } from '../stores/useHttpStore';
import { useAppStore } from '../stores/useAppStore';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import type { OpenApiEndpoint } from '../types/openapi';

const METHOD_COLORS: Record<string, string> = {
  get: 'text-blue-400 bg-blue-950/40 border-blue-800/60',
  post: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60',
  put: 'text-amber-400 bg-amber-950/40 border-amber-800/60',
  patch: 'text-orange-400 bg-orange-950/40 border-orange-800/60',
  delete: 'text-rose-400 bg-rose-950/40 border-rose-800/60'
};

export const OpenApiPage: React.FC = () => {
  const {
    currentSpec,
    discoveredSpecs,
    selectedTag,
    searchFilter,
    selectedEndpoint,
    isLoading,
    specUrlInput,
    loadSpecFromFile,
    loadSpecFromUrl,
    discoverSpecsInProject,
    setSelectedTag,
    setSearchFilter,
    setSelectedEndpoint,
    setSpecUrlInput
  } = useOpenApiStore();

  const { projects, selectedProjectId } = useProjectStore();
  const { setUrl, setMethod, setBody, setParams } = useHttpStore();
  const { setActiveTab } = useAppStore();

  const [urlInput, setUrlInput] = useState('');

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    if (selectedProject?.path) {
      discoverSpecsInProject(selectedProject.path);
    }
  }, [selectedProjectId]);

  const handleFetchUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      loadSpecFromUrl(urlInput.trim());
    }
  };

  const handleSendToApiTester = (endpoint: OpenApiEndpoint) => {
    const serverBase = currentSpec?.servers?.[0]?.url || 'http://localhost:3000';
    const fullUrl = `${serverBase.replace(/\/$/, '')}${endpoint.path}`;

    setMethod(endpoint.method.toUpperCase() as any);
    setUrl(fullUrl);

    // If endpoint has sample request body, transfer it
    const sampleBody =
      endpoint.requestBody?.content?.['application/json']?.example ||
      endpoint.requestBody?.content?.['application/json']?.schema?.example;

    if (sampleBody) {
      setBody(JSON.stringify(sampleBody, null, 2));
    }

    setActiveTab('api');
    toast.success(`Transferred ${endpoint.method.toUpperCase()} ${endpoint.path} to HTTP API Tester`);
  };

  const tags = currentSpec?.tags?.map((t) => t.name) || ['All'];
  const allEndpoints = currentSpec?.endpoints || [];

  const filteredEndpoints = allEndpoints.filter((ep) => {
    if (selectedTag && !ep.tags?.includes(selectedTag)) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        ep.path.toLowerCase().includes(q) ||
        ep.summary?.toLowerCase().includes(q) ||
        ep.method.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-zinc-50 overflow-hidden select-none">
      {/* ── Top Spec Header & URL Loader ── */}
      <div className="p-3 sm:p-4 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-100">{currentSpec?.title || 'OpenAPI / Swagger Studio'}</h1>
              <Badge variant="outline" className="text-[10px] font-mono border-blue-500/30 text-blue-300">
                v{currentSpec?.version || '3.0'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              Interactive API documentation & schema explorer with live sandbox transfer.
            </p>
          </div>
        </div>

        {/* Remote Spec URL / File loader */}
        <form onSubmit={handleFetchUrl} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Globe className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <Input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="http://localhost:3000/openapi.json"
              className="h-8 pl-8 pr-2 bg-zinc-900 border-zinc-800 text-xs font-mono text-zinc-200"
            />
          </div>
          <Button type="submit" size="sm" disabled={isLoading} className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium">
            Fetch Spec
          </Button>
        </form>
      </div>

      {/* ── Main 2-Column Studio ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Sidebar: Discovered Specs & Endpoint Tree */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/60 flex flex-col shrink-0 overflow-hidden">
          {/* Discovered Specs in Project */}
          {discoveredSpecs.length > 0 && (
            <div className="p-2.5 border-b border-zinc-800 bg-zinc-900/40">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                Project Spec Files
              </span>
              <div className="space-y-1">
                {discoveredSpecs.map((specPath) => {
                  const filename = specPath.split(/[\/\\]/).pop();
                  return (
                    <button
                      key={specPath}
                      onClick={() => loadSpecFromFile(specPath)}
                      className="w-full text-left px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono text-blue-400 hover:text-blue-300 truncate transition-colors flex items-center gap-1.5"
                    >
                      <FileCode className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{filename}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search & Tag Filter */}
          <div className="p-2.5 space-y-2 border-b border-zinc-800/80">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <Input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter endpoints..."
                className="h-7 pl-8 pr-2 bg-zinc-900 border-zinc-800 text-xs text-zinc-200"
              />
            </div>

            {/* Tag Pills */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-nowrap pb-0.5">
              <button
                type="button"
                onClick={() => setSelectedTag(null)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0',
                  !selectedTag ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
                )}
              >
                All ({allEndpoints.length})
              </button>

              {tags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[11px] font-medium transition-colors shrink-0',
                    selectedTag === tag ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-900'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredEndpoints.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">No matching endpoints found</div>
            ) : (
              filteredEndpoints.map((ep) => {
                const isSelected =
                  selectedEndpoint?.path === ep.path && selectedEndpoint?.method === ep.method;

                return (
                  <button
                    key={`${ep.method}-${ep.path}`}
                    onClick={() => setSelectedEndpoint(ep)}
                    className={cn(
                      'w-full text-left p-2 rounded-lg transition-all flex items-start gap-2 border',
                      isSelected
                        ? 'bg-zinc-900 border-blue-500/50 shadow-sm'
                        : 'bg-zinc-950/40 border-transparent hover:bg-zinc-900/60 hover:border-zinc-800'
                    )}
                  >
                    <span
                      className={cn(
                        'text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border shrink-0',
                        METHOD_COLORS[ep.method]
                      )}
                    >
                      {ep.method}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono text-zinc-200 truncate">{ep.path}</div>
                      {ep.summary && (
                        <div className="text-[11px] text-zinc-500 truncate mt-0.5 font-sans">
                          {ep.summary}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Detail: Endpoint Schema & Sandbox */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950/40 space-y-6">
          {selectedEndpoint ? (
            <div className="space-y-6 max-w-4xl">
              {/* Endpoint Title Bar */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={cn(
                        'text-xs font-mono uppercase font-bold px-2.5 py-1 rounded-md border',
                        METHOD_COLORS[selectedEndpoint.method]
                      )}
                    >
                      {selectedEndpoint.method}
                    </span>
                    <span className="text-base sm:text-lg font-mono font-bold text-zinc-100 break-all">
                      {selectedEndpoint.path}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleSendToApiTester(selectedEndpoint)}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-8 gap-1.5 font-semibold shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Open in API Tester
                  </Button>
                </div>

                {selectedEndpoint.summary && (
                  <p className="text-sm font-medium text-zinc-200">{selectedEndpoint.summary}</p>
                )}

                {selectedEndpoint.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {selectedEndpoint.description}
                  </p>
                )}
              </div>

              {/* Parameters Table */}
              {selectedEndpoint.parameters && selectedEndpoint.parameters.length > 0 && (
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardHeader className="p-3 pb-2 border-b border-zinc-850">
                    <CardTitle className="text-xs uppercase font-bold text-zinc-400">
                      Parameters ({selectedEndpoint.parameters.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-zinc-850 text-xs font-mono">
                    {selectedEndpoint.parameters.map((param) => (
                      <div key={`${param.in}-${param.name}`} className="p-3 flex items-start justify-between gap-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-100">{param.name}</span>
                            <Badge variant="outline" className="text-[9px] font-sans border-zinc-800 text-zinc-400">
                              {param.in}
                            </Badge>
                            {param.required && (
                              <Badge variant="outline" className="text-[9px] font-sans border-rose-800 text-rose-400">
                                REQUIRED
                              </Badge>
                            )}
                          </div>
                          {param.description && (
                            <p className="text-[11px] text-zinc-400 font-sans">{param.description}</p>
                          )}
                        </div>

                        <span className="text-zinc-500 text-[11px]">{param.schema?.type || 'string'}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Request Body Example */}
              {selectedEndpoint.requestBody && (
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardHeader className="p-3 pb-2 border-b border-zinc-850">
                    <CardTitle className="text-xs uppercase font-bold text-zinc-400">
                      Request Body (JSON Schema)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <pre className="p-3 rounded-lg bg-zinc-900 font-mono text-xs text-emerald-400 overflow-x-auto">
                      {JSON.stringify(
                        selectedEndpoint.requestBody.content?.['application/json']?.example ||
                          selectedEndpoint.requestBody.content?.['application/json']?.schema ||
                          {},
                        null,
                        2
                      )}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Response Codes */}
              {selectedEndpoint.responses && (
                <Card className="bg-zinc-950 border-zinc-800">
                  <CardHeader className="p-3 pb-2 border-b border-zinc-850">
                    <CardTitle className="text-xs uppercase font-bold text-zinc-400">Responses</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 divide-y divide-zinc-850 text-xs">
                    {Object.entries(selectedEndpoint.responses).map(([code, resp]) => (
                      <div key={code} className="p-3 flex items-start gap-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-mono text-xs font-bold px-2 py-0.5',
                            code.startsWith('2')
                              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20'
                              : 'border-zinc-800 text-zinc-400'
                          )}
                        >
                          {code}
                        </Badge>
                        <span className="text-zinc-300 font-sans">{resp.description || 'Response payload'}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 py-20 space-y-2">
              <FileCode className="w-10 h-10 opacity-30" />
              <p className="text-sm font-semibold text-zinc-300">Select an API Endpoint</p>
              <p className="text-xs text-zinc-500">
                Choose an endpoint from the left navigation tree to inspect schemas and parameters.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
