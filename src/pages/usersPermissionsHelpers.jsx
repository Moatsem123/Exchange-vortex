export const ROLE_COLORS = {
  owner: "amber",
  admin: "rose",
  manager: "teal",
  accountant: "blue",
  cashier: "emerald",
  auditor: "violet",
  data_entry: "slate",
};

export const MODULE_LABELS = {
  customers: "العملاء",
  customer: "العملاء",
  transactions: "العمليات المالية",
  transaction: "العمليات المالية",
  vaults: "الصناديق",
  vault: "الصناديق",
  currencies: "العملات وأسعار الصرف",
  currency: "العملات وأسعار الصرف",
  exchange_rate: "أسعار الصرف",
  reports: "التقارير",
  report: "التقارير",
  notifications: "الإشعارات",
  notification: "الإشعارات",
  archive: "الأرشيف",
  users: "المستخدمون",
  user: "المستخدمون",
  roles: "الأدوار",
  role: "الأدوار",
  permissions: "الصلاحيات",
  permission: "الصلاحيات",
  settings: "الإعدادات",
  dashboard: "لوحة التحكم",
};

export const ACTION_LABELS = {
  viewAny: "عرض الكل",
  view: "عرض",
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  restore: "استعادة",
  forceDelete: "حذف نهائي",
  export: "تصدير",
  manage: "إدارة",
  daily: "يومي",
  monthly: "شهري",
  viewAll: "عرض الكل",
  viewBalance: "عرض الرصيد",
  viewStatement: "كشف الحساب",
  setVaultBalance: "تعديل رصيد الصندوق",
  read: "تعليم كمقروء",
};

export function unwrapData(res) {
  return res?.data ?? res ?? null;
}

export function normalizeArray(res) {
  const data = unwrapData(res);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

export function normalizePermissionsResponse(res) {
  const data = unwrapData(res);

  if (!Array.isArray(data)) return [];

  return data.flatMap((group) => {
    if (Array.isArray(group?.permissions)) {
      return group.permissions
        .filter((permission) => permission?.name)
        .map((permission) => ({
          ...permission,
          group: permission.group || group.group,
          group_label: permission.group_label || group.group_label,
        }));
    }

    if (group?.name) return [group];

    return [];
  });
}

export function permissionKey(permission) {
  if (typeof permission === "string") return permission;

  return String(permission?.name || "");
}

export function getRoleName(user) {
  if (typeof user?.role === "string") return user.role;

  if (typeof user?.role?.name === "string") return user.role.name;

  if (Array.isArray(user?.roles) && user.roles[0]) {
    if (typeof user.roles[0] === "string") return user.roles[0];

    return user.roles[0].name || "—";
  }

  return "—";
}

export function getRoleLabel(role) {
  return role?.label_ar || role?.display_name || role?.label || role?.name || "—";
}

export function getPermissionName(permission) {
  return permissionKey(permission);
}

export function getPermissionLabel(permission) {
  if (typeof permission === "string") return permission;

  return (
    permission?.label_ar ||
    permission?.display_name ||
    permission?.label ||
    permission?.name ||
    "—"
  );
}

export function getPermissionModule(permission) {
  const name = getPermissionName(permission);

  return permission?.group || permission?.module || name.split(".")[0] || "other";
}

export function getPermissionModuleLabel(permission) {
  return (
    permission?.group_label ||
    MODULE_LABELS[getPermissionModule(permission)] ||
    getPermissionModule(permission)
  );
}

export function getPermissionActionKey(permission) {
  const name = getPermissionName(permission);

  return permission?.action || name.split(".").slice(1).join(".") || "";
}

export function getPermissionAction(permission) {
  const action = getPermissionActionKey(permission);

  return ACTION_LABELS[action] || action || "صلاحية";
}

export function groupPermissions(permissions = []) {
  return permissions.reduce((result, permission) => {
    const group = getPermissionModule(permission);

    if (!result[group]) result[group] = [];

    result[group].push(permission);

    return result;
  }, {});
}