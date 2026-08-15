<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import RolePermissionEditor from '../components/RolePermissionEditor.vue';
</script>

<template>
  <Page
    title="页面字典"
    description="为 employee / management / hr / admin 配置侧栏可见页面"
  >
    <RolePermissionEditor :perm-type="1" />
  </Page>
</template>
