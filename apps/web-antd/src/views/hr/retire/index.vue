<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Table,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createRetire,
  effectRetire,
  generatePensionPayments,
  listPensionGrades,
  listPensionPayments,
  listRetireRecords,
} from '#/api/hr/retire';

const records = ref<any[]>([]);
const grades = ref<any[]>([]);
const payments = ref<any[]>([]);
const open = ref(false);
const form = reactive({
  employeeId: undefined as number | undefined,
  reason: '',
  retireDate: undefined as Dayjs | undefined,
});

const recordColumns = [
  { dataIndex: 'employeeId', title: '员工', width: 90 },
  { dataIndex: 'retireDate', title: '退休日', width: 120 },
  { dataIndex: 'seniorityYearsAtRetire', title: '工龄', width: 80 },
  { dataIndex: 'monthlyPensionAmount', title: '月退休金', width: 110 },
  { dataIndex: 'status', title: '状态', width: 80 },
  { key: 'a', title: '操作', width: 120 },
];

const gradeColumns = [
  { dataIndex: 'minYears', title: '工龄下限' },
  { dataIndex: 'maxYears', title: '上限' },
  { dataIndex: 'monthlyAmount', title: '月金额' },
];

const paymentColumns = [
  { dataIndex: 'employeeId', title: '员工' },
  { dataIndex: 'payMonth', title: '月份' },
  { dataIndex: 'amount', title: '金额' },
  { dataIndex: 'status', title: '状态' },
];

async function load() {
  records.value = (await listRetireRecords()) as any[];
  grades.value = (await listPensionGrades()) as any[];
  payments.value = (await listPensionPayments()) as any[];
}

async function submit() {
  if (!form.employeeId || !form.retireDate) return;
  await createRetire({
    employeeId: form.employeeId,
    reason: form.reason,
    retireDate: form.retireDate.format('YYYY-MM-DD'),
  });
  message.success('已提交退休审批');
  open.value = false;
  await load();
}

async function genPay() {
  const m = dayjs().format('YYYY-MM');
  const n = await generatePensionPayments(m);
  message.success(`已生成 ${n} 条发放单`);
  await load();
}

async function doEffect(id: number) {
  await effectRetire(id);
  message.success('已生效');
  await load();
}

onMounted(load);
</script>

<template>
  <Page description="退休办理与退休金档位 / 发放台账" title="退休管理">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <Button type="primary" @click="open = true">发起退休</Button>
      <Button @click="genPay">生成本月退休金</Button>
    </div>

    <h3 class="mb-3 text-base font-medium">退休单</h3>
    <Table
      class="mb-8"
      :columns="recordColumns"
      :data-source="records"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <Button
          v-if="column.key === 'a' && record.status === 1"
          size="small"
          type="link"
          @click="doEffect(record.id)"
        >
          立即生效
        </Button>
      </template>
    </Table>

    <h3 class="mb-3 text-base font-medium">退休金档</h3>
    <Table
      class="mb-8"
      :columns="gradeColumns"
      :data-source="grades"
      row-key="id"
      size="small"
    />

    <h3 class="mb-3 text-base font-medium">发放台账</h3>
    <Table
      :columns="paymentColumns"
      :data-source="payments"
      row-key="id"
      size="small"
    />

    <Modal v-model:open="open" title="发起退休" @ok="submit">
      <Form layout="vertical">
        <Form.Item label="员工ID" required>
          <InputNumber v-model:value="form.employeeId" class="w-full" />
        </Form.Item>
        <Form.Item label="退休日" required>
          <DatePicker v-model:value="form.retireDate" class="w-full" />
        </Form.Item>
        <Form.Item label="原因">
          <Input v-model:value="form.reason" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
