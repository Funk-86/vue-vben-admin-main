<script lang="ts" setup>
import type { Dayjs } from 'dayjs';

import type { HolidayVO } from '#/api/hr/holiday';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createHoliday,
  deleteHoliday,
  getHolidays,
  updateHoliday,
} from '#/api/hr/holiday';

const year = ref(dayjs().year());
const loading = ref(false);
const list = ref<HolidayVO[]>([]);
const open = ref(false);
const editingId = ref<null | number>(null);
const form = reactive({
  holidayDate: undefined as Dayjs | undefined,
  name: '',
  holidayType: 'PUBLIC',
  remark: '',
});
const columns = [
  { title: '日期', dataIndex: 'holidayDate', width: 140 },
  { title: '名称', dataIndex: 'name' },
  { title: '类型', dataIndex: 'holidayType', width: 120 },
  { title: '备注', dataIndex: 'remark' },
  { title: '操作', key: 'action', width: 160 },
];

async function load() {
  loading.value = true;
  try {
    list.value = await getHolidays(year.value);
  } finally {
    loading.value = false;
  }
}
function openCreate() {
  editingId.value = null;
  Object.assign(form, {
    holidayDate: undefined,
    name: '',
    holidayType: 'PUBLIC',
    remark: '',
  });
  open.value = true;
}
function openEdit(row: HolidayVO) {
  editingId.value = row.id;
  Object.assign(form, {
    holidayDate: dayjs(row.holidayDate),
    name: row.name,
    holidayType: row.holidayType,
    remark: row.remark || '',
  });
  open.value = true;
}
async function submit() {
  if (!form.holidayDate || !form.name) {
    message.warning('请完善信息');
    return;
  }
  const payload = {
    holidayDate: form.holidayDate.format('YYYY-MM-DD'),
    name: form.name,
    holidayType: form.holidayType,
    remark: form.remark,
  };
  await (editingId.value
    ? updateHoliday(editingId.value, payload)
    : createHoliday(payload));
  message.success('已保存');
  open.value = false;
  await load();
}
onMounted(load);
</script>
<template>
  <Page title="节假日日历">
    <Space class="mb-4">
      <Select
        v-model:value="year"
        :options="
          [2025, 2026, 2027].map((y) => ({ label: String(y), value: y }))
        "
        style="width: 120px"
        @change="load"
      />
      <Button type="primary" @click="openCreate">新增</Button>
    </Space>
    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Space>
            <Button
              size="small"
              type="link"
              @click="openEdit(record as HolidayVO)"
            >
              编辑
            </Button>
            <Popconfirm
              title="确认删除？"
              @confirm="
                async () => {
                  await deleteHoliday(record.id);
                  message.success('已删除');
                  load();
                }
              "
            >
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>
    <Modal v-model:open="open" title="节假日" @ok="submit">
      <Form layout="vertical">
        <Form.Item label="日期" required>
          <DatePicker v-model:value="form.holidayDate" class="w-full" />
        </Form.Item>
        <Form.Item label="名称" required>
          <Input v-model:value="form.name" />
        </Form.Item>
        <Form.Item label="类型">
          <Select
            v-model:value="form.holidayType"
            :options="[
              { label: '法定假', value: 'PUBLIC' },
              { label: '公司假', value: 'COMPANY' },
              { label: '调休上班', value: 'WORKDAY' },
            ]"
          />
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="form.remark" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
