import { useAccessStore } from '@vben/stores';

import { requestClient } from '#/api/request';

export interface InterviewSessionVO {
  amICandidate?: boolean;
  applicationId: number;
  candidateUserId?: number;
  currentRound?: number;
  difficulty?: string;
  endedAt?: string;
  id: number;
  jobTitle?: string;
  maxRounds?: number;
  roomName?: string;
  startedAt?: string;
  status?: string;
  totalScore?: number;
}

export interface InterviewTokenVO {
  amICandidate?: boolean;
  configured?: boolean;
  identity?: string;
  roomName?: string;
  token: string;
  url?: string;
}

export interface InterviewMessageVO {
  content: string;
  createdAt?: string;
  id?: number;
  role: 'assistant' | 'system' | 'user' | string;
  roundNo?: number;
  sessionId?: number;
}

export interface InterviewReportVO {
  dimensions?: Record<string, number> | unknown;
  highlights?: unknown;
  rawJson?: string;
  sessionId?: number;
  strengths?: unknown;
  suggestions?: unknown;
  totalScore?: number;
  weaknesses?: unknown;
}

export interface ProctorEventVO {
  createdAt?: string;
  detail?: string;
  eventType: string;
  id?: number;
  occurredAt?: string;
  sessionId?: number;
}

export interface InterviewRecordingVO {
  contentType?: string;
  createdAt?: string;
  durationSec?: number;
  filePath?: string;
  fileUrl?: string;
  id: number;
  sessionId?: number;
  source?: string;
}

function apiBaseUrl() {
  const raw = import.meta.env.VITE_GLOB_API_URL || '/api';
  if (typeof raw === 'string' && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${String(raw).startsWith('/') ? raw : `/${raw}`}`.replace(
      /\/$/,
      '',
    );
  }
  return String(raw).replace(/\/$/, '');
}

async function readSseStream(
  response: Response,
  onChunk: (text: string) => void,
) {
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(errText || `SSE 请求失败(${response.status})`);
  }
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('浏览器不支持流式读取');
  }
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() || '';
    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;
      if (trimmed.startsWith('data:')) {
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') continue;
        // Spring SseEmitter may JSON-encode strings (quoted)
        if (data.startsWith('"') && data.endsWith('"')) {
          try {
            onChunk(JSON.parse(data) as string);
            continue;
          } catch {
            // fallthrough
          }
        }
        onChunk(data);
      }
    }
  }
}

async function fetchSse(
  path: string,
  method: 'GET' | 'POST',
  body: Record<string, unknown> | undefined,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) {
  const accessStore = useAccessStore();
  const token = accessStore.accessToken;
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    headers: {
      Accept: 'text/event-stream',
      Authorization: token ? `Bearer ${token}` : '',
      ...(method !== 'GET' && body
        ? { 'Content-Type': 'application/json' }
        : {}),
    },
    method,
    signal,
    ...(method !== 'GET' && body ? { body: JSON.stringify(body) } : {}),
  });
  await readSseStream(response, onChunk);
}

export async function createInterview(data: {
  applicationId: number;
  difficulty?: string;
  maxRounds?: number;
}) {
  return requestClient.post<InterviewSessionVO>('/interviews', data);
}

export async function getInterview(id: number) {
  return requestClient.get<InterviewSessionVO>(`/interviews/${id}`);
}

export async function getToken(id: number) {
  return requestClient.get<InterviewTokenVO>(`/interviews/${id}/token`);
}

export async function listMessages(id: number) {
  return requestClient.get<InterviewMessageVO[]>(`/interviews/${id}/messages`);
}

export async function completeInterview(id: number) {
  return requestClient.post<InterviewReportVO>(`/interviews/${id}/complete`);
}

export async function getReport(id: number) {
  return requestClient.get<InterviewReportVO>(`/interviews/${id}/report`);
}

export async function reportProctorEvents(
  id: number,
  events: Array<{ detail?: string; eventType: string; occurredAt?: string }>,
) {
  return requestClient.post(`/interviews/${id}/proctor/events`, { events });
}

export async function listProctorEvents(id: number) {
  return requestClient.get<ProctorEventVO[]>(
    `/interviews/${id}/proctor/events`,
  );
}

export async function uploadRecording(id: number, formData: FormData) {
  return requestClient.post<InterviewRecordingVO>(
    `/interviews/${id}/recording`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
}

export async function listRecordings(id: number) {
  return requestClient.get<InterviewRecordingVO[]>(
    `/interviews/${id}/recording`,
  );
}

export async function openInterviewOpening(
  id: number,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) {
  return fetchSse(
    `/interviews/${id}/opening`,
    'GET',
    undefined,
    onChunk,
    signal,
  );
}

export async function sendInterviewMessage(
  id: number,
  content: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
) {
  return fetchSse(
    `/interviews/${id}/messages`,
    'POST',
    { content },
    onChunk,
    signal,
  );
}
