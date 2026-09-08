import { requestClient } from '#/api/request';

export namespace AuthApi {
  export interface LoginParams {
    /** 邮箱登录（与 username 二选一） */
    email?: string;
    /** 若已开启 MFA，填写 Authenticator 动态码 */
    mfaCode?: string;
    password: string;
    /** 登录角色编码，与后端 sys_role.role_code 一致 */
    roleCode: string;
    /** 用户名登录（与 email 二选一） */
    username?: string;
  }

  export interface MenuVO {
    children?: MenuVO[];
    code: string;
    id: number;
    name: string;
    path?: string;
    sortOrder?: number;
  }

  export interface LoginResult {
    avatar?: string;
    menus: MenuVO[];
    permissions: string[];
    realName: string;
    roles: string[];
    token: string;
    username: string;
  }
}

export async function loginApi(data: AuthApi.LoginParams) {
  return requestClient.post<AuthApi.LoginResult>('/auth/login', data);
}

export interface UserInfoResult {
  avatar?: string;
  permissions: string[];
  realName: string;
  roles: string[];
  username: string;
}

export async function fetchUserInfoApi() {
  return requestClient.get<UserInfoResult>('/auth/userinfo');
}

export async function changePasswordApi(data: {
  confirmPassword: string;
  newPassword: string;
  oldPassword: string;
}) {
  return requestClient.post('/auth/regis', data);
}

export interface ProfileResult {
  avatar?: string;
  boundEmployee?: boolean;
  email?: string;
  gender?: number;
  introduction?: string;
  phone?: string;
  realName?: string;
  roles: string[];
  username: string;
}

export interface ProfileUpdateParams {
  email?: string;
  gender?: number;
  introduction?: string;
  phone?: string;
  realName?: string;
  username?: string;
}

export interface ProfileUpdateResult {
  token?: string;
  username: string;
}

export async function fetchProfileApi() {
  return requestClient.get<ProfileResult>('/auth/profile');
}

export async function updateProfileApi(data: ProfileUpdateParams) {
  return requestClient.put<ProfileUpdateResult>('/auth/profile', data);
}

/** 校验当前用户登录密码（锁屏解锁） */
export async function verifyPasswordApi(password: string) {
  return requestClient.post('/auth/verify-password', { password });
}

/** 后端未提供 refresh 接口，占位避免编译错误 */
export async function refreshTokenApi() {
  throw new Error('不支持刷新 Token');
}

export async function sendForgotPasswordCodeApi(email: string) {
  return requestClient.post('/auth/forgot-password/send-code', { email });
}

export async function resetForgotPasswordApi(data: {
  code: string;
  confirmPassword: string;
  email: string;
  newPassword: string;
}) {
  return requestClient.post('/auth/forgot-password/reset', data);
}
