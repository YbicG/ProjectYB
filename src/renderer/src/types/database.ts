export type DatabaseEngine = 'sqlite' | 'postgres' | 'mysql' | 'redis' | 'mongodb';

export interface DatabaseConnection {
  id: string;
  name: string;
  engine: DatabaseEngine;
  connectionString?: string;
  filePath?: string;
  maskedUri?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  projectId?: string;
  projectName?: string;
  envSource?: string;
  source: 'auto-discovered' | 'manual' | 'docker';
  createdAt: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  durationMs: number;
  error?: string;
}

export interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimary: boolean;
}

export interface TableSchema {
  name: string;
  type: 'table' | 'view' | 'collection';
  columns: TableColumn[];
  rowCount?: number;
}

export interface RedisKeyItem {
  key: string;
  type: string;
  ttl: number;
  value?: any;
}
