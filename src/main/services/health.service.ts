import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';

export interface ProjectActivitySummary {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface StaleProjectInfo {
  id: string;
  name: string;
  path: string;
  type: string;
  daysInactive: number;
  lastCommitMessage?: string;
  lastCommitDate?: string;
}

export interface HealthOverviewData {
  healthScore: number; // 0 - 100
  totalProjects: number;
  gitProjects: number;
  cleanProjects: number;
  dirtyProjects: number;
  staleCount: number;
  staleProjects: StaleProjectInfo[];
  activityTimeline: ProjectActivitySummary[];
  ecosystemBreakdown: Record<string, number>;
  generatedAt: number;
}

export class HealthService {
  /**
   * Generates a comprehensive health and activity report across all projects.
   */
  async getHealthOverview(projects: Array<{ id: string; name: string; path: string; type: string; isGitRepo?: boolean }>): Promise<HealthOverviewData> {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    let gitProjectsCount = 0;
    let cleanProjectsCount = 0;
    let dirtyProjectsCount = 0;
    const staleProjects: StaleProjectInfo[] = [];
    const dateCommitMap: Record<string, number> = {};
    const ecosystemBreakdown: Record<string, number> = {};

    // Initialize 30-day timeline with 0s
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      dateCommitMap[dateStr] = 0;
    }

    for (const proj of projects) {
      // Tally ecosystem
      const eco = proj.type || 'other';
      ecosystemBreakdown[eco] = (ecosystemBreakdown[eco] || 0) + 1;

      // Check if git repo
      const gitDir = path.join(proj.path, '.git');
      const isGit = proj.isGitRepo ?? fs.existsSync(gitDir);

      if (!isGit) continue;

      gitProjectsCount++;
      try {
        const git = simpleGit({ baseDir: proj.path, binary: 'git', maxConcurrentProcesses: 2 });
        const [status, log] = await Promise.all([
          git.status().catch(() => null),
          git.log({ maxCount: 30 }).catch(() => null)
        ]);

        if (status) {
          const isClean = status.isClean();
          if (isClean) cleanProjectsCount++;
          else dirtyProjectsCount++;
        }

        if (log && log.latest) {
          const lastCommitTime = new Date(log.latest.date).getTime();
          const daysInactive = Math.floor((now - lastCommitTime) / (24 * 60 * 60 * 1000));

          if (daysInactive > 30) {
            staleProjects.push({
              id: proj.id,
              name: proj.name,
              path: proj.path,
              type: proj.type,
              daysInactive,
              lastCommitMessage: log.latest.message,
              lastCommitDate: log.latest.date
            });
          }

          // Aggregate commits within last 30 days
          for (const entry of log.all) {
            const commitTime = new Date(entry.date).getTime();
            if (commitTime >= thirtyDaysAgo) {
              const dateStr = new Date(commitTime).toISOString().split('T')[0];
              if (dateCommitMap[dateStr] !== undefined) {
                dateCommitMap[dateStr]++;
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[HealthService] Error scanning project ${proj.name}:`, err);
      }
    }

    // Sort stale projects by longest inactivity
    staleProjects.sort((a, b) => b.daysInactive - a.daysInactive);

    // Format timeline array
    const activityTimeline: ProjectActivitySummary[] = Object.entries(dateCommitMap).map(([date, count]) => ({
      date,
      count
    }));

    // Calculate composite Health Score (0 - 100)
    // 40% git cleanliness + 40% activity/non-stale + 20% total tracked coverage
    let healthScore = 100;
    if (projects.length > 0) {
      const gitRatio = gitProjectsCount / projects.length;
      const cleanRatio = gitProjectsCount > 0 ? cleanProjectsCount / gitProjectsCount : 1;
      const activeRatio = gitProjectsCount > 0 ? (gitProjectsCount - staleProjects.length) / gitProjectsCount : 1;

      healthScore = Math.round(
        (cleanRatio * 40) +
        (activeRatio * 40) +
        (gitRatio * 20)
      );
    }

    return {
      healthScore: Math.min(100, Math.max(0, healthScore)),
      totalProjects: projects.length,
      gitProjects: gitProjectsCount,
      cleanProjects: cleanProjectsCount,
      dirtyProjects: dirtyProjectsCount,
      staleCount: staleProjects.length,
      staleProjects,
      activityTimeline,
      ecosystemBreakdown,
      generatedAt: now
    };
  }
}

export const healthService = new HealthService();
