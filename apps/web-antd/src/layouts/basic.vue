<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import type { NotificationVO } from '#/api/hr/notification';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { BasicLayout, Notification, UserDropdown } from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import {
  buildNotificationStreamUrl,
  createStreamTicket,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '#/api/hr/notification';
import AiAssistant from '#/components/ai-assistant/index.vue';
import AppLockScreen from '#/layouts/lock-screen.vue';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';
import { ROLE_NAME_MAP } from '#/views/hr/roles';

const POLL_INTERVAL_MS = 30_000;
const SSE_RECONNECT_BASE_MS = 2000;
const SSE_RECONNECT_MAX_MS = 30_000;

const notifications = ref<NotificationItem[]>([]);
const unreadCount = ref(0);
const pollTimer = ref<null | ReturnType<typeof setInterval>>(null);
const eventSource = ref<EventSource | null>(null);
const sseReconnectTimer = ref<null | ReturnType<typeof setTimeout>>(null);
const sseRetryMs = ref(SSE_RECONNECT_BASE_MS);

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();

const showDot = computed(
  () =>
    unreadCount.value <= 0 && notifications.value.some((item) => !item.isRead),
);

const menus = computed(() => [
  {
    handler: () => {
      // 用 path，避免路由名偶发未注册时 resolve 抛错
      void router.push('/profile').catch(() => {
        void router.push({ name: 'Profile' }).catch(() => undefined);
      });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

const dropdownDescription = computed(() => {
  return userStore.userInfo?.username || '';
});

const dropdownTagText = computed(() => {
  const role = userStore.userInfo?.roles?.[0];
  return role ? ROLE_NAME_MAP[role] || role : '';
});

function formatNoticeDate(value?: string) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diffMs < minute) {
    return '刚刚';
  }
  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}分钟前`;
  }
  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}小时前`;
  }
  if (diffMs < 2 * day) {
    return '1天前';
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function toNotificationItem(item: NotificationVO): NotificationItem {
  return {
    avatar: preferences.app.defaultAvatar,
    date: formatNoticeDate(item.createdAt),
    id: item.id,
    isRead: item.isRead === 1,
    link: item.link || '/hr/task',
    message: item.content || '',
    title: item.title,
  };
}

async function loadUnreadCount() {
  if (!accessStore.accessToken) {
    unreadCount.value = 0;
    return;
  }
  try {
    const res = await getUnreadNotificationCount();
    unreadCount.value = res?.count ?? 0;
  } catch {
    unreadCount.value = notifications.value.filter((n) => !n.isRead).length;
  }
}

async function loadNotifications() {
  if (!accessStore.accessToken) {
    notifications.value = [];
    unreadCount.value = 0;
    return;
  }
  try {
    const page = await getNotifications({ pageNum: 1, pageSize: 20 });
    notifications.value = (page?.records ?? []).map((item) =>
      toNotificationItem(item),
    );
    await loadUnreadCount();
  } catch {
    // 轮询失败不打断页面
  }
}

function stopPolling() {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

function startPolling() {
  stopPolling();
  if (!accessStore.accessToken) {
    return;
  }
  pollTimer.value = setInterval(() => {
    if (document.visibilityState === 'visible') {
      void loadNotifications();
    }
  }, POLL_INTERVAL_MS);
}

function clearSseReconnect() {
  if (sseReconnectTimer.value) {
    clearTimeout(sseReconnectTimer.value);
    sseReconnectTimer.value = null;
  }
}

function stopSse() {
  clearSseReconnect();
  if (eventSource.value) {
    eventSource.value.close();
    eventSource.value = null;
  }
}

function scheduleSseReconnect() {
  clearSseReconnect();
  if (!accessStore.accessToken) {
    return;
  }
  const delay = sseRetryMs.value;
  sseRetryMs.value = Math.min(sseRetryMs.value * 2, SSE_RECONNECT_MAX_MS);
  sseReconnectTimer.value = setTimeout(() => {
    startSse();
  }, delay);
}

async function startSse() {
  stopSse();
  if (!accessStore.accessToken) {
    return;
  }
  try {
    // 退出登录可能发生在 await 前，再次确认 token，避免无凭证请求触发 401 提示
    if (!accessStore.accessToken) {
      return;
    }
    const ticketVo = await createStreamTicket();
    if (!accessStore.accessToken) {
      return;
    }
    if (!ticketVo?.ticket) {
      scheduleSseReconnect();
      return;
    }
    const es = new EventSource(buildNotificationStreamUrl(ticketVo.ticket));
    eventSource.value = es;

    es.addEventListener('connected', () => {
      sseRetryMs.value = SSE_RECONNECT_BASE_MS;
    });

    es.addEventListener('unread', () => {
      void loadNotifications();
    });

    es.addEventListener('error', () => {
      es.close();
      if (eventSource.value === es) {
        eventSource.value = null;
      }
      scheduleSseReconnect();
    });
  } catch {
    if (accessStore.accessToken) {
      scheduleSseReconnect();
    }
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && accessStore.accessToken) {
    void loadNotifications();
    if (
      !eventSource.value ||
      eventSource.value.readyState === EventSource.CLOSED
    ) {
      startSse();
    }
  }
}

async function handleLogout() {
  stopPolling();
  stopSse();
  notifications.value = [];
  await authStore.logout(false);
}

async function handleNoticeClear() {
  try {
    await markAllNotificationsRead();
    notifications.value = [];
    unreadCount.value = 0;
  } catch {
    // handled
  }
}

async function markRead(id: number | string) {
  const item = notifications.value.find((n) => n.id === id);
  if (!item || item.isRead) {
    return;
  }
  item.isRead = true;
  unreadCount.value = Math.max(0, unreadCount.value - 1);
  try {
    await markNotificationRead(Number(id));
  } catch {
    item.isRead = false;
    void loadUnreadCount();
  }
}

function remove(id: number | string) {
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

async function handleMakeAll() {
  try {
    await markAllNotificationsRead();
    notifications.value.forEach((item) => {
      item.isRead = true;
    });
    unreadCount.value = 0;
  } catch {
    // handled
  }
}

const viewAll = () => {
  void router.push('/hr/task');
};

const handleClick = (item: NotificationItem) => {
  if (item.id !== null && item.id !== undefined) {
    void markRead(item.id);
  }
  if (item.link) {
    navigateTo(item.link, item.query, item.state);
  }
};

function navigateTo(
  link: string,
  query?: Record<string, any>,
  state?: Record<string, any>,
) {
  if (link.startsWith('http://') || link.startsWith('https://')) {
    window.open(link, '_blank');
  } else {
    router.push({
      path: link,
      query: query || {},
      state,
    });
  }
}

function startNotificationServices() {
  void loadNotifications();
  startPolling();
  sseRetryMs.value = SSE_RECONNECT_BASE_MS;
  startSse();
}

watch(
  () => accessStore.accessToken,
  (token) => {
    if (token) {
      // 首屏后再拉通知/SSE，避免与业务页抢带宽
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(() => startNotificationServices(), {
          timeout: 2500,
        });
      } else {
        setTimeout(startNotificationServices, 1200);
      }
    } else {
      stopPolling();
      stopSse();
      notifications.value = [];
      unreadCount.value = 0;
    }
  },
  { immediate: true },
);

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
  }),
  async ({ enable, content, isDark: isDarkValue }) => {
    if (enable) {
      const watermarkColor = isDarkValue
        ? 'rgba(255, 255, 255, 0.12)'
        : 'rgba(0, 0, 0, 0.12)';

      await updateWatermark({
        advancedStyle: {
          colorStops: [
            {
              color: watermarkColor,
              offset: 0,
            },
            {
              color: watermarkColor,
              offset: 1,
            },
          ],
          type: 'linear',
        },
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange);
});

onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange);
  stopPolling();
  stopSse();
});
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        :description="dropdownDescription"
        :tag-text="dropdownTagText"
        @logout="handleLogout"
        @clear-preferences-and-logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :count="unreadCount"
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @read="(item) => item.id && markRead(item.id)"
        @remove="(item) => item.id && remove(item.id)"
        @make-all="handleMakeAll"
        @on-click="handleClick"
        @view-all="viewAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <AppLockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
  <AiAssistant v-if="accessStore.accessToken" />
</template>
