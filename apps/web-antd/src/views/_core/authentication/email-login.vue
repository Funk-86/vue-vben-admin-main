<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { BasicOption, Recordable } from '@vben/types';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLogin, z } from '@vben/common-ui';

import { Button } from 'ant-design-vue';

import { useAuthStore } from '#/store';
import { HR_ROLE, ROLE_NAME_MAP } from '#/views/hr/roles';

defineOptions({ name: 'EmailLogin' });

const authStore = useAuthStore();
const router = useRouter();
const loading = ref(false);

const ROLE_OPTIONS: BasicOption[] = [
  HR_ROLE.SUPER_ADMIN,
  HR_ROLE.HR_ADMIN,
  HR_ROLE.DEPT_MANAGER,
  HR_ROLE.EMPLOYEE,
].map((code) => ({
  label: ROLE_NAME_MAP[code] ?? code,
  value: code,
}));

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenSelect',
      componentProps: {
        options: ROLE_OPTIONS,
        placeholder: '请选择登录角色',
      },
      defaultValue: HR_ROLE.EMPLOYEE,
      fieldName: 'roleCode',
      label: '登录角色',
      rules: z.string().min(1, { message: '请选择登录角色' }),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入绑定邮箱',
      },
      fieldName: 'email',
      label: '邮箱',
      rules: z
        .string()
        .min(1, { message: '请输入邮箱' })
        .email({ message: '邮箱格式不正确' }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: '请输入密码',
      },
      fieldName: 'password',
      label: '密码',
      rules: z.string().min(1, { message: '请输入密码' }),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '若已开启 MFA 请填写 6 位验证码',
      },
      fieldName: 'mfaCode',
      label: 'MFA 验证码',
      rules: z.string().optional(),
    },
  ];
});

async function handleSubmit(values: Recordable<any>) {
  loading.value = true;
  try {
    await authStore.authLogin({
      email: values.email,
      mfaCode: values.mfaCode,
      password: values.password,
      roleCode: values.roleCode,
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <AuthenticationLogin
      :form-schema="formSchema"
      :loading="loading || authStore.loginLoading"
      :show-code-login="false"
      :show-forget-password="true"
      :show-qrcode-login="false"
      :show-register="false"
      :show-remember-me="false"
      :show-third-party-login="false"
      sub-title="使用员工档案绑定的邮箱登录（未绑定邮箱将无法登录）"
      title="邮箱登录"
      @submit="handleSubmit"
    />
    <Button block class="mt-3" @click="router.push('/auth/login')">
      返回账号密码登录
    </Button>
  </div>
</template>
