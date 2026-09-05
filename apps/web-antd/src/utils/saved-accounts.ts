/** 本地记住的多账户（仅当前站点 hostname 隔离） */
export interface SavedAccount {
  label: string;
  password: string;
  roleCode: string;
  username: string;
}

const STORAGE_KEY = `HR_SAVED_ACCOUNTS_${location.hostname}`;

export function loadSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedAccounts(accounts: SavedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

/** 按 username + roleCode 去重保存 */
export function upsertSavedAccount(account: SavedAccount) {
  const list = loadSavedAccounts().filter(
    (a) =>
      !(a.username === account.username && a.roleCode === account.roleCode),
  );
  list.unshift(account);
  persistSavedAccounts(list.slice(0, 8));
}

export function removeSavedAccount(username: string, roleCode: string) {
  persistSavedAccounts(
    loadSavedAccounts().filter(
      (a) => !(a.username === username && a.roleCode === roleCode),
    ),
  );
}
