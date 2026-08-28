import { app, BrowserWindow, Menu, Tray, nativeImage, NativeImage, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getStore } from '../ipc/store.ipc';

// Embedded 32x32 PNG icon in base64 (ProjectYB logo — >Y_ terminal mark)
const TRAY_ICON_BASE64 = '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';

export class TrayService {
  private tray: Tray | null = null;
  private isQuitting: boolean = false;
  private hasShownNotice: boolean = false;

  get isAppQuitting(): boolean {
    return this.isQuitting;
  }

  setQuitting(quitting: boolean) {
    this.isQuitting = quitting;
  }

  getAppIcon(): NativeImage {
    // Check file system first
    const possiblePaths = [
      path.join(__dirname, '../../resources/icon.png'),
      path.join(__dirname, '../resources/icon.png'),
      path.join(process.resourcesPath, 'resources/icon.png'),
      path.join(process.resourcesPath, 'icon.png'),
      path.join(__dirname, 'icon.png')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          const img = nativeImage.createFromPath(p);
          if (!img.isEmpty()) return img;
        } catch {}
      }
    }

    // Direct base64 fallback
    return nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`);
  }

  init(mainWindow: BrowserWindow) {
    if (this.tray) return;

    const icon = this.getAppIcon().resize({ width: 16, height: 16 });
    this.tray = new Tray(icon);
    this.tray.setToolTip('ProjectYB — Desktop Project Manager');

    this.updateContextMenu(mainWindow);

    // Click / Double click to restore window
    this.tray.on('click', () => {
      this.showWindow(mainWindow);
    });

    this.tray.on('double-click', () => {
      this.showWindow(mainWindow);
    });

    // Intercept window close to minimize to tray
    mainWindow.on('close', async (event) => {
      if (this.isQuitting) {
        return; // Allow real quit
      }

      try {
        const store = await getStore();
        const minimizeToTray = store.get('minimizeToTray', true);

        if (minimizeToTray !== false) {
          event.preventDefault();
          if (!mainWindow.isDestroyed()) {
            store.set('windowBounds', mainWindow.getBounds());
            mainWindow.hide();
          }

          if (!this.hasShownNotice) {
            this.hasShownNotice = true;
            if (Notification.isSupported()) {
              const notice = new Notification({
                title: 'ProjectYB Running in Background',
                body: 'ProjectYB is minimized to your system tray. Right-click the tray icon to fully close it.',
                icon: this.getAppIcon()
              });
              notice.on('click', () => this.showWindow(mainWindow));
              notice.show();
            }
          }
        }
      } catch (e) {
        console.error('Error handling window close in TrayService:', e);
      }
    });
  }

  showWindow(mainWindow: BrowserWindow) {
    if (mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.show();
    mainWindow.focus();
  }

  updateContextMenu(mainWindow: BrowserWindow) {
    if (!this.tray) return;

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open ProjectYB',
        click: () => this.showWindow(mainWindow)
      },
      {
        label: 'Scan Projects',
        click: () => {
          if (!mainWindow.isDestroyed()) {
            this.showWindow(mainWindow);
            mainWindow.webContents.send('projects:triggerScan');
          }
        }
      },
      { type: 'separator' },
      {
        label: 'Quit ProjectYB',
        click: () => {
          this.isQuitting = true;
          app.quit();
        }
      }
    ]);

    this.tray.setContextMenu(contextMenu);
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }
}

export const trayService = new TrayService();
