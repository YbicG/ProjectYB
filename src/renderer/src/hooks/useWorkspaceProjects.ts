import { useMemo } from 'react';
import { useProjectStore } from '@renderer/stores/useProjectStore';
import { useWorkspaceStore } from '@renderer/stores/useWorkspaceStore';
import type { ProjectInfo } from '@renderer/types/project';
import type { Workspace } from '@renderer/types/workspace';

export function useWorkspaceProjects() {
  const allProjects = useProjectStore((s) => s.projects);
  const isScanning = useProjectStore((s) => s.isScanning);
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useWorkspaceStore();

  const activeWorkspace = useMemo<Workspace | undefined>(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId);
  }, [workspaces, activeWorkspaceId]);

  const isWorkspaceScoped = Boolean(activeWorkspace);

  const projects = useMemo<ProjectInfo[]>(() => {
    if (!activeWorkspace) {
      return allProjects;
    }
    const ids = new Set(activeWorkspace.projectIds || []);
    return allProjects.filter((p) => ids.has(p.id) || ids.has(p.path));
  }, [allProjects, activeWorkspace]);

  return {
    projects,
    allProjects,
    activeWorkspace,
    isWorkspaceScoped,
    isScanning,
    setActiveWorkspace
  };
}
