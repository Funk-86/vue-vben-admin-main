<script lang="ts" setup>
import type { DepartmentVO } from '#/api/hr';

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
  Select,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import {
  createDepartment,
  deleteDepartment,
  getDepartmentTree,
  updateDepartment,
} from '#/api/hr';
import { COMMON_STATUS } from '#/views/hr/constants';

const loading = ref(false);
const treeData = ref<DepartmentVO[]>([]);
const modalOpen = ref(false);
const editing = ref<DepartmentVO | null>(null);

const formState = reactive({
  deptCode: '',
  deptName: '',
  parentId: 0,
  sortOrder: 0,
  status: 1,
});

const columns = [
  { dataIndex: 'deptName', key: 'deptName', title: '部门名称', width: 220 },
  { dataIndex: 'deptCode', key: 'deptCode', title: '部门编码', width: 140 },
  { dataIndex: 'sortOrder', key: 'sortOrder', title: '排序', width: 80 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 220 },
];

async function loadData() {
  loading.value = true;
  try {
    treeData.value = await getDepartmentTree();
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  formState.deptCode = '';
  formState.deptName = '';
  formState.parentId = 0;
  formState.sortOrder = 0;
  formState.status = 1;
}

function openCreate(parentId = 0) {
  editing.value = null;
  resetForm();
  formState.parentId = parentId;
  modalOpen.value = true;
}

function openEdit(record: DepartmentVO) {
  editing.value = record;
  formState.deptCode = record.deptCode;
  formState.deptName = record.deptName;
  formState.parentId = record.parentId ?? 0;
  formState.sortOrder = record.sortOrder ?? 0;
  formState.status = record.status ?? 1;
  modalOpen.value = true;
}

async function handleSubmit() {
  if (!formState.deptName || !formState.deptCode) {
    message.warning('请填写部门名称和编码');
    return;
  }
  try {
    if (editing.value) {
      await updateDepartment(editing.value.id, {
        deptName: formState.deptName,
        sortOrder: formState.sortOrder,
        status: formState.status,
      });
      message.success('更新成功');
    } else {
      await createDepartment({ ...formState });
      message.success('创建成功');
    }
    modalOpen.value = false;
    await loadData();
  } catch {
    // 错误已由拦截器提示
  }
}

async function handleDelete(record: DepartmentVO) {
  await deleteDepartment(record.id);
  message.success('删除成功');
  await loadData();
}

onMounted(loadData);
</script>

<template>
  <Page description="组织架构部门树维护" title="部门管理">
    <div class="mb-4">
      <Button type="primary" @click="openCreate(0)">新增根部门</Button>
    </div>
    <Table
      :columns="columns"
      :data-source="treeData"
      :loading="loading"
      :pagination="false"
      children-column-name="children"
      default-expand-all-rows
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'status'">
          <Tag :color="record.status === 1 ? 'green' : 'red'">
            {{ COMMON_STATUS[record.status] ?? record.status }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button size="small" type="link" @click="openEdit(record)">
              编辑
            </Button>
            <Button
              size="small"
              type="link"
              @click="openCreate(record.id)"
            >
              新增子部门
            </Button>
            <Popconfirm
              title="确定删除该部门？"
              @confirm="handleDelete(record)"
            >
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalOpen"
      :title="editing ? '编辑部门' : '新增部门'"
      @ok="handleSubmit"
    >
      <Form layout="vertical">
        <Form.Item label="部门名称" required>
          <Input v-model:value="formState.deptName" />
        </Form.Item>
        <Form.Item v-if="!editing" label="部门编码" required>
          <Input v-model:value="formState.deptCode" />
        </Form.Item>
        <Form.Item v-if="!editing" label="父部门ID">
          <InputNumber v-model:value="formState.parentId" class="w-full" />
        </Form.Item>
        <Form.Item label="排序">
          <InputNumber v-model:value="formState.sortOrder" class="w-full" />
        </Form.Item>
        <Form.Item label="状态">
          <Select v-model:value="formState.status">
            <Select.Option :value="1">启用</Select.Option>
            <Select.Option :value="0">禁用</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
