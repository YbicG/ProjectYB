import { app, BrowserWindow, Menu, Tray, nativeImage, Notification } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { getStore } from '../ipc/store.ipc';

// Embedded 32x32 PNG icon in base64 (ProjectYB violet icon)
const TRAY_ICON_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABBklEQVR4nO2XSVLCYBBGcx1CGMIQuA+IzMiod+AgXkgNg4ICBr0CG60suioF/Pm6rerCBa/qLaDzVd42lnXlv/E4PfxoCl/+UP5WNTYiPN6XvlSFARNvryoMGHuBqjigGJwY5dxd8iwMGBU+z0qY7tznYMCwsDNK/PUeCgMG+a3RKJJbVBjQz29iJbj/HwsD7nIfUML0O04Y0HPfoSY4WxjQddcsj+HuYEAnu2JLSDYwoJ15Y0tINjCglXllS0g2MKCZXrIlJBsY0Egv2BKSDQyop+ZsCckGBtw6M7aEZAMDao7PlpBscEDSVxUG3NgvqsKAqv2sKgyoJJ5UZX0bXOzD5Mol+AWzbRZWc+9GogAAAABJRU5ErkJggg==';

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

  getAppIcon(): nativeImage {
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
