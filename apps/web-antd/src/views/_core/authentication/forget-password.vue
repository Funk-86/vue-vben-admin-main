<script lang="ts" setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button, Form, Input, message, Space } from 'ant-design-vue';

import {
  resetForgotPasswordApi,
  sendForgotPasswordCodeApi,
} from '#/api/core/auth';

defineOptions({ name: 'ForgetPassword' });

const router = useRouter();
const loading = ref(false);
const sending = ref(false);
const countdown = ref(0);
let timer: null | ReturnType<typeof setInterval> = null;

const form = reactive({
  code: '',
  confirmPassword: '',
  email: '',
  newPassword: '',
});

async function sendCode() {
  const email = form.email.trim();
  if (!email) {
    message.warning('请输入邮箱');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    message.warning('邮箱格式不正确');
    return;
  }
  sending.value = true;
  try {
    await sendForgotPasswordCodeApi(email);
    message.success('验证码已发送，请查收邮箱');
    countdown.value = 60;
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      countdown.value -= 1;
      if (countdown.value <= 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    }, 1000);
  } catch {
    // interceptor
  } finally {
    sending.value = false;
  }
}

async function handleSubmit() {
  if (!form.email.trim()) {
    message.warning('请输入邮箱');
    return;
  }
  if (!form.code.trim()) {
    message.warning('请输入验证码');
    return;
  }
  if (!form.newPassword || form.newPassword.length < 6) {
    message.warning('新密码至少 6 位');
    return;
  }
  if (form.newPassword !== form.confirmPassword) {
    message.warning('两次密码不一致');
    return;
  }
  loading.value = true;
  try {
    await resetForgotPasswordApi({
      code: form.code.trim(),
      confirmPassword: form.confirmPassword,
      email: form.email.trim(),
      newPassword: form.newPassword,
    });
    message.success('密码已重置，请登录');
    router.push('/auth/login');
  } catch {
    // interceptor
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="w-full">
    <h2 class="mb-1 text-2xl font-bold">忘记密码</h2>
    <p class="mb-6 text-sm text-muted-foreground">
      通过绑定邮箱验证码重置登录密码（至少 6 位）
    </p>
    <Form layout="vertical" @finish="handleSubmit">
      <Form.Item label="邮箱" required>
        <Input
          v-model:value="form.email"
          allow-clear
          placeholder="请输入账号绑定的邮箱"
        />
      </Form.Item>
      <Form.Item label="验证码" required>
        <Space.Compact class="w-full">
          <Input
            v-model:value="form.code"
            allow-clear
            class="flex-1"
            placeholder="邮箱收到的 6 位验证码"
            :maxlength="8"
          />
          <Button
            :disabled="countdown > 0"
            :loading="sending"
            @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
          </Button>
        </Space.Compact>
      </Form.Item>
      <Form.Item label="新密码" required>
        <Input.Password
          v-model:value="form.newPassword"
          placeholder="至少 6 位"
        />
      </Form.Item>
      <Form.Item label="确认密码" required>
        <Input.Password
          v-model:value="form.confirmPassword"
          placeholder="再次输入新密码"
        />
      </Form.Item>
      <Button
        block
        class="mt-2"
        html-type="submit"
        type="primary"
        :loading="loading"
      >
        重置密码
      </Button>
      <Button block class="mt-3" @click="router.push('/auth/login')">
        返回登录
      </Button>
    </Form>
  </div>
</template>
