import { app, BrowserWindow } from 'electron';
import * as path from 'path';

import { setupTerminalIpc } from './ipc/terminal.ipc';
import { setupGitIpc } from './ipc/git.ipc';
import { setupGithubIpc } from './ipc/github.ipc';
import { setupProjectsIpc } from './ipc/projects.ipc';
import { setupSystemIpc } from './ipc/system.ipc';
import { setupStoreIpc, getStore } from './ipc/store.ipc';
import { setupWindowIpc } from './ipc/window.ipc';
import { terminalService } from './services/terminal.service';
import { systemMonitor } from './services/system-monitor';

async function createWindow() {
  const store = await getStore();
  const bounds = store.get('windowBounds', { width: 1400, height: 900 }) as { width: number; height: number; x?: number; y?: number };

  const mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 1000,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#09090b',
      symbolColor: '#ffffff'
    },
    backgroundColor: '#09090b',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  });

  mainWindow.on('close', () => {
    store.set('windowBounds', mainWindow.getBounds());
  });

  setupTerminalIpc(mainWindow);
  setupGitIpc();
  setupGithubIpc();
  setupProjectsIpc();
  setupSystemIpc(mainWindow);
  await setupStoreIpc();
  setupWindowIpc(mainWindow);
  
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  terminalService.killAll();
  systemMonitor.stopMonitoring();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
