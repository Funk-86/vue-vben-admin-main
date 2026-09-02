<script setup lang="ts">
import type { UploadProps } from 'ant-design-vue';

import { computed, ref } from 'vue';

import { VbenAvatar } from '@vben/common-ui';
import { preferences } from '@vben/preferences';
import { useUserStore } from '@vben/stores';

import { message, Upload } from 'ant-design-vue';

import { uploadEmployeeAvatarApi, uploadMyAvatarApi } from '#/api/core/avatar';
import { saveUserInfoCache } from '#/api/core/user';

const props = withDefaults(
  defineProps<{
    avatarClass?: string;
    employeeId?: number;
    /** my：当前登录用户；employee：指定员工 */
    mode?: 'employee' | 'my';
    src?: string;
  }>(),
  {
    avatarClass: 'size-20',
    employeeId: undefined,
    mode: 'my',
    src: undefined,
  },
);

const emit = defineEmits<{
  success: [url: string];
}>();

const userStore = useUserStore();
const uploading = ref(false);

const displaySrc = computed(() => {
  if (props.src) {
    return props.src;
  }
  if (props.mode === 'employee') {
    return preferences.app.defaultAvatar;
  }
  return userStore.userInfo?.avatar || preferences.app.defaultAvatar;
});

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const uploadFile = file as File;
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(uploadFile.type)) {
    message.error('仅支持 JPG、PNG、WEBP 格式');
    return Upload.LIST_IGNORE;
  }
  if (uploadFile.size > 2 * 1024 * 1024) {
    message.error('头像不能超过 2MB');
    return Upload.LIST_IGNORE;
  }
  return true;
};

const customRequest: UploadProps['customRequest'] = async (options) => {
  const file = options.file as File;
  uploading.value = true;
  try {
    const url =
      props.mode === 'employee' && props.employeeId
        ? await uploadEmployeeAvatarApi(props.employeeId, file)
        : await uploadMyAvatarApi(file);

    if (props.mode === 'my') {
      const current = userStore.userInfo;
      if (current) {
        const info = { ...current, avatar: url };
        userStore.setUserInfo(info as any);
        saveUserInfoCache(info as any);
      }
    }

    message.success('头像更新成功');
    emit('success', url);
    options.onSuccess?.(url);
  } catch (error) {
    options.onError?.(error as Error);
  } finally {
    uploading.value = false;
  }
};
</script>

<template>
  <Upload
    accept="image/jpeg,image/png,image/webp"
    :before-upload="beforeUpload"
    :custom-request="customRequest"
    :disabled="mode === 'employee' && !employeeId"
    :show-upload-list="false"
    name="file"
  >
    <div
      class="group relative inline-flex cursor-pointer rounded-full"
      :class="avatarClass"
    >
      <VbenAvatar :class="avatarClass" :src="displaySrc" />
      <div
        class="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <span class="text-xs text-white">
          {{ uploading ? '上传中…' : '更换头像' }}
        </span>
      </div>
    </div>
  </Upload>
</template>
