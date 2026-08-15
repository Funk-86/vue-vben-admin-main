import { requestClient } from '#/api/request';

export interface AiChatMessage {
  content: string;
  role: 'assistant' | 'system' | 'user';
}

export interface AiTaskCard {
  creatorName?: string;
  dueTime?: string;
  id: number;
  myProgress?: number;
  myStatusLabel?: string;
  overdue?: boolean;
  priorityLabel?: string;
  title: string;
}

export interface AiChatResult {
  content: string;
  tasks?: AiTaskCard[];
}

export interface AiTaskDraftResult {
  content: string;
  title: string;
}

export async function aiChat(messages: AiChatMessage[]) {
  return requestClient.post<AiChatResult>('/ai/chat', { messages });
}

export async function aiTaskDraft(prompt: string) {
  return requestClient.post<AiTaskDraftResult>('/ai/task-draft', { prompt });
}
