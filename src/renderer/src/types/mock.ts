export interface MockRoute {
  id: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  statusCode: number;
  responseBody: string;
  delayMs?: number;
  enabled: boolean;
}

export interface WebhookEvent {
  id: string;
  timestamp: number;
  method: string;
  path: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: string;
  ip: string;
  matchedRoute?: string;
}

export interface MockServerStatus {
  running: boolean;
  port: number;
  routesCount: number;
  webhooksCount: number;
}
