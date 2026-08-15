<script lang="ts" setup>
import type {
  DepartmentVO,
  PositionVO,
  SalaryBaseDictVO,
  TaskScoreBonusDictVO,
} from '#/api/hr';

import { onMounted, reactive, ref, watch } from 'vue';

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
  Tabs,
  Tag,
} from 'ant-design-vue';

import {
  createSalaryBaseDict,
  createScoreBonusDict,
  deleteSalaryBaseDict,
  deleteScoreBonusDict,
  getDepartmentTree,
  getPositionsByDept,
  getSalaryBaseDictList,
  getScoreBonusDictList,
  updateSalaryBaseDict,
  updateScoreBonusDict,
} from '#/api/hr';
import { COMMON_STATUS, flattenDepartments } from '#/views/hr/constants';

const activeTab = ref('base');

// ---------- 底薪字典 ----------
const baseLoading = ref(false);
const baseList = ref<SalaryBaseDictVO[]>([]);
const baseModalOpen = ref(false);
const baseEditing = ref<SalaryBaseDictVO | null>(null);
const positionOptions = ref<{ label: string; value: number }[]>([]);
const baseForm = reactive({
  baseSalary: 0,
  positionId: undefined as number | undefined,
  remark: '',
  status: 1,
});

const baseColumns = [
  { dataIndex: 'positionName', key: 'positionName', title: '岗位' },
  { dataIndex: 'baseSalary', key: 'baseSalary', title: '底薪', width: 120 },
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

async function loadBaseDict() {
  baseLoading.value = true;
  try {
    baseList.value = await getSalaryBaseDictList();
  } finally {
    baseLoading.value = false;
  }
}

function openBaseCreate() {
  baseEditing.value = null;
  Object.assign(baseForm, {
    baseSalary: 0,
    positionId: undefined,
    remark: '',
    status: 1,
  });
  baseModalOpen.value = true;
}

function openBaseEdit(record: SalaryBaseDictVO) {
  baseEditing.value = record;
  Object.assign(baseForm, {
    baseSalary: Number(record.baseSalary),
    positionId: record.positionId,
    remark: record.remark ?? '',
    status: record.status,
  });
  baseModalOpen.value = true;
}

async function submitBaseDict() {
  if (!baseForm.positionId) {
    message.warning('请选择岗位');
    return;
  }
  const payload = {
    baseSalary: baseForm.baseSalary,
    positionId: baseForm.positionId,
    remark: baseForm.remark || undefined,
    status: baseForm.status,
  };
  if (baseEditing.value) {
    await updateSalaryBaseDict(baseEditing.value.id, payload);
    message.success('更新成功');
  } else {
    await createSalaryBaseDict(payload);
    message.success('创建成功');
  }
  baseModalOpen.value = false;
  await loadBaseDict();
}

async function removeBaseDict(record: SalaryBaseDictVO) {
  await deleteSalaryBaseDict(record.id);
  message.success('删除成功');
  await loadBaseDict();
}

// ---------- 评分奖金字典 ----------
const scoreLoading = ref(false);
const scoreList = ref<TaskScoreBonusDictVO[]>([]);
const scoreModalOpen = ref(false);
const scoreEditing = ref<TaskScoreBonusDictVO | null>(null);
const scoreForm = reactive({
  bonusAmount: 0,
  grade: 1,
  gradeLabel: '优',
  status: 1,
});

const GRADE_PRESETS: Record<number, string> = {
  1: '优',
  2: '良',
  3: '中',
  4: '合格',
  5: '差',
};

const scoreColumns = [
  { dataIndex: 'grade', key: 'grade', title: '等级', width: 80 },
  { dataIndex: 'gradeLabel', key: 'gradeLabel', title: '名称', width: 100 },
  { dataIndex: 'bonusAmount', key: 'bonusAmount', title: '奖金金额', width: 120 },
  { dataIndex: 'status', key: 'status', title: '状态', width: 90 },
  { key: 'action', title: '操作', width: 160 },
];

async function loadScoreDict() {
  scoreLoading.value = true;
  try {
    scoreList.value = await getScoreBonusDictList();
  } finally {
    scoreLoading.value = false;
  }
}

function openScoreCreate() {
  scoreEditing.value = null;
  Object.assign(scoreForm, {
    bonusAmount: 0,
    grade: 1,
    gradeLabel: '优',
    status: 1,
  });
  scoreModalOpen.value = true;
}

function openScoreEdit(record: TaskScoreBonusDictVO) {
  scoreEditing.value = record;
  Object.assign(scoreForm, {
    bonusAmount: Number(record.bonusAmount),
    grade: record.grade,
    gradeLabel: record.gradeLabel,
    status: record.status,
  });
  scoreModalOpen.value = true;
}

watch(
  () => scoreForm.grade,
  (grade) => {
    if (!scoreEditing.value && GRADE_PRESETS[grade]) {
      scoreForm.gradeLabel = GRADE_PRESETS[grade]!;
    }
  },
);

async function submitScoreDict() {
  const payload = {
    bonusAmount: scoreForm.bonusAmount,
    grade: scoreForm.grade,
    gradeLabel: scoreForm.gradeLabel,
    status: scoreForm.status,
  };
  if (scoreEditing.value) {
    await updateScoreBonusDict(scoreEditing.value.id, payload);
    message.success('更新成功');
  } else {
    await createScoreBonusDict(payload);
    message.success('创建成功');
  }
  scoreModalOpen.value = false;
  await loadScoreDict();
}

async function removeScoreDict(record: TaskScoreBonusDictVO) {
  await deleteScoreBonusDict(record.id);
  message.success('删除成功');
  await loadScoreDict();
}

watch(activeTab, (tab) => {
  if (tab === 'score' && !scoreList.value.length) {
    loadScoreDict();
  }
});

onMounted(async () => {
  await Promise.all([loadPositionOptions(), loadBaseDict()]);
});
</script>

<template>
  <Page description="岗位底薪与任务评分奖金档位（仅超级管理员）" title="薪资字典">
    <Tabs v-model:active-key="activeTab">
      <Tabs.TabPane key="base" tab="底薪字典">
        <div class="mb-4">
          <Button type="primary" @click="openBaseCreate">新增底薪</Button>
        </div>
        <Table
          :columns="baseColumns"
          :data-source="baseList"
          :loading="baseLoading"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <Tag :color="record.status === 1 ? 'green' : 'default'">
                {{ COMMON_STATUS[record.status] }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button size="small" type="link" @click="openBaseEdit(record)">
                  编辑
                </Button>
                <Popconfirm title="确定删除？" @confirm="removeBaseDict(record)">
                  <Button danger size="small" type="link">删除</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>

      <Tabs.TabPane key="score" tab="评分奖金字典">
        <div class="mb-4">
          <Button type="primary" @click="openScoreCreate">新增档位</Button>
        </div>
        <Table
          :columns="scoreColumns"
          :data-source="scoreList"
          :loading="scoreLoading"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <Tag :color="record.status === 1 ? 'green' : 'default'">
                {{ COMMON_STATUS[record.status] }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <Space>
                <Button size="small" type="link" @click="openScoreEdit(record)">
                  编辑
                </Button>
                <Popconfirm
                  title="确定删除？"
                  @confirm="removeScoreDict(record)"
                >
                  <Button danger size="small" type="link">删除</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Tabs.TabPane>
    </Tabs>

    <Modal
      v-model:open="baseModalOpen"
      :title="baseEditing ? '编辑底薪' : '新增底薪'"
      @ok="submitBaseDict"
    >
      <Form layout="vertical">
        <Form.Item label="岗位" required>
          <Select
            v-model:value="baseForm.positionId"
            :options="positionOptions"
            class="w-full"
            show-search
            option-filter-prop="label"
          />
        </Form.Item>
        <Form.Item label="底薪" required>
          <InputNumber
            v-model:value="baseForm.baseSalary"
            :min="0"
            :precision="2"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="状态">
          <Select
            v-model:value="baseForm.status"
            :options="[
              { label: '启用', value: 1 },
              { label: '停用', value: 0 },
            ]"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="备注">
          <Input v-model:value="baseForm.remark" />
        </Form.Item>
      </Form>
    </Modal>

    <Modal
      v-model:open="scoreModalOpen"
      :title="scoreEditing ? '编辑评分奖金' : '新增评分奖金'"
      @ok="submitScoreDict"
    >
      <Form layout="vertical">
        <Form.Item label="等级" required>
          <Select
            v-model:value="scoreForm.grade"
            :disabled="!!scoreEditing"
            :options="[
              { label: '1 优', value: 1 },
              { label: '2 良', value: 2 },
              { label: '3 中', value: 3 },
              { label: '4 合格', value: 4 },
              { label: '5 差', value: 5 },
            ]"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="等级名称" required>
          <Input v-model:value="scoreForm.gradeLabel" />
        </Form.Item>
        <Form.Item label="奖金金额" required>
          <InputNumber
            v-model:value="scoreForm.bonusAmount"
            :min="0"
            :precision="2"
            class="w-full"
          />
        </Form.Item>
        <Form.Item label="状态">
          <Select
            v-model:value="scoreForm.status"
            :options="[
              { label: '启用', value: 1 },
              { label: '停用', value: 0 },
            ]"
            class="w-full"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Page>
</template>
