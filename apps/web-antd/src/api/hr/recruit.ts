import { requestClient } from '#/api/request';

export interface JobPostVO {
  createdAt?: string;
  id: number;
  jdText?: string;
  status?: string;
  title: string;
}

export interface JobPostCreateParams {
  jdText?: string;
  status?: string;
  title: string;
}

export interface JobPostUpdateParams {
  jdText?: string;
  status?: string;
  title?: string;
}

export interface ApplicationVO {
  candidateUserId?: number;
  candidateUsername?: string;
  createdAt?: string;
  id: number;
  interviewSessionId?: null | number;
  jobPostId: number;
  jobTitle?: string;
  status?: string;
  totalScore?: null | number;
}

export interface InviteVO {
  expireAt?: string;
  id?: number;
  invitePath?: string;
  jobPostId: number;
  jobTitle?: string;
  token: string;
}

export interface CandidateRegisterParams {
  inviteToken?: string;
  password: string;
  username: string;
}

export async function listJobs() {
  return requestClient.get<JobPostVO[]>('/recruit/jobs');
}

export async function createJob(data: JobPostCreateParams) {
  return requestClient.post<JobPostVO>('/recruit/jobs', data);
}

export async function updateJob(id: number, data: JobPostUpdateParams) {
  return requestClient.put<JobPostVO>(`/recruit/jobs/${id}`, data);
}

export async function listPublicJobs() {
  return requestClient.get<JobPostVO[]>('/recruit/jobs/public');
}

export async function listApplications(params?: {
  jobPostId?: number;
  minScore?: number;
  status?: string;
}) {
  return requestClient.get<ApplicationVO[]>('/recruit/applications', {
    params,
  });
}

export async function applyApplication(formData: FormData) {
  return requestClient.post<ApplicationVO>('/recruit/applications', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export async function decideApplication(
  id: number,
  decision: 'PASSED' | 'REJECTED' | string,
) {
  const normalized =
    decision === 'PASS' || decision === 'PASSED'
      ? 'PASSED'
      : decision === 'REJECT' || decision === 'REJECTED'
        ? 'REJECTED'
        : decision;
  return requestClient.put(`/recruit/applications/${id}/decision`, {
    decision: normalized,
  });
}

/** 面试结束后，面试官允许候选人再次投递 */
export async function reopenApplication(id: number) {
  return requestClient.put(`/recruit/applications/${id}/reopen`);
}

export async function createInvite(jobPostId: number) {
  return requestClient.post<InviteVO>('/recruit/invites', { jobPostId });
}

export async function getInvitePublic(token: string) {
  return requestClient.get<InviteVO>(`/recruit/invites/${token}/public`);
}

export async function registerCandidate(data: CandidateRegisterParams) {
  return requestClient.post('/auth/candidate/register', data);
}
