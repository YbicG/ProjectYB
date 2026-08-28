export interface CloudflareBinaryStatus {
  installed: boolean;
  version?: string;
  binaryPath?: string;
  source: 'system' | 'embedded' | 'missing';
}

export type TunnelType = 'quick' | 'named';
export type TunnelStatus = 'starting' | 'connected' | 'error' | 'stopped';
export type TunnelProtocol = 'http' | 'https' | 'tcp';

export interface ActiveTunnel {
  id: string;
  name: string;
  type: TunnelType;
  localPort: number;
  localHost: string;
  protocol: TunnelProtocol;
  publicUrl?: string;
  status: TunnelStatus;
  pid?: number;
  startedAt: number;
  error?: string;
  customHostname?: string;
  tunnelToken?: string;
  serviceId?: string;
  serviceName?: string;
  projectName?: string;
}

export interface RemoteTunnelInfo {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  connectionsCount?: number;
}

export interface CloudflareAccount {
  id: string;
  name: string;
}

export interface CloudflareConfig {
  apiToken?: string;
  accountId?: string;
  defaultDomain?: string;
  autoStartOnBoot?: boolean;
}
