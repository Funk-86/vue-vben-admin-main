<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { HrContractVO } from '#/api/hr/contract';

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

import {
  createContract,
  pageContracts,
  renewContract,
} from '#/api/hr/contract';

import '#/views/hr/hr-common.css';

const loading = ref(false);
const list = ref<HrContractVO[]>([]);
const open = ref(false);
const renewOpen = ref(false);
const renewId = ref<null | number>(null);
const form = reactive({
  contractNo: '',
  employeeId: undefined as number | undefined,
  startDate: undefined as Dayjs | undefined,
  endDate: undefined as Dayjs | undefined,
});
const renewForm = reactive({
  newEndDate: undefined as Dayjs | undefined,
  effectiveDate: undefined as Dayjs | undefined,
});

async function load() {
  loading.value = true;
  try {
    const res = await pageContracts({ pageNum: 1, pageSize: 50 });
    list.value = res.records || [];
  } finally {
    loading.value = false;
  }
}
async function submit() {
  if (!form.contractNo || !form.employeeId || !form.startDate) {
    message.warning('请完善');
    return;
  }
  await createContract({
    contractNo: form.contractNo,
    employeeId: form.employeeId,
    startDate: form.startDate.format('YYYY-MM-DD'),
    endDate: form.endDate?.format('YYYY-MM-DD'),
  });
  message.success('已创建');
  open.value = false;
  await load();
}
async function submitRenew() {
  if (!renewId.value || !renewForm.newEndDate) return;
  await renewContract(renewId.value, {
    newEndDate: renewForm.newEndDate.format('YYYY-MM-DD'),
    effectiveDate: renewForm.effectiveDate?.format('YYYY-MM-DD'),
  });
  message.success('续签已提交审批');
  renewOpen.value = false;
  await load();
}
function openRenew(id: number) {
  renewId.value = id;
  renewOpen.value = true;
}
onMounted(load);
</script>
<template>
  <Page title="合同主数据">
    <div class="hr-toolbar">
      <Button type="primary" @click="open = true">新建合同</Button>
    </div>
    <Table
      :columns="[
        { title: '编号', dataIndex: 'contractNo', ellipsis: true },
        { title: '员工ID', dataIndex: 'employeeId', width: 100 },
        { title: '开始', dataIndex: 'startDate', width: 120 },
        { title: '结束', dataIndex: 'endDate', width: 120 },
        { title: '状态', dataIndex: 'status', width: 100 },
        { title: '操作', key: 'a', width: 100 },
      ]"
      :data-source="list"
      :loading="loading"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <Button
          v-if="column.key === 'a'"
          size="small"
          type="link"
          @click="openRenew(record.id)"
        >
          续签
        </Button>
      </template>
    </Table>
    <Modal v-model:open="open" title="新建合同" @ok="submit">
      <Form layout="vertical">
        <Form.Item label="合同编号" required>
          <Input v-model:value="form.contractNo" />
        </Form.Item>
        <Form.Item label="员工ID" required>
          <InputNumber v-model:value="form.employeeId" class="w-full" />
        </Form.Item>
        <Form.Item label="开始日" required>
          <DatePicker v-model:value="form.startDate" class="w-full" />
        </Form.Item>
        <Form.Item label="结束日">
          <DatePicker v-model:value="form.endDate" class="w-full" />
        </Form.Item>
      </Form>
    </Modal>
    <Modal v-model:open="renewOpen" title="发起续签" @ok="submitRenew">
      <Form layout="vertical">
        <Form.Item label="新结束日" required>
          <DatePicker v-model:value="renewForm.newEndDate" class="w-full" />
        </Form.Item>
        <Form.Item label="生效日">
          <DatePicker v-model:value="renewForm.effectiveDate" class="w-full" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
