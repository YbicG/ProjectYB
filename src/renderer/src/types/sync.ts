export interface CloudVaultPayload {
  version: string;
  createdAt: string;
  data: {
    scanPaths?: string[];
    scanPathModes?: Record<string, 'git' | 'all'>;
    pinnedProjects?: string[];
    databaseConnections?: any[];
    pipelines?: any[];
    snippets?: any[];
    workspaceStacks?: any[];
    runConfigs?: any[];
    mockRoutes?: any[];
    customTheme?: any;
  };
}

export interface EncryptedBundle {
  algorithm: 'aes-256-gcm';
  iv: string;
  authTag: string;
  ciphertext: string;
  createdAt: string;
}

export interface SyncStatus {
  lastBackupDate?: string;
  lastGistId?: string;
  lastGistUrl?: string;
}
