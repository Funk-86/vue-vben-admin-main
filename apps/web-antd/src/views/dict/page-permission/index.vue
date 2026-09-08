<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Tabs } from 'ant-design-vue';

import PageRouteManager from '../components/PageRouteManager.vue';
import RolePermissionEditor from '../components/RolePermissionEditor.vue';

const activeTab = ref('routes');
const roleEditorRef = ref<InstanceType<typeof RolePermissionEditor> | null>(
  null,
);

function onRoutesChanged() {
  roleEditorRef.value?.reload?.();
}
</script>

<template>
  <Page title="页面字典" description="维护侧栏路由路径，并为各角色配置可见页面">
    <Tabs v-model:active-key="activeTab">
      <Tabs.TabPane key="routes" tab="路由路径">
        <PageRouteManager @changed="onRoutesChanged" />
      </Tabs.TabPane>
      <Tabs.TabPane key="roles" tab="角色可见性">
        <RolePermissionEditor ref="roleEditorRef" :perm-type="1" />
      </Tabs.TabPane>
    </Tabs>
  </Page>
</template>
