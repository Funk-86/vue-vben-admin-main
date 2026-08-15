import type { UserInfo } from '@vben/types';

import { fetchUserInfoApi } from '#/api/core/auth';

const USER_INFO_KEY = 'hr_user_info';

export function saveUserInfoCache(userInfo: UserInfo) {
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
}

export function loadUserInfoCache(): null | UserInfo {
  const raw = localStorage.getItem(USER_INFO_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function clearUserInfoCache() {
  localStorage.removeItem(USER_INFO_KEY);
}

function buildUserInfo(
  remote: {
    avatar?: string;
    realName?: string;
    roles: string[];
    username: string;
  },
  cached: null | UserInfo,
): UserInfo {
  const displayName = remote.realName || remote.username;
  return {
    avatar: remote.avatar ?? cached?.avatar ?? '',
    desc: remote.roles?.join(', ') ?? '',
    homePath: cached?.homePath ?? '/workspace',
    realName: displayName,
    roles: remote.roles ?? [],
    token: cached?.token ?? '',
    userId: remote.username,
    username: remote.username,
  };
}

/** 从后端拉取用户信息；失败时回退 localStorage 缓存 */
export async function getUserInfoApi(): Promise<{
  permissions: string[];
  userInfo: UserInfo;
}> {
  const cached = loadUserInfoCache();
  try {
    const remote = await fetchUserInfoApi();
    const userInfo = buildUserInfo(remote, cached);
    saveUserInfoCache(userInfo);
    return {
      permissions: remote.permissions ?? [],
      userInfo,
    };
  } catch {
    if (cached) {
      return { permissions: [], userInfo: cached };
    }
    throw new Error('用户信息不存在，请重新登录');
  }
}
