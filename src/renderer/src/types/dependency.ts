export type PackageEcosystem = 'npm' | 'pypi' | 'cargo' | 'go' | 'unknown';

export interface InstalledPackage {
  name: string;
  version: string;
  type: 'dependency' | 'devDependency' | 'peerDependency' | 'optional';
  ecosystem: PackageEcosystem;
}

export interface OutdatedPackage {
  name: string;
  current: string;
  wanted: string;
  latest: string;
  packageType: 'dependency' | 'devDependency' | 'peerDependency' | 'optional';
  isBreaking: boolean;
  ecosystem: PackageEcosystem;
}

export interface SecurityVulnerability {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'moderate' | 'low' | 'info';
  title: string;
  url?: string;
  advisory?: string;
  fixAvailable: boolean | string;
  affectedVersions?: string;
  patchedVersions?: string;
  ecosystem: PackageEcosystem;
}

export interface AuditSummary {
  vulnerabilities: SecurityVulnerability[];
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
}

export interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  author?: string;
  keywords?: string[];
  links?: {
    npm?: string;
    homepage?: string;
    repository?: string;
  };
}
