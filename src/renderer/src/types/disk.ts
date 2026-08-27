export type CleanCategory = 'dependencies' | 'build' | 'caches';

export interface DiskItem {
  name: string;
  relativePath: string;
  fullPath: string;
  category: CleanCategory;
  bytes: number;
}

export interface ProjectDiskUsage {
  projectId: string;
  projectName: string;
  projectPath: string;
  totalBytes: number;
  dependenciesBytes: number;
  buildBytes: number;
  cachesBytes: number;
  sourceBytes: number;
  reclaimableBytes: number;
  items: DiskItem[];
}

export interface GlobalDiskSummary {
  totalAnalyzedBytes: number;
  totalReclaimableBytes: number;
  dependenciesBytes: number;
  buildBytes: number;
  cachesBytes: number;
  projects: ProjectDiskUsage[];
}
