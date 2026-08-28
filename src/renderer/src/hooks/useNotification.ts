import {
  useNotificationStore,
  NotificationType,
  NotificationCategory
} from '@renderer/stores/useNotificationStore';

export function useNotification() {
  const { notify } = useNotificationStore();

  return {
    notify,
    success: (message: string, title: string = 'Success', category: NotificationCategory = 'system') =>
      notify({ title, message, type: 'success', category }),
    error: (message: string, title: string = 'Error', category: NotificationCategory = 'system') =>
      notify({ title, message, type: 'error', category }),
    warning: (message: string, title: string = 'Warning', category: NotificationCategory = 'system') =>
      notify({ title, message, type: 'warning', category }),
    info: (message: string, title: string = 'Information', category: NotificationCategory = 'system') =>
      notify({ title, message, type: 'info', category }),

    // Specialized helpers
    serviceStarted: (name: string) =>
      notify({
        title: 'Service Started',
        message: `Service "${name}" is now running`,
        type: 'success',
        category: 'services',
        actionTab: 'services'
      }),

    serviceStopped: (name: string) =>
      notify({
        title: 'Service Stopped',
        message: `Service "${name}" was stopped`,
        type: 'info',
        category: 'services',
        actionTab: 'services'
      }),

    serviceCrashed: (name: string, exitCode?: number) =>
      notify({
        title: 'Service Crash Alert',
        message: `Service "${name}" crashed unexpectedly${exitCode !== undefined ? ` (exit code ${exitCode})` : ''}`,
        type: 'error',
        category: 'services',
        actionTab: 'services'
      }),

    gitCommitSuccess: (project: string, hash?: string) =>
      notify({
        title: 'Git Commit Successful',
        message: `Committed changes to ${project}${hash ? ` (${hash.substring(0, 7)})` : ''}`,
        type: 'success',
        category: 'git',
        actionTab: 'git'
      }),

    gitPushSuccess: (project: string, branch?: string) =>
      notify({
        title: 'Git Push Successful',
        message: `Pushed commits for ${project}${branch ? ` to ${branch}` : ''}`,
        type: 'success',
        category: 'git',
        actionTab: 'git'
      })
  };
}
