<script lang="ts" setup>
import type { SeniorityGradeVO } from '#/api/hr/salary';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
} from 'ant-design-vue';

import {
  createSeniorityGrade,
  deleteSeniorityGrade,
  getSeniorityGradeList,
  updateSeniorityGrade,
} from '#/api/hr/salary';

const loading = ref(false);
const list = ref<SeniorityGradeVO[]>([]);
const open = ref(false);
const editingId = ref<null | number>(null);
const form = reactive({
  minYears: 0,
  maxYears: 1,
  seniorityPay: 0,
  salaryCoeff: 1,
  status: 1,
  remark: '',
});

const columns = [
  { dataIndex: 'minYears', key: 'minYears', title: '工龄下限(含)', width: 120 },
  {
    dataIndex: 'maxYears',
    key: 'maxYears',
    title: '工龄上限(不含)',
    width: 130,
  },
  {
    dataIndex: 'salaryCoeff',
    key: 'salaryCoeff',
    title: '基本工资系数',
    width: 120,
  },
  {
    dataIndex: 'seniorityPay',
    key: 'seniorityPay',
    title: '工龄津贴',
    width: 110,
  },
  { dataIndex: 'status', key: 'status', title: '启用', width: 80 },
  { dataIndex: 'remark', key: 'remark', title: '备注' },
  { key: 'action', title: '操作', width: 160 },
];

async function load() {
  loading.value = true;
  try {
    list.value = await getSeniorityGradeList();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  Object.assign(form, {
    minYears: 0,
    maxYears: 1,
    seniorityPay: 0,
    salaryCoeff: 1,
    status: 1,
    remark: '',
  });
  open.value = true;
}

function openEdit(row: SeniorityGradeVO) {
  editingId.value = row.id;
  Object.assign(form, {
    minYears: row.minYears,
    maxYears: row.maxYears,
    seniorityPay: Number(row.seniorityPay),
    salaryCoeff: Number(row.salaryCoeff),
    status: row.status,
    remark: row.remark || '',
  });
  open.value = true;
}

async function submit() {
  const payload = {
    minYears: form.minYears,
    maxYears: form.maxYears,
    seniorityPay: form.seniorityPay,
    salaryCoeff: form.salaryCoeff,
    status: form.status,
    remark: form.remark || undefined,
  };
  if (editingId.value) {
    await updateSeniorityGrade(editingId.value, payload);
    message.success('已更新');
  } else {
    await createSeniorityGrade(payload);
    message.success('已创建');
  }
  open.value = false;
  await load();
}

async function remove(row: SeniorityGradeVO) {
  await deleteSeniorityGrade(row.id);
  message.success('已删除');
  await load();
}

onMounted(load);
</script>

<template>
  <Page
    auto-content-height
    description="按有效工龄匹配基本工资系数与工龄津贴"
    title="工龄薪档"
  >
    <div class="mb-3">
      <Button type="primary" @click="openCreate">新增档位</Button>
    </div>
    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          {{ record.status === 1 ? '是' : '否' }}
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button type="link" @click="openEdit(record as SeniorityGradeVO)">
              编辑
            </Button>
            <Popconfirm
              title="确认删除？"
              @confirm="remove(record as SeniorityGradeVO)"
            >
              <Button danger type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="open"
      :title="editingId ? '编辑工龄薪档' : '新增工龄薪档'"
      @ok="submit"
    >
      <Form layout="vertical">
        <Form.Item label="工龄下限(含)">
          <InputNumber v-model:value="form.minYears" :min="0" class="w-full" />
        </Form.Item>
        <Form.Item label="工龄上限(不含)">
          <InputNumber v-model:value="form.maxYears" :min="1" class="w-full" />
        </Form.Item>
        <Form.Item label="基本工资系数">
          <InputNumber
            v-model:value="form.salaryCoeff"
            :min="0.01"
            :step="0.01"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="工龄津贴(元/月)">
          <InputNumber
            v-model:value="form.seniorityPay"
            :min="0"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="启用">
          <Switch
            :checked="form.status === 1"
            @change="(c) => (form.status = c ? 1 : 0)"
          />
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="form.remark" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
