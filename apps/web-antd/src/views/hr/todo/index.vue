<script lang="ts" setup>
import type { WfTodoVO } from '#/api/hr/workflow';

import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Select, Table, Tag } from 'ant-design-vue';

import { getWorkflowTodos, workflowAction } from '#/api/hr/workflow';

import '#/views/hr/hr-common.css';

const router = useRouter();
const loading = ref(false);
const list = ref<WfTodoVO[]>([]);
const total = ref(0);
const query = reactive({
  scope: 'pending',
  bizType: undefined as string | undefined,
  pageNum: 1,
  pageSize: 10,
});

const BIZ_TYPE_LABEL: Record<string, string> = {
  LEAVE: '请假',
  OVERTIME: '加班',
  MAKEUP: '补卡',
  FIELD: '外勤',
  PERSONNEL: '人事异动',
  CONTRACT_RENEW: '合同续签',
  RETIRE: '退休办理',
};

const NODE_LABEL: Record<string, string> = {
  MANAGER: '直属经理',
  HR: '人事',
};

const STATUS_LABEL: Record<number, string> = {
  0: '待审批',
  1: '已通过',
  2: '已驳回',
  3: '已跳过',
  4: '已取消',
};

const STATUS_COLOR: Record<number, string> = {
  0: 'processing',
  1: 'success',
  2: 'error',
  3: 'default',
  4: 'default',
};

const columns = [
  { title: '类型', dataIndex: 'bizType', width: 120 },
  { title: '标题', dataIndex: 'title' },
  { title: '节点', dataIndex: 'nodeCode', width: 110 },
  { title: '状态', dataIndex: 'status', width: 100 },
  { title: '提交时间', dataIndex: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 220 },
];

const scopeOptions = [
  { label: '待我审', value: 'pending' },
  { label: '我已审', value: 'done' },
  { label: '相关节点', value: 'mine' },
];

const bizTypeOptions = Object.entries(BIZ_TYPE_LABEL).map(([value, label]) => ({
  label,
  value,
}));

function bizTypeLabel(code?: string) {
  if (!code) return '-';
  return BIZ_TYPE_LABEL[code] ?? code;
}

function nodeLabel(code?: string) {
  if (!code) return '-';
  return NODE_LABEL[code] ?? code;
}

function statusLabel(status?: number) {
  if (status === null || status === undefined) return '-';
  return STATUS_LABEL[status] ?? String(status);
}

function formatTime(v?: string) {
  if (!v) return '-';
  return v.replace('T', ' ').slice(0, 19);
}

async function load() {
  loading.value = true;
  try {
    const res = await getWorkflowTodos(query);
    list.value = res.records || [];
    total.value = Number(res.total || 0);
  } finally {
    loading.value = false;
  }
}

async function act(row: WfTodoVO, approved: boolean) {
  await workflowAction(row.bizType, row.bizId, { approved });
  message.success(approved ? '已通过' : '已驳回');
  await load();
}

function openBiz(row: WfTodoVO) {
  if (row.link) router.push(row.link);
}

onMounted(load);
</script>

<template>
  <Page
    description="请假 / 考勤 / 人事 / 合同 / 退休的统一审批入口"
    title="审批待办"
  >
    <div class="hr-toolbar">
      <Select
        v-model:value="query.scope"
        :options="scopeOptions"
        class="w-28"
        @change="
          () => {
            query.pageNum = 1;
            load();
          }
        "
      />
      <Select
        v-model:value="query.bizType"
        allow-clear
        :options="bizTypeOptions"
        class="w-32"
        placeholder="业务类型"
        @change="
          () => {
            query.pageNum = 1;
            load();
          }
        "
      />
      <Button type="primary" @click="load">查询</Button>
    </div>
    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="{
        current: query.pageNum,
        pageSize: query.pageSize,
        total,
        onChange: (p: number, ps: number) => {
          query.pageNum = p;
          query.pageSize = ps;
          load();
        },
      }"
      row-key="taskId"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'bizType'">
          {{ bizTypeLabel(record.bizType) }}
        </template>
        <template v-else-if="column.dataIndex === 'nodeCode'">
          {{ nodeLabel(record.nodeCode) }}
        </template>
        <template v-else-if="column.dataIndex === 'status'">
          <Tag :color="STATUS_COLOR[record.status] || 'default'">
            {{ statusLabel(record.status) }}
          </Tag>
        </template>
        <template v-else-if="column.dataIndex === 'createdAt'">
          {{ formatTime(record.createdAt) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <div class="flex flex-wrap items-center gap-1">
            <Button
              size="small"
              type="link"
              @click="openBiz(record as WfTodoVO)"
            >
              详情
            </Button>
            <Button
              v-if="query.scope === 'pending'"
              size="small"
              type="link"
              @click="act(record as WfTodoVO, true)"
            >
              通过
            </Button>
            <Button
              v-if="query.scope === 'pending'"
              danger
              size="small"
              type="link"
              @click="act(record as WfTodoVO, false)"
            >
              驳回
            </Button>
          </div>
        </template>
      </template>
    </Table>
  </Page>
</template>
