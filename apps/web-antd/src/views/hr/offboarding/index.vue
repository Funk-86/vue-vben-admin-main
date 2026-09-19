<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Button, InputNumber, message, Table } from 'ant-design-vue';

import {
  completeChecklistItem,
  listChecklistInstances,
  startChecklist,
} from '#/api/hr/checklist';

import '#/views/hr/hr-common.css';

const employeeId = ref<number | undefined>();
const list = ref<any[]>([]);

async function load() {
  if (!employeeId.value) return;
  list.value = (await listChecklistInstances(
    employeeId.value,
    'OFFBOARD',
  )) as any[];
}

async function start() {
  if (!employeeId.value) return;
  await startChecklist(employeeId.value, 'OFFBOARD');
  message.success('已生成离职交接清单');
  await load();
}

async function done(id: number) {
  await completeChecklistItem(id);
  message.success('已完成');
  await load();
}
</script>

<template>
  <Page title="离职交接">
    <div class="hr-toolbar">
      <InputNumber
        v-model:value="employeeId"
        class="hr-w-sm"
        placeholder="员工ID"
      />
      <Button @click="load">查询</Button>
      <Button type="primary" @click="start">生成清单</Button>
    </div>
    <Table
      :columns="[
        { title: '事项', dataIndex: 'itemName' },
        { title: '角色', dataIndex: 'assigneeRole', width: 120 },
        { title: '必做', dataIndex: 'requiredFlag', width: 80 },
        { title: '状态', dataIndex: 'status', width: 80 },
        { title: '操作', key: 'a', width: 120 },
      ]"
      :data-source="list"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <Button
          v-if="column.key === 'a' && record.status === 0"
          size="small"
          type="link"
          @click="done(record.id)"
        >
          完成
        </Button>
      </template>
    </Table>
  </Page>
</template>
