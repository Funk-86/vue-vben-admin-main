import type { Recordable, UserInfo } from '@vben/types';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { notification } from 'ant-design-vue';
import { defineStore } from 'pinia';

import {
  clearUserInfoCache,
  getUserInfoApi,
  loginApi,
  saveUserInfoCache,
} from '#/api';
import { $t } from '#/locales';

/** 模块级标记：避免 $reset 清掉状态后，退出竞态请求仍触发二次登出/报错 */
const loggingOut = ref(false);

export const useAuthStore = defineStore('auth', () => {
  const accessStore = useAccessStore();
  const userStore = useUserStore();
  const router = useRouter();

  const loginLoading = ref(false);
  const isLoggingOut = computed(() => loggingOut.value);

  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    let userInfo: null | UserInfo = null;
    try {
      loginLoading.value = true;
      const loginResult = await loginApi({
        mfaCode: params.mfaCode || undefined,
        password: params.password,
        roleCode: params.roleCode,
        username: params.username,
      });

      if (loginResult?.token) {
        accessStore.setAccessToken(loginResult.token);

        userInfo = {
          avatar: loginResult.avatar ?? '',
          desc: loginResult.roles?.join(', ') ?? '',
          homePath: '/workspace',
          realName: loginResult.realName || loginResult.username,
          roles: loginResult.roles ?? [],
          token: loginResult.token,
          userId: loginResult.username,
          username: loginResult.username,
        };

        userStore.setUserInfo(userInfo);
        accessStore.setAccessCodes(loginResult.permissions ?? []);
        saveUserInfoCache(userInfo);

        if (accessStore.loginExpired) {
          accessStore.setLoginExpired(false);
        } else {
          onSuccess
            ? await onSuccess?.()
            : await router.push(
                userInfo.homePath || preferences.app.defaultHomePath,
              );
        }

        notification.success({
          description: `${$t('authentication.loginSuccessDesc')}:${userInfo.realName}`,
          duration: 3,
          message: $t('authentication.loginSuccess'),
        });
      }
    } finally {
      loginLoading.value = false;
    }

    return { userInfo };
  }

  async function logout(redirect: boolean = true) {
    if (loggingOut.value) {
      return;
    }
    loggingOut.value = true;
    try {
      clearUserInfoCache();
      resetAllStores();
      accessStore.setLoginExpired(false);

      await router.replace({
        path: LOGIN_PATH,
        query: redirect
          ? {
              redirect: encodeURIComponent(router.currentRoute.value.fullPath),
            }
          : {},
      });
    } finally {
      loggingOut.value = false;
    }
  }

  async function fetchUserInfo() {
    const { permissions, userInfo } = await getUserInfoApi();
    userStore.setUserInfo(userInfo);
    if (permissions.length > 0) {
      accessStore.setAccessCodes(permissions);
    }
    return userInfo;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchUserInfo,
    isLoggingOut,
    loginLoading,
    logout,
  };
});
