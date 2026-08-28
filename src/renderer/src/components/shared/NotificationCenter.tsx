import React, { useState } from 'react';
import {
  Bell,
  Trash2,
  CheckCheck,
  Settings,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Info,
  Server,
  GitBranch,
  Activity,
  Terminal,
  ShieldAlert,
  Boxes,
  Globe,
  FolderGit2,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import {
  useNotificationStore,
  AppNotification,
  NotificationCategory
} from '@renderer/stores/useNotificationStore';
import { useAppStore } from '@renderer/stores/useAppStore';
import { cn } from '@renderer/lib/utils';

export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    clearAll,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotificationStore();
  const { setActiveTab } = useAppStore();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'errors' | 'services' | 'git'>('all');

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read;
    if (activeFilter === 'errors') return n.type === 'error' || n.type === 'warning';
    if (activeFilter === 'services') return n.category === 'services';
    if (activeFilter === 'git') return n.category === 'git';
    return true;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-violet-400 shrink-0" />;
    }
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'services':
        return <Server className="w-3 h-3 text-emerald-400" />;
      case 'git':
        return <GitBranch className="w-3 h-3 text-violet-400" />;
      case 'projects':
        return <FolderGit2 className="w-3 h-3 text-amber-400" />;
      case 'terminals':
        return <Terminal className="w-3 h-3 text-cyan-400" />;
      case 'dependencies':
        return <ShieldAlert className="w-3 h-3 text-orange-400" />;
      case 'docker':
        return <Boxes className="w-3 h-3 text-blue-400" />;
      case 'network':
        return <Globe className="w-3 h-3 text-pink-400" />;
      default:
        return <Activity className="w-3 h-3 text-zinc-400" />;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-zinc-400 hover:text-zinc-100"
          title="Notification Center"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-violet-600 border border-zinc-950 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 border-zinc-800 bg-zinc-950/95 backdrop-blur-xl p-0 shadow-2xl overflow-hidden z-50 text-zinc-100"
      >
        {/* ── Dropdown Header ── */}
        <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DropdownMenuLabel className="p-0 font-bold text-xs tracking-tight text-zinc-100 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-violet-400" />
              Notifications
            </DropdownMenuLabel>
            {unreadCount > 0 && (
              <Badge
                variant="outline"
                className="text-[9px] font-mono px-1.5 py-0 border-violet-500/40 text-violet-300 bg-violet-950/40"
              >
                {unreadCount} unread
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={markAllAsRead}
                className="h-7 w-7 text-zinc-400 hover:text-zinc-100"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearAll}
                className="h-7 w-7 text-zinc-400 hover:text-red-400"
                title="Clear all notifications"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setActiveTab('settings')}
              className="h-7 w-7 text-zinc-400 hover:text-violet-300"
              title="Notification Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Filter Pills ── */}
        {notifications.length > 0 && (
          <div className="px-3 py-2 border-b border-zinc-850 flex items-center gap-1 overflow-x-auto no-scrollbar bg-zinc-900/30">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'unread', label: `Unread (${unreadCount})` },
                { id: 'errors', label: 'Alerts' },
                { id: 'services', label: 'Services' },
                { id: 'git', label: 'Git' }
              ] as const
            ).map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'px-2 py-0.5 rounded text-[10px] font-medium transition-colors shrink-0',
                  activeFilter === filter.id
                    ? 'bg-violet-600 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Notifications Scrollable List ── */}
        <ScrollArea className="max-h-[380px] overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-zinc-500 flex flex-col items-center gap-2">
              <Bell className="w-8 h-8 opacity-20 text-zinc-400" />
              <p className="font-medium text-zinc-400">No notifications to display</p>
              <p className="text-[10px] text-zinc-600">
                {activeFilter === 'unread'
                  ? 'All notifications have been read.'
                  : 'Events from Git, Services, Terminals and System will appear here.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-850/60">
              {filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    'p-3 flex items-start gap-3 transition-colors group relative cursor-pointer',
                    n.read
                      ? 'bg-zinc-950/40 hover:bg-zinc-900/40 opacity-70'
                      : 'bg-zinc-900/30 hover:bg-zinc-900/60'
                  )}
                >
                  {/* Status / Category Icon */}
                  <div className="mt-0.5 shrink-0">
                    {getTypeIcon(n.type)}
                  </div>

                  {/* Body Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-xs text-zinc-200 truncate">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {formatTimestamp(n.time)}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed break-words">
                      {n.message}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 uppercase">
                        {getCategoryIcon(n.category)}
                        <span>{n.category}</span>
                      </div>

                      {n.actionTab && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab(n.actionTab as any);
                          }}
                          className="text-[10px] font-medium text-violet-400 hover:text-violet-300 transition-colors"
                        >
                          View →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delete Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-opacity p-0.5 -mr-1 -mt-1"
                    title="Dismiss"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
