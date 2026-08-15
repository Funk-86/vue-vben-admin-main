<script setup lang="ts">
import type { VbenFormSchema } from '#/adapter/form';

import { computed, ref } from 'vue';

import { ProfilePasswordSetting, z } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { changePasswordApi } from '#/api/core/auth';

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      fieldName: 'oldPassword',
      label: '旧密码',
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: '请输入旧密码',
      },
      rules: 'required',
    },
    {
      fieldName: 'newPassword',
      label: '新密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请输入新密码',
      },
      rules: 'required',
    },
    {
      fieldName: 'confirmPassword',
      label: '确认密码',
      component: 'VbenInputPassword',
      componentProps: {
        passwordStrength: true,
        placeholder: '请再次输入新密码',
      },
      dependencies: {
        rules(values) {
          const { newPassword } = values;
          return z
            .string({ required_error: '请再次输入新密码' })
            .min(1, { message: '请再次输入新密码' })
            .refine((value) => value === newPassword, {
              message: '两次输入的密码不一致',
            });
        },
        triggerFields: ['newPassword'],
      },
    },
  ];
});

const passwordSettingRef = ref<InstanceType<typeof ProfilePasswordSetting>>();

async function handleSubmit(values: Record<string, string>) {
  try {
    await changePasswordApi({
      confirmPassword: values.confirmPassword,
      newPassword: values.newPassword,
      oldPassword: values.oldPassword,
    });
    message.success('密码修改成功');
    passwordSettingRef.value?.getFormApi()?.resetForm();
  } catch {
    // 错误由 request 拦截器统一提示
  }
}
</script>
<template>
  <ProfilePasswordSetting
    ref="passwordSettingRef"
    class="w-1/3"
    :form-schema="formSchema"
    @submit="handleSubmit"
  />
</template>
