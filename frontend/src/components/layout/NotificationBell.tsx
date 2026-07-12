import { Bell, Check, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type NotificationType = 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
  });

  const notifications: Notification[] = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const readMutation = useMutation({
    mutationFn: notificationsApi.read,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const readAllMutation = useMutation({
    mutationFn: notificationsApi.readAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'CRITICAL': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-600 ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="px-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => readAllMutation.mutate()}
            >
              <Check className="mr-1 h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem 
                key={notification.id} 
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer",
                  !notification.read && "bg-muted/50"
                )}
                onClick={() => {
                  if (!notification.read) {
                    readMutation.mutate(notification.id);
                  }
                }}
              >
                <div className="mt-0.5">{getIcon(notification.type)}</div>
                <div className="flex flex-col gap-1">
                  <span className={cn("text-sm font-medium leading-none", !notification.read && "font-bold")}>
                    {notification.title}
                  </span>
                  <span className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 font-medium">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
