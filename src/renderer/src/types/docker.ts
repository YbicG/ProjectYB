export interface DockerStatus {
  available: boolean;
  running: boolean;
  version?: string;
  containers?: number;
  images?: number;
}

export interface ComposeService {
  id: string;
  name: string;
  service: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'unknown';
  status: string;
  image: string;
  ports: string;
  publishers: { url: string; targetPort: number; publishedPort: number; protocol: string }[];
}

export interface DatabaseProbeResult {
  success: boolean;
  protocol: string;
  host: string;
  port: number;
  database?: string;
  responseTimeMs: number;
  error?: string;
}
