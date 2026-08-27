import React, { useState } from 'react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Globe,
  Server,
  Activity,
  AlertTriangle,
  Cpu
} from 'lucide-react'
import { usePortStore, COMMON_DEV_PORTS } from '@renderer/stores/usePortStore'
import { cn } from '@renderer/lib/utils'
import { toast } from 'sonner'
import type { PortInfo } from '@renderer/types/port'

interface PortCardProps {
  portInfo: PortInfo
}

export const PortCard: React.FC<PortCardProps> = ({ portInfo }) => {
  const { killPort } = usePortStore()
  const [copied, setCopied] = useState(false)
  const [isKilling, setIsKilling] = useState(false)

  const isDevPort = COMMON_DEV_PORTS.has(portInfo.port)
  const isSystemProcess = portInfo.pid <= 4 || portInfo.processName === 'System' || portInfo.processName === 'Idle'

  const handleOpenBrowser = () => {
    window.open(`http://localhost:${portInfo.port}`, '_blank')
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(`http://localhost:${portInfo.port}`)
    setCopied(true)
    toast.success(`Copied http://localhost:${portInfo.port}`)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKill = async () => {
    if (isSystemProcess) {
      toast.error('Cannot terminate system critical process')
      return
    }
    setIsKilling(true)
    await killPort(portInfo.pid, portInfo.port)
    setIsKilling(false)
  }

  return (
    <Card
      className={cn(
        'bg-zinc-950 border transition-all duration-200 hover:border-zinc-700',
        isDevPort ? 'border-violet-500/30 bg-violet-950/10' : 'border-zinc-800/80'
      )}
    >
      <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
        {/* Top row: Port Number & Badges */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'h-9 w-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm border',
                isDevPort
                  ? 'bg-violet-500/15 border-violet-500/30 text-violet-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              )}
            >
              :{portInfo.port}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-zinc-100 font-mono">
                  {portInfo.processName}
                </span>
                {isDevPort && (
                  <Badge
                    variant="outline"
                    className="bg-cyan-950/40 border-cyan-800 text-cyan-300 text-[10px] py-0 px-1 font-mono"
                  >
                    DEV
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                <Cpu className="w-3 h-3 text-zinc-600" />
                PID: <span className="text-zinc-400">{portInfo.pid}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500 uppercase text-[10px]">{portInfo.protocol}</span>
              </p>
            </div>
          </div>

          <Badge
            variant="outline"
            className="bg-emerald-950/30 border-emerald-800/60 text-emerald-400 text-[10px] font-mono"
          >
            LISTEN
          </Badge>
        </div>

        {/* Address info */}
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded px-2.5 py-1.5 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
          <span className="truncate">{portInfo.localAddress}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyUrl}
            className="h-5 w-5 text-zinc-500 hover:text-zinc-300 shrink-0"
            title="Copy http://localhost:PORT"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-800/60">
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenBrowser}
            className="flex-1 h-8 text-xs border-zinc-700 hover:bg-zinc-900 text-zinc-200 gap-1.5"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            Open Browser
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleKill}
            disabled={isKilling || isSystemProcess}
            className={cn(
              'h-8 text-xs border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-900 hover:bg-rose-950/20 px-2.5',
              isSystemProcess && 'opacity-40 cursor-not-allowed'
            )}
            title={isSystemProcess ? 'System process cannot be terminated' : 'Kill process holding this port'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
