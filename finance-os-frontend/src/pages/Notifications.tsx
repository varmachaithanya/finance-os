import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Tabs, Tab, Button, List, ListItem, ListItemButton,
  ListItemAvatar, ListItemText, Avatar, IconButton, Skeleton,
  Typography, Badge, Tooltip,
} from '@mui/material';
import {
  NotificationsOff as NotificationsOffIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Delete as DeleteIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  CreditCard as CreditCardIcon,
  Autorenew as AutorenewIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import PageHeader from '@/components/common/PageHeader';
import {
  listNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification,
} from '@/services/notificationService';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const typeIconMap: Record<string, React.ReactElement> = {
  budget_alert: <AccountBalanceWalletIcon />,
  credit_card_due: <CreditCardIcon />,
  loan_emi_due: <CreditCardIcon />,
  subscription_renewal: <AutorenewIcon />,
};

const typeColorMap: Record<string, string> = {
  budget_alert: '#4CAF50',
  credit_card_due: '#f44336',
  loan_emi_due: '#FF9800',
  subscription_renewal: '#2196F3',
};

const tabConfig = [
  { value: 'all', label: 'All', filter: null as string | null },
  { value: 'unread', label: 'Unread', filter: 'unread' as const },
  { value: 'credit_card_due', label: 'Credit Card Due', filter: 'credit_card_due' as const },
  { value: 'loan_emi_due', label: 'Loan EMI Due', filter: 'loan_emi_due' as const },
  { value: 'subscription_renewal', label: 'Subscription Renewal', filter: 'subscription_renewal' as const },
  { value: 'budget_alert', label: 'Budget Alert', filter: 'budget_alert' as const },
] as const;

type TabValue = (typeof tabConfig)[number]['value'];

export default function Notifications() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabValue>('all');

  const { data: notifResponse, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => listNotifications({ page: 1, limit: 100 }),
    refetchInterval: 30_000,
  });

  const { data: unreadResponse } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => getUnreadCount(),
    refetchInterval: 30_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const notifications = notifResponse?.data ?? [];
  const filteredNotifications = notifications.filter((n) => {
    if (tab === 'all') return true;
    if (tab === 'unread') return !n.is_read;
    return n.type === tab;
  });

  return (
    <Box>
      <PageHeader
        title="Notifications"
        actions={
          <Button variant="outlined" startIcon={<MarkEmailReadIcon />}
            onClick={() => markAllAsReadMutation.mutate()} disabled={markAllAsReadMutation.isPending}>
            Mark All Read
          </Button>
        }
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v as TabValue)}
        variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        {tabConfig.map(({ value, label }) => (
          <Tab key={value} value={value} label={
            value === 'unread' ? (
              <Badge badgeContent={unreadResponse?.unread_count ?? 0} color="primary">
                {label}
              </Badge>
            ) : label
          } />
        ))}
      </Tabs>

      {isLoading ? (
        <List>
          {Array.from({ length: 5 }).map((_, i) => (
            <ListItemButton key={i} sx={{ borderRadius: 1, mb: 0.5 }}>
              <ListItemAvatar><Skeleton variant="circular" width={40} height={40} /></ListItemAvatar>
              <ListItemText primary={<Skeleton width="60%" />} secondary={<Skeleton width="40%" />} />
            </ListItemButton>
          ))}
        </List>
      ) : filteredNotifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <NotificationsOffIcon sx={{ fontSize: 64, mb: 2 }} />
          <Typography variant="h6">No notifications</Typography>
        </Box>
      ) : (
        <List>
          {filteredNotifications.map((notification) => (
            <ListItem key={notification.id} disablePadding
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {!notification.is_read && (
                    <Tooltip title="Mark as read">
                      <IconButton edge="end" size="small" onClick={(e) => {
                        e.stopPropagation();
                        markAsReadMutation.mutate(notification.id);
                      }}>
                        <MarkEmailReadIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Delete">
                    <IconButton edge="end" size="small" onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(notification.id);
                    }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }>
              <ListItemButton sx={{
                bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                borderRadius: 1, mb: 0.5,
              }}>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: typeColorMap[notification.type] ?? '#9E9E9E' }}>
                    {typeIconMap[notification.type] ?? <InfoIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight={notification.is_read ? 400 : 700}>
                      {notification.title}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" component="span">
                        {notification.message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" display="block">
                        {dayjs(notification.created_at).fromNow()}
                      </Typography>
                    </>
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
