<script lang="ts" setup>
import type { Rule } from 'ant-design-vue/es/form';

import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Button, Card, Form, Input, message } from 'ant-design-vue';

import { registerCandidate } from '#/api/hr/recruit';

defineOptions({ name: 'CandidateRegister' });

const router = useRouter();
const route = useRoute();
const loading = ref(false);
const form = reactive({
  inviteToken: (route.query.invite as string) || '',
  password: '',
  username: '',
});

const rules: Record<string, Rule[]> = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 32, message: '用户名长度为 3–32 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 64, message: '密码至少 6 位', trigger: 'blur' },
  ],
};

async function handleSubmit() {
  loading.value = true;
  try {
    await registerCandidate({
      inviteToken: form.inviteToken?.trim() || undefined,
      password: form.password,
      username: form.username.trim(),
    });
    message.success('注册成功，请用「求职者」角色登录');
    await router.push({
      path: '/auth/login',
      query: {
        role: 'CANDIDATE',
        username: form.username.trim(),
      },
    });
  } catch (error: any) {
    message.error(error?.message || error?.msg || '注册失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Card class="mx-auto max-w-md" title="求职者注册">
    <Form :model="form" :rules="rules" layout="vertical" @finish="handleSubmit">
      <Form.Item label="用户名" name="username">
        <Input
          v-model:value="form.username"
          allow-clear
          placeholder="请输入用户名"
          autocomplete="username"
        />
      </Form.Item>
      <Form.Item label="密码" name="password">
        <Input.Password
          v-model:value="form.password"
          placeholder="请输入密码（至少 6 位）"
          autocomplete="new-password"
        />
      </Form.Item>
      <Form.Item label="邀请码（可选）" name="inviteToken">
        <Input
          v-model:value="form.inviteToken"
          allow-clear
          placeholder="来自招聘邀请链接的 token"
        />
      </Form.Item>
      <Button block :loading="loading" type="primary" html-type="submit">
        注册
      </Button>
      <Button block class="mt-2" @click="router.push('/auth/login')">
        返回登录
      </Button>
    </Form>
  </Card>
</template>
