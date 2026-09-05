<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import type { DepartmentVO, TaskDetailVO, TaskVO } from '#/api/hr';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Rate,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  abandonHallTask,
  claimHallTask,
  getDepartmentTree,
  getTaskDetail,
  getTaskHall,
  publishHallTask,
  reclaimHallTask,
} from '#/api/hr';
import { TASK_ASSIGNEE_STATUS_MAP } from '#/views/hr/constants';
import { hasAnyRole, HR_ROLE, useHrAccess } from '#/views/hr/roles';

const { canFeat, userRoles } = useHrAccess();
const canPublish = computed(() => canFeat('feat.task.hall.publish'));
const canClaim = computed(() => canFeat('feat.task.hall.claim'));
const canReclaim = computed(() =>
  hasAnyRole(userRoles.value, [
    HR_ROLE.DEPT_MANAGER,
    HR_ROLE.HR_ADMIN,
    HR_ROLE.SUPER_ADMIN,
  ]),
);
const isHr = computed(() =>
  hasAnyRole(userRoles.value, [HR_ROLE.HR_ADMIN, HR_ROLE.SUPER_ADMIN]),
);

const loading = ref(false);
const records = ref<TaskVO[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });

const publishOpen = ref(false);
const detailOpen = ref(false);
const detail = ref<null | TaskDetailVO>(null);
const departmentOptions = ref<{ label: string; value: number }[]>([]);

const POLICY_OPTIONS = [
  { label: '仅标记逾期', value: 'MARK_ONLY' },
  { label: '未完成奖金清零', value: 'ZERO_BONUS' },
  { label: '未完成扣款', value: 'DEDUCT' },
];

const POLICY_LABEL: Record<string, string> = {
  DEDUCT: '未完成扣款',
  MARK_ONLY: '仅标记',
  ZERO_BONUS: '奖金清零',
};

const publishForm = reactive({
  claimMode: 'solo' as 'multi' | 'solo',
  claimQuota: 1,
  content: '',
  deductAmount: undefined as number | undefined,
  deptId: undefined as number | undefined,
  difficulty: 3,
  dueTime: undefined as dayjs.Dayjs | undefined,
  overduePolicy: 'MARK_ONLY',
  suggestBonus: undefined as number | undefined,
  title: '',
});

const columns = computed<TableColumnsType>(() => {
  const cols: TableColumnsType = [
    {
      dataIndex: 'title',
      ellipsis: true,
      key: 'title',
      title: '任务',
      width: 160,
    },
  ];
  if (isHr.value) {
    cols.push({
      dataIndex: 'deptName',
      ellipsis: true,
      key: 'deptName',
      title: '部门',
      width: 120,
    });
  }
  cols.push(
    { dataIndex: 'difficulty', key: 'difficulty', title: '难度', width: 140 },
    { dataIndex: 'quota', key: 'quota', title: '名额', width: 130 },
    {
      dataIndex: 'suggestBonus',
      key: 'suggestBonus',
      title: '建议奖金',
      width: 100,
    },
    {
      dataIndex: 'overduePolicy',
      key: 'overduePolicy',
      title: '逾期策略',
      width: 160,
    },
    { dataIndex: 'dueTime', key: 'dueTime', title: '截止', width: 160 },
    {
      dataIndex: 'creatorName',
      key: 'creatorName',
      title: '发布人',
      width: 100,
    },
    { key: 'action', title: '操作', width: 140, fixed: 'right' },
  );
  return cols;
});

const tableScrollX = computed(() =>
  columns.value.reduce((sum, col) => sum + (Number(col.width) || 120), 0),
);

async function loadList() {
  loading.value = true;
  try {
    const page = await getTaskHall({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
    });
    records.value = page.records ?? [];
    pagination.total = page.total ?? 0;
  } finally {
    loading.value = false;
  }
}

async function loadDepartments() {
  if (!isHr.value) return;
  try {
    const list = await getDepartmentTree();
    const flat: { label: string; value: number }[] = [];
    const walk = (nodes: DepartmentVO[]) => {
      for (const d of nodes ?? []) {
        if (d.id !== undefined && d.id !== null && d.deptName) {
          flat.push({ label: d.deptName, value: d.id });
        }
        if (d.children?.length) walk(d.children);
      }
    };
    walk(list ?? []);
    departmentOptions.value = flat;
  } catch {
    departmentOptions.value = [];
  }
}

function openPublish() {
  publishForm.title = '';
  publishForm.content = '';
  publishForm.dueTime = undefined;
  publishForm.difficulty = 3;
  publishForm.claimMode = 'solo';
  publishForm.claimQuota = 1;
  publishForm.suggestBonus = undefined;
  publishForm.overduePolicy = 'MARK_ONLY';
  publishForm.deductAmount = undefined;
  publishForm.deptId = undefined;
  publishOpen.value = true;
}

async function submitPublish() {
  if (!publishForm.title.trim()) {
    message.warning('请填写标题');
    return;
  }
  const quota =
    publishForm.claimMode === 'solo'
      ? 1
      : Math.max(2, publishForm.claimQuota || 2);
  if (
    publishForm.overduePolicy === 'DEDUCT' &&
    !(publishForm.deductAmount && publishForm.deductAmount > 0)
  ) {
    message.warning('请填写扣款金额');
    return;
  }
  await publishHallTask({
    claimQuota: quota,
    content: publishForm.content || undefined,
    deductAmount:
      publishForm.overduePolicy === 'DEDUCT'
        ? publishForm.deductAmount
        : undefined,
    deptId: isHr.value ? publishForm.deptId : undefined,
    difficulty: publishForm.difficulty,
    dueTime: publishForm.dueTime
      ? publishForm.dueTime.format('YYYY-MM-DDTHH:mm:ss')
      : undefined,
    overduePolicy: publishForm.overduePolicy,
    suggestBonus: publishForm.suggestBonus,
    title: publishForm.title.trim(),
  });
  message.success('已发布到任务大厅');
  publishOpen.value = false;
  await loadList();
}

async function onClaim(row: TaskVO) {
  const res = await claimHallTask(row.id);
  message.success(`接取成功（${res.claimedCount}/${res.claimQuota}）`);
  await loadList();
}

async function onAbandon(row: TaskVO) {
  Modal.confirm({
    title: '确认放弃该任务名额？',
    content: '放弃后名额将释放给本部门其他同事。',
    async onOk() {
      await abandonHallTask(row.id, { reason: '主动放弃' });
      message.success('已放弃');
      await loadList();
    },
  });
}

async function onReclaim(row: TaskVO) {
  Modal.confirm({
    title: '强制收回并回大厅？',
    content: '将清空当前认领，任务重新开放。',
    async onOk() {
      await reclaimHallTask(row.id, {
        action: 'BACK_TO_HALL',
        reason: '管理者强制收回',
      });
      message.success('已收回');
      await loadList();
    },
  });
}

async function openDetail(id: number) {
  detail.value = await getTaskDetail(id);
  detailOpen.value = true;
}

onMounted(async () => {
  await Promise.all([loadList(), loadDepartments()]);
});
</script>

<template>
  <Page
    :description="
      isHr
        ? 'HR 可查看全部部门开放任务；员工/经理仅见本部门'
        : '本部门开放认领任务：独占一人或多人协作'
    "
    title="任务大厅"
  >
    <div class="mb-4 flex justify-between">
      <Space>
        <Button @click="loadList">刷新</Button>
      </Space>
      <Button v-if="canPublish" type="primary" @click="openPublish">
        发布大厅任务
      </Button>
    </div>

    <Table
      :columns="columns"
      :data-source="records"
      :loading="loading"
      :pagination="{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: (p: number) => {
          pagination.current = p;
          loadList();
        },
      }"
      :scroll="{ x: tableScrollX }"
      row-key="id"
      table-layout="fixed"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'difficulty'">
          <Rate :value="record.difficulty || 0" disabled />
        </template>
        <template v-else-if="column.key === 'quota'">
          <Tag color="blue">
            已接 {{ record.claimedCount ?? 0 }} / 需
            {{ record.claimQuota ?? 1 }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'suggestBonus'">
          {{ record.suggestBonus != null ? `${record.suggestBonus} 元` : '—' }}
        </template>
        <template v-else-if="column.key === 'overduePolicy'">
          {{
            POLICY_LABEL[record.overduePolicy || ''] ||
            record.overduePolicy ||
            '—'
          }}
          <span v-if="record.overduePolicy === 'DEDUCT' && record.deductAmount">
            （{{ record.deductAmount }} 元）
          </span>
        </template>
        <template v-else-if="column.key === 'dueTime'">
          {{
            record.dueTime
              ? dayjs(record.dueTime).format('YYYY-MM-DD HH:mm')
              : '—'
          }}
          <Tag v-if="record.overdue" class="ml-1" color="red">逾期</Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button size="small" type="link" @click="openDetail(record.id)">
              详情
            </Button>
            <Button
              v-if="canClaim"
              size="small"
              type="link"
              @click="onClaim(record as TaskVO)"
            >
              接取
            </Button>
            <Button
              v-if="canReclaim"
              size="small"
              type="link"
              danger
              @click="onReclaim(record as TaskVO)"
            >
              收回
            </Button>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="publishOpen"
      title="发布大厅任务"
      :confirm-loading="false"
      ok-text="发布"
      width="560px"
      @ok="submitPublish"
    >
      <Form layout="vertical" class="mt-2">
        <Form.Item label="标题" required>
          <Input v-model:value="publishForm.title" :maxlength="128" />
        </Form.Item>
        <Form.Item label="内容">
          <Input.TextArea v-model:value="publishForm.content" :rows="3" />
        </Form.Item>
        <Form.Item v-if="isHr" label="发布部门">
          <Select
            v-model:value="publishForm.deptId"
            allow-clear
            :options="departmentOptions"
            placeholder="默认本人部门"
            style="width: 100%"
          />
        </Form.Item>
        <Form.Item label="难度">
          <Rate v-model:value="publishForm.difficulty" />
        </Form.Item>
        <Form.Item label="协作方式">
          <Select
            v-model:value="publishForm.claimMode"
            :options="[
              { label: '独占一人', value: 'solo' },
              { label: '多人协作', value: 'multi' },
            ]"
            style="width: 100%"
          />
        </Form.Item>
        <Form.Item v-if="publishForm.claimMode === 'multi'" label="协作人数">
          <InputNumber
            v-model:value="publishForm.claimQuota"
            :min="2"
            :max="20"
            style="width: 100%"
          />
        </Form.Item>
        <Form.Item label="建议奖金（展示）">
          <InputNumber
            v-model:value="publishForm.suggestBonus"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </Form.Item>
        <Form.Item label="逾期策略" required>
          <Select
            v-model:value="publishForm.overduePolicy"
            :options="POLICY_OPTIONS"
            style="width: 100%"
          />
        </Form.Item>
        <Form.Item
          v-if="publishForm.overduePolicy === 'DEDUCT'"
          label="扣款金额（元/人）"
          required
        >
          <InputNumber
            v-model:value="publishForm.deductAmount"
            :min="0.01"
            :precision="2"
            style="width: 100%"
          />
        </Form.Item>
        <Form.Item label="截止时间">
          <DatePicker
            v-model:value="publishForm.dueTime"
            show-time
            style="width: 100%"
          />
        </Form.Item>
      </Form>
    </Modal>

    <Drawer
      v-model:open="detailOpen"
      title="任务详情"
      width="520"
      destroy-on-close
    >
      <template v-if="detail">
        <h3 class="mb-2 text-base font-medium">{{ detail.title }}</h3>
        <p class="mb-3 text-gray-600 whitespace-pre-wrap">
          {{ detail.content || '无描述' }}
        </p>
        <div class="mb-3 space-y-1 text-sm">
          <div>
            名额：已接 {{ detail.claimedCount ?? 0 }} / 需
            {{ detail.claimQuota ?? 1 }}
          </div>
          <div>难度：{{ detail.difficulty ?? '—' }} 星</div>
          <div>策略：{{ POLICY_LABEL[detail.overduePolicy || ''] || '—' }}</div>
        </div>
        <div class="mb-2 font-medium">执行人</div>
        <div
          v-for="a in detail.assignees || []"
          :key="a.employeeId"
          class="mb-2 flex justify-between border-b border-gray-100 py-2 text-sm"
        >
          <span>{{ a.employeeName || a.employeeId }}</span>
          <span>
            {{ TASK_ASSIGNEE_STATUS_MAP[a.status ?? -1] || a.status }}
            <span v-if="a.progress != null"> · {{ a.progress }}%</span>
          </span>
        </div>
        <Button
          v-if="canClaim && detail.status === 0"
          class="mt-4"
          type="primary"
          block
          @click="onClaim(detail as TaskVO)"
        >
          接取
        </Button>
        <Button
          v-if="detail.myStatus === 0 || detail.myStatus === 1"
          class="mt-2"
          block
          @click="onAbandon(detail as TaskVO)"
        >
          放弃名额
        </Button>
      </template>
    </Drawer>
  </Page>
</template>
