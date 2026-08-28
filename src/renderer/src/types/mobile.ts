export interface MobileCredentials {
  username: string;
  rawPasswordDisplay?: string;
}

export interface MobileCompanionStatus {
  running: boolean;
  port: number;
  localUrl: string;
  publicUrl?: string;
  tunnelType?: 'quick' | 'named';
  tunnelId?: string;
  username: string;
  activeSessions: number;
}
