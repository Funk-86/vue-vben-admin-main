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

export interface StreamTicketVO {
  expiresIn: number;
  ticket: string;
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

/** 申请 SSE 一次性连接 ticket（需 Authorization Bearer） */
export async function createStreamTicket() {
  return requestClient.post<StreamTicketVO>('/notifications/stream-ticket');
}

/** EventSource 使用短时 ticket，不再在 URL 中传递 JWT */
export function buildNotificationStreamUrl(ticket: string) {
  const base = apiURL.endsWith('/') ? apiURL.slice(0, -1) : apiURL;
  return `${base}/notifications/stream?ticket=${encodeURIComponent(ticket)}`;
}
