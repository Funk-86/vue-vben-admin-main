import { requestClient } from '#/api/request';

/** 上传当前用户头像，返回 OSS 公网 URL */
export async function uploadMyAvatarApi(file: File) {
  return requestClient.upload<string>('/auth/avatar', { file });
}

/** 获取当前用户头像 URL */
export async function getMyAvatarApi() {
  return requestClient.get<string>('/auth/avatar');
}

/** 为指定员工上传头像（HR / 管理员） */
export async function uploadEmployeeAvatarApi(employeeId: number, file: File) {
  return requestClient.upload<string>(`/employees/${employeeId}/avatar`, {
    file,
  });
}
