import type { TablePaginationConfig } from 'ant-design-vue/es/table';

/** Ant Design Table bodyCell 的 record 类型断言 */
export function asRow<T>(record: Record<string, unknown>): T {
  return record as T;
}

/** 统一 Table 分页 change 回调 */
export function onTablePageChange(
  pag: TablePaginationConfig,
  pagination: { current: number; pageSize: number },
  reload: () => void,
) {
  pagination.current = pag.current ?? 1;
  pagination.pageSize = pag.pageSize ?? 10;
  reload();
}

/** 从 Select change 事件解析 number */
export function asSelectNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}
