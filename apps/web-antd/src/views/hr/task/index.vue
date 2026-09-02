<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type {
  TaskAssigneeVO,
  TaskAttachmentVO,
  TaskBoardVO,
  TaskDetailVO,
  TaskScoreBonusDictVO,
  TaskVO,
} from '#/api/hr';

import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { useWindowSize } from '@vueuse/core';
import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Progress,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Timeline,
  Upload,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  acceptTask,
  aiTaskDraft,
  closeTask,
  createTask,
  deleteTaskAttachment,
  fetchAllEmployees,
  getProjects,
  getScoreBonusDictList,
  getTaskBoard,
  getTaskDetail,
  getTasks,
  rejectTask,
  runTaskOverdueRemind,
  scoreTaskAssignee,
  updateTaskProgress,
  uploadTaskAttachment,
  urgeTask,
} from '#/api/hr';
import {
  TASK_ASSIGNEE_STATUS_MAP,
  TASK_PRIORITY_MAP,
  TASK_STATUS_MAP,
} from '#/views/hr/constants';
import { useHrAccess } from '#/views/hr/roles';

const route = useRoute();
const router = useRouter();
const { canFeat } = useHrAccess();
const canCreate = computed(() => canFeat('feat.task.create'));
const canOverdueRemind = computed(() => canFeat('feat.org.manage'));
/** 经理/HR 可查看历史附件并删除 */
const canManageAttachments = computed(
  () => canCreate.value || canOverdueRemind.value,
);
/** 创建人/经理/HR 可对已完成执行人评分 */
const canScoreAssignee = computed(
  () => canCreate.value || canOverdueRemind.value,
);

const scope = ref<'created' | 'mine'>('mine');
const viewMode = ref<'board' | 'list'>('list');
const loading = ref(false);
const remindLoading = ref(false);
const records = ref<TaskVO[]>([]);
const board = ref<TaskBoardVO>({
  closed: [],
  done: [],
  inProgress: [],
  pending: [],
});
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const boardColumns = computed(() => [
  {
    key: 'pending' as const,
    title: '待接收',
    color: '#faad14',
    list: board.value.pending,
  },
  {
    key: 'inProgress' as const,
    title: '进行中',
    color: '#1677ff',
    list: board.value.inProgress,
  },
  {
    key: 'done' as const,
    title: '已完成',
    color: '#52c41a',
    list: board.value.done,
  },
  {
    key: 'closed' as const,
    title: '已关闭',
    color: '#8c8c8c',
    list: board.value.closed,
  },
]);

const createOpen = ref(false);
const detailOpen = ref(false);
const progressOpen = ref(false);
const rejectOpen = ref(false);
const detail = ref<null | TaskDetailVO>(null);
const currentId = ref<null | number>(null);
const employeeOptions = ref<{ label: string; value: number }[]>([]);
const aiDraftLoading = ref(false);
const aiDraftPrompt = ref('');
const attachmentUploading = ref(false);
/** 更新进度弹窗中的附件列表 */
const progressAttachments = ref<TaskAttachmentVO[]>([]);

const createForm = reactive({
  assigneeIds: [] as number[],
  content: '',
  dueTime: undefined as dayjs.Dayjs | undefined,
  parentId: undefined as number | undefined,
  priority: 2,
  projectId: undefined as number | undefined,
  title: '',
});
const projectOptions = ref<{ label: string; value: number }[]>([]);
const createModalTitle = computed(() =>
  createForm.parentId ? '创建子任务' : '下发任务',
);

const progressForm = reactive({
  feedback: '',
  progress: 50,
});

const rejectReason = ref('');

const scoreOpen = ref(false);
const scoreTarget = ref<null | TaskAssigneeVO>(null);
const scoreGrade = ref<number>(1);
const scoreBonusOptions = ref<TaskScoreBonusDictVO[]>([]);
const scoreSubmitting = ref(false);

const scoreGradeOptions = computed(() =>
  scoreBonusOptions.value
    .filter((d) => d.status === 1)
    .map((d) => ({
      label: `${d.gradeLabel}（¥${d.bonusAmount}）`,
      value: d.grade,
    })),
);

/** 按进度百分比返回进度条颜色 */
function progressStrokeColor(percent: number) {
  if (percent >= 100) return '#52c41a';
  if (percent >= 70) return '#1677ff';
  if (percent >= 30) return '#faad14';
  return '#ff4d4f';
}

/** 各列最小宽度（内容不足时按比例拉伸；总宽超过视口时横向滚动） */
const COLUMN_MIN_WIDTHS = {
  title: 140,
  creatorName: 96,
  priority: 80,
  status: 88,
  myStatus: 96,
  progress: 140,
  dueTime: 160,
  overdue: 72,
  action: 220,
} as const;

const TABLE_MIN_WIDTH = Object.values(COLUMN_MIN_WIDTHS).reduce(
  (sum, w) => sum + w,
  0,
);

const { width: windowWidth } = useWindowSize();

/**
 * 宽屏：列按百分比均分铺满；窄屏：按最小宽度排布并允许横向滚动。
 */
const columns = computed<TableColumnsType>(() => {
  const wide = windowWidth.value >= TABLE_MIN_WIDTH;
  const pct = (min: number) =>
    wide ? `${((min / TABLE_MIN_WIDTH) * 100).toFixed(2)}%` : min;

  return [
    {
      dataIndex: 'title',
      key: 'title',
      title: '标题',
      ellipsis: true,
      width: pct(COLUMN_MIN_WIDTHS.title),
    },
    {
      dataIndex: 'creatorName',
      key: 'creatorName',
      title: '创建人',
      ellipsis: true,
      width: pct(COLUMN_MIN_WIDTHS.creatorName),
    },
    {
      dataIndex: 'priority',
      key: 'priority',
      title: '优先级',
      width: pct(COLUMN_MIN_WIDTHS.priority),
    },
    {
      dataIndex: 'status',
      key: 'status',
      title: '状态',
      width: pct(COLUMN_MIN_WIDTHS.status),
    },
    {
      dataIndex: 'myStatus',
      key: 'myStatus',
      title: '我的状态',
      width: pct(COLUMN_MIN_WIDTHS.myStatus),
    },
    {
      dataIndex: 'progress',
      key: 'progress',
      title: '进度',
      width: pct(COLUMN_MIN_WIDTHS.progress),
    },
    {
      dataIndex: 'dueTime',
      key: 'dueTime',
      title: '截止时间',
      ellipsis: true,
      width: pct(COLUMN_MIN_WIDTHS.dueTime),
    },
    {
      dataIndex: 'overdue',
      key: 'overdue',
      title: '逾期',
      width: pct(COLUMN_MIN_WIDTHS.overdue),
    },
    {
      key: 'action',
      title: '操作',
      width: pct(COLUMN_MIN_WIDTHS.action),
      fixed: wide ? undefined : 'right',
    },
  ];
});

/** 视口小于表格最小内容宽时启用横向滚动 */
const tableScroll = computed(() =>
  windowWidth.value < TABLE_MIN_WIDTH ? { x: TABLE_MIN_WIDTH } : undefined,
);

async function loadList() {
  loading.value = true;
  try {
    const result = await getTasks({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      scope: scope.value,
    });
    records.value = result.records ?? [];
    pagination.total = result.total;
    pagination.current = result.pageNum;
  } finally {
    loading.value = false;
  }
}

async function loadBoard() {
  loading.value = true;
  try {
    board.value = (await getTaskBoard(scope.value)) ?? {
      closed: [],
      done: [],
      inProgress: [],
      pending: [],
    };
  } finally {
    loading.value = false;
  }
}

async function refreshView() {
  await (viewMode.value === 'board' ? loadBoard() : loadList());
}

async function onRunOverdueRemind() {
  remindLoading.value = true;
  try {
    const result = await runTaskOverdueRemind();
    message.success(`逾期提醒已执行，新发送 ${result?.sent ?? 0} 条`);
  } finally {
    remindLoading.value = false;
  }
}

async function loadEmployees() {
  if (!canCreate.value) return;
  const list = await fetchAllEmployees();
  employeeOptions.value = list
    .filter((e) => e.status !== 3)
    .map((e) => ({ label: `${e.name}（${e.empNo}）`, value: e.id }));
}

async function loadProjectOptions() {
  if (!canCreate.value) return;
  try {
    const res = await getProjects({ pageNum: 1, pageSize: 100, scope: 'mine' });
    projectOptions.value = (res.records || [])
      .filter((p) => p.status !== 3)
      .map((p) => ({ label: p.name, value: p.id }));
  } catch {
    projectOptions.value = [];
  }
}

function openCreate(parent?: { parentId?: number; projectId?: number }) {
  createForm.title = '';
  createForm.content = '';
  createForm.priority = 2;
  createForm.dueTime = undefined;
  createForm.assigneeIds = [];
  createForm.parentId = parent?.parentId;
  createForm.projectId = parent?.projectId;
  aiDraftPrompt.value = '';
  void loadProjectOptions();
  createOpen.value = true;
}

function openCreateSubtask() {
  if (!detail.value || !canCreate.value) return;
  if (detail.value.parentId && detail.value.parentId > 0) {
    message.warning('仅支持一层子任务，请在根任务下添加');
    return;
  }
  openCreate({
    parentId: detail.value.id,
    projectId: detail.value.projectId,
  });
}

async function submitCreate() {
  if (!createForm.title.trim()) {
    message.warning('请输入标题');
    return;
  }
  if (createForm.assigneeIds.length === 0) {
    message.warning('请选择执行人');
    return;
  }
  await createTask({
    title: createForm.title.trim(),
    content: createForm.content || undefined,
    priority: createForm.priority,
    parentId: createForm.parentId,
    projectId: createForm.projectId,
    dueTime: createForm.dueTime
      ? createForm.dueTime.format('YYYY-MM-DDTHH:mm:ss')
      : undefined,
    assigneeIds: createForm.assigneeIds,
  });
  message.success(createForm.parentId ? '子任务已创建' : '任务已下发');
  createOpen.value = false;
  const parentId = createForm.parentId;
  scope.value = 'created';
  await refreshView();
  if (parentId && detailOpen.value) {
    detail.value = await getTaskDetail(parentId);
  }
}

async function generateTaskDraft() {
  const prompt =
    aiDraftPrompt.value.trim() ||
    createForm.title.trim() ||
    createForm.content.trim();
  if (!prompt) {
    message.warning('请先填写关键词或标题');
    return;
  }
  aiDraftLoading.value = true;
  try {
    const draft = await aiTaskDraft(prompt);
    if (draft?.title) {
      createForm.title = draft.title;
    }
    if (draft?.content) {
      createForm.content = draft.content;
    }
    message.success('已生成任务草稿，可继续编辑');
  } catch {
    // handled by interceptor
  } finally {
    aiDraftLoading.value = false;
  }
}

async function openDetail(id: number) {
  detail.value = await getTaskDetail(id);
  detailOpen.value = true;
  if (canScoreAssignee.value && scoreBonusOptions.value.length === 0) {
    try {
      scoreBonusOptions.value = await getScoreBonusDictList();
    } catch {
      // 无权限或未配置时忽略
    }
  }
}

async function openScore(record: TaskAssigneeVO) {
  if (!detail.value?.id) return;
  scoreTarget.value = record;
  scoreGrade.value = record.scoreGrade ?? 1;
  if (scoreBonusOptions.value.length === 0) {
    scoreBonusOptions.value = await getScoreBonusDictList();
  }
  scoreOpen.value = true;
}

async function submitScore() {
  if (!detail.value?.id || !scoreTarget.value) return;
  scoreSubmitting.value = true;
  try {
    await scoreTaskAssignee(
      detail.value.id,
      scoreTarget.value.employeeId,
      scoreGrade.value,
    );
    message.success('评分成功');
    scoreOpen.value = false;
    detail.value = await getTaskDetail(detail.value.id);
  } finally {
    scoreSubmitting.value = false;
  }
}

function isImageAttachment(file: TaskAttachmentVO) {
  const type = (file.contentType || '').toLowerCase();
  if (type.startsWith('image/')) return true;
  const name = (file.fileName || '').toLowerCase();
  return /\.(jpe?g|png|webp|gif)$/.test(name);
}

async function onUploadAttachment(file: File) {
  const taskId = detail.value?.id ?? currentId.value;
  if (taskId === null || taskId === undefined) return false;
  if (file.size > 10 * 1024 * 1024) {
    message.warning('附件不能超过 10MB');
    return false;
  }
  attachmentUploading.value = true;
  try {
    const uploaded = await uploadTaskAttachment(taskId, file);
    message.success('附件已上传');
    // 更新进度：仅展示本次会话上传的附件，不拉取历史
    if (progressOpen.value && currentId.value === taskId && uploaded) {
      progressAttachments.value = [...progressAttachments.value, uploaded];
    }
    // 经理在详情中上传：刷新全部历史附件
    if (
      detailOpen.value &&
      detail.value?.id === taskId &&
      canManageAttachments.value
    ) {
      detail.value = await getTaskDetail(taskId);
    }
  } finally {
    attachmentUploading.value = false;
  }
  return false;
}

async function onDeleteAttachment(attachmentId: number) {
  const taskId = detail.value?.id ?? currentId.value;
  if (taskId === null || taskId === undefined) return;
  // 进度弹窗：员工可撤回本次刚上传的；详情：仅经理可删
  if (detailOpen.value && !progressOpen.value && !canManageAttachments.value) {
    message.warning('无权删除历史附件，请联系部门经理');
    return;
  }
  await deleteTaskAttachment(taskId, attachmentId);
  message.success('附件已删除');
  if (progressOpen.value && currentId.value === taskId) {
    progressAttachments.value = progressAttachments.value.filter(
      (f) => f.id !== attachmentId,
    );
  }
  if (
    detailOpen.value &&
    detail.value?.id === taskId &&
    canManageAttachments.value
  ) {
    detail.value = await getTaskDetail(taskId);
  }
}

/** 从 AI 卡片 / 外链带入的 taskId 自动打开详情 */
async function openDetailFromQuery() {
  const raw = route.query.taskId;
  if (raw === null || raw === undefined || raw === '') return;
  const id = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(id) || id <= 0) return;
  try {
    await openDetail(id);
  } finally {
    const query = { ...route.query };
    delete query.taskId;
    router.replace({ path: route.path, query });
  }
}

async function onAccept(id: number) {
  await acceptTask(id);
  message.success('已接收');
  await refreshView();
}

function openProgress(id: number, current?: number) {
  currentId.value = id;
  progressForm.progress = Math.min(100, (current ?? 0) + 10);
  progressForm.feedback = '';
  // 每次更新进度只展示本次新上传的附件，不加载历史
  progressAttachments.value = [];
  progressOpen.value = true;
}

async function submitProgress() {
  if (currentId.value === null || currentId.value === undefined) return;
  detail.value = await updateTaskProgress(currentId.value, {
    progress: progressForm.progress,
    feedback: progressForm.feedback || undefined,
  });
  message.success(progressForm.progress >= 100 ? '已完成' : '进度已更新');
  progressOpen.value = false;
  await refreshView();
}

function openReject(id: number) {
  currentId.value = id;
  rejectReason.value = '';
  rejectOpen.value = true;
}

async function submitReject() {
  if (currentId.value === null || currentId.value === undefined) return;
  if (!rejectReason.value.trim()) {
    message.warning('请填写驳回原因');
    return;
  }
  await rejectTask(currentId.value, rejectReason.value.trim());
  message.success('已驳回');
  rejectOpen.value = false;
  await refreshView();
}

async function onClose(id: number) {
  await closeTask(id);
  message.success('已关闭');
  await refreshView();
}

async function onUrge(id: number) {
  await urgeTask(id);
  message.success('已催办');
  if (detailOpen.value) {
    detail.value = await getTaskDetail(id);
  }
}

function onTabChange(key: number | string) {
  scope.value = key as 'created' | 'mine';
  pagination.current = 1;
  refreshView();
}

function onViewModeChange(mode: number | string) {
  viewMode.value = mode as 'board' | 'list';
  refreshView();
}

onMounted(async () => {
  await Promise.all([refreshView(), loadEmployees()]);
  await openDetailFromQuery();
});

watch(
  () => route.query.taskId,
  async (taskId) => {
    if (taskId !== null && taskId !== undefined && taskId !== '') {
      await openDetailFromQuery();
    }
  },
);
</script>

<template>
  <Page
    auto-content-height
    description="上级下发任务，下级接收并更新进度"
    title="任务管理"
  >
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <Tabs
        :active-key="scope"
        :tab-bar-style="{ marginBottom: 0 }"
        @change="onTabChange"
      >
        <Tabs.TabPane key="mine" tab="我负责的" />
        <Tabs.TabPane v-if="canCreate" key="created" tab="我创建的" />
      </Tabs>
      <Space wrap>
        <Segmented
          :value="viewMode"
          :options="[
            { label: '列表', value: 'list' },
            { label: '看板', value: 'board' },
          ]"
          @change="onViewModeChange"
        />
        <Button
          v-if="canOverdueRemind"
          :loading="remindLoading"
          @click="onRunOverdueRemind"
        >
          逾期提醒补跑
        </Button>
        <Button v-if="canCreate" type="primary" @click="() => openCreate()">
          新建任务
        </Button>
      </Space>
    </div>

    <div
      v-if="viewMode === 'board'"
      class="flex min-h-[480px] gap-3 overflow-x-auto pb-2"
    >
      <div
        v-for="col in boardColumns"
        :key="col.key"
        class="flex w-72 shrink-0 flex-col rounded-lg border border-gray-100 bg-gray-50"
      >
        <div
          class="flex items-center justify-between border-b border-gray-100 px-3 py-2"
        >
          <span class="font-medium" :style="{ color: col.color }">{{
            col.title
          }}</span>
          <Tag class="m-0">{{ col.list.length }}</Tag>
        </div>
        <div
          class="flex-1 space-y-2 overflow-y-auto p-2"
          style="max-height: 60vh"
        >
          <Spin v-if="loading" class="block w-full py-8 text-center" />
          <template v-else>
            <button
              v-for="item in col.list"
              :key="item.id"
              type="button"
              class="w-full rounded-md border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-400 hover:shadow"
              @click="openDetail(item.id)"
            >
              <div class="mb-1 flex items-start justify-between gap-2">
                <span class="line-clamp-2 font-medium text-gray-900">{{
                  item.title
                }}</span>
                <Tag v-if="item.overdue" color="error" class="m-0 shrink-0">
                  逾期
                </Tag>
              </div>
              <div class="mb-2 text-xs text-gray-500">
                {{ item.creatorName || '-' }}
                · {{ TASK_PRIORITY_MAP[item.priority ?? 2] ?? '中' }}
              </div>
              <Progress
                :percent="item.progress ?? 0"
                size="small"
                :stroke-color="progressStrokeColor(item.progress ?? 0)"
              />
              <div class="mt-1 text-xs text-gray-400">
                截止：{{ item.dueTime || '未设置' }}
              </div>
            </button>
            <div
              v-if="!col.list.length"
              class="py-8 text-center text-xs text-gray-400"
            >
              暂无任务
            </div>
          </template>
        </div>
      </div>
    </div>

    <Table
      v-else
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        onChange: (page: number, pageSize: number) => {
          pagination.current = page;
          pagination.pageSize = pageSize;
          loadList();
        },
      }"
      :scroll="tableScroll"
      class="w-full"
      row-key="id"
      size="middle"
      table-layout="fixed"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'priority'">
          {{ TASK_PRIORITY_MAP[record.priority ?? 2] ?? '-' }}
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag>{{ TASK_STATUS_MAP[record.status ?? 0] ?? '-' }}</Tag>
        </template>
        <template v-else-if="column.key === 'myStatus'">
          {{
            record.myStatus === null || record.myStatus === undefined
              ? '-'
              : (TASK_ASSIGNEE_STATUS_MAP[record.myStatus] ?? '-')
          }}
        </template>
        <template v-else-if="column.key === 'progress'">
          <Progress
            :percent="record.progress ?? 0"
            :stroke-color="progressStrokeColor(record.progress ?? 0)"
            size="small"
          />
        </template>
        <template v-else-if="column.key === 'overdue'">
          <Tag v-if="record.overdue" color="red">逾期</Tag>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space wrap>
            <Button size="small" type="link" @click="openDetail(record.id)">
              详情
            </Button>
            <Button
              v-if="record.myStatus === 0"
              size="small"
              type="link"
              @click="onAccept(record.id)"
            >
              接收
            </Button>
            <Button
              v-if="record.myStatus === 1"
              size="small"
              type="link"
              @click="openProgress(record.id, record.myProgress)"
            >
              进度
            </Button>
            <Button
              v-if="record.myStatus === 0"
              danger
              size="small"
              type="link"
              @click="openReject(record.id)"
            >
              驳回
            </Button>
            <Button
              v-if="
                canCreate &&
                scope === 'created' &&
                (record.status === 0 || record.status === 1)
              "
              size="small"
              type="link"
              @click="onUrge(record.id)"
            >
              催办
            </Button>
            <Button
              v-if="
                canCreate &&
                scope === 'created' &&
                (record.status === 0 || record.status === 1)
              "
              danger
              size="small"
              type="link"
              @click="onClose(record.id)"
            >
              关闭
            </Button>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="createOpen"
      :title="createModalTitle"
      @ok="submitCreate"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="AI 生成">
          <Space.Compact class="w-full">
            <Input
              v-model:value="aiDraftPrompt"
              placeholder="输入关键词，如：本周项目进度周报"
              allow-clear
            />
            <Button
              type="primary"
              :loading="aiDraftLoading"
              @click="generateTaskDraft"
            >
              AI 生成说明
            </Button>
          </Space.Compact>
        </Form.Item>
        <Form.Item label="标题" required>
          <Input v-model:value="createForm.title" placeholder="任务标题" />
        </Form.Item>
        <Form.Item label="说明">
          <Input.TextArea v-model:value="createForm.content" :rows="3" />
        </Form.Item>
        <Form.Item v-if="createForm.parentId" label="父任务">
          <Input :value="`#${createForm.parentId}`" disabled />
        </Form.Item>
        <Form.Item v-if="!createForm.parentId" label="所属项目">
          <Select
            v-model:value="createForm.projectId"
            allow-clear
            :options="projectOptions"
            placeholder="可选，挂接到项目"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="优先级">
          <Select
            v-model:value="createForm.priority"
            :options="[
              { label: '低', value: 1 },
              { label: '中', value: 2 },
              { label: '高', value: 3 },
            ]"
          />
        </Form.Item>
        <Form.Item label="截止时间">
          <DatePicker
            v-model:value="createForm.dueTime"
            show-time
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="执行人" required>
          <Select
            v-model:value="createForm.assigneeIds"
            mode="multiple"
            :options="employeeOptions"
            placeholder="选择本部门员工"
            option-filter-prop="label"
          />
        </Form.Item>
      </Form>
    </Modal>

    <Modal v-model:open="progressOpen" title="更新进度" @ok="submitProgress">
      <Form layout="vertical" class="mt-4">
        <Form.Item label="进度(%)" required>
          <InputNumber
            v-model:value="progressForm.progress"
            :min="1"
            :max="100"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="说明">
          <Input.TextArea v-model:value="progressForm.feedback" :rows="3" />
        </Form.Item>
        <Form.Item label="附件">
          <Upload
            :before-upload="onUploadAttachment"
            :show-upload-list="false"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
          >
            <Button size="small" :loading="attachmentUploading">
              上传附件
            </Button>
          </Upload>
          <div class="mt-1 text-xs text-gray-400">
            支持图片/PDF/Word，最大 10MB；此处仅显示本次上传的附件
          </div>
          <div
            v-if="progressAttachments.length"
            class="mt-2 flex flex-wrap gap-3 pt-1.5 pr-1.5"
          >
            <div
              v-for="file in progressAttachments"
              :key="file.id"
              class="group relative"
            >
              <!-- 图片：小缩略图，悬停圆形 × 浮出右上角 -->
              <template v-if="isImageAttachment(file) && file.url">
                <div
                  class="h-14 w-14 overflow-hidden rounded border border-gray-200 bg-gray-50"
                >
                  <Image
                    :src="file.url"
                    :alt="file.fileName"
                    :width="56"
                    :height="56"
                    class="!h-14 !w-14 object-cover"
                  />
                </div>
                <button
                  type="button"
                  class="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gray-500 text-[11px] leading-none text-white shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-gray-600"
                  title="删除"
                  @click.stop.prevent="onDeleteAttachment(file.id)"
                >
                  ×
                </button>
              </template>
              <!-- 文档：紧凑文件名块，悬停圆形 × -->
              <template v-else>
                <div
                  class="flex h-14 max-w-[120px] items-center rounded border border-gray-200 bg-gray-50 px-2"
                >
                  <a
                    v-if="file.url"
                    :href="file.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="truncate text-xs text-blue-600 hover:underline"
                    :title="file.fileName"
                  >
                    {{ file.fileName }}
                  </a>
                  <span
                    v-else
                    class="truncate text-xs text-gray-600"
                    :title="file.fileName"
                  >
                    {{ file.fileName }}
                  </span>
                </div>
                <button
                  type="button"
                  class="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gray-500 text-[11px] leading-none text-white shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-gray-600"
                  title="删除"
                  @click.stop.prevent="onDeleteAttachment(file.id)"
                >
                  ×
                </button>
              </template>
            </div>
          </div>
          <div v-else class="mt-2 text-xs text-gray-400">暂无附件</div>
        </Form.Item>
        <div class="text-gray-500 text-sm">进度填到 100 将自动完成任务</div>
      </Form>
    </Modal>

    <Modal v-model:open="rejectOpen" title="驳回任务" @ok="submitReject">
      <Form layout="vertical" class="mt-4">
        <Form.Item label="驳回原因" required>
          <Input.TextArea v-model:value="rejectReason" :rows="3" />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="scoreOpen"
      :confirm-loading="scoreSubmitting"
      :title="`评分：${scoreTarget?.employeeName || ''}`"
      @ok="submitScore"
    >
      <Form layout="vertical">
        <Form.Item label="等级" required>
          <Select
            v-model:value="scoreGrade"
            :options="scoreGradeOptions"
            class="w-full"
            placeholder="选择优/良/中/合格/差"
          />
        </Form.Item>
        <p class="text-xs text-gray-400">
          奖金金额按「评分奖金字典」自动写入，可改评覆盖
        </p>
      </Form>
    </Modal>

    <Drawer
      v-model:open="detailOpen"
      title="任务详情"
      width="560"
      destroy-on-close
    >
      <template v-if="detail">
        <h3 class="mb-2 text-lg font-medium">{{ detail.title }}</h3>
        <p class="mb-4 text-gray-600 whitespace-pre-wrap">
          {{ detail.content || '无说明' }}
        </p>
        <p class="mb-2">
          状态：{{ TASK_STATUS_MAP[detail.status ?? 0] }}
          <Tag v-if="detail.overdue" color="red" class="ml-2">逾期</Tag>
        </p>
        <p class="mb-2">整体进度：{{ detail.progress ?? 0 }}%</p>
        <p class="mb-2">创建人：{{ detail.creatorName || '-' }}</p>
        <p class="mb-2">截止：{{ detail.dueTime || '-' }}</p>
        <p v-if="detail.projectId" class="mb-2">
          项目ID：{{ detail.projectId }}
        </p>
        <p v-if="detail.parentId && detail.parentId > 0" class="mb-4">
          父任务：#{{ detail.parentId }}
        </p>
        <div v-else class="mb-4">
          <Space>
            <Button
              v-if="canCreate && detail.status !== 3"
              size="small"
              type="primary"
              @click="openCreateSubtask"
            >
              添加子任务
            </Button>
          </Space>
        </div>

        <template v-if="detail.children?.length">
          <h4 class="mb-2 font-medium">子任务</h4>
          <Table
            :columns="[
              { title: '标题', dataIndex: 'title' },
              { title: '状态', dataIndex: 'status', width: 80 },
              { title: '进度', dataIndex: 'progress', width: 70 },
            ]"
            :data-source="detail.children"
            :pagination="false"
            row-key="id"
            size="small"
            class="mb-4"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'status'">
                {{ TASK_STATUS_MAP[record.status ?? 0] }}
              </template>
              <template v-else-if="column.dataIndex === 'progress'">
                {{ record.progress ?? 0 }}%
              </template>
              <template v-else-if="column.dataIndex === 'title'">
                <Button type="link" size="small" @click="openDetail(record.id)">
                  {{ record.title }}
                </Button>
              </template>
            </template>
          </Table>
        </template>

        <h4 class="mb-2 font-medium">执行人</h4>
        <Table
          :columns="[
            { title: '姓名', dataIndex: 'employeeName', width: 80 },
            { title: '状态', dataIndex: 'status', width: 70 },
            { title: '进度', dataIndex: 'progress', width: 60 },
            { title: '评分', dataIndex: 'score', width: 120 },
            { title: '操作', key: 'action', width: 70 },
          ]"
          :data-source="detail.assignees || []"
          :pagination="false"
          row-key="employeeId"
          size="small"
          class="mb-4"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              {{ TASK_ASSIGNEE_STATUS_MAP[record.status ?? 0] }}
            </template>
            <template v-else-if="column.dataIndex === 'progress'">
              {{ record.progress ?? 0 }}%
            </template>
            <template v-else-if="column.dataIndex === 'score'">
              <span v-if="record.scoreGrade">
                {{ record.scoreGradeLabel || record.scoreGrade }}
                <template v-if="record.scoreBonus != null">
                  / ¥{{ record.scoreBonus }}
                </template>
              </span>
              <span v-else class="text-gray-400">未评</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <Button
                v-if="canScoreAssignee && record.status === 2"
                size="small"
                type="link"
                @click="openScore(record as any)"
              >
                {{ record.scoreGrade ? '改评' : '评分' }}
              </Button>
            </template>
          </template>
        </Table>

        <template v-if="canManageAttachments">
          <h4 class="mb-2 font-medium">附件（历史）</h4>
          <div class="mb-3">
            <Upload
              :before-upload="onUploadAttachment"
              :show-upload-list="false"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx"
            >
              <Button size="small" :loading="attachmentUploading">
                上传附件
              </Button>
            </Upload>
            <span class="ml-2 text-xs text-gray-400">经理可查看并删除全部历史附件</span>
          </div>
          <div
            v-if="detail.attachments?.length"
            class="mb-4 flex flex-wrap gap-3 pt-1.5 pr-1.5"
          >
            <div
              v-for="file in detail.attachments"
              :key="file.id"
              class="group relative"
              :title="`${file.fileName} · ${file.uploaderName || '-'}`"
            >
              <template v-if="isImageAttachment(file) && file.url">
                <div
                  class="h-14 w-14 overflow-hidden rounded border border-gray-200 bg-gray-50"
                >
                  <Image
                    :src="file.url"
                    :alt="file.fileName"
                    :width="56"
                    :height="56"
                    class="!h-14 !w-14 object-cover"
                  />
                </div>
                <button
                  type="button"
                  class="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gray-500 text-[11px] leading-none text-white shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-gray-600"
                  title="删除"
                  @click.stop.prevent="onDeleteAttachment(file.id)"
                >
                  ×
                </button>
              </template>
              <template v-else>
                <div
                  class="flex h-14 max-w-[120px] items-center rounded border border-gray-200 bg-gray-50 px-2"
                >
                  <a
                    v-if="file.url"
                    :href="file.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="truncate text-xs text-blue-600 hover:underline"
                  >
                    {{ file.fileName }}
                  </a>
                  <span v-else class="truncate text-xs">{{
                    file.fileName
                  }}</span>
                </div>
                <button
                  type="button"
                  class="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-gray-500 text-[11px] leading-none text-white shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-gray-600"
                  title="删除"
                  @click.stop.prevent="onDeleteAttachment(file.id)"
                >
                  ×
                </button>
              </template>
            </div>
          </div>
          <div v-else class="mb-4 text-xs text-gray-400">暂无附件</div>
        </template>

        <h4 class="mb-2 font-medium">操作记录</h4>
        <Timeline>
          <Timeline.Item v-for="(log, idx) in detail.logs || []" :key="idx">
            <div>
              <strong>{{ log.action }}</strong>
              · {{ log.operatorName || '-' }}
            </div>
            <div class="text-gray-500 text-sm">{{ log.remark }}</div>
            <div class="text-gray-400 text-xs">{{ log.createdAt }}</div>
          </Timeline.Item>
        </Timeline>
      </template>
    </Drawer>
  </Page>
</template>
