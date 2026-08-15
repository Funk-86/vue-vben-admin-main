<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { ProfileNotificationSetting } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import {
  getUserSettings,
  updateNotificationSettings,
  type UserSettingVO,
} from '#/api/core/user-setting';

const loading = ref(false);
const settings = ref<UserSettingVO | null>(null);

const formSchema = computed(() => {
  const s = settings.value;
  return [
    {
      fieldName: 'notifyAccount',
      label: '账户密码',
      description: '密码修改等账户安全消息将以站内信通知',
      value: s?.notifyAccount ?? true,
    },
    {
      fieldName: 'notifySystem',
      label: '系统消息',
      description: '试用期提醒等系统消息将以站内信通知',
      value: s?.notifySystem ?? true,
    },
    {
      fieldName: 'notifyTodo',
      label: '待办任务',
      description: '任务分配、催办、逾期等将以站内信通知',
      value: s?.notifyTodo ?? true,
    },
  ];
});

async function load() {
  loading.value = true;
  try {
    settings.value = await getUserSettings();
  } finally {
    loading.value = false;
  }
}

async function onChange(payload: { fieldName: string; value: boolean }) {
  if (!settings.value) return;
  const next = {
    notifyAccount: settings.value.notifyAccount,
    notifySystem: settings.value.notifySystem,
    notifyTodo: settings.value.notifyTodo,
    [payload.fieldName]: payload.value,
  };
  // 乐观更新
  settings.value = { ...settings.value, ...next };
  try {
    await updateNotificationSettings(next);
    message.success('已保存');
  } catch {
    await load();
  }
}

onMounted(load);
</script>
<template>
  <div v-if="!loading || settings">
    <ProfileNotificationSetting :form-schema="formSchema" @change="onChange" />
  </div>
</template>
