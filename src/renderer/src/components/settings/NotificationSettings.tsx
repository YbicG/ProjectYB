import React from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Laptop,
  MessageSquare,
  Server,
  GitBranch,
  FolderGit2,
  Terminal,
  ShieldAlert,
  Boxes,
  Globe,
  Activity,
  Sparkles,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  useNotificationStore,
  NotificationCategory
} from '@renderer/stores/useNotificationStore';
import { cn } from '@renderer/lib/utils';
import { toast } from 'sonner';

interface CategoryConfig {
  id: NotificationCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  badge: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    id: 'system',
    label: 'System & Resource Monitor',
    description: 'High CPU (>85%) and High RAM (>90%) performance alerts, disk space optimizer and startup status',
    icon: Activity,
    iconColor: 'text-rose-400',
    badge: 'Hardware'
  },
  {
    id: 'services',
    label: 'Background Services',
    description: 'Service start/stop status, abnormal crash detection, auto-restart triggers, and port kills',
    icon: Server,
    iconColor: 'text-emerald-400',
    badge: 'Processes'
  },
  {
    id: 'git',
    label: 'Git & Version Control',
    description: 'Commit, push, and pull feedback, branch checkout, merge conflicts, and stash events',
    icon: GitBranch,
    iconColor: 'text-violet-400',
    badge: 'VCS'
  },
  {
    id: 'projects',
    label: 'Project Hub & Scanner',
    description: 'Project scanning results, manual repository additions, clean zip snapshot exports',
    icon: FolderGit2,
    iconColor: 'text-amber-400',
    badge: 'Projects'
  },
  {
    id: 'terminals',
    label: 'Terminal Instances',
    description: 'Terminal process exits with non-zero error codes and command execution alerts',
    icon: Terminal,
    iconColor: 'text-cyan-400',
    badge: 'PTY'
  },
  {
    id: 'dependencies',
    label: 'Security & Dependencies',
    description: 'Vulnerability CVE audit alerts, package installations, upgrades, and uninstalls',
    icon: ShieldAlert,
    iconColor: 'text-orange-400',
    badge: 'Security'
  },
  {
    id: 'docker',
    label: 'Docker & Containers',
    description: 'Container compose up/down/restart status, database connection test results',
    icon: Boxes,
    iconColor: 'text-blue-400',
    badge: 'Containers'
  },
  {
    id: 'network',
    label: 'HTTP & API Tester',
    description: 'API request failures, network timeouts, endpoint probe responses',
    icon: Globe,
    iconColor: 'text-pink-400',
    badge: 'Network'
  }
];

export const NotificationSettings: React.FC = () => {
  const {
    settings,
    updateSettings,
    toggleCategory,
    notify,
    clearAll,
    notifications
  } = useNotificationStore();

  const handleTestNotification = (category: NotificationCategory = 'system') => {
    notify({
      title: 'Test Notification Received',
      message: `Notifications for ${category.toUpperCase()} are working properly across your enabled channels!`,
      type: 'success',
      category
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* ── Header Overview ── */}
      <div>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
              <Bell className="w-5 h-5 text-violet-400" />
              Notification Center Settings
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Configure in-app toasts, desktop OS banners, audio chimes, and granular event triggers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTestNotification('system')}
              className="text-xs gap-1.5 border-violet-500/40 text-violet-300 hover:bg-violet-950/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Send Test Notification
            </Button>

            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearAll();
                  toast.info('Notification history cleared');
                }}
                className="text-xs text-zinc-400 hover:text-red-400 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Master Switch Card ── */}
      <Card className="border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base text-zinc-100">
                Master Notification Switch
              </span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-mono font-bold uppercase',
                  settings.enabled
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20'
                    : 'border-zinc-700 text-zinc-500 bg-zinc-900'
                )}
              >
                {settings.enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <p className="text-xs text-zinc-400">
              When disabled, all notifications, sounds, and banners across all categories are muted.
            </p>
          </div>

          <button
            onClick={() => updateSettings({ enabled: !settings.enabled })}
            className={cn(
              'w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-violet-500/50',
              settings.enabled ? 'bg-violet-600' : 'bg-zinc-800'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded-full bg-white transition-transform absolute top-1',
                settings.enabled ? 'left-7' : 'left-1'
              )}
            />
          </button>
        </CardContent>
      </Card>

      {/* ── Delivery Channels ── */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Delivery Channels
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Channel 1: In-App Toasts */}
          <Card
            onClick={() => updateSettings({ showToasts: !settings.showToasts })}
            className={cn(
              'border cursor-pointer transition-all hover:border-zinc-700 p-4 flex flex-col justify-between space-y-3',
              settings.showToasts
                ? 'border-violet-500/30 bg-zinc-900/60'
                : 'border-zinc-800 bg-zinc-950/40 opacity-70'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-violet-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <input
                type="checkbox"
                checked={settings.showToasts}
                onChange={() => {}}
                className="rounded border-zinc-700 text-violet-600 focus:ring-0 cursor-pointer"
              />
            </div>
            <div>
              <span className="font-semibold text-xs text-zinc-200 block">
                In-App Toasts
              </span>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Popups in the lower right corner of the application window.
              </p>
            </div>
          </Card>

          {/* Channel 2: OS Native Desktop Notifications */}
          <Card
            onClick={() => updateSettings({ showNative: !settings.showNative })}
            className={cn(
              'border cursor-pointer transition-all hover:border-zinc-700 p-4 flex flex-col justify-between space-y-3',
              settings.showNative
                ? 'border-violet-500/30 bg-zinc-900/60'
                : 'border-zinc-800 bg-zinc-950/40 opacity-70'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400">
                <Laptop className="w-4 h-4" />
              </div>
              <input
                type="checkbox"
                checked={settings.showNative}
                onChange={() => {}}
                className="rounded border-zinc-700 text-cyan-600 focus:ring-0 cursor-pointer"
              />
            </div>
            <div>
              <span className="font-semibold text-xs text-zinc-200 block">
                Desktop OS Notifications
              </span>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Native Windows taskbar and system tray banners.
              </p>
            </div>
          </Card>

          {/* Channel 3: Audio Chime */}
          <Card
            onClick={() => updateSettings({ sound: !settings.sound })}
            className={cn(
              'border cursor-pointer transition-all hover:border-zinc-700 p-4 flex flex-col justify-between space-y-3',
              settings.sound
                ? 'border-violet-500/30 bg-zinc-900/60'
                : 'border-zinc-800 bg-zinc-950/40 opacity-70'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-amber-400">
                {settings.sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              </div>
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={() => {}}
                className="rounded border-zinc-700 text-amber-600 focus:ring-0 cursor-pointer"
              />
            </div>
            <div>
              <span className="font-semibold text-xs text-zinc-200 block">
                Audio Chimes
              </span>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Play subtle synthesized tone chords on events.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Category-by-Category Toggles ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Event Category Triggers
          </h3>
          <span className="text-[11px] text-zinc-500 font-mono">
            {Object.values(settings.categories).filter(Boolean).length} / {CATEGORIES.length} Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isEnabled = settings.categories[cat.id] !== false && settings.enabled;

            return (
              <Card
                key={cat.id}
                className={cn(
                  'border transition-all p-3.5 flex items-start justify-between gap-3 bg-zinc-950/70',
                  isEnabled
                    ? 'border-zinc-800 hover:border-zinc-700'
                    : 'border-zinc-900 opacity-60'
                )}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn('p-2 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 mt-0.5', cat.iconColor)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-200 truncate">
                        {cat.label}
                      </span>
                      <Badge variant="outline" className="text-[9px] font-mono px-1 py-0 border-zinc-800 text-zinc-500">
                        {cat.badge}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className={cn(
                      'w-9 h-5 rounded-full transition-colors relative focus:outline-none',
                      isEnabled ? 'bg-violet-600' : 'bg-zinc-800'
                    )}
                    title={`Toggle ${cat.label}`}
                  >
                    <div
                      className={cn(
                        'w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5',
                        isEnabled ? 'left-5' : 'left-0.5'
                      )}
                    />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
