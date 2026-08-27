import si from 'systeminformation';

class SystemMonitor {
  private intervalId: NodeJS.Timeout | null = null;

  startMonitoring(mainWindow: any, intervalMs: number = 2000) {
    if (this.intervalId) this.stopMonitoring();

    this.intervalId = setInterval(async () => {
      try {
        if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents) {
          return;
        }

        const [cpu, mem, network] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.networkStats()
        ]);

        const rx = Array.isArray(network) ? network.reduce((acc, n) => acc + (n.rx_sec || 0), 0) : 0;
        const tx = Array.isArray(network) ? network.reduce((acc, n) => acc + (n.tx_sec || 0), 0) : 0;

        if (!mainWindow.isDestroyed() && mainWindow.webContents) {
          mainWindow.webContents.send('system:metrics', {
            cpu: { usage: cpu.currentLoad || 0 },
            memory: {
              total: mem.total || 0,
              used: mem.active || 0,
              percentage: mem.total > 0 ? (mem.active / mem.total) * 100 : 0
            },
            network: { rxSec: rx, txSec: tx }
          });
        }
      } catch (error) {
        console.error('Error fetching system metrics', error);
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
