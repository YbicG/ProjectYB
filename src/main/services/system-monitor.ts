import si from 'systeminformation';
import { terminalService } from './terminal.service';

class SystemMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  startMonitoring(mainWindow: any, intervalMs: number = 2000) {
    if (this.intervalId) this.stopMonitoring();

    this.intervalId = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      try {
        if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) {
          this.isProcessing = false;
          return;
        }

        const terminals = terminalService.getAllTerminals();
        const hasTerminals = terminals.length > 0;

        const promises: [Promise<any>, Promise<any>, Promise<any>, Promise<any>] = [
          si.currentLoad(),
          si.mem(),
          si.networkStats(),
          hasTerminals ? si.processes() : Promise.resolve(null)
        ];

        const [cpu, mem, network, processesData] = await Promise.all(promises);

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
    }, intervalMs);
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
