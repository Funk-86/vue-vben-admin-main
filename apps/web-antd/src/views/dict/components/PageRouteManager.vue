<script lang="ts" setup>
import type { TablePaginationConfig } from 'ant-design-vue/es/table';

import type { PermissionNodeVO } from '#/api/dict/rbac';

import { computed, onMounted, reactive, ref } from 'vue';

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
  createPageRoute,
  deletePageRoute,
  getPageRoutes,
  updatePageRoute,
} from '#/api/dict/rbac';

interface FlatRoute {
  id: number;
  parentId: number;
  path?: string;
  permCode: string;
  permName: string;
  sortOrder?: number;
  status?: number;
  parentName?: string;
  depth: number;
}

const emit = defineEmits<{ changed: [] }>();

const loading = ref(false);
const tree = ref<PermissionNodeVO[]>([]);
const modalOpen = ref(false);
const editing = ref<FlatRoute | null>(null);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showTotal: (total: number) => `共 ${total} 条`,
  total: 0,
});

const form = reactive({
  parentId: 0 as number,
  path: '',
  permName: '',
  sortOrder: 0,
  status: 1,
});

const flatList = computed(() => {
  const rows: FlatRoute[] = [];
  const walk = (
    nodes: PermissionNodeVO[],
    depth: number,
    parentName?: string,
  ) => {
    for (const n of nodes || []) {
      rows.push({
        depth,
        id: Number(n.id),
        parentId: Number(n.parentId ?? 0),
        parentName,
        path: n.path,
        permCode: n.permCode,
        permName: n.permName,
        sortOrder: n.sortOrder,
        status: n.status,
      });
      if (n.children?.length) {
        walk(n.children, depth + 1, n.permName);
      }
    }
  };
  walk(tree.value, 0);
  return rows;
});

const parentOptions = computed(() => {
  const opts = [{ label: '无（一级菜单分组）', value: 0 }];
  for (const n of tree.value || []) {
    opts.push({
      label: `${n.permName}${n.path ? `（${n.path}）` : ''}`,
      value: Number(n.id),
    });
  }
  return opts;
});

const columns = [
  { dataIndex: 'permName', key: 'permName', title: '名称' },
  { dataIndex: 'path', key: 'path', title: '路由路径', width: 200 },
  { dataIndex: 'permCode', key: 'permCode', title: '权限编码', width: 200 },
  { dataIndex: 'parentName', key: 'parentName', title: '父级', width: 120 },
  { dataIndex: 'sortOrder', key: 'sortOrder', title: '排序', width: 80 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 160 },
];

async function load() {
  loading.value = true;
  try {
    tree.value = (await getPageRoutes()) || [];
    pagination.total = flatList.value.length;
    const maxPage = Math.max(
      1,
      Math.ceil(pagination.total / pagination.pageSize) || 1,
    );
    if (pagination.current > maxPage) pagination.current = maxPage;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.parentId = 0;
  form.permName = '';
  form.path = '';
  form.sortOrder = 0;
  form.status = 1;
  modalOpen.value = true;
}

function openEdit(row: FlatRoute) {
  editing.value = row;
  form.parentId = row.parentId || 0;
  form.permName = row.permName;
  form.path = row.path || '';
  form.sortOrder = row.sortOrder ?? 0;
  form.status = row.status ?? 1;
  modalOpen.value = true;
}

async function submit() {
  if (!form.permName.trim()) {
    message.warning('请填写名称');
    return;
  }
  if (!form.path.trim()) {
    message.warning('请填写路由路径');
    return;
  }
  const payload = {
    parentId: form.parentId ?? 0,
    path: form.path.trim(),
    permName: form.permName.trim(),
    sortOrder: form.sortOrder,
    status: form.status,
  };
  if (editing.value) {
    await updatePageRoute(editing.value.id, payload);
    message.success('已更新');
  } else {
    await createPageRoute(payload);
    message.success('已新增（默认赋予超级管理员，需重新登录后侧栏可见）');
  }
  modalOpen.value = false;
  await load();
  emit('changed');
}

async function remove(row: FlatRoute) {
  await deletePageRoute(row.id);
  message.success('已删除');
  await load();
  emit('changed');
}

function handleTableChange(pag: TablePaginationConfig) {
  pagination.current = pag.current ?? 1;
  pagination.pageSize = pag.pageSize ?? 10;
}

onMounted(load);

defineExpose({ reload: load });
</script>

<template>
  <div>
    <div class="mb-4">
      <Button type="primary" @click="openCreate">新增路由</Button>
      <span class="ml-3 text-xs text-gray-400">
        一级=菜单分组（如 /dict）；二级=具体页面（如 /dict/xxx），编码自动生成
      </span>
    </div>
    <Table
      :columns="columns"
      :data-source="flatList"
      :loading="loading"
      :pagination="pagination"
      row-key="id"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'permName'">
          <span :style="{ paddingLeft: `${(record.depth || 0) * 16}px` }">
            {{ record.permName }}
          </span>
        </template>
        <template v-else-if="column.key === 'parentName'">
          {{ record.parentName || '—' }}
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag :color="record.status === 1 ? 'green' : 'default'">
            {{ record.status === 1 ? '启用' : '停用' }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space>
            <Button size="small" type="link" @click="openEdit(record as any)">
              编辑
            </Button>
            <Popconfirm
              title="确定删除该路由？"
              @confirm="remove(record as any)"
            >
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalOpen"
      :title="editing ? '编辑页面路由' : '新增页面路由'"
      destroy-on-close
      @ok="submit"
    >
      <Form layout="vertical">
        <Form.Item label="父级" required>
          <Select
            v-model:value="form.parentId"
            :options="parentOptions"
            :disabled="
              !!editing &&
              editing.depth === 0 &&
              flatList.filter((r) => r.parentId === editing?.id).length > 0
            "
          />
        </Form.Item>
        <Form.Item label="名称" required>
          <Input v-model:value="form.permName" placeholder="如：岗位角色字典" />
        </Form.Item>
        <Form.Item label="路由路径" required>
          <Input
            v-model:value="form.path"
            placeholder="如：/dict/position-role"
          />
        </Form.Item>
        <Form.Item label="排序">
          <InputNumber v-model:value="form.sortOrder" class="w-full" :min="0" />
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
      </Form>
    </Modal>
  </div>
</template>
