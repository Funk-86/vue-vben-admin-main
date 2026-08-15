import type { PageQuery, PageResult } from './types';

import { useAppConfig } from '@vben/hooks';

import { requestClient } from '#/api/request';

export interface NotificationVO {
  bizId?: number;
  bizType?: string;
  content?: string;
  createdAt?: string;
  id: number;
  isRead?: number;
  link?: string;
  title: string;
}

export interface UnreadPushVO {
  latest?: NotificationVO;
  unreadCount: number;
}

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

export async function getNotifications(
  params?: PageQuery & { onlyUnread?: boolean },
) {
  return requestClient.get<PageResult<NotificationVO>>('/notifications', {
    params,
  });
}

export async function getUnreadNotificationCount() {
  return requestClient.get<{ count: number }>('/notifications/unread-count');
}

export async function markNotificationRead(id: number) {
  return requestClient.put(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead() {
  return requestClient.put('/notifications/read-all');
}

/** EventSource 无法带 Authorization，使用 query token；apiURL 已含 /api */
export function buildNotificationStreamUrl(token: string) {
  const base = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
  return `${base}/notifications/stream?token=${encodeURIComponent(token)}`;
}
