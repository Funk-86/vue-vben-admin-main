<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue/es/table';

import type { EmployeeVO, SalaryVO } from '#/api/hr';
import type { AttendanceDeductRuleVO } from '#/api/hr/salary';

import { computed, onMounted, reactive, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createSalary,
  deleteSalary,
  fetchAllEmployees,
  getDeductRules,
  getSalaryList,
  paySalary,
  previewSalary,
  updateDeductRule,
  updateSalary,
} from '#/api/hr';
import { SALARY_STATUS_MAP } from '#/views/hr/constants';
import { useHrAccess } from '#/views/hr/roles';
import { onTablePageChange } from '#/views/hr/table-utils';

const { canFeat } = useHrAccess();
const canManageSalary = computed(() => canFeat('feat.salary.manage'));

const loading = ref(false);
const list = ref<SalaryVO[]>([]);
const employees = ref<EmployeeVO[]>([]);
const modalOpen = ref(false);
const editing = ref<null | SalaryVO>(null);
const previewTip = ref('');
const deductDetail = ref('');
const previewLoading = ref(false);
const pagination = reactive({ current: 1, pageSize: 10, total: 0 });
const activeTab = ref('list');
const deductRules = ref<AttendanceDeductRuleVO[]>([]);
const loadingRules = ref(false);

const formState = reactive({
  baseSalary: 0,
  bonus: 0,
  deduction: 0,
  employeeId: undefined as number | undefined,
  positionId: undefined as number | undefined,
  remark: '',
  salaryMonth: undefined as dayjs.Dayjs | undefined,
  taskBonus: 0,
});

const employeeOptions = ref<{ label: string; value: number }[]>([]);

const actualPreview = computed(() => {
  return (
    (formState.baseSalary || 0) +
    (formState.bonus || 0) -
    (formState.deduction || 0)
  ).toFixed(2);
});

const columns = [
  { dataIndex: 'salaryMonth', key: 'salaryMonth', title: '月份', width: 100 },
  { dataIndex: 'empNo', key: 'empNo', title: '工号', width: 100 },
  { dataIndex: 'employeeName', key: 'employeeName', title: '姓名', width: 100 },
  { dataIndex: 'positionName', key: 'positionName', title: '岗位', width: 110 },
  { dataIndex: 'baseSalary', key: 'baseSalary', title: '底薪', width: 100 },
  { dataIndex: 'taskBonus', key: 'taskBonus', title: '任务奖金', width: 100 },
  { dataIndex: 'bonus', key: 'bonus', title: '最终奖金', width: 100 },
  { dataIndex: 'deduction', key: 'deduction', title: '扣款', width: 90 },
  { dataIndex: 'actualSalary', key: 'actualSalary', title: '实发', width: 110 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { dataIndex: 'payDate', key: 'payDate', title: '发放日', width: 110 },
  { key: 'action', title: '操作', width: 200 },
];

async function loadEmployees() {
  employees.value = await fetchAllEmployees();
  employeeOptions.value = employees.value.map((e) => ({
    label: `${e.name}（${e.empNo}）`,
    value: e.id,
  }));
}

async function loadData(page?: { current: number; pageSize: number }) {
  loading.value = true;
  try {
    const params = {
      pageNum: page?.current ?? pagination.current,
      pageSize: page?.pageSize ?? pagination.pageSize,
    };
    const result = await getSalaryList(params);
    list.value = result.records;
    pagination.total = result.total;
    pagination.current = result.pageNum;
    pagination.pageSize = result.pageSize;
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: TablePaginationConfig) {
  onTablePageChange(pag, pagination, () =>
    loadData({ current: pagination.current, pageSize: pagination.pageSize }),
  );
}

function openCreate() {
  editing.value = null;
  previewTip.value = '';
  deductDetail.value = '';
  Object.assign(formState, {
    baseSalary: 0,
    bonus: 0,
    deduction: 0,
    employeeId: undefined,
    positionId: undefined,
    remark: '',
    salaryMonth: dayjs(),
    taskBonus: 0,
  });
  modalOpen.value = true;
}

function openEdit(record: SalaryVO) {
  editing.value = record;
  previewTip.value = '';
  deductDetail.value = '';
  Object.assign(formState, {
    baseSalary: record.baseSalary,
    bonus: record.bonus ?? 0,
    deduction: record.deduction ?? 0,
    employeeId: record.employeeId,
    positionId: record.positionId,
    remark: record.remark ?? '',
    salaryMonth: dayjs(record.salaryMonth, 'YYYY-MM'),
    taskBonus: record.taskBonus ?? 0,
  });
  modalOpen.value = true;
}

async function applyPreview() {
  if (editing.value || !formState.employeeId || !formState.salaryMonth) {
    return;
  }
  previewLoading.value = true;
  try {
    const preview = await previewSalary({
      employeeId: formState.employeeId,
      salaryMonth: formState.salaryMonth.format('YYYY-MM'),
    });
    formState.baseSalary = Number(preview.baseSalary ?? 0);
    formState.taskBonus = Number(preview.taskBonus ?? 0);
    formState.bonus = Number(preview.bonus ?? preview.taskBonus ?? 0);
    formState.deduction = Number(preview.deduction ?? 0);
    formState.positionId = preview.positionId;
    previewTip.value = preview.tip || '';
    deductDetail.value = preview.deductDetail || '';
    if (preview.tip) {
      message.warning(preview.tip);
    }
  } finally {
    previewLoading.value = false;
  }
}

watch(
  () => [formState.employeeId, formState.salaryMonth, modalOpen.value] as const,
  ([employeeId, salaryMonth, open]) => {
    if (open && !editing.value && employeeId && salaryMonth) {
      applyPreview();
    }
  },
);

async function handleSubmit() {
  if (!formState.employeeId || !formState.salaryMonth) {
    message.warning('请选择员工和月份');
    return;
  }
  if (editing.value) {
    await updateSalary(editing.value.id, {
      baseSalary: formState.baseSalary,
      bonus: formState.bonus,
      deduction: formState.deduction,
      employeeId: formState.employeeId,
      remark: formState.remark || undefined,
      salaryMonth: formState.salaryMonth.format('YYYY-MM'),
    });
    message.success('更新成功');
  } else {
    await createSalary({
      baseSalary: formState.baseSalary,
      bonus: formState.bonus,
      deduction: formState.deduction,
      employeeId: formState.employeeId,
      positionId: formState.positionId,
      remark: formState.remark || undefined,
      salaryMonth: formState.salaryMonth.format('YYYY-MM'),
      taskBonus: formState.taskBonus,
    });
    message.success('创建成功');
  }
  modalOpen.value = false;
  await loadData();
}

async function handlePay(record: SalaryVO) {
  await paySalary(record.id);
  message.success('发放成功');
  await loadData();
}

async function handleDelete(record: SalaryVO) {
  await deleteSalary(record.id);
  message.success('删除成功');
  await loadData();
}

const ruleColumns = [
  { dataIndex: 'ruleCode', key: 'ruleCode', title: '规则编码', width: 140 },
  { dataIndex: 'remark', key: 'remark', title: '说明' },
  { dataIndex: 'unitAmount', key: 'unitAmount', title: '单价', width: 120 },
  { dataIndex: 'enabled', key: 'enabled', title: '启用', width: 100 },
  { key: 'action', title: '操作', width: 100 },
];

async function loadDeductRules() {
  loadingRules.value = true;
  try {
    deductRules.value = await getDeductRules();
  } finally {
    loadingRules.value = false;
  }
}

async function saveRule(record: AttendanceDeductRuleVO) {
  await updateDeductRule(record.id, {
    enabled: record.enabled,
    remark: record.remark,
    ruleCode: record.ruleCode,
    unitAmount: record.unitAmount,
  });
  message.success('规则已保存');
  await loadDeductRules();
}

onMounted(async () => {
  await Promise.all([loadEmployees(), loadData(), loadDeductRules()]);
});
</script>

<template>
  <Page
    description="员工月薪生成与发放（底薪、任务奖金与考勤扣款由系统带出）"
    title="薪资管理"
  >
    <Tabs v-model:active-key="activeTab">
      <Tabs.TabPane key="list" tab="薪资列表">
        <div v-if="canManageSalary" class="mb-4">
          <Button type="primary" @click="openCreate">生成/新增薪资</Button>
        </div>

        <Table
          :columns="columns"
          :data-source="list"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 1400 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <Tag :color="record.status === 1 ? 'green' : 'orange'">
                {{ SALARY_STATUS_MAP[record.status] }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space v-if="canManageSalary">
                <Button
                  v-if="record.status === 0"
                  size="small"
                  type="link"
                  @click="openEdit(record as any)"
                >
                  编辑
                </Button>
                <Popconfirm
                  v-if="record.status === 0"
                  title="确认发放该薪资？"
                  @confirm="handlePay(record as any)"
                >
                  <Button size="small" type="link">发放</Button>
                </Popconfirm>
                <Popconfirm
                  v-if="record.status === 0"
                  title="确定删除？"
                  @confirm="handleDelete(record as any)"
                >
                  <Button danger size="small" type="link">删除</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>

      <Tabs.TabPane v-if="canManageSalary" key="rules" tab="扣款规则">
        <Table
          :columns="ruleColumns"
          :data-source="deductRules"
          :loading="loadingRules"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'unitAmount'">
              <InputNumber
                v-model:value="record.unitAmount"
                :min="0"
                :precision="2"
                class="w-full"
              />
            </template>
            <template v-else-if="column.key === 'enabled'">
              <Switch
                :checked="record.enabled === 1"
                @change="
                  (checked) => (record.enabled = checked === true ? 1 : 0)
                "
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <Button size="small" type="link" @click="saveRule(record as any)">
                保存
              </Button>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>
    </Tabs>

    <Modal
      v-model:open="modalOpen"
      :confirm-loading="previewLoading"
      :title="editing ? '编辑薪资' : '生成/新增薪资'"
      width="560px"
      @ok="handleSubmit"
    >
      <Alert
        v-if="previewTip && !editing"
        :message="previewTip"
        class="mb-3"
        show-icon
        type="warning"
      />
      <Alert
        v-if="deductDetail && !editing"
        :message="`自动扣款：${deductDetail}`"
        class="mb-3"
        show-icon
        type="info"
      />
      <Form layout="vertical">
        <Form.Item label="员工" required>
          <Select
            v-model:value="formState.employeeId"
            :disabled="!!editing"
            :options="employeeOptions"
            class="w-full"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>
        <Form.Item label="薪资月份" required>
          <DatePicker
            v-model:value="formState.salaryMonth"
            :disabled="!!editing"
            class="w-full"
            picker="month"
          />
        </Form.Item>
        <Form.Item label="底薪" required>
          <InputNumber
            v-model:value="formState.baseSalary"
            :min="0"
            :precision="2"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="任务奖金（汇总）">
          <InputNumber
            v-model:value="formState.taskBonus"
            disabled
            :min="0"
            :precision="2"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="最终奖金（可手调）">
          <InputNumber
            v-model:value="formState.bonus"
            :min="0"
            :precision="2"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="扣款（可手调）">
          <InputNumber
            v-model:value="formState.deduction"
            :min="0"
            :precision="2"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="实发预览">
          <Input :value="actualPreview" disabled />
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="formState.remark" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
