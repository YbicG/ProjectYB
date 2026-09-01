import React, { useEffect, useState } from 'react'
import {
  Radio,
  RefreshCw,
  Search,
  Zap,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Activity,
  Globe
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { PortCard } from './PortCard'
import { PortCollisionDialog } from './PortCollisionDialog'
import { AlertTriangle } from 'lucide-react'
import { usePortStore, COMMON_DEV_PORTS } from '@renderer/stores/usePortStore'
import { cn } from '@renderer/lib/utils'

export const PortManager: React.FC = () => {
  const {
    ports,
    isLoading,
    search,
    filter,
    suggestedPort,
    isSuggesting,
    fetchPorts,
    findSuggestedPort,
    setSearch,
    setFilter
  } = usePortStore()

  const [testPortStart, setTestPortStart] = useState<string>('3000')
  const [collisionModalOpen, setCollisionModalOpen] = useState(false)
  const [targetPortToResolve, setTargetPortToResolve] = useState<number>(3000)

  useEffect(() => {
    fetchPorts()
  }, [])

  const handleSuggest = () => {
    const start = parseInt(testPortStart, 10) || 3000
    findSuggestedPort(start)
  }

  const isDevPort = (p: any) => {
    if (COMMON_DEV_PORTS.has(p.port)) return true
    const name = (p.processName || '').toLowerCase()
    return ['node.exe', 'node', 'python.exe', 'python', 'go.exe', 'cargo.exe', 'mysqld.exe', 'postgres.exe', 'redis-server.exe', 'deno.exe', 'bun.exe', 'java.exe', 'php.exe'].includes(name)
  }

  const devPortsCount = ports.filter(isDevPort).length

  const filteredPorts = ports.filter((p) => {
    // Filter mode
    if (filter === 'dev' && !isDevPort(p)) return false
    if (filter === 'system' && isDevPort(p)) return false

    // Search query
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.port.toString().includes(q) ||
      p.processName.toLowerCase().includes(q) ||
      p.pid.toString().includes(q) ||
      p.localAddress.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950 text-zinc-50">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-violet-400" />
            <h1 className="text-xl font-bold tracking-tight">Active Ports & Conflict Detector</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time scanner for system TCP listening ports, running processes, and available port suggestions.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Free Port Finder Helper */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <span className="text-[11px] text-zinc-400 font-mono pl-2">Find free:</span>
            <input
              type="number"
              value={testPortStart}
              onChange={(e) => setTestPortStart(e.target.value)}
              className="w-16 h-7 bg-zinc-950 border border-zinc-800 rounded text-center text-xs font-mono text-zinc-100 outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="3000"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSuggest}
              disabled={isSuggesting}
              className="h-7 text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-200"
            >
              {isSuggesting ? 'Checking…' : 'Check'}
            </Button>
            {suggestedPort !== null && (
              <Badge className="bg-emerald-950/80 border-emerald-800 text-emerald-300 text-xs font-mono py-0.5 px-2">
                Available: :{suggestedPort}
              </Badge>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchPorts}
            disabled={isLoading}
            className="h-9 border-zinc-700 hover:bg-zinc-800 text-zinc-200 gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Sub-header: Search and Filters ── */}
      <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-950/50 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <Input
              placeholder="Filter by port, process name, or PID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 bg-zinc-900 border-zinc-800 text-xs font-mono"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
              filter === 'all'
                ? 'bg-violet-600 text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            All Ports
            <span className="text-[10px] opacity-75 font-mono">({ports.length})</span>
          </button>

          <button
            onClick={() => setFilter('dev')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5',
              filter === 'dev'
                ? 'bg-violet-600 text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            Dev & Web Ports
            <span className="text-[10px] opacity-75 font-mono">({devPortsCount})</span>
          </button>

          <button
            onClick={() => setFilter('system')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              filter === 'system'
                ? 'bg-violet-600 text-white font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            System
          </button>
        </div>
      </div>

      {/* ── Main Content Grid ── */}
      <div className="flex-1 p-6 overflow-y-auto">
        {isLoading && ports.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-700" />
            <p className="text-sm">Scanning active network ports…</p>
          </div>
        ) : filteredPorts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-2">
            <Radio className="w-8 h-8 text-zinc-700" />
            <p className="text-sm">No listening ports matched your filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPorts.map((portInfo) => (
              <PortCard key={`${portInfo.protocol}-${portInfo.port}`} portInfo={portInfo} />
            ))}
          </div>
        )}
      </div>

      <PortCollisionDialog
        open={collisionModalOpen}
        onOpenChange={setCollisionModalOpen}
        port={targetPortToResolve}
        projectPath=""
        projectName="Active Port"
        onResolved={() => fetchPorts()}
      />
    </div>
  )
}
