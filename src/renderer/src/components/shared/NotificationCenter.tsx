import React, { useState } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: Date;
  read: boolean;
}

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'System', message: 'ProjectYB started successfully', time: new Date(), read: false }
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const clearAll = () => setNotifications([]);
  
  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

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
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <Button variant="ghost" size="sm" onClick={clearAll} className="h-8 px-2 text-zinc-400 hover:text-zinc-50">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-zinc-500">No new notifications</div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem key={n.id} className="flex flex-col items-start p-3 focus:bg-zinc-800" onClick={() => markAsRead(n.id)}>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium">{n.title}</span>
                  <span className="text-xs text-zinc-500">
                    {n.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 mt-1">{n.message}</p>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
