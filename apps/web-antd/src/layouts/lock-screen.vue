<script setup lang="ts">
/**
 * 锁屏页：支持「锁屏临时密码」或「登录密码」解锁。
 * 仅使用 web-antd 可解析的依赖（避免 @vben-core/*）。
 */
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { LockKeyhole } from '@vben/icons';
import { useAccessStore, useUserStore } from '@vben/stores';

import { useDateFormat, useNow } from '@vueuse/core';
import { Avatar, Button, Input, message } from 'ant-design-vue';

import { verifyPasswordApi } from '#/api/core/auth';

interface Props {
  avatar?: string;
}

defineOptions({
  name: 'AppLockScreen',
});

withDefaults(defineProps<Props>(), {
  avatar: '',
});

const emit = defineEmits<{ toLogin: [] }>();

const accessStore = useAccessStore();
const userStore = useUserStore();

const now = useNow();
const meridiem = useDateFormat(now, 'A');
const hour = useDateFormat(now, 'HH');
const minute = useDateFormat(now, 'mm');
const date = useDateFormat(now, 'YYYY-MM-DD dddd');

const showUnlockForm = ref(false);
const unlocking = ref(false);
const password = ref('');

const displayName = computed(
  () => userStore.userInfo?.realName || userStore.userInfo?.username || '',
);

async function handleSubmit() {
  const pwd = password.value.trim();
  if (!pwd) {
    message.warning('请输入密码');
    return;
  }

  if (
    accessStore.lockScreenPassword &&
    accessStore.lockScreenPassword === pwd
  ) {
    accessStore.unlockScreen();
    return;
  }

  unlocking.value = true;
  try {
    await verifyPasswordApi(pwd);
    accessStore.unlockScreen();
  } catch {
    message.error('密码错误');
  } finally {
    unlocking.value = false;
  }
}

function toggleUnlockForm() {
  showUnlockForm.value = !showUnlockForm.value;
  if (!showUnlockForm.value) {
    password.value = '';
  }
}

onMounted(() => {
  document.body.style.overflow = 'hidden';
});
onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="fixed inset-0 z-[2000] size-full bg-white dark:bg-[#0b1220]">
    <div v-show="!showUnlockForm" class="size-full">
      <div
        class="fixed top-6 left-1/2 z-[2001] flex -translate-x-1/2 cursor-pointer flex-col items-center text-xl font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
        @click="toggleUnlockForm"
      >
        <LockKeyhole class="mb-1 size-6" />
        <span>点击解锁</span>
      </div>
      <div class="flex size-full items-center justify-center">
        <div class="flex gap-4 px-4 sm:gap-6 md:gap-8">
          <div
            class="relative flex h-28 w-28 items-center justify-center rounded-xl bg-gray-100 text-4xl dark:bg-gray-800 sm:h-40 sm:w-40 sm:text-5xl md:h-48 md:w-48 md:text-6xl"
          >
            <span class="absolute top-3 left-3 text-xs font-semibold sm:text-sm">
              {{ meridiem }}
            </span>
            {{ hour }}
          </div>
          <div
            class="flex h-28 w-28 items-center justify-center rounded-xl bg-gray-100 text-4xl dark:bg-gray-800 sm:h-40 sm:w-40 sm:text-5xl md:h-48 md:w-48 md:text-6xl"
          >
            {{ minute }}
          </div>
        </div>
      </div>
      <div
        class="absolute bottom-20 w-full text-center text-lg text-gray-500 dark:text-gray-400"
      >
        {{ displayName }} · 屏幕已锁定
      </div>
    </div>

    <div
      v-if="showUnlockForm"
      class="flex size-full items-center justify-center"
      @keydown.enter.prevent="handleSubmit"
    >
      <div class="mb-10 flex w-[90%] max-w-xs flex-col items-center px-4">
        <Avatar :src="avatar || undefined" :size="80" class="mb-4">
          {{ displayName?.slice(0, 1) || 'U' }}
        </Avatar>
        <div class="mb-3 text-base font-medium">{{ displayName }}</div>
        <Input.Password
          v-model:value="password"
          class="mb-3 w-full"
          placeholder="请输入锁屏密码或登录密码"
          allow-clear
        />
        <Button
          type="primary"
          class="mb-2 w-full"
          :loading="unlocking"
          @click="handleSubmit"
        >
          进入系统
        </Button>
        <Button type="link" class="w-full" @click="emit('toLogin')">
          返回登录
        </Button>
        <Button type="link" class="w-full" @click="toggleUnlockForm">
          返回
        </Button>
      </div>
    </div>

    <div
      class="absolute bottom-5 w-full text-center text-xl text-gray-700 dark:text-gray-200 md:text-2xl"
    >
      <div v-if="showUnlockForm" class="mb-2 text-2xl md:text-3xl">
        {{ hour }}:{{ minute }}
        <span class="text-base md:text-lg">{{ meridiem }}</span>
      </div>
      <div>{{ date }}</div>
    </div>
  </div>
</template>
