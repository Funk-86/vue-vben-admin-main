<script setup lang="ts">
import type { MfaSetupVO, UserSettingVO } from '#/api/core/user-setting';

import { computed, onMounted, ref } from 'vue';

import { ProfileSecuritySetting } from '@vben/common-ui';

import { Form, Input, message, Modal } from 'ant-design-vue';

import {
  confirmMfa,
  getUserSettings,
  setSecurityQuestion,
  setupMfa,
  toggleSecuritySetting,
} from '#/api/core/user-setting';

const loading = ref(false);
const settings = ref<null | UserSettingVO>(null);

const questionOpen = ref(false);
const questionForm = ref({ question: '您的出生城市是？', answer: '' });

const mfaOpen = ref(false);
const mfaSetup = ref<MfaSetupVO | null>(null);
const mfaCode = ref('');

const formSchema = computed(() => {
  const s = settings.value;
  return [
    {
      fieldName: 'accountPassword',
      label: '账户密码',
      description: s?.passwordStrength || '已设置登录密码',
      value: true,
    },
    {
      fieldName: 'phoneSecured',
      label: '密保手机',
      description: s?.hasPhone
        ? `已绑定手机：${s.maskedPhone}`
        : '未绑定手机，请先在「基本设置」中填写',
      value: !!s?.phoneSecured,
    },
    {
      fieldName: 'securityQuestion',
      label: '密保问题',
      description: s?.hasSecurityQuestion
        ? `已设置：${s.securityQuestion}`
        : '未设置密保问题，密保问题可有效保护账户安全',
      value: !!s?.securityQuestionEnabled,
    },
    {
      fieldName: 'emailSecured',
      label: '备用邮箱',
      description: s?.hasEmail
        ? `已绑定邮箱：${s.maskedEmail}`
        : '未绑定邮箱，请先在「基本设置」中填写',
      value: !!s?.emailSecured,
    },
    {
      fieldName: 'mfa',
      label: 'MFA 设备',
      description: s?.mfaEnabled
        ? '已绑定 MFA，登录时需填写动态验证码'
        : '未绑定 MFA 设备，绑定后登录可进行二次确认',
      value: !!s?.mfaEnabled,
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
  const { fieldName, value } = payload;

  if (fieldName === 'accountPassword') {
    message.info('请在「修改密码」中更新登录密码');
    await load();
    return;
  }

  if (fieldName === 'securityQuestion' && value) {
    questionForm.value = {
      question: settings.value?.securityQuestion || '您的出生城市是？',
      answer: '',
    };
    questionOpen.value = true;
    await load();
    return;
  }

  if (fieldName === 'mfa' && value) {
    try {
      mfaSetup.value = await setupMfa();
      mfaCode.value = '';
      mfaOpen.value = true;
    } catch {
      // interceptor
    }
    await load();
    return;
  }

  try {
    await toggleSecuritySetting({ field: fieldName, enabled: value });
    message.success('已更新');
    await load();
  } catch {
    await load();
  }
}

async function submitQuestion() {
  if (
    !questionForm.value.question.trim() ||
    !questionForm.value.answer.trim()
  ) {
    message.warning('请填写密保问题与答案');
    return;
  }
  await setSecurityQuestion({
    question: questionForm.value.question.trim(),
    answer: questionForm.value.answer.trim(),
  });
  message.success('密保问题已设置');
  questionOpen.value = false;
  await load();
}

async function submitMfa() {
  if (!mfaCode.value.trim()) {
    message.warning('请输入验证码');
    return;
  }
  await confirmMfa(mfaCode.value.trim());
  message.success('MFA 已启用');
  mfaOpen.value = false;
  await load();
}

onMounted(load);
</script>
<template>
  <div>
    <ProfileSecuritySetting
      v-if="!loading || settings"
      :form-schema="formSchema"
      @change="(payload: any) => onChange(payload)"
    />

    <Modal
      v-model:open="questionOpen"
      title="设置密保问题"
      @ok="submitQuestion"
    >
      <Form layout="vertical" class="mt-2">
        <Form.Item label="密保问题" required>
          <Input v-model:value="questionForm.question" />
        </Form.Item>
        <Form.Item label="答案" required>
          <Input.Password v-model:value="questionForm.answer" />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="mfaOpen"
      title="绑定 MFA 设备"
      ok-text="确认启用"
      @ok="submitMfa"
    >
      <p class="mb-2 text-sm text-gray-600">
        请使用 Google Authenticator / 微软验证器等 App，手动添加密钥：
      </p>
      <p class="mb-3 break-all rounded bg-gray-50 p-2 font-mono text-sm">
        {{ mfaSetup?.secret }}
      </p>
      <p class="mb-3 text-xs text-gray-400 break-all">
        {{ mfaSetup?.otpauthUrl }}
      </p>
      <Form layout="vertical">
        <Form.Item label="6 位动态验证码" required>
          <Input
            v-model:value="mfaCode"
            :maxlength="6"
            placeholder="输入 App 中的验证码"
          />
        </Form.Item>
      </Form>
    </Modal>
  </div>
</template>
