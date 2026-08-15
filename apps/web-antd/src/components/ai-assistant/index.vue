<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  Button,
  Drawer,
  FloatButton,
  Input,
  Progress,
  Spin,
  Tag,
} from 'ant-design-vue';

import { aiChat, type AiChatMessage, type AiTaskCard } from '#/api/hr/ai';

interface UiMessage {
  content: string;
  role: 'assistant' | 'user';
  tasks?: AiTaskCard[];
}

const router = useRouter();
const open = ref(false);
const loading = ref(false);
const input = ref('');
const listRef = ref<HTMLElement | null>(null);
const messages = ref<UiMessage[]>([
  {
    content:
      '你好，我是智汇人事助手。可以问请假、考勤、任务流程，或让我帮你写任务说明。',
    role: 'assistant',
  },
]);

async function scrollBottom() {
  await nextTick();
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight;
  }
}

async function send() {
  const text = input.value.trim();
  if (!text || loading.value) {
    return;
  }
  messages.value.push({ content: text, role: 'user' });
  input.value = '';
  await scrollBottom();

  loading.value = true;
  try {
    const history: AiChatMessage[] = messages.value
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-12)
      .map((m) => ({ content: m.content, role: m.role }));
    const result = await aiChat(history);
    messages.value.push({
      content: result?.content || '暂时没有得到有效回复，请稍后再试。',
      role: 'assistant',
      tasks: result?.tasks?.length ? result.tasks : undefined,
    });
  } catch (error: any) {
    const tip =
      error?.response?.data?.message ||
      error?.message ||
      'AI 调用失败，请查看后端日志';
    messages.value.push({
      content: tip,
      role: 'assistant',
    });
  } finally {
    loading.value = false;
    await scrollBottom();
  }
}

function clearChat() {
  messages.value = [
    {
      content: '对话已清空。有什么可以帮你的？',
      role: 'assistant',
    },
  ];
}

function openTaskDetail(taskId: number) {
  open.value = false;
  router.push({ path: '/hr/task', query: { taskId: String(taskId) } });
}
</script>

<template>
  <FloatButton
    type="primary"
    tooltip="AI 助手"
    @click="open = true"
  >
    <template #icon>
      <span class="text-sm font-semibold">AI</span>
    </template>
  </FloatButton>

  <Drawer
    v-model:open="open"
    title="智汇人事 · AI 助手"
    placement="right"
    :width="400"
    :destroy-on-close="false"
  >
    <div class="flex h-full flex-col gap-3">
      <div
        ref="listRef"
        class="min-h-0 flex-1 space-y-3 overflow-y-auto rounded border border-gray-100 bg-gray-50 p-3"
      >
        <div
          v-for="(item, index) in messages"
          :key="index"
          class="flex"
          :class="item.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[90%] space-y-2"
            :class="item.role === 'user' ? 'w-auto' : 'w-full'"
          >
            <div
              class="rounded-lg px-3 py-2 text-sm leading-6"
              :class="
                item.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 shadow-sm'
              "
            >
              {{ item.content }}
            </div>

            <div
              v-if="item.tasks?.length"
              class="space-y-2"
            >
              <button
                v-for="task in item.tasks"
                :key="task.id"
                type="button"
                class="w-full rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-400 hover:shadow"
                @click="openTaskDetail(task.id)"
              >
                <div class="mb-1 flex items-start justify-between gap-2">
                  <span class="font-medium text-gray-900">{{ task.title }}</span>
                  <Tag v-if="task.overdue" color="error" class="m-0 shrink-0">逾期</Tag>
                </div>
                <div class="mb-2 flex flex-wrap gap-1 text-xs">
                  <Tag class="m-0" color="processing">{{ task.myStatusLabel || '未知' }}</Tag>
                  <Tag class="m-0">优先级：{{ task.priorityLabel || '中' }}</Tag>
                </div>
                <Progress
                  :percent="task.myProgress ?? 0"
                  size="small"
                  :stroke-color="
                    (task.myProgress ?? 0) >= 100
                      ? '#52c41a'
                      : (task.myProgress ?? 0) >= 70
                        ? '#1677ff'
                        : (task.myProgress ?? 0) >= 30
                          ? '#faad14'
                          : '#ff4d4f'
                  "
                />
                <div class="mt-1 text-xs text-gray-500">
                  截止：{{ task.dueTime || '未设置' }}
                  <span v-if="task.creatorName"> · 创建人：{{ task.creatorName }}</span>
                </div>
                <div class="mt-1 text-xs text-blue-500">点击查看详情 →</div>
              </button>
            </div>
          </div>
        </div>
        <div v-if="loading" class="py-2 text-center">
          <Spin size="small" />
          <span class="ml-2 text-xs text-gray-500">思考中…</span>
        </div>
      </div>

      <div class="flex gap-2">
        <Button size="small" @click="clearChat">清空</Button>
      </div>

      <div class="flex gap-2">
        <Input.TextArea
          v-model:value="input"
          :rows="3"
          :disabled="loading"
          placeholder="例如：给我展示未完成的任务"
          @press-enter.exact.prevent="send"
        />
      </div>
      <Button type="primary" block :loading="loading" @click="send">
        发送
      </Button>
      <p class="text-xs text-gray-400">
        经后端转发，本地 Ollama / 上线可改云端配置，浏览器不直连模型。
      </p>
    </div>
  </Drawer>
</template>
