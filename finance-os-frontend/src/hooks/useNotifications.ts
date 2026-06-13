import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notificationService';

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list(),
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 60_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => notificationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
    },
  });

  return {
    notifications: notificationsQuery.data ?? [],
    unreadCount: unreadCountQuery.data?.count ?? 0,
    isLoading: notificationsQuery.isLoading,
    error: notificationsQuery.error,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllReadMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
  };
};
