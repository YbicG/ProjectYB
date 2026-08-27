import React, { useEffect } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { useNotificationStore } from '@renderer/stores/useNotificationStore';
import { useGitStore } from '@renderer/stores/useGitStore';

export const NotificationCenter: React.FC = () => {
  const { notifications, clearAll, markAsRead, addNotification } = useNotificationStore();

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Listen to git events via intercepting git store or listening to terminal
    // Wait, the instructions say: terminal exits (window.api.terminal.onExit) should add a notification if it was a crash (exitCode !== 0)
    // However, onExit requires a terminal ID. We can listen globally if there was an event, but onExit needs id.
    // Let's implement it inside Terminal.tsx or Service.tsx instead of here if we don't have global events.
    // Actually, NotificationCenter is mounted globally, but how do we know all terminal IDs?
    // Maybe we just check terminal onExit when terminals are created in their store?
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full p-0 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 px-2 text-zinc-400 hover:text-zinc-50">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
        <DropdownMenuSeparator className="bg-zinc-800" />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">No new notifications</div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem 
                key={n.id} 
                className={`flex flex-col items-start p-3 focus:bg-zinc-800 cursor-pointer ${n.read ? 'opacity-60' : ''}`} 
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-zinc-200">{n.title}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-1 whitespace-pre-wrap">{n.message}</p>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
