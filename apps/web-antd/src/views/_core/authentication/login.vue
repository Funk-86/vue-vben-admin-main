<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';
import type { BasicOption, Recordable } from '@vben/types';

import type { SavedAccount } from '#/utils/saved-accounts';

import { computed, nextTick, onMounted, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Button, Select } from 'ant-design-vue';

import { useAuthStore } from '#/store';
import {
  loadSavedAccounts,
  removeSavedAccount,
  upsertSavedAccount,
} from '#/utils/saved-accounts';
import { HR_ROLE, ROLE_NAME_MAP } from '#/views/hr/roles';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();
const loginRef = ref<{
  getFormApi: () => { setValues: (v: Recordable<any>) => void };
}>();
const savedAccounts = ref<SavedAccount[]>([]);
const selectedAccountKey = ref<string>();
const rememberMe = ref(false);

const ROLE_OPTIONS: BasicOption[] = [
  HR_ROLE.SUPER_ADMIN,
  HR_ROLE.HR_ADMIN,
  HR_ROLE.DEPT_MANAGER,
  HR_ROLE.EMPLOYEE,
].map((code) => ({
  label: ROLE_NAME_MAP[code] ?? code,
  value: code,
}));

const accountOptions = computed(() =>
  savedAccounts.value.map((a) => ({
    label: `${a.username} · ${ROLE_NAME_MAP[a.roleCode] ?? a.roleCode}`,
    value: `${a.username}::${a.roleCode}`,
  })),
);

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

function refreshSavedAccounts() {
  savedAccounts.value = loadSavedAccounts();
}

function applySavedAccount(key: string) {
  const acc = savedAccounts.value.find(
    (a) => `${a.username}::${a.roleCode}` === key,
  );
  if (!acc) return;
  loginRef.value?.getFormApi()?.setValues({
    username: acc.username,
    password: acc.password,
    roleCode: acc.roleCode,
  });
  rememberMe.value = true;
}

function onAccountChange(key: string | undefined) {
  const value = typeof key === 'string' ? key : undefined;
  selectedAccountKey.value = value;
  if (value) {
    applySavedAccount(value);
  }
}

function removeSelectedAccount() {
  if (!selectedAccountKey.value) return;
  const acc = savedAccounts.value.find(
    (a) => `${a.username}::${a.roleCode}` === selectedAccountKey.value,
  );
  if (acc) {
    removeSavedAccount(acc.username, acc.roleCode);
    refreshSavedAccounts();
    selectedAccountKey.value = undefined;
  }
}

async function handleSubmit(values: Recordable<any>) {
  if (
    rememberMe.value &&
    values.username &&
    values.password &&
    values.roleCode
  ) {
    upsertSavedAccount({
      label: `${values.username} · ${ROLE_NAME_MAP[values.roleCode as string] ?? values.roleCode}`,
      password: values.password as string,
      roleCode: values.roleCode as string,
      username: values.username as string,
    });
    refreshSavedAccounts();
  }
  await authStore.authLogin(values);
}

onMounted(async () => {
  refreshSavedAccounts();
  await nextTick();
  const first = savedAccounts.value[0];
  if (first) {
    selectedAccountKey.value = `${first.username}::${first.roleCode}`;
    applySavedAccount(selectedAccountKey.value);
  }
});
</script>

<template>
  <div>
    <div v-if="accountOptions.length" class="mb-4">
      <div class="mb-1 text-sm text-muted-foreground">已记住的账户</div>
      <Select
        v-model:value="selectedAccountKey"
        allow-clear
        class="w-full"
        :options="accountOptions"
        placeholder="选择账户快速登录"
        @change="(v) => onAccountChange(typeof v === 'string' ? v : undefined)"
      />
      <Button
        v-if="selectedAccountKey"
        class="mt-1 px-0"
        size="small"
        type="link"
        @click="removeSelectedAccount"
      >
        移除此记住账户
      </Button>
    </div>

    <AuthenticationLogin
      ref="loginRef"
      :form-schema="formSchema"
      :loading="authStore.loginLoading"
      :show-register="false"
      :show-remember-me="false"
      @submit="handleSubmit"
    />

    <label class="mt-2 flex cursor-pointer items-center gap-2 text-sm">
      <input v-model="rememberMe" type="checkbox" />
      记住账号、密码与登录角色（本机可保存多个账户）
    </label>
  </div>
</template>
