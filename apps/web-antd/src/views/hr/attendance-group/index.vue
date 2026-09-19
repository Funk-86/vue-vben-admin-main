<script lang="ts" setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, Input, InputNumber, message, Table } from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  createGroup,
  generateSchedules,
  listGroups,
  listSchedules,
  listShifts,
} from '#/api/hr/attendance-group';

import '#/views/hr/hr-common.css';

const groups = ref<any[]>([]);
const shifts = ref<any[]>([]);
const schedules = ref<any[]>([]);
const selectedId = ref<null | number>(null);
const year = ref(dayjs().year());
const month = ref(dayjs().month() + 1);
const newName = ref('');

async function load() {
  groups.value = (await listGroups()) as any[];
  shifts.value = (await listShifts()) as any[];
}

async function addGroup() {
  if (!newName.value) return;
  await createGroup({
    defaultShiftId: shifts.value[0]?.id,
    groupName: newName.value,
    status: 1,
  });
  newName.value = '';
  message.success('已创建');
  await load();
}

async function selectGroup(id: number) {
  selectedId.value = id;
  const from = dayjs(`${year.value}-${month.value}-01`).format('YYYY-MM-DD');
  const to = dayjs(from).endOf('month').format('YYYY-MM-DD');
  schedules.value = (await listSchedules(id, from, to)) as any[];
}

async function gen() {
  if (!selectedId.value) return;
  await generateSchedules(selectedId.value, year.value, month.value);
  message.success('已按节假日生成排班');
  await selectGroup(selectedId.value);
}

onMounted(load);
</script>

<template>
  <Page title="考勤组排班">
    <div class="hr-toolbar">
      <Input
        v-model:value="newName"
        class="hr-w-md"
        placeholder="新考勤组名称"
      />
      <Button type="primary" @click="addGroup">新建考勤组</Button>
      <InputNumber v-model:value="year" :min="2024" class="hr-w-xs" />
      <InputNumber v-model:value="month" :max="12" :min="1" class="hr-w-xs" />
      <Button :disabled="!selectedId" @click="gen">生成当月排班</Button>
    </div>
    <Table
      :columns="[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '名称', dataIndex: 'groupName' },
        { title: '操作', key: 'a', width: 120 },
      ]"
      :data-source="groups"
      class="mb-4"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <Button
          v-if="column.key === 'a'"
          size="small"
          type="link"
          @click="selectGroup(record.id)"
        >
          查看排班
        </Button>
      </template>
    </Table>
    <Table
      v-if="selectedId"
      :columns="[
        { title: '日期', dataIndex: 'workDate' },
        { title: '类型', dataIndex: 'dayType' },
        { title: '班次ID', dataIndex: 'shiftId' },
      ]"
      :data-source="schedules"
      row-key="id"
      size="small"
    />
  </Page>
</template>
