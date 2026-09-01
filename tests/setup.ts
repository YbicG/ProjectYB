import { vi } from 'vitest';
import * as fs from 'fs';

// Mock electron
vi.mock('electron', () => {
  const createMockNativeImage = (filePath?: string) => {
    let exists = false;
    let size = 0;
    if (filePath && fs.existsSync(filePath)) {
      exists = true;
      try {
        size = fs.statSync(filePath).size;
      } catch {}
    }
    const isEmptyVal = !exists || size === 0;

    const mockImg = {
      isEmpty: () => isEmptyVal,
      resize: (options?: { width?: number; height?: number; quality?: string }) => ({
        toPNG: () => Buffer.from(`mock-png-data-${options?.width || 32}x${options?.height || 32}`),
        toJPEG: (quality?: number) => Buffer.from(`mock-jpeg-data-${quality || 90}`)
      }),
      toPNG: () => Buffer.from('mock-png-data'),
      toJPEG: (quality?: number) => Buffer.from(`mock-jpeg-data-${quality || 90}`)
    };

    return mockImg;
  };

  return {
    nativeImage: {
      createFromPath: vi.fn((p: string) => createMockNativeImage(p)),
      createEmpty: vi.fn(() => createMockNativeImage())
    },
    BrowserWindow: vi.fn().mockImplementation(() => ({
      webContents: {
        send: vi.fn()
      },
      on: vi.fn(),
      loadURL: vi.fn(),
      loadFile: vi.fn()
    })),
    app: {
      getPath: vi.fn((name: string) => `/mock/path/${name}`),
      getVersion: vi.fn(() => '1.0.0'),
      getName: vi.fn(() => 'ProjectYB')
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
      removeHandler: vi.fn()
    }
  };
});

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    warning: vi.fn()
  }
}));

// Setup global window for renderer tests running in Node environment
if (typeof globalThis.window === 'undefined') {
  (globalThis as any).window = {};
}
