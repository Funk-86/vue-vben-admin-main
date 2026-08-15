import { requestClient } from '#/api/request';

export interface UserSettingVO {
  emailSecured: boolean;
  hasEmail: boolean;
  hasPhone: boolean;
  hasSecurityQuestion: boolean;
  maskedEmail?: string;
  maskedPhone?: string;
  mfaEnabled: boolean;
  notifyAccount: boolean;
  notifySystem: boolean;
  notifyTodo: boolean;
  passwordSet: boolean;
  passwordStrength?: string;
  phoneSecured: boolean;
  securityQuestion?: string;
  securityQuestionEnabled: boolean;
}

export interface MfaSetupVO {
  otpauthUrl: string;
  secret: string;
}

export async function getUserSettings() {
  return requestClient.get<UserSettingVO>('/auth/settings');
}

export async function updateNotificationSettings(data: {
  notifyAccount: boolean;
  notifySystem: boolean;
  notifyTodo: boolean;
}) {
  return requestClient.put('/auth/settings/notification', data);
}

export async function toggleSecuritySetting(data: {
  enabled: boolean;
  field: string;
}) {
  return requestClient.put('/auth/settings/security/toggle', data);
}

export async function setSecurityQuestion(data: {
  answer: string;
  question: string;
}) {
  return requestClient.put('/auth/settings/security/question', data);
}

export async function setupMfa() {
  return requestClient.post<MfaSetupVO>('/auth/settings/security/mfa/setup');
}

export async function confirmMfa(code: string) {
  return requestClient.post('/auth/settings/security/mfa/confirm', { code });
}
