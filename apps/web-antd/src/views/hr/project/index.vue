<script lang="ts" setup>
import type { ProjectVO, TaskVO } from '#/api/hr';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  closeProject,
  createProject,
  createTask,
  fetchAllEmployees,
  getProjectDetail,
  getProjectTasks,
  getProjects,
  updateProject,
  updateProjectProgress,
} from '#/api/hr';
import { TASK_STATUS_MAP } from '#/views/hr/constants';
import { hasAnyRole, ROLE_HR_STAFF, ROLE_MANAGER_UP } from '#/views/hr/roles';

const PROJECT_STATUS_MAP: Record<number, string> = {
  0: '规划中',
  1: '进行中',
  2: '已完成',
  3: '已关闭',
};

const userStore = useUserStore();
const canManage = computed(() =>
  hasAnyRole(userStore.userInfo?.roles, ROLE_MANAGER_UP),
);
const canSeeAll = computed(() =>
  hasAnyRole(userStore.userInfo?.roles, ROLE_HR_STAFF),
);

const loading = ref(false);
const list = ref<ProjectVO[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const statusFilter = ref<number | undefined>(undefined);
const scope = ref<'all' | 'mine'>('mine');

const employeeOptions = ref<{ label: string; value: number }[]>([]);

const createOpen = ref(false);
const detailOpen = ref(false);
const progressOpen = ref(false);
const taskCreateOpen = ref(false);
const detail = ref<ProjectVO | null>(null);
const projectTasks = ref<TaskVO[]>([]);
const currentId = ref<number | null>(null);

const createForm = reactive({
  description: '',
  endDate: undefined as dayjs.Dayjs | undefined,
  memberIds: [] as number[],
  name: '',
  ownerId: undefined as number | undefined,
  startDate: undefined as dayjs.Dayjs | undefined,
});

const progressForm = reactive({
  locked: true,
  progress: 0,
});

const taskForm = reactive({
  assigneeIds: [] as number[],
  content: '',
  dueTime: undefined as dayjs.Dayjs | undefined,
  priority: 2,
  title: '',
});

const columns = [
  { dataIndex: 'name', key: 'name', title: '项目名称', ellipsis: true },
  { dataIndex: 'ownerName', key: 'ownerName', title: '负责人', width: 100 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { dataIndex: 'progress', key: 'progress', title: '进度', width: 140 },
  { dataIndex: 'taskCount', key: 'taskCount', title: '任务数', width: 80 },
  { dataIndex: 'endDate', key: 'endDate', title: '截止日期', width: 120 },
  { key: 'action', title: '操作', width: 200 },
];

async function loadEmployees() {
  const listEmp = await fetchAllEmployees();
  employeeOptions.value = listEmp
    .filter((e) => e.status !== 3)
    .map((e) => ({ label: `${e.name}（${e.empNo}）`, value: e.id }));
}

async function loadList() {
  loading.value = true;
  try {
    const res = await getProjects({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      scope: canSeeAll.value && scope.value === 'all' ? 'all' : 'mine',
      status: statusFilter.value,
    });
    list.value = res.records || [];
    pagination.total = Number(res.total || 0);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  createForm.name = '';
  createForm.description = '';
  createForm.ownerId = undefined;
  createForm.memberIds = [];
  createForm.startDate = undefined;
  createForm.endDate = undefined;
  createOpen.value = true;
}

async function submitCreate() {
  if (!createForm.name.trim()) {
    message.warning('请输入项目名称');
    return;
  }
  await createProject({
    name: createForm.name.trim(),
    description: createForm.description || undefined,
    ownerId: createForm.ownerId,
    memberIds: createForm.memberIds,
    startDate: createForm.startDate?.format('YYYY-MM-DD'),
    endDate: createForm.endDate?.format('YYYY-MM-DD'),
  });
  message.success('项目已创建');
  createOpen.value = false;
  await loadList();
}

async function openDetail(id: number) {
  currentId.value = id;
  detail.value = await getProjectDetail(id);
  projectTasks.value = await getProjectTasks(id);
  detailOpen.value = true;
}

function openProgress() {
  if (!detail.value) return;
  progressForm.progress = detail.value.progress ?? 0;
  progressForm.locked = detail.value.progressLocked !== false;
  progressOpen.value = true;
}

async function submitProgress() {
  if (currentId.value == null) return;
  await updateProjectProgress(currentId.value, {
    progress: progressForm.progress,
    locked: progressForm.locked,
  });
  message.success('进度已更新');
  progressOpen.value = false;
  await openDetail(currentId.value);
  await loadList();
}

async function submitClose() {
  if (currentId.value == null) return;
  Modal.confirm({
    title: '确认关闭该项目？',
    onOk: async () => {
      await closeProject(currentId.value!);
      message.success('项目已关闭');
      detailOpen.value = false;
      await loadList();
    },
  });
}

function openTaskCreate() {
  taskForm.title = '';
  taskForm.content = '';
  taskForm.priority = 2;
  taskForm.dueTime = undefined;
  taskForm.assigneeIds = [];
  taskCreateOpen.value = true;
}

async function submitTaskCreate() {
  if (currentId.value == null) return;
  if (!taskForm.title.trim()) {
    message.warning('请输入任务标题');
    return;
  }
  if (!taskForm.assigneeIds.length) {
    message.warning('请选择执行人');
    return;
  }
  await createTask({
    title: taskForm.title.trim(),
    content: taskForm.content || undefined,
    priority: taskForm.priority,
    projectId: currentId.value,
    dueTime: taskForm.dueTime
      ? taskForm.dueTime.format('YYYY-MM-DDTHH:mm:ss')
      : undefined,
    assigneeIds: taskForm.assigneeIds,
  });
  message.success('任务已挂接到项目');
  taskCreateOpen.value = false;
  await openDetail(currentId.value);
  await loadList();
}

async function saveMembers() {
  if (!detail.value || currentId.value == null) return;
  await updateProject(currentId.value, {
    name: detail.value.name,
    description: detail.value.description,
    ownerId: detail.value.ownerId,
    memberIds: detail.value.memberIds || [],
    startDate: detail.value.startDate,
    endDate: detail.value.endDate,
    status: detail.value.status,
  });
  message.success('成员已保存');
  await openDetail(currentId.value);
}

onMounted(async () => {
  if (canManage.value) {
    await loadEmployees();
  }
  await loadList();
});
</script>

<template>
  <Page title="项目管理" description="项目建档、成员与任务进度">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Select
        v-if="canSeeAll"
        v-model:value="scope"
        class="w-32"
        :options="[
          { label: '我参与的', value: 'mine' },
          { label: '全部', value: 'all' },
        ]"
        @change="
          () => {
            pagination.current = 1;
            loadList();
          }
        "
      />
      <Select
        v-model:value="statusFilter"
        allow-clear
        class="w-32"
        placeholder="状态"
        :options="[
          { label: '规划中', value: 0 },
          { label: '进行中', value: 1 },
          { label: '已完成', value: 2 },
          { label: '已关闭', value: 3 },
        ]"
        @change="
          () => {
            pagination.current = 1;
            loadList();
          }
        "
      />
      <Button v-if="canManage" type="primary" @click="openCreate">新建项目</Button>
    </div>

    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      row-key="id"
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
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag>{{ PROJECT_STATUS_MAP[record.status ?? 1] }}</Tag>
        </template>
        <template v-else-if="column.key === 'progress'">
          <Progress :percent="record.progress ?? 0" size="small" />
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button type="link" size="small" @click="openDetail(record.id)">
              详情
            </Button>
          </Space>
        </template>
      </template>
    </Table>

    <Modal v-model:open="createOpen" title="新建项目" @ok="submitCreate">
      <Form layout="vertical" class="mt-4">
        <Form.Item label="项目名称" required>
          <Input v-model:value="createForm.name" />
        </Form.Item>
        <Form.Item label="说明">
          <Input.TextArea v-model:value="createForm.description" :rows="3" />
        </Form.Item>
        <Form.Item label="负责人">
          <Select
            v-model:value="createForm.ownerId"
            allow-clear
            show-search
            option-filter-prop="label"
            :options="employeeOptions"
            placeholder="默认本人"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="成员">
          <Select
            v-model:value="createForm.memberIds"
            mode="multiple"
            show-search
            option-filter-prop="label"
            :options="employeeOptions"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="起止日期">
          <Space>
            <DatePicker v-model:value="createForm.startDate" />
            <DatePicker v-model:value="createForm.endDate" />
          </Space>
        </Form.Item>
      </Form>
    </Modal>

    <Drawer
      v-model:open="detailOpen"
      title="项目详情"
      width="640"
      destroy-on-close
    >
      <template v-if="detail">
        <h3 class="mb-2 text-lg font-medium">{{ detail.name }}</h3>
        <p class="mb-3 text-gray-600 whitespace-pre-wrap">
          {{ detail.description || '无说明' }}
        </p>
        <p class="mb-1">
          状态：{{ PROJECT_STATUS_MAP[detail.status ?? 1] }}
          <Tag v-if="detail.progressLocked" class="ml-2">进度已锁定</Tag>
        </p>
        <p class="mb-1">负责人：{{ detail.ownerName || '-' }}</p>
        <p class="mb-1">部门：{{ detail.deptName || '-' }}</p>
        <p class="mb-3">
          进度：
          <Progress :percent="detail.progress ?? 0" class="inline-block w-48" />
        </p>
        <Space class="mb-4">
          <Button
            v-if="canManage && detail.status !== 3"
            type="primary"
            size="small"
            @click="openProgress"
          >
            确认进度
          </Button>
          <Button
            v-if="canManage && detail.status !== 3"
            size="small"
            @click="openTaskCreate"
          >
            挂接任务
          </Button>
          <Button
            v-if="canManage && detail.status !== 3"
            danger
            size="small"
            @click="submitClose"
          >
            关闭项目
          </Button>
        </Space>

        <h4 class="mb-2 font-medium">成员</h4>
        <Select
          v-if="canManage && detail.status !== 3"
          v-model:value="detail.memberIds"
          mode="multiple"
          show-search
          option-filter-prop="label"
          :options="employeeOptions"
          class="mb-2 w-full"
        />
        <Button
          v-if="canManage && detail.status !== 3"
          size="small"
          class="mb-4"
          @click="saveMembers"
        >
          保存成员
        </Button>
        <div v-else class="mb-4 text-sm text-gray-600">
          {{ (detail.memberNames || []).join('、') || '-' }}
        </div>

        <h4 class="mb-2 font-medium">根任务</h4>
        <Table
          :columns="[
            { title: '标题', dataIndex: 'title' },
            { title: '状态', dataIndex: 'status', width: 90 },
            { title: '进度', dataIndex: 'progress', width: 80 },
          ]"
          :data-source="projectTasks"
          :pagination="false"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              {{ TASK_STATUS_MAP[record.status ?? 0] }}
            </template>
            <template v-else-if="column.dataIndex === 'progress'">
              {{ record.progress ?? 0 }}%
            </template>
          </template>
        </Table>
      </template>
    </Drawer>

    <Modal v-model:open="progressOpen" title="确认项目进度" @ok="submitProgress">
      <Form layout="vertical" class="mt-4">
        <Form.Item label="进度 %">
          <InputNumber v-model:value="progressForm.progress" :min="0" :max="100" class="w-full" />
        </Form.Item>
        <Form.Item label="锁定进度（不再被任务自动覆盖）">
          <Switch v-model:checked="progressForm.locked" />
        </Form.Item>
      </Form>
    </Modal>

    <Modal v-model:open="taskCreateOpen" title="挂接任务到项目" @ok="submitTaskCreate">
      <Form layout="vertical" class="mt-4">
        <Form.Item label="标题" required>
          <Input v-model:value="taskForm.title" />
        </Form.Item>
        <Form.Item label="说明">
          <Input.TextArea v-model:value="taskForm.content" :rows="3" />
        </Form.Item>
        <Form.Item label="优先级">
          <Select
            v-model:value="taskForm.priority"
            :options="[
              { label: '低', value: 1 },
              { label: '中', value: 2 },
              { label: '高', value: 3 },
            ]"
          />
        </Form.Item>
        <Form.Item label="执行人" required>
          <Select
            v-model:value="taskForm.assigneeIds"
            mode="multiple"
            show-search
            option-filter-prop="label"
            :options="employeeOptions"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="截止时间">
          <DatePicker
            v-model:value="taskForm.dueTime"
            show-time
            class="w-full"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
