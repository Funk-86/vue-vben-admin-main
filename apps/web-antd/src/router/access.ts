import type {
  ComponentRecordType,
  GenerateMenuAndRoutesOptions,
  RouteRecordStringComponent,
} from '@vben/types';

import type { RouteRecordRaw } from 'vue-router';

import { generateAccessible } from '@vben/access';
import { preferences } from '@vben/preferences';
import { useAccessStore } from '@vben/stores';

import { BasicLayout, IFrameView } from '#/layouts';

const forbiddenComponent = () => import('#/views/_core/fallback/forbidden.vue');

/** 从 accessCodes 提取页面字典 path（perm_code 形如 page:/hr/task） */
function collectPagePaths(accessCodes: string[]): Set<string> {
  const paths = new Set<string>();
  for (const code of accessCodes || []) {
    if (code.startsWith('page:')) {
      paths.add(code.slice('page:'.length));
    }
  }
  return paths;
}

function filterRoutesByPageDict(
  routes: RouteRecordRaw[],
  pagePaths: Set<string>,
): RouteRecordRaw[] {
  if (!pagePaths.size) {
    return routes;
  }

  const filterOne = (route: RouteRecordRaw): null | RouteRecordRaw => {
    const children = (route.children || [])
      .map((c) => filterOne(c))
      .filter(Boolean) as RouteRecordRaw[];

    const path = route.path;
    const isPageLeaf = typeof path === 'string' && path.startsWith('/');
    const allowedLeaf = isPageLeaf && pagePaths.has(path);

    // 页面字典生效时，不再用写死的 meta.authority 挡菜单（接口仍有后端鉴权）
    const clearAuthority = (r: RouteRecordRaw): RouteRecordRaw => ({
      ...r,
      meta: r.meta ? { ...r.meta, authority: undefined } : r.meta,
    });

    if (children.length > 0) {
      return clearAuthority({ ...route, children });
    }
    if (allowedLeaf) {
      return clearAuthority({ ...route, children: undefined });
    }
    return null;
  };

  return routes.map((r) => filterOne(r)).filter(Boolean) as RouteRecordRaw[];
}

async function generateAccess(options: GenerateMenuAndRoutesOptions) {
  const pageMap: ComponentRecordType = import.meta.glob('../views/**/*.vue');

  const layoutMap: ComponentRecordType = {
    BasicLayout,
    IFrameView,
  };

  const accessStore = useAccessStore();
  const pagePaths = collectPagePaths(accessStore.accessCodes || []);
  const routes = filterRoutesByPageDict(
    (options.routes || []) as RouteRecordRaw[],
    pagePaths,
  );

  return await generateAccessible(preferences.app.accessMode, {
    ...options,
    routes: routes as RouteRecordStringComponent[],
    // 前端路由模式不请求后端菜单，避免无效 /menu/all 等待
    fetchMenuListAsync: async () => [],
    forbiddenComponent,
    layoutMap,
    pageMap,
  });
}

export { generateAccess };
