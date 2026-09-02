<script lang="ts" setup>
import type { PerformanceReviewVO, PerformanceTaskHintVO } from '#/api/hr';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  confirmPerformance,
  createPerformance,
  deletePerformance,
  fetchAllEmployees,
  getPerformanceReviews,
  getPerformanceTaskHint,
  submitPerformance,
  updatePerformance,
} from '#/api/hr';
import { useHrAccess } from '#/views/hr/roles';

import '#/views/hr/hr-common.css';

const GRADE_OPTIONS = [
  { label: '优', value: 1 },
  { label: '良', value: 2 },
  { label: '中', value: 3 },
  { label: '合格', value: 4 },
  { label: '差', value: 5 },
];

const STATUS_COLOR: Record<number, string> = {
  0: 'default',
  1: 'processing',
  2: 'success',
};

const { canFeat } = useHrAccess();
const canManage = computed(() => canFeat('feat.performance.score'));
const canView = computed(() => canFeat('feat.performance.view'));

const loading = ref(false);
const list = ref<PerformanceReviewVO[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const employeeOptions = ref<{ label: string; value: number }[]>([]);

const query = reactive({
  employeeId: undefined as number | undefined,
  periodKey: '',
  periodType: undefined as number | undefined,
  status: undefined as number | undefined,
});

const modalOpen = ref(false);
const editingId = ref<null | number>(null);
const hint = ref<null | PerformanceTaskHintVO>(null);
const hintLoading = ref(false);
const form = reactive({
  comment: '',
  employeeId: undefined as number | undefined,
  periodKey: dayjs().format('YYYY-MM'),
  periodType: 1,
  scoreGrade: 2,
});

const columns = [
  { dataIndex: 'employeeName', key: 'employeeName', title: '员工', width: 100 },
  { dataIndex: 'empNo', key: 'empNo', title: '工号', width: 90 },
  { dataIndex: 'deptName', key: 'deptName', title: '部门', width: 100 },
  { dataIndex: 'period', key: 'period', title: '周期', width: 120 },
  { dataIndex: 'scoreGradeLabel', key: 'score', title: '评级', width: 70 },
  { dataIndex: 'task', key: 'task', title: '任务表现', width: 140 },
  {
    dataIndex: 'reviewerName',
    key: 'reviewerName',
    title: '评分人',
    width: 90,
  },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 220 },
];

async function loadEmployees() {
  if (!canManage.value) return;
  const emps = await fetchAllEmployees();
  employeeOptions.value = emps
    .filter((e) => e.status !== 3)
    .map((e) => ({ label: `${e.name}（${e.empNo}）`, value: e.id }));
}

async function loadList() {
  loading.value = true;
  try {
    const res = await getPerformanceReviews({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      employeeId: query.employeeId,
      periodType: query.periodType,
      periodKey: query.periodKey || undefined,
      status: query.status,
    });
    list.value = res.records || [];
    pagination.total = Number(res.total || 0);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.employeeId = undefined;
  form.periodType = 1;
  form.periodKey = dayjs().format('YYYY-MM');
  form.scoreGrade = 2;
  form.comment = '';
  hint.value = null;
  modalOpen.value = true;
}

function openEdit(row: PerformanceReviewVO) {
  if (row.status === 2) {
    message.warning('已确认考核不可修改');
    return;
  }
  editingId.value = row.id;
  form.employeeId = row.employeeId;
  form.periodType = row.periodType;
  form.periodKey = row.periodKey;
  form.scoreGrade = row.scoreGrade ?? 2;
  form.comment = row.comment || '';
  hint.value = {
    employeeId: row.employeeId,
    periodType: row.periodType,
    periodKey: row.periodKey,
    taskDoneCount: row.taskDoneCount,
    taskTotalCount: row.taskTotalCount,
    taskAvgGrade: row.taskAvgGrade,
  };
  modalOpen.value = true;
}

async function loadHint() {
  if (!form.employeeId || !form.periodKey) {
    message.warning('请先选择员工与周期');
    return;
  }
  hintLoading.value = true;
  try {
    hint.value = await getPerformanceTaskHint({
      employeeId: form.employeeId,
      periodType: form.periodType,
      periodKey: form.periodKey.trim(),
    });
  } finally {
    hintLoading.value = false;
  }
}

async function save(submit: boolean) {
  if (!form.employeeId) {
    message.warning('请选择员工');
    return;
  }
  if (!form.periodKey.trim()) {
    message.warning('请填写周期');
    return;
  }
  const payload = {
    employeeId: form.employeeId,
    periodType: form.periodType,
    periodKey: form.periodKey.trim(),
    scoreGrade: form.scoreGrade,
    comment: form.comment || undefined,
    submit,
  };
  await (editingId.value !== null && editingId.value !== undefined
    ? updatePerformance(editingId.value, payload)
    : createPerformance(payload));
  message.success(submit ? '已提交' : '已保存草稿');
  modalOpen.value = false;
  await loadList();
}

async function onSubmit(id: number) {
  await submitPerformance(id);
  message.success('已提交');
  await loadList();
}

async function onConfirm(id: number) {
  await confirmPerformance(id);
  message.success('已确认归档');
  await loadList();
}

async function onDelete(id: number) {
  await deletePerformance(id);
  message.success('已删除');
  await loadList();
}

onMounted(async () => {
  if (!canView.value) return;
  await loadEmployees();
  await loadList();
});
</script>

<template>
  <Page
    title="绩效考核"
    description="月/季考核单，经理五级评分，确认后进入员工档案"
  >
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Select
        v-if="canManage"
        v-model:value="query.employeeId"
        :options="employeeOptions"
        :popup-match-select-width="false"
        allow-clear
        class="w-56"
        option-filter-prop="label"
        placeholder="员工"
        popup-class-name="hr-filter-select-dropdown"
        show-search
      />
      <Select
        v-model:value="query.periodType"
        :options="[
          { label: '月度', value: 1 },
          { label: '季度', value: 2 },
        ]"
        :popup-match-select-width="false"
        allow-clear
        class="w-32"
        placeholder="周期类型"
        popup-class-name="hr-filter-select-dropdown"
      />
      <Input
        v-model:value="query.periodKey"
        allow-clear
        class="w-40"
        placeholder="如 2026-08 / 2026-Q3"
      />
      <Select
        v-model:value="query.status"
        :options="[
          { label: '草稿', value: 0 },
          { label: '已提交', value: 1 },
          { label: '已确认', value: 2 },
        ]"
        :popup-match-select-width="false"
        allow-clear
        class="w-32"
        placeholder="状态"
        popup-class-name="hr-filter-select-dropdown"
      />
      <Button
        type="primary"
        @click="
          () => {
            pagination.current = 1;
            loadList();
          }
        "
      >
        查询
      </Button>
      <Button v-if="canManage" type="primary" @click="openCreate">
        新建考核
      </Button>
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
        <template v-if="column.key === 'period'">
          {{ record.periodType === 2 ? '季' : '月' }} {{ record.periodKey }}
        </template>
        <template v-else-if="column.key === 'task'">
          <span class="text-xs text-gray-600">
            完成 {{ record.taskDoneCount ?? 0 }}/{{
              record.taskTotalCount ?? 0
            }}
            <template v-if="record.taskAvgGrade != null">
              · 均分 {{ record.taskAvgGrade }}
            </template>
          </span>
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag :color="STATUS_COLOR[record.status ?? 0]">
            {{ record.statusLabel || record.status }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button
              v-if="canManage && record.status !== 2"
              type="link"
              size="small"
              @click="openEdit(record as any)"
            >
              编辑
            </Button>
            <Button
              v-if="canManage && record.status === 0"
              type="link"
              size="small"
              @click="onSubmit(record.id)"
            >
              提交
            </Button>
            <Button
              v-if="canManage && record.status === 1"
              type="link"
              size="small"
              @click="onConfirm(record.id)"
            >
              确认
            </Button>
            <Popconfirm
              v-if="canManage && record.status !== 2"
              title="确认删除？"
              @confirm="onDelete(record.id)"
            >
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑考核' : '新建考核'"
      :footer="null"
      width="560"
      destroy-on-close
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="员工" required>
          <Select
            v-model:value="form.employeeId"
            :disabled="!!editingId"
            show-search
            option-filter-prop="label"
            :options="employeeOptions"
            class="w-full"
            placeholder="选择被考核人"
          />
        </Form.Item>
        <Form.Item label="周期类型" required>
          <Select
            v-model:value="form.periodType"
            :disabled="!!editingId"
            :options="[
              { label: '月度', value: 1 },
              { label: '季度', value: 2 },
            ]"
            @change="
              () => {
                form.periodKey =
                  form.periodType === 2
                    ? `${dayjs().format('YYYY')}-Q${Math.ceil((dayjs().month() + 1) / 3)}`
                    : dayjs().format('YYYY-MM');
              }
            "
          />
        </Form.Item>
        <Form.Item label="考核周期" required>
          <Input
            v-model:value="form.periodKey"
            :disabled="!!editingId"
            :placeholder="form.periodType === 2 ? '2026-Q3' : '2026-08'"
          />
        </Form.Item>
        <Form.Item label="任务表现参考">
          <Space>
            <Button size="small" :loading="hintLoading" @click="loadHint">
              拉取周期任务数据
            </Button>
            <span v-if="hint" class="text-sm text-gray-600">
              完成 {{ hint.taskDoneCount ?? 0 }}/{{ hint.taskTotalCount ?? 0 }}
              <template v-if="hint.taskAvgGrade != null">
                · 任务评分均分 {{ hint.taskAvgGrade }}
              </template>
              <template v-else> · 暂无任务评分</template>
            </span>
          </Space>
        </Form.Item>
        <Form.Item label="五级评分" required>
          <Select
            v-model:value="form.scoreGrade"
            :options="GRADE_OPTIONS"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="评语">
          <Input.TextArea v-model:value="form.comment" :rows="3" />
        </Form.Item>
        <Space>
          <Button @click="save(false)">存草稿</Button>
          <Button type="primary" @click="save(true)">提交</Button>
        </Space>
      </Form>
    </Modal>
  </Page>
</template>
