<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { BasicOption } from '@vben/types';

import { computed } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { useAuthStore } from '#/store';
import { HR_ROLE, ROLE_NAME_MAP } from '#/views/hr/roles';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

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
      defaultValue: HR_ROLE.SUPER_ADMIN,
      fieldName: 'roleCode',
      label: '登录角色',
      rules: z.string().min(1, { message: '请选择登录角色' }),
    },
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: $t('authentication.usernameTip'),
      },
      // 不预填账号，由「记住账号」从 localStorage 回填
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
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
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-register="false"
    :show-remember-me="true"
    @submit="authStore.authLogin"
  />
</template>
