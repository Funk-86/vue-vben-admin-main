/** 招聘岗位 / 申请状态：编码 → 中文 */

export const JOB_STATUS_LABEL: Record<string, string> = {
  OPEN: '招聘中',
  CLOSED: '已关闭',
};

export const JOB_STATUS_COLOR: Record<string, string> = {
  OPEN: 'success',
  CLOSED: 'default',
};

export const APP_STATUS_LABEL: Record<string, string> = {
  APPLIED: '已投递',
  PENDING_INTERVIEW: '待面试',
  IN_INTERVIEW: '面试中',
  SCORED: '已评分',
  PASSED: '已通过',
  REJECTED: '已淘汰',
  REOPEN: '可再次投递',
};

export const APP_STATUS_COLOR: Record<string, string> = {
  APPLIED: 'default',
  PENDING_INTERVIEW: 'warning',
  IN_INTERVIEW: 'processing',
  SCORED: 'blue',
  PASSED: 'success',
  REJECTED: 'error',
  REOPEN: 'cyan',
};

export function jobStatusLabel(code?: null | string) {
  if (!code) return '-';
  return JOB_STATUS_LABEL[code] ?? code;
}

export function appStatusLabel(code?: null | string) {
  if (!code) return '-';
  return APP_STATUS_LABEL[code] ?? code;
}
