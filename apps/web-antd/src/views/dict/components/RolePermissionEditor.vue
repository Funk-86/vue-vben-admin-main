<script lang="ts" setup>
import type { PermissionNodeVO, RoleVO } from '#/api/dict/rbac';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Checkbox,
  Space,
  Spin,
  message,
} from 'ant-design-vue';

import {
  getPermissionTree,
  getRbacRoles,
  getRolePermissionIds,
  saveRolePermissions,
} from '#/api/dict/rbac';

const props = defineProps<{
  /** 1=页面字典 2=用户权限字典 */
  permType: 1 | 2;
}>();

const ROLE_HINT: Record<string, string> = {
  DEPT_MANAGER: 'management',
  EMPLOYEE: 'employee',
  HR_ADMIN: 'hr',
  SUPER_ADMIN: 'admin',
};

interface PermGroup {
  children: PermissionNodeVO[];
  id: number;
  name: string;
  path?: string;
}

const loading = ref(false);
const saving = ref(false);
const roles = ref<RoleVO[]>([]);
const activeRole = ref('');
const groups = ref<PermGroup[]>([]);
/** groupId -> 已勾选的子权限 id 列表；无子节点的组用 [groupId] 表示自身 */
const groupChecked = reactive<Record<number, number[]>>({});

const leafIds = computed(() => {
  const ids: number[] = [];
  for (const g of groups.value) {
    if (!g.children.length) {
      ids.push(g.id);
    } else {
      for (const c of g.children) ids.push(c.id);
    }
  }
  return ids;
});

const leafCheckedCount = computed(() => {
  let n = 0;
  for (const g of groups.value) {
    const selected = groupChecked[g.id] || [];
    if (!g.children.length) {
      if (selected.includes(g.id)) n += 1;
    } else {
      n += selected.length;
    }
  }
  return n;
});

function childOptions(g: PermGroup) {
  return g.children.map((c) => ({
    label: c.path ? `${c.permName}（${c.path}）` : c.permName,
    value: c.id,
  }));
}

function groupCheckState(g: PermGroup): boolean | 'indeterminate' {
  const selected = groupChecked[g.id] || [];
  if (!g.children.length) {
    return selected.includes(g.id);
  }
  const n = selected.length;
  if (n === 0) return false;
  if (n === g.children.length) return true;
  return 'indeterminate';
}

function onGroupToggle(g: PermGroup, checked: boolean) {
  if (!g.children.length) {
    groupChecked[g.id] = checked ? [g.id] : [];
    return;
  }
  groupChecked[g.id] = checked ? g.children.map((c) => c.id) : [];
}

function collectPermissionIds(): number[] {
  const ids = new Set<number>();
  for (const g of groups.value) {
    const selected = groupChecked[g.id] || [];
    for (const id of selected) ids.add(Number(id));
    if (g.children.length) {
      if (selected.length === g.children.length && selected.length > 0) {
        ids.add(g.id);
      }
    } else if (selected.includes(g.id)) {
      ids.add(g.id);
    }
  }
  return [...ids];
}

function toGroups(tree: PermissionNodeVO[]): PermGroup[] {
  return (tree || []).map((n) => ({
    id: Number(n.id),
    name: n.permName,
    path: n.path,
    children: (n.children || []).map((c) => ({
      ...c,
      id: Number(c.id),
    })),
  }));
}

function applyCheckedIds(ids: Array<number | string>) {
  const set = new Set(ids.map(Number).filter((n) => !Number.isNaN(n)));
  for (const g of groups.value) {
    if (!g.children.length) {
      groupChecked[g.id] = set.has(g.id) ? [g.id] : [];
      continue;
    }
    // 父节点在库中仅表示“分组”，以子节点勾选为准；父全选时再勾上全部子
    const fromKids = g.children.map((c) => c.id).filter((id) => set.has(id));
    if (set.has(g.id) && fromKids.length === 0) {
      // 兼容：库里只有父、没有子（历史脏数据）→ 视为全选子项
      groupChecked[g.id] = g.children.map((c) => c.id);
    } else {
      groupChecked[g.id] = fromKids;
    }
  }
}

async function loadRoles() {
  roles.value = await getRbacRoles();
}

async function loadTree() {
  const tree = await getPermissionTree(props.permType);
  groups.value = toGroups(tree || []);
  for (const g of groups.value) {
    if (groupChecked[g.id] === undefined) {
      groupChecked[g.id] = [];
    }
  }
}

async function loadChecked(roleCode: string) {
  const ids = (await getRolePermissionIds(roleCode, props.permType)) || [];
  applyCheckedIds(ids);
}

async function selectRole(roleCode: string) {
  activeRole.value = roleCode;
  loading.value = true;
  try {
    if (!groups.value.length) await loadTree();
    await loadChecked(roleCode);
  } finally {
    loading.value = false;
  }
}

async function reload() {
  loading.value = true;
  try {
    await loadRoles();
    await loadTree();
    const emp = roles.value.find((r) => r.roleCode === 'EMPLOYEE');
    const first = emp?.roleCode || roles.value[0]?.roleCode || '';
    if (first) {
      activeRole.value = first;
      await loadChecked(first);
    }
  } finally {
    loading.value = false;
  }
}

async function onSave() {
  if (!activeRole.value) return;
  saving.value = true;
  try {
    const permissionIds = collectPermissionIds();
    const leafCount = leafIds.value.filter((id) =>
      permissionIds.includes(id),
    ).length;

    if (leafCount === 0) {
      message.warning('未勾选任何具体项，请勾选后再保存');
      return;
    }

    await saveRolePermissions(activeRole.value, {
      permType: props.permType,
      permissionIds,
    });

    const raw = (await getRolePermissionIds(activeRole.value, props.permType)) || [];
    const rawSet = new Set(raw.map(Number));
    const missing = leafIds.value.filter(
      (id) => permissionIds.includes(id) && !rawSet.has(id),
    );
    applyCheckedIds(raw);

    if (missing.length) {
      message.error(
        `保存异常：未落库 ${missing.length} 项（id: ${missing.slice(0, 8).join(',')}），请把该提示发给开发`,
      );
      return;
    }
    message.success(
      `已保存（叶子 ${leafCount} 个 / 共提交 ${permissionIds.length} 个 id）。该角色用户需重新登录后生效`,
    );
  } finally {
    saving.value = false;
  }
}

function checkAll() {
  for (const g of groups.value) {
    onGroupToggle(g, true);
  }
}

function checkNone() {
  for (const g of groups.value) {
    onGroupToggle(g, false);
  }
}

onMounted(reload);
</script>

<template>
  <Spin :spinning="loading">
    <div class="mb-4 flex flex-wrap gap-2">
      <Button
        v-for="r in roles"
        :key="r.roleCode"
        :type="activeRole === r.roleCode ? 'primary' : 'default'"
        @click="selectRole(r.roleCode)"
      >
        {{ r.roleName }}
        <span class="ml-1 text-xs opacity-70">
          ({{ ROLE_HINT[r.roleCode] || r.roleCode }})
        </span>
      </Button>
    </div>

    <Card size="small">
      <p class="mb-3 text-sm text-gray-500">
        当前角色：
        <b>{{ roles.find((r) => r.roleCode === activeRole)?.roleName || '-' }}</b>
        —
        <span class="text-xs text-gray-400">勾选版 v3</span>
        ；
        <b class="text-orange-500">保存后需重新登录</b>
        才更新侧栏/能力。
      </p>
      <Space class="mb-4">
        <Button size="small" @click="checkAll">全选</Button>
        <Button size="small" @click="checkNone">清空</Button>
        <span class="text-xs text-gray-400">
          已选叶子 {{ leafCheckedCount }} / {{ leafIds.length }}
        </span>
      </Space>

      <div v-if="groups.length" class="space-y-4">
        <div
          v-for="g in groups"
          :key="g.id"
          class="rounded border border-gray-100 px-3 py-2 dark:border-gray-800"
        >
          <div class="mb-2 font-medium">
            <Checkbox
              :checked="groupCheckState(g) === true"
              :indeterminate="groupCheckState(g) === 'indeterminate'"
              @update:checked="(v) => onGroupToggle(g, v)"
            >
              {{ g.name }}
              <span class="ml-1 text-xs font-normal text-gray-400">
                #{{ g.id }}
                <template v-if="g.path">（{{ g.path }}）</template>
              </span>
            </Checkbox>
          </div>
          <div v-if="g.children.length" class="ml-6">
            <Checkbox.Group
              v-model:value="groupChecked[g.id]"
              class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
              :options="childOptions(g)"
            />
          </div>
        </div>
      </div>
      <div v-else class="text-gray-400">暂无权限项，请先执行数据库迁移 V16</div>

      <div class="mt-4">
        <Button type="primary" :loading="saving" @click="onSave">
          保存勾选
        </Button>
      </div>
    </Card>
  </Spin>
</template>
