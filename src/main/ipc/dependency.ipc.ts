import { ipcMain } from 'electron';
import { dependencyService } from '../services/dependency.service';

export function setupDependencyIpc() {
  ipcMain.handle('dependencies:getInstalled', (_, projectPath: string) =>
    dependencyService.getInstalledPackages(projectPath)
  );

  ipcMain.handle('dependencies:getOutdated', (_, projectPath: string) =>
    dependencyService.getOutdatedPackages(projectPath)
  );

  ipcMain.handle('dependencies:getAudit', (_, projectPath: string) =>
    dependencyService.getSecurityAudit(projectPath)
  );

  ipcMain.handle('dependencies:upgrade', (_, options: { projectPath: string; packageName: string; targetVersion?: string; isDev?: boolean }) =>
    dependencyService.upgradePackage(options.projectPath, options.packageName, options.targetVersion, options.isDev)
  );

  ipcMain.handle('dependencies:fixAudit', (_, projectPath: string) =>
    dependencyService.fixVulnerabilities(projectPath)
  );

  ipcMain.handle('dependencies:search', (_, query: string, limit?: number) =>
    dependencyService.searchRegistry(query, limit)
  );

  ipcMain.handle('dependencies:install', (_, options: { projectPath: string; packageName: string; isDev?: boolean }) =>
    dependencyService.installPackage(options.projectPath, options.packageName, options.isDev)
  );

  ipcMain.handle('dependencies:uninstall', (_, options: { projectPath: string; packageName: string }) =>
    dependencyService.uninstallPackage(options.projectPath, options.packageName)
  );
}
