import React, { useMemo } from 'react'
import { FolderGit2, Activity, GitBranch, Clock } from 'lucide-react'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useGitStore } from '@renderer/stores/useGitStore'
import { cn } from '@renderer/lib/utils'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  accent: string
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, accent }) => (
  <div
    className={cn(
      'flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 flex-1 min-w-0',
      'transition-colors hover:border-zinc-700'
    )}
  >
    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', accent)}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-1 truncate text-xs text-zinc-500">{label}</p>
    </div>
  </div>
)

/**
 * Horizontal row of stat cards summarising the health of the workspace.
 * Shows: total projects, running services, projects with git changes, last scan time.
 */
export const HealthOverview: React.FC = () => {
  const projects = useProjectStore((s) => s.projects)
  const isScanning = useProjectStore((s) => s.isScanning)
  const runningServices = useServiceStore((s) => s.runningServices)
  const statuses = useGitStore((s) => s.statuses)

  const projectsWithChanges = useMemo(() => {
    let count = 0
    statuses.forEach((status) => {
      if (!status.isClean) count++
    })
    return count
  }, [statuses])

  const lastScan = useMemo(() => {
    if (isScanning) return 'Scanning…'
    if (projects.length === 0) return 'Never'
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [isScanning, projects.length])

  return (
    <div className="flex gap-3 flex-wrap">
      <StatCard
        icon={<FolderGit2 className="h-4 w-4 text-violet-400" />}
        label="Total Projects"
        value={projects.length}
        accent="bg-violet-500/10"
      />
      <StatCard
        icon={<Activity className="h-4 w-4 text-green-400" />}
        label="Running Services"
        value={runningServices.length}
        accent="bg-green-500/10"
      />
      <StatCard
        icon={<GitBranch className="h-4 w-4 text-yellow-400" />}
        label="With Git Changes"
        value={projectsWithChanges}
        accent="bg-yellow-500/10"
      />
      <StatCard
        icon={<Clock className="h-4 w-4 text-zinc-400" />}
        label="Last Scan"
        value={lastScan}
        accent="bg-zinc-800"
      />
    </div>
  )
}
