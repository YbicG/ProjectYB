import si from 'systeminformation';
import { terminalService } from './terminal.service';

export interface DeveloperProcessInfo {
  pid: number;
  parentPid: number;
  name: string;
  command: string;
  cpu: number;
  memoryMb: number;
  terminalId?: string;
  terminalTitle?: string;
}

class SystemMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private lastProcCheckTime = 0;

  startMonitoring(mainWindow: any) {
    if (this.intervalId) this.stopMonitoring();

    this.intervalId = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      try {
        if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) {
          this.isProcessing = false;
          return;
        }

        // Adaptive polling: if minimized or blurred, reduce frequency and skip heavy process scans
        const isMinimized = typeof mainWindow.isMinimized === 'function' && mainWindow.isMinimized();

        const terminals = terminalService.getAllTerminals();
        const hasTerminals = terminals.length > 0;
        const now = Date.now();

        // Only scan processes every 4 seconds when focused, or skip if minimized
        const shouldScanProcesses = hasTerminals && !isMinimized && (now - this.lastProcCheckTime > 3800);

        const promises: [Promise<any>, Promise<any>, Promise<any>, Promise<any>] = [
          si.currentLoad(),
          si.mem(),
          si.networkStats(),
          shouldScanProcesses ? si.processes() : Promise.resolve(null)
        ];

        const [cpu, mem, network, processesData] = await Promise.all(promises);

        if (shouldScanProcesses) {
          this.lastProcCheckTime = now;
        }

        const rx = Array.isArray(network) ? network.reduce((acc, n) => acc + (n.rx_sec || 0), 0) : 0;
        const tx = Array.isArray(network) ? network.reduce((acc, n) => acc + (n.tx_sec || 0), 0) : 0;

        if (!mainWindow.isDestroyed() && mainWindow.webContents) {
          // 1. Send system-wide metrics
          mainWindow.webContents.send('system:metrics', {
            cpu: { usage: Math.round((cpu.currentLoad || 0) * 10) / 10 },
            memory: {
              total: mem.total || 0,
              used: mem.active || 0,
              percentage: mem.total > 0 ? (mem.active / mem.total) * 100 : 0
            },
            network: { rxSec: rx, txSec: tx }
          });

          // 2. If terminals exist and process list is available, calculate tree stats per terminal
          if (hasTerminals && processesData && Array.isArray(processesData.list)) {
            const procList = processesData.list;
            const childrenMap = new Map<number, number[]>();
            const procByPid = new Map<number, any>();

            for (const p of procList) {
              procByPid.set(p.pid, p);
              if (!childrenMap.has(p.parentPid)) childrenMap.set(p.parentPid, []);
              childrenMap.get(p.parentPid)!.push(p.pid);
            }

            const statsMap: Record<string, { cpu: number; memory: number }> = {};

            for (const term of terminals) {
              if (!term.pid) continue;
              let totalCpu = 0;
              let totalRssKb = 0;

              const queue = [term.pid];
              const visited = new Set<number>();

              while (queue.length > 0) {
                const curr = queue.shift()!;
                if (visited.has(curr)) continue;
                visited.add(curr);

                const p = procByPid.get(curr);
                if (p) {
                  totalCpu += p.cpu || 0;
                  totalRssKb += p.memRss || 0;
                }

                const children = childrenMap.get(curr);
                if (children) {
                  for (const c of children) queue.push(c);
                }
              }

              statsMap[term.id] = {
                cpu: Math.round(totalCpu * 10) / 10,
                memory: Math.round(totalRssKb / 1024) // in MB
              };
            }

            mainWindow.webContents.send('system:service-stats', statsMap);
          }
        }
      } catch (error) {
        console.error('Error fetching system metrics', error);
      } finally {
        this.isProcessing = false;
      }
    }, 2500);
  }

  async getAllDeveloperProcesses(): Promise<DeveloperProcessInfo[]> {
    try {
      const terminals = terminalService.getAllTerminals();
      const termMap = new Map(terminals.map((t) => [t.pid, t]));

      const processesData = await si.processes();
      if (!processesData || !Array.isArray(processesData.list)) return [];

      const procList = processesData.list;
      const childrenMap = new Map<number, number[]>();
      const procByPid = new Map<number, any>();

      for (const p of procList) {
        procByPid.set(p.pid, p);
        if (!childrenMap.has(p.parentPid)) childrenMap.set(p.parentPid, []);
        childrenMap.get(p.parentPid)!.push(p.pid);
      }

      const results: DeveloperProcessInfo[] = [];

      for (const [pid, term] of termMap) {
        const queue = [pid];
        const visited = new Set<number>();

        while (queue.length > 0) {
          const curr = queue.shift()!;
          if (visited.has(curr)) continue;
          visited.add(curr);

          const p = procByPid.get(curr);
          if (p) {
            results.push({
              pid: p.pid,
              parentPid: p.parentPid,
              name: p.name || 'node',
              command: p.command || '',
              cpu: Math.round((p.cpu || 0) * 10) / 10,
              memoryMb: Math.round((p.memRss || 0) / 1024),
              terminalId: term.id,
              terminalTitle: term.name || term.projectName || 'Terminal'
            });
          }

          const children = childrenMap.get(curr);
          if (children) {
            for (const c of children) queue.push(c);
          }
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  async getProcessStats(pids: number[]) {
    try {
      const processes = await si.processes();
      return processes.list.filter(p => pids.includes(p.pid)).map(p => ({
        pid: p.pid,
        cpu: p.cpu,
        memory: p.mem
      }));
    } catch (error) {
      console.error('Error fetching process stats', error);
      return [];
    }
  }

  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const systemMonitor = new SystemMonitor();
