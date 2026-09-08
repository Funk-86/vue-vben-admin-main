<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue/es/table';

import type { DepartmentVO, PositionRoleDictVO, PositionVO } from '#/api/hr';

import { onMounted, reactive, ref } from 'vue';

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

import {
  createPositionRoleDict,
  deletePositionRoleDict,
  getDepartmentTree,
  getPositionRoleDictList,
  getPositionsByDept,
  updatePositionRoleDict,
} from '#/api/hr';
import { COMMON_STATUS, flattenDepartments } from '#/views/hr/constants';
import { ROLE_NAME_MAP } from '#/views/hr/roles';

const loading = ref(false);
const list = ref<PositionRoleDictVO[]>([]);
const modalOpen = ref(false);
const editing = ref<null | PositionRoleDictVO>(null);
const positionOptions = ref<{ label: string; value: number }[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  total: 0,
});

const form = reactive({
  positionId: undefined as number | undefined,
  remark: '',
  roleCode: 'EMPLOYEE' as string,
  status: 1,
});

const roleOptions = [
  { label: ROLE_NAME_MAP.HR_ADMIN || 'HR管理员', value: 'HR_ADMIN' },
  { label: ROLE_NAME_MAP.DEPT_MANAGER || '部门经理', value: 'DEPT_MANAGER' },
  { label: ROLE_NAME_MAP.EMPLOYEE || '普通员工', value: 'EMPLOYEE' },
];

const columns = [
  { dataIndex: 'positionName', key: 'positionName', title: '岗位' },
  {
    dataIndex: 'positionCode',
    key: 'positionCode',
    title: '岗位编码',
    width: 120,
  },
  { dataIndex: 'roleCode', key: 'roleCode', title: '系统角色', width: 140 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { dataIndex: 'remark', key: 'remark', title: '备注' },
  { key: 'action', title: '操作', width: 160 },
];

async function loadPositionOptions() {
  const tree = await getDepartmentTree();
  const depts = flattenDepartments(tree as DepartmentVO[]);
  const all: PositionVO[] = [];
  for (const d of depts) {
    const positions = await getPositionsByDept(d.id);
    all.push(...positions);
  }
  positionOptions.value = all.map((p) => ({
    label: `${p.positionName}${p.positionCode ? ` [${p.positionCode}]` : ''}${
      p.deptName ? `（${p.deptName}）` : ''
    }`,
    value: p.id,
  }));
}

async function loadList() {
  loading.value = true;
  try {
    list.value = await getPositionRoleDictList();
    pagination.total = list.value.length;
    const maxPage = Math.max(
      1,
      Math.ceil(pagination.total / pagination.pageSize) || 1,
    );
    if (pagination.current > maxPage) {
      pagination.current = maxPage;
    }
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag: TablePaginationConfig) {
  pagination.current = pag.current ?? 1;
  pagination.pageSize = pag.pageSize ?? 10;
}

function openCreate() {
  editing.value = null;
  form.positionId = undefined;
  form.roleCode = 'EMPLOYEE';
  form.status = 1;
  form.remark = '';
  modalOpen.value = true;
}

function openEdit(record: PositionRoleDictVO) {
  editing.value = record;
  form.positionId = record.positionId;
  form.roleCode = record.roleCode;
  form.status = record.status;
  form.remark = record.remark || '';
  modalOpen.value = true;
}

async function submit() {
  if (!form.positionId) {
    message.warning('请选择岗位');
    return;
  }
  const payload = {
    positionId: form.positionId,
    remark: form.remark || undefined,
    roleCode: form.roleCode,
    status: form.status,
  };
  if (editing.value) {
    await updatePositionRoleDict(editing.value.id, payload);
    message.success('更新成功');
  } else {
    await createPositionRoleDict(payload);
    message.success('创建成功');
  }
  modalOpen.value = false;
  await loadList();
}

async function remove(record: PositionRoleDictVO) {
  await deletePositionRoleDict(record.id);
  message.success('删除成功');
  await loadList();
}

onMounted(async () => {
  await Promise.all([loadPositionOptions(), loadList()]);
});
</script>

<template>
  <Page
    description="按岗位划分系统角色，调岗生效与员工导入将据此分配权限"
    title="岗位角色字典"
  >
    <div class="mb-4">
      <Button type="primary" @click="openCreate">新增映射</Button>
    </div>
    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'roleCode'">
          {{ ROLE_NAME_MAP[record.roleCode] || record.roleCode }}
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag :color="record.status === 1 ? 'green' : 'default'">
            {{ COMMON_STATUS[record.status] }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button size="small" type="link" @click="openEdit(record as any)">
              编辑
            </Button>
            <Popconfirm title="确定删除？" @confirm="remove(record as any)">
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalOpen"
      :title="editing ? '编辑岗位角色' : '新增岗位角色'"
      destroy-on-close
      @ok="submit"
    >
      <Form layout="vertical">
        <Form.Item label="岗位" required>
          <Select
            v-model:value="form.positionId"
            :options="positionOptions"
            allow-clear
            placeholder="选择岗位"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>
        <Form.Item label="系统角色" required>
          <Select v-model:value="form.roleCode" :options="roleOptions" />
        </Form.Item>
        <Form.Item label="状态">
          <Select
            v-model:value="form.status"
            :options="[
              { label: '启用', value: 1 },
              { label: '停用', value: 0 },
            ]"
          />
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="form.remark" allow-clear placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
