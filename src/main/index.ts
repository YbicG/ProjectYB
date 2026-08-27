import { app, BrowserWindow, shell } from 'electron';
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
import { trayService } from './services/tray.service';

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  let bounds = { width: 1400, height: 900 } as { width: number; height: number; x?: number; y?: number };
  
  try {
    const store = await getStore();
    bounds = store.get('windowBounds', bounds) as typeof bounds;
  } catch (err) {
    console.error('Failed to load store, using defaults:', err);
  }

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 1000,
    minHeight: 600,
    icon: trayService.getAppIcon(),
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

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  trayService.init(mainWindow);

  setupTerminalIpc(mainWindow);
  setupGitIpc();
  setupGithubIpc();
  setupProjectsIpc();
  setupSystemIpc(mainWindow);
  
  try {
    await setupStoreIpc();
  } catch (err) {
    console.error('Failed to setup store IPC:', err);
  }
  
  setupWindowIpc(mainWindow);

  // Open DevTools in dev mode
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
  
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', async function () {
    if (mainWindow) {
      trayService.showWindow(mainWindow);
    } else if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('before-quit', () => {
  trayService.setQuitting(true);
  trayService.destroy();
  terminalService.killAll();
  systemMonitor.stopMonitoring();
});

app.on('window-all-closed', () => {
  if (trayService.isAppQuitting || process.platform === 'darwin') {
    app.quit();
  }
});
