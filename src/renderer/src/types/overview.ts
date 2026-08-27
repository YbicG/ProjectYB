export interface TelemetryPoint {
  timestamp: number;
  cpu: number;
  ramPercent: number;
  ramGB: number;
  rxKB: number;
  txKB: number;
}

export interface WallboardConfig {
  kioskMode: boolean;
  refreshRateSec: number;
  showSparklines: boolean;
  showServices: boolean;
  showGitFeed: boolean;
  showPorts: boolean;
  showDocker: boolean;
  showClock: boolean;
  gridCols: 2 | 3 | 4;
}
