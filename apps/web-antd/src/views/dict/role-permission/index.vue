<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import RolePermissionEditor from '../components/RolePermissionEditor.vue';
</script>

<template>
  <Page
    title="用户权限字典"
    description="为 employee / management / hr / admin 勾选业务能力（任务下发、审批、薪资等）"
  >
    <RolePermissionEditor :perm-type="2" />
  </Page>
</template>
