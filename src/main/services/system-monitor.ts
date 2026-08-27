import si from 'systeminformation';

class SystemMonitor {
  private intervalId: NodeJS.Timeout | null = null;

  startMonitoring(callback: (metrics: any) => void, intervalMs: number = 3000) {
    if (this.intervalId) this.stopMonitoring();

    this.intervalId = setInterval(async () => {
      try {
        const [cpu, mem, network] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.networkStats()
        ]);

        const rx = network.reduce((acc, n) => acc + (n.rx_sec || 0), 0);
        const tx = network.reduce((acc, n) => acc + (n.tx_sec || 0), 0);

        callback({
          cpu: { currentLoad: cpu.currentLoad },
          memory: {
            total: mem.total,
            used: mem.active,
            percentage: (mem.active / mem.total) * 100
          },
          network: { rx, tx }
        });
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
