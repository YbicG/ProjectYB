export interface ProjectActivityPoint {
  date: string;
  count: number;
}

export interface StaleProject {
  id: string;
  name: string;
  path: string;
  type: string;
  daysInactive: number;
  lastCommitMessage?: string;
  lastCommitDate?: string;
}

export interface HealthOverview {
  healthScore: number;
  totalProjects: number;
  gitProjects: number;
  cleanProjects: number;
  dirtyProjects: number;
  staleCount: number;
  staleProjects: StaleProject[];
  activityTimeline: ProjectActivityPoint[];
  ecosystemBreakdown: Record<string, number>;
  generatedAt: number;
}
