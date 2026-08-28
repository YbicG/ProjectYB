export interface ProxyRoute {
  id: string;
  hostname: string;
  targetPort: number;
  targetHost?: string;
  useHttps: boolean;
  enabled: boolean;
  requestCount?: number;
  lastActive?: string;
  createdAt: string;
}

export interface ProxyStatus {
  running: boolean;
  httpPort: number;
  httpsPort: number;
  routesCount: number;
  activeConnections: number;
}
