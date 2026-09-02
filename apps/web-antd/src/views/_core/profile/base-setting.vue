<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, onMounted, ref } from 'vue';

import { ProfileBaseSetting } from '@vben/common-ui';
import { useAccessStore, useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { fetchProfileApi, updateProfileApi } from '#/api/core/auth';
import { saveUserInfoCache } from '#/api/core/user';
import { ROLE_NAME_MAP } from '#/views/hr/roles';

const userStore = useUserStore();
const accessStore = useAccessStore();
const profileBaseSettingRef = ref();
const boundEmployee = ref(true);

const genderOptions = [
  { label: '男', value: 1 },
  { label: '女', value: 2 },
];

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入登录用户名',
      },
      fieldName: 'username',
      label: '用户名',
      rules: 'required',
    },
    {
      component: 'Input',
      componentProps: {
        disabled: true,
      },
      fieldName: 'roleLabel',
      label: '角色',
    },
    {
      component: 'Input',
      componentProps: {
        disabled: !boundEmployee.value,
        placeholder: '请输入姓名',
      },
      fieldName: 'realName',
      label: '姓名',
      rules: boundEmployee.value ? 'required' : undefined,
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        disabled: !boundEmployee.value,
        options: genderOptions,
        placeholder: '请选择性别',
      },
      fieldName: 'gender',
      label: '性别',
    },
    {
      component: 'Input',
      componentProps: {
        disabled: !boundEmployee.value,
        placeholder: '请输入手机号',
      },
      fieldName: 'phone',
      label: '手机号',
    },
    {
      component: 'Input',
      componentProps: {
        disabled: !boundEmployee.value,
        placeholder: '请输入邮箱',
      },
      fieldName: 'email',
      label: '邮箱',
    },
    {
      component: 'Textarea',
      componentProps: {
        disabled: !boundEmployee.value,
        placeholder: '请输入个人简介',
        rows: 4,
      },
      fieldName: 'introduction',
      label: '个人简介',
    },
  ];
});

function roleLabel(roles: string[] | undefined) {
  if (!roles?.length) {
    return '未分配';
  }
  return roles.map((role) => ROLE_NAME_MAP[role] ?? role).join('、');
}

async function loadProfile() {
  const profile = await fetchProfileApi();
  boundEmployee.value = profile.boundEmployee !== false;
  profileBaseSettingRef.value?.getFormApi()?.setValues({
    email: profile.email ?? '',
    gender: profile.gender,
    introduction: profile.introduction ?? '',
    phone: profile.phone ?? '',
    realName: profile.realName ?? '',
    roleLabel: roleLabel(profile.roles),
    username: profile.username,
  });
}

async function handleSubmit(values: Record<string, any>) {
  const username = String(values.username ?? '').trim();
  if (!username) {
    message.warning('请填写用户名');
    return;
  }
  try {
    const payload: Record<string, any> = {
      username,
    };
    if (boundEmployee.value) {
      payload.email = values.email || '';
      payload.gender = values.gender;
      payload.introduction = values.introduction || '';
      payload.phone = values.phone || '';
      payload.realName = values.realName;
    }
    const result = await updateProfileApi(payload);
    if (result?.token) {
      accessStore.setAccessToken(result.token);
    }
    if (userStore.userInfo) {
      const next = {
        ...userStore.userInfo,
        realName: boundEmployee.value
          ? values.realName
          : userStore.userInfo.realName,
        userId: result.username,
        username: result.username,
      };
      userStore.setUserInfo(next as any);
      saveUserInfoCache(next as any);
    }
    message.success('个人信息已更新');
    await loadProfile();
  } catch {
    // 错误由 request 拦截器统一提示
  }
}

onMounted(async () => {
  try {
    await loadProfile();
  } catch {
    // handled
  }
});
</script>

<template>
  <div class="w-full max-w-xl">
    <p v-if="!boundEmployee" class="mb-4 text-sm text-orange-500">
      当前账号未关联员工档案，可修改用户名；姓名等档案信息不可编辑。
    </p>
    <ProfileBaseSetting
      ref="profileBaseSettingRef"
      :form-schema="formSchema"
      @submit="handleSubmit"
    />
  </div>
</template>
