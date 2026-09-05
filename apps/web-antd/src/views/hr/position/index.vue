<script lang="ts" setup>
import type { DepartmentVO, PositionVO } from '#/api/hr';

import { computed, onMounted, reactive, ref, watch } from 'vue';

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
  createPosition,
  deletePosition,
  getDepartmentTree,
  getPositionsByDept,
  updatePosition,
} from '#/api/hr';
import {
  COMMON_STATUS,
  flattenDepartmentOptions,
  POSITION_LEVEL_MAP,
} from '#/views/hr/constants';
import { useHrAccess } from '#/views/hr/roles';

import '#/views/hr/hr-common.css';

const { canFeat } = useHrAccess();
const canManageOrg = computed(() => canFeat('feat.org.manage'));

const loading = ref(false);
const deptId = ref<number>();
const deptTree = ref<DepartmentVO[]>([]);
const list = ref<PositionVO[]>([]);
const modalOpen = ref(false);
const editing = ref<null | PositionVO>(null);

const formState = reactive({
  deptId: undefined as number | undefined,
  level: 1,
  positionCode: '',
  positionName: '',
  status: 1,
});

const deptOptions = computed(() => flattenDepartmentOptions(deptTree.value));

const columns = [
  { dataIndex: 'positionName', key: 'positionName', title: '岗位名称' },
  { dataIndex: 'positionCode', key: 'positionCode', title: '岗位编码' },
  { dataIndex: 'deptName', key: 'deptName', title: '所属部门' },
  { dataIndex: 'level', key: 'level', title: '职级', width: 90 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 160 },
];

async function loadDepts() {
  deptTree.value = await getDepartmentTree();
  if (!deptId.value && deptOptions.value.length > 0) {
    deptId.value = deptOptions.value[0]?.value;
  }
}

async function loadData() {
  if (!deptId.value) {
    list.value = [];
    return;
  }
  loading.value = true;
  try {
    list.value = await getPositionsByDept(deptId.value);
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  formState.positionCode = '';
  formState.positionName = '';
  formState.level = 1;
  formState.status = 1;
  formState.deptId = deptId.value;
  modalOpen.value = true;
}

function openEdit(record: PositionVO) {
  editing.value = record;
  formState.positionCode = record.positionCode;
  formState.positionName = record.positionName;
  formState.level = record.level;
  formState.status = record.status;
  formState.deptId = record.deptId;
  modalOpen.value = true;
}

async function handleSubmit() {
  if (!formState.positionName || !formState.deptId) {
    message.warning('请填写完整信息');
    return;
  }
  try {
    if (editing.value) {
      await updatePosition(editing.value.id, {
        deptId: formState.deptId,
        level: formState.level,
        positionName: formState.positionName,
        status: formState.status,
      });
      message.success('更新成功');
    } else {
      if (!formState.positionCode) {
        message.warning('请填写岗位编码');
        return;
      }
      await createPosition({ ...formState, deptId: formState.deptId });
      message.success('创建成功');
    }
    modalOpen.value = false;
    await loadData();
  } catch {
    // handled
  }
}

async function handleDelete(record: PositionVO) {
  await deletePosition(record.id);
  message.success('删除成功');
  await loadData();
}

watch(deptId, loadData);

onMounted(async () => {
  await loadDepts();
  await loadData();
});
</script>

<template>
  <Page
    description="按部门维护岗位信息；选择公司（根部门）可查看全公司岗位"
    title="岗位管理"
  >
    <div class="mb-4 flex items-center gap-3">
      <span>选择部门：</span>
      <Select
        v-model:value="deptId"
        :options="deptOptions"
        :popup-match-select-width="false"
        class="w-60"
        option-filter-prop="label"
        placeholder="请选择部门/公司"
        popup-class-name="hr-filter-select-dropdown"
        show-search
      />
      <Button
        v-if="canManageOrg"
        :disabled="!deptId"
        type="primary"
        @click="openCreate"
      >
        新增岗位
      </Button>
    </div>

    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="{ pageSize: 10 }"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'level'">
          {{ POSITION_LEVEL_MAP[record.level] ?? record.level }}
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag :color="record.status === 1 ? 'green' : 'red'">
            {{ COMMON_STATUS[record.status] ?? record.status }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'action'">
          <Space v-if="canManageOrg">
            <Button size="small" type="link" @click="openEdit(record as any)">
              编辑
            </Button>
            <Popconfirm
              title="确定删除该岗位？"
              @confirm="handleDelete(record as any)"
            >
              <Button danger size="small" type="link">删除</Button>
            </Popconfirm>
          </Space>
        </template>
      </template>
    </Table>

    <Modal
      v-model:open="modalOpen"
      :title="editing ? '编辑岗位' : '新增岗位'"
      @ok="handleSubmit"
    >
      <Form layout="vertical">
        <Form.Item label="岗位名称" required>
          <Input v-model:value="formState.positionName" />
        </Form.Item>
        <Form.Item v-if="!editing" label="岗位编码" required>
          <Input v-model:value="formState.positionCode" />
        </Form.Item>
        <Form.Item label="所属部门" required>
          <Select
            v-model:value="formState.deptId"
            :options="deptOptions"
            :popup-match-select-width="false"
            class="w-full"
            option-filter-prop="label"
            popup-class-name="hr-filter-select-dropdown"
            show-search
          />
        </Form.Item>
        <Form.Item label="职级">
          <Select v-model:value="formState.level">
            <Select.Option
              v-for="(label, val) in POSITION_LEVEL_MAP"
              :key="val"
              :value="Number(val)"
            >
              {{ label }}
            </Select.Option>
          </Select>
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
