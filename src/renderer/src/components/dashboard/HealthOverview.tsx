import React, { useMemo } from 'react'
import { FolderGit2, Activity, GitBranch, Clock, Sparkles } from 'lucide-react'
import { useProjectStore } from '@renderer/stores/useProjectStore'
import { useServiceStore } from '@renderer/stores/useServiceStore'
import { useGitStore } from '@renderer/stores/useGitStore'
import { useHealthStore } from '@renderer/stores/useHealthStore'
import { cn } from '@renderer/lib/utils'

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  accent: string
  onClick?: () => void
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, accent, onClick }) => (
  <div
    onClick={onClick}
    className={cn(
      'flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 flex-1 min-w-0',
      'transition-colors hover:border-zinc-700',
      onClick && 'cursor-pointer hover:bg-zinc-800/80 group'
    )}
  >
    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', accent)}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm sm:text-base md:text-lg font-bold leading-none tabular-nums text-zinc-100 truncate">{value}</p>
      <p className="mt-1 truncate text-xs text-zinc-500">{label}</p>
    </div>
  </div>
)

/**
 * Horizontal row of stat cards summarising the health of the workspace.
 * Shows: total projects, running services, projects with git changes, last scan time, and Health Analytics trigger.
 */
export const HealthOverview: React.FC = () => {
  const projects = useProjectStore((s) => s.projects)
  const isScanning = useProjectStore((s) => s.isScanning)
  const runningServices = useServiceStore((s) => s.runningServices)
  const statuses = useGitStore((s) => s.statuses)
  const { setModalOpen } = useHealthStore()

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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
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
        icon={<Sparkles className="h-4 w-4 text-cyan-400" />}
        label="Health & Velocity"
        value="View Radar →"
        accent="bg-cyan-500/10"
        onClick={() => setModalOpen(true)}
      />
    </div>
  )
}
