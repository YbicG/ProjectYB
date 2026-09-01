import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import { PortResolverService, portResolverService } from '../src/main/services/port-resolver.service';

describe('PortResolverService', () => {
  let service: PortResolverService;
  let tempDir: string;

  beforeEach(() => {
    service = new PortResolverService();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'projectyb-port-test-'));
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('isPortFree & findAvailablePort', () => {
    it('detects a free port vs an occupied port', async () => {
      // Find a free port first
      const freePort = await service.findAvailablePort(49152, 49200);
      expect(freePort).toBeGreaterThanOrEqual(49152);

      const isInitiallyFree = await service.isPortFree(freePort);
      expect(isInitiallyFree).toBe(true);

      // Start a server on that port
      const server = net.createServer();
      await new Promise<void>((resolve) => {
        server.listen(freePort, '127.0.0.1', () => resolve());
      });

      try {
        const isOccupied = await service.isPortFree(freePort);
        expect(isOccupied).toBe(false);

        // findAvailablePort should skip the occupied port and find the next one
        const nextPort = await service.findAvailablePort(freePort, freePort + 10);
        expect(nextPort).toBeGreaterThan(freePort);
        expect(await service.isPortFree(nextPort)).toBe(true);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });

    it('returns startPort + 1 if no port is free in the range', async () => {
      // Stub isPortFree to return false
      const origIsPortFree = service.isPortFree;
      service.isPortFree = async () => false;

      const port = await service.findAvailablePort(3000, 3005);
      expect(port).toBe(3001);

      service.isPortFree = origIsPortFree;
    });
  });

  describe('updateEnvPort', () => {
    it('updates existing PORT in .env and captures oldPort', async () => {
      const initialEnv = [
        '# Server Configuration',
        'NODE_ENV=development',
        'PORT=3000',
        'DATABASE_URL=postgres://localhost:5432/db'
      ].join('\n');

      fs.writeFileSync(path.join(tempDir, '.env'), initialEnv);

      const res = await service.updateEnvPort(tempDir, 3001);
      expect(res.success).toBe(true);
      expect(res.oldPort).toBe(3000);
      expect(res.message).toContain('3001');

      const updated = fs.readFileSync(path.join(tempDir, '.env'), 'utf8');
      expect(updated).toContain('PORT=3001');
      expect(updated).not.toContain('PORT=3000');
      expect(updated).toContain('NODE_ENV=development');
      expect(updated).toContain('DATABASE_URL=postgres://localhost:5432/db');
    });

    it('updates existing VITE_PORT in .env and captures oldPort', async () => {
      const initialEnv = [
        'VITE_APP_TITLE=ProjectYB',
        'VITE_PORT=5173'
      ].join('\n');

      fs.writeFileSync(path.join(tempDir, '.env'), initialEnv);

      const res = await service.updateEnvPort(tempDir, 5174);
      expect(res.success).toBe(true);
      expect(res.oldPort).toBe(5173);

      const updated = fs.readFileSync(path.join(tempDir, '.env'), 'utf8');
      expect(updated).toContain('VITE_PORT=5174');
    });

    it('appends PORT to .env when no port variable exists', async () => {
      const initialEnv = 'API_SECRET=mysecret123\n';
      fs.writeFileSync(path.join(tempDir, '.env'), initialEnv);

      const res = await service.updateEnvPort(tempDir, 8080);
      expect(res.success).toBe(true);
      expect(res.oldPort).toBeUndefined();

      const updated = fs.readFileSync(path.join(tempDir, '.env'), 'utf8');
      expect(updated).toContain('API_SECRET=mysecret123');
      expect(updated).toContain('PORT=8080');
    });

    it('creates a new .env file with PORT if none exists', async () => {
      const res = await service.updateEnvPort(tempDir, 4000);
      expect(res.success).toBe(true);

      const envFile = path.join(tempDir, '.env');
      expect(fs.existsSync(envFile)).toBe(true);
      expect(fs.readFileSync(envFile, 'utf8')).toContain('PORT=4000');
    });

    it('handles write failure gracefully for invalid directory paths', async () => {
      const invalidPath = path.join(tempDir, 'does-not-exist', 'deep-dir');
      const res = await service.updateEnvPort(invalidPath, 3000);
      expect(res.success).toBe(false);
      expect(res.message).toContain('Failed to update .env');
    });
  });

  describe('getPortProcess & killPortProcess', () => {
    it('returns null when no process is holding an unused port', async () => {
      const unusedPort = 59123;
      const proc = await service.getPortProcess(unusedPort);
      expect(proc).toBeNull();
    });

    it('returns failure when attempting to kill an unused port', async () => {
      const unusedPort = 59124;
      const res = await service.killPortProcess(unusedPort);
      expect(res.success).toBe(false);
      expect(res.message).toContain('No process found');
    });
  });
});
