<script lang="ts" setup>
import type { DepartmentVO, PersonnelChangeVO, PositionVO } from '#/api/hr';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  approvePersonnelChange,
  cancelPersonnelChange,
  createPersonnelChange,
  effectPersonnelChange,
  fetchAllEmployees,
  getDepartmentTree,
  getPersonnelChanges,
  getPositionsByDept,
} from '#/api/hr';
import { flattenDepartments } from '#/views/hr/constants';
import { useHrAccess } from '#/views/hr/roles';

import '#/views/hr/hr-common.css';

const STATUS_COLOR: Record<number, string> = {
  0: 'gold',
  1: 'blue',
  2: 'red',
  3: 'default',
  4: 'green',
};

const { canFeat } = useHrAccess();
const canApprove = computed(() => canFeat('feat.personnel.approve'));
const canApply = computed(() => canFeat('feat.personnel.apply'));
const canEffect = computed(() => canFeat('feat.personnel.effect'));

const loading = ref(false);
const list = ref<PersonnelChangeVO[]>([]);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const query = reactive({
  changeType: undefined as number | undefined,
  status: undefined as number | undefined,
});

const employeeOptions = ref<{ label: string; value: number }[]>([]);
const deptOptions = ref<{ label: string; value: number }[]>([]);
const positionOptions = ref<{ label: string; value: number }[]>([]);

const createOpen = ref(false);
const form = reactive({
  changeType: 1,
  effectiveDate: undefined as dayjs.Dayjs | undefined,
  employeeId: undefined as number | undefined,
  newSalary: undefined as number | undefined,
  reason: '',
  toDeptId: undefined as number | undefined,
  toPositionId: undefined as number | undefined,
});

const columns = [
  { dataIndex: 'employeeName', title: '员工', width: 90 },
  { dataIndex: 'changeTypeLabel', title: '类型', width: 90 },
  { dataIndex: 'summary', key: 'summary', title: '变更摘要' },
  { dataIndex: 'effectiveDate', title: '生效日', width: 110 },
  { dataIndex: 'applicantName', title: '申请人', width: 90 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 240 },
];

async function loadMeta() {
  const [emps, tree] = await Promise.all([
    fetchAllEmployees(),
    getDepartmentTree(),
  ]);
  employeeOptions.value = emps
    .filter((e) => e.status !== 3)
    .map((e) => ({ label: `${e.name}（${e.empNo}）`, value: e.id }));
  deptOptions.value = flattenDepartments(tree as DepartmentVO[]).map((d) => ({
    label: d.deptName,
    value: d.id,
  }));
}

async function loadPositions(deptId?: number) {
  if (!deptId) {
    positionOptions.value = [];
    return;
  }
  const listPos = await getPositionsByDept(deptId);
  positionOptions.value = (listPos as PositionVO[]).map((p) => ({
    label: p.positionName,
    value: p.id,
  }));
}

watch(
  () => form.toDeptId,
  (deptId) => {
    form.toPositionId = undefined;
    void loadPositions(deptId);
  },
);

async function loadList() {
  loading.value = true;
  try {
    const res = await getPersonnelChanges({
      pageNum: pagination.current,
      pageSize: pagination.pageSize,
      changeType: query.changeType,
      status: query.status,
    });
    list.value = res.records || [];
    pagination.total = Number(res.total || 0);
  } finally {
    loading.value = false;
  }
}

function summaryText(row: PersonnelChangeVO) {
  if (row.changeType === 1) {
    return `${row.fromDeptName || '-'} / ${row.fromPositionName || '-'} → ${row.toDeptName || '-'} / ${row.toPositionName || '-'}`;
  }
  if (row.changeType === 2) {
    return `底薪 ${row.oldSalary ?? '-'} → ${row.newSalary ?? '-'}`;
  }
  if (row.changeType === 3) {
    return row.reason || '申请离职';
  }
  return `合同文档 ${row.contractDocCount ?? 0} 份${row.reason ? ` · ${row.reason}` : ''}`;
}

function openCreate() {
  form.changeType = 1;
  form.employeeId = undefined;
  form.toDeptId = undefined;
  form.toPositionId = undefined;
  form.newSalary = undefined;
  form.effectiveDate = dayjs();
  form.reason = '';
  createOpen.value = true;
}

async function submitCreate() {
  if (!form.employeeId) {
    message.warning('请选择员工');
    return;
  }
  if (form.changeType === 1 && (!form.toDeptId || !form.toPositionId)) {
    message.warning('调岗请选择目标部门与岗位');
    return;
  }
  if (
    form.changeType === 2 &&
    (form.newSalary === null ||
      form.newSalary === undefined ||
      form.newSalary <= 0)
  ) {
    message.warning('请填写新底薪');
    return;
  }
  await createPersonnelChange({
    changeType: form.changeType,
    employeeId: form.employeeId,
    toDeptId: form.toDeptId,
    toPositionId: form.toPositionId,
    newSalary: form.newSalary,
    effectiveDate: form.effectiveDate?.format('YYYY-MM-DD'),
    reason: form.reason || undefined,
  });
  message.success('已提交申请');
  createOpen.value = false;
  await loadList();
}

async function onApprove(id: number, approved: boolean) {
  await approvePersonnelChange(id, { approved });
  message.success(approved ? '已通过' : '已拒绝');
  await loadList();
}

async function onCancel(id: number) {
  await cancelPersonnelChange(id);
  message.success('已撤销');
  await loadList();
}

async function onEffect(id: number) {
  await effectPersonnelChange(id);
  message.success('已生效并回写档案');
  await loadList();
}

onMounted(async () => {
  await loadMeta();
  await loadList();
});
</script>

<template>
  <Page
    title="入转调离"
    description="调岗调薪、离职、入职完善：申请 → 审批 → 生效"
  >
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Select
        v-model:value="query.changeType"
        allow-clear
        class="w-32"
        placeholder="类型"
        :options="[
          { label: '调岗', value: 1 },
          { label: '调薪', value: 2 },
          { label: '离职', value: 3 },
          { label: '入职完善', value: 4 },
        ]"
      />
      <Select
        v-model:value="query.status"
        allow-clear
        class="w-32"
        placeholder="状态"
        :options="[
          { label: '待审批', value: 0 },
          { label: '已通过', value: 1 },
          { label: '已拒绝', value: 2 },
          { label: '已撤销', value: 3 },
          { label: '已生效', value: 4 },
        ]"
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
      <Button v-if="canApply" type="primary" @click="openCreate">
        发起申请
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
        <template v-if="column.key === 'summary'">
          {{ summaryText(record as any) }}
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag :color="STATUS_COLOR[record.status] || 'default'">
            {{ record.statusLabel }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button
              v-if="canApprove && record.status === 0"
              type="link"
              size="small"
              @click="onApprove(record.id, true)"
            >
              通过
            </Button>
            <Button
              v-if="canApprove && record.status === 0"
              type="link"
              size="small"
              danger
              @click="onApprove(record.id, false)"
            >
              拒绝
            </Button>
            <Button
              v-if="canEffect && record.status === 1"
              type="link"
              size="small"
              @click="onEffect(record.id)"
            >
              生效
            </Button>
            <Button
              v-if="record.status === 0 || record.status === 1"
              type="link"
              size="small"
              @click="onCancel(record.id)"
            >
              撤销
            </Button>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="createOpen"
      title="发起异动申请"
      :width="480"
      destroy-on-close
      @ok="submitCreate"
    >
      <Form layout="vertical" class="mt-4">
        <Form.Item label="类型" required>
          <Select
            v-model:value="form.changeType"
            :options="[
              { label: '调岗', value: 1 },
              { label: '调薪', value: 2 },
              { label: '离职', value: 3 },
              { label: '入职完善', value: 4 },
            ]"
          />
        </Form.Item>
        <Form.Item label="员工" required>
          <Select
            v-model:value="form.employeeId"
            :options="employeeOptions"
            :popup-match-select-width="false"
            class="w-full"
            option-filter-prop="label"
            popup-class-name="hr-filter-select-dropdown"
            show-search
          />
        </Form.Item>
        <template v-if="form.changeType === 1">
          <Form.Item label="目标部门" required>
            <Select
              v-model:value="form.toDeptId"
              :options="deptOptions"
              :popup-match-select-width="false"
              class="w-full"
              option-filter-prop="label"
              popup-class-name="hr-filter-select-dropdown"
              show-search
            />
          </Form.Item>
          <Form.Item label="目标岗位" required>
            <Select
              v-model:value="form.toPositionId"
              :options="positionOptions"
              :popup-match-select-width="false"
              class="w-full"
              option-filter-prop="label"
              popup-class-name="hr-filter-select-dropdown"
              show-search
            />
          </Form.Item>
        </template>
        <Form.Item v-if="form.changeType === 2" label="新底薪" required>
          <InputNumber v-model:value="form.newSalary" :min="0" class="w-full" />
        </Form.Item>
        <Form.Item label="计划生效日">
          <DatePicker v-model:value="form.effectiveDate" class="w-full" />
        </Form.Item>
        <Form.Item :label="form.changeType === 4 ? '完善说明' : '原因'">
          <Input.TextArea v-model:value="form.reason" :rows="3" />
        </Form.Item>
        <p v-if="form.changeType === 4" class="text-xs text-gray-400">
          生效前需在「文档管理」上传劳动合同或保密协议
        </p>
      </Form>
    </Modal>
  </Page>
</template>
