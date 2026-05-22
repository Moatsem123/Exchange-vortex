import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UsersRound,
  ShieldCheck,
  UserPlus,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Edit3,
  Trash2,
  RotateCcw,
  Power,
  KeyRound,
  Loader2,
  X,
  Check,
  Save,
  UserRound,
  Mail,
  Phone,
  Wallet,
  Settings,
  LockKeyhole,
  ChevronDown,
} from "lucide-react";

import Badge from "../shared/Badge";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import Pagination from "../shared/Pagination";
import ScrollReveal from "../shared/ScrollReveal";
import { useToast } from "../shared/Toast";
import { extractApiError, formatMoney, unwrapList } from "../shared/helpers";
import usersPermissionsService from "../services/usersPermissions";

const PER_PAGE = 8;

const ROLE_COLORS = {
  owner: "amber",
  admin: "rose",
  manager: "teal",
  accountant: "blue",
  cashier: "emerald",
  auditor: "violet",
  data_entry: "slate",
};

const MODULE_LABELS = {
  customer: "العملاء",
  transaction: "المعاملات",
  account: "الحسابات والصناديق",
  currency: "العملات",
  "exchange-rate": "أسعار الصرف",
  report: "التقارير",
  notification: "الإشعارات",
  archive: "الأرشيف",
  user: "المستخدمون",
  role: "الأدوار",
  permission: "الصلاحيات",
  setting: "الإعدادات",
  dashboard: "لوحة التحكم",
};

const ACTION_LABELS = {
  viewAny: "عرض الكل",
  view: "عرض",
  create: "إضافة",
  update: "تعديل",
  delete: "حذف",
  restore: "استعادة",
  forceDelete: "حذف نهائي",
  daily: "يومي",
  monthly: "شهري",
  export: "تصدير",
  manage: "إدارة",
  toggle: "تفعيل",
};

function extractData(res) {
  return res?.data ?? res ?? null;
}

function normalizeArray(res) {
  const data = extractData(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function getRoleName(user) {
  if (typeof user?.role === "string") return user.role;
  if (typeof user?.role?.name === "string") return user.role.name;
  if (Array.isArray(user?.roles) && user.roles[0]) return user.roles[0].name || user.roles[0];
  return "—";
}

function getRoleLabel(role) {
  return role?.label_ar || role?.display_name || role?.label || role?.name || "—";
}

function getPermissionName(permission) {
  return typeof permission === "string" ? permission : permission?.name || permission?.key || "";
}

function getPermissionLabel(permission) {
  if (typeof permission === "string") return permission;
  return permission?.label_ar || permission?.display_name || permission?.label || permission?.name || permission?.key || "—";
}

function getPermissionModule(permission) {
  const name = getPermissionName(permission);
  return permission?.group || permission?.module || name.split(".")[0] || "other";
}

function getPermissionAction(permission) {
  const name = getPermissionName(permission);
  const action = permission?.action || name.split(".").slice(1).join(".");
  return ACTION_LABELS[action] || action || "صلاحية";
}

function UsersPermissionsPage() {
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: PER_PAGE });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [openUserForm, setOpenUserForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const [activeRoleId, setActiveRoleId] = useState(null);
  const [openRoleForm, setOpenRoleForm] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(null);

  const activeRole = useMemo(
    () => roles.find((role) => String(role.id) === String(activeRoleId)) || roles[0] || null,
    [roles, activeRoleId]
  );

  const selectedRolePermissions = useMemo(() => {
    const list = activeRole?.permissions || [];
    return new Set(list.map(getPermissionName));
  }, [activeRole]);

  const groupedPermissions = useMemo(() => {
    const result = {};
    permissions.forEach((permission) => {
      const module = getPermissionModule(permission);
      if (!result[module]) result[module] = [];
      result[module].push(permission);
    });
    return result;
  }, [permissions]);

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.name, label: getRoleLabel(role) })),
    [roles]
  );

  const stats = useMemo(() => {
    const active = users.filter((u) => u.is_active !== false && !u.deleted_at).length;
    const admins = users.filter((u) => ["owner", "admin", "manager"].includes(getRoleName(u))).length;
    return {
      users: meta.total || users.length,
      roles: roles.length,
      active,
      admins,
    };
  }, [users, roles, meta.total]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersRes, rolesRes, permissionsRes] = await Promise.all([
        usersPermissionsService.users.list({
          page,
          per_page: PER_PAGE,
          with_trashed: false,
          ...(search && { search }),
          ...(roleFilter && { role: roleFilter }),
        }),
        usersPermissionsService.roles.list(),
        usersPermissionsService.permissions.list(),
      ]);

      const { items, meta: m } = unwrapList(usersRes);
      const normalizedRoles = normalizeArray(rolesRes);
      const normalizedPermissions = normalizeArray(permissionsRes);

      setUsers(items);
      setRoles(normalizedRoles);
      setPermissions(normalizedPermissions);
      setMeta({
        total: Number(m?.total ?? items.length),
        current_page: Number(m?.current_page ?? page),
        last_page: Number(m?.last_page ?? 1),
        per_page: Number(m?.per_page ?? PER_PAGE),
      });

      if (!activeRoleId && normalizedRoles[0]) setActiveRoleId(normalizedRoles[0].id);
    } catch (err) {
      setError(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, activeRoleId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  async function handleCreateUser(payload) {
    setBusy(true);
    try {
      await usersPermissionsService.users.create(payload);
      toast.success("تمت إضافة المستخدم بنجاح");
      setOpenUserForm(false);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateUser(payload) {
    if (!editUser) return;
    setBusy(true);
    try {
      await usersPermissionsService.users.update(editUser.id, payload);
      if (payload.role && payload.role !== getRoleName(editUser)) {
        await usersPermissionsService.users.changeRole(editUser.id, payload.role);
      }
      toast.success("تم تحديث المستخدم");
      setEditUser(null);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleUser(user) {
    setBusy(true);
    try {
      await usersPermissionsService.users.toggleActive(user.id);
      toast.success("تم تحديث حالة المستخدم");
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUser() {
    if (!confirmDeleteUser) return;
    setBusy(true);
    try {
      await usersPermissionsService.users.remove(confirmDeleteUser.id);
      toast.success("تم حذف المستخدم");
      setConfirmDeleteUser(null);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateRole(payload) {
    setBusy(true);
    try {
      await usersPermissionsService.roles.create(payload);
      toast.success("تم إنشاء الدور");
      setOpenRoleForm(false);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateRole(payload) {
    if (!editRole) return;
    setBusy(true);
    try {
      await usersPermissionsService.roles.update(editRole.id, { name: payload.name });
      await usersPermissionsService.roles.assignPermissions(editRole.id, payload.permissions || []);
      toast.success("تم تحديث الدور والصلاحيات");
      setEditRole(null);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRole() {
    if (!confirmDeleteRole) return;
    setBusy(true);
    try {
      await usersPermissionsService.roles.remove(confirmDeleteRole.id);
      toast.success("تم حذف الدور");
      setConfirmDeleteRole(null);
      setActiveRoleId(null);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleTogglePermission(permissionName) {
    if (!activeRole) return;
    setBusy(true);

    const current = new Set(selectedRolePermissions);
    if (current.has(permissionName)) current.delete(permissionName);
    else current.add(permissionName);

    try {
      await usersPermissionsService.roles.assignPermissions(activeRole.id, Array.from(current));
      toast.success("تم تحديث صلاحيات الدور");
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 text-right">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700">
            <UsersRound className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">المستخدمون والصلاحيات</h1>
            <p className="mt-1 text-xs font-bold text-slate-500 sm:text-sm">
              إدارة المستخدمين والأدوار وتحديد ما يمكن الوصول إليه داخل النظام
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOpenRoleForm(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ShieldCheck className="h-4 w-4" />
            إضافة دور
          </button>
          <button
            type="button"
            onClick={() => setOpenUserForm(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-black text-white shadow-sm transition hover:brightness-110"
            style={{ background: "hsl(179, 87%, 28%)" }}
          >
            <Plus className="h-4 w-4" />
            إضافة مستخدم
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmallStat title="إجمالي المستخدمين" value={stats.users} icon={UsersRound} color="emerald" note="كل حسابات الدخول" />
        <SmallStat title="الأدوار" value={stats.roles} icon={ShieldCheck} color="amber" note="تصنيفات الصلاحيات" />
        <SmallStat title="الموظفون النشطون" value={stats.active} icon={UserRound} color="blue" note="مسموح لهم بالدخول" />
        <SmallStat title="المدراء" value={stats.admins} icon={LockKeyhole} color="violet" note="صلاحيات إدارية" />
      </section>

      {error && !loading ? (
        <ErrorState title="تعذّر تحميل المستخدمين والصلاحيات" description={extractApiError(error)} onRetry={load} />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.08fr_1fr]">
          <ScrollReveal>
            <section className="ep-card-static overflow-visible">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-72">
                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو البريد..."
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-10 pl-4 text-right text-sm font-bold text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10"
                    />
                  </div>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="h-11 min-w-40 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none transition hover:bg-slate-50 focus:border-teal-400"
                  >
                    <option value="">كل الأدوار</option>
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>{role.label}</option>
                    ))}
                  </select>
                </div>

                <div className="text-right">
                  <h3 className="text-base font-black text-slate-900">قائمة المستخدمين</h3>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    {loading ? "جارٍ التحميل..." : `${meta.total ?? users.length} مستخدم`}
                  </p>
                </div>
              </div>

              {loading ? (
                <TableSkeleton />
              ) : users.length === 0 ? (
                <EmptyState icon={UsersRound} title="لا يوجد مستخدمون" description="لم يتم العثور على مستخدمين مطابقين للبحث" />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="ep-table min-w-[820px]">
                      <thead>
                        <tr>
                          <th className="text-right">المستخدم</th>
                          <th className="text-right">البريد الإلكتروني</th>
                          <th className="text-right">الدور</th>
                          <th className="text-right">الحالة</th>
                          <th className="text-right">الرصيد</th>
                          <th className="text-center">إجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <UserRow
                            key={user.id}
                            user={user}
                            onView={() => setSelectedUser(user)}
                            onEdit={() => setEditUser(user)}
                            onToggle={() => handleToggleUser(user)}
                            onDelete={() => setConfirmDeleteUser(user)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-slate-200">
                    <Pagination
                      current={meta.current_page || page}
                      last={meta.last_page || 1}
                      total={meta.total || users.length}
                      perPage={meta.per_page || PER_PAGE}
                      onChange={setPage}
                    />
                  </div>
                </>
              )}
            </section>
          </ScrollReveal>

          <ScrollReveal>
            <section className="ep-card-static overflow-visible">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {activeRole && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditRole(activeRole)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRole(activeRole)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <div className="text-right">
                    <h3 className="text-base font-black text-slate-900">الأدوار والصلاحيات</h3>
                    <p className="mt-1 text-[11px] font-bold text-slate-400">حدد ماذا يستطيع كل دور أن يشاهد أو ينفذ</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {roles.map((role) => {
                    const active = String(activeRole?.id) === String(role.id);
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setActiveRoleId(role.id)}
                        className={`rounded-xl border px-3 py-2 text-xs font-black transition ${
                          active
                            ? "border-teal-500 bg-teal-600 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {getRoleLabel(role)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!activeRole ? (
                <EmptyState icon={ShieldCheck} title="لا توجد أدوار" description="ابدأ بإنشاء دور جديد" />
              ) : (
                <div className="p-5">
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <Badge color={ROLE_COLORS[activeRole.name] || "teal"}>{getRoleLabel(activeRole)}</Badge>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{activeRole.name}</p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          {selectedRolePermissions.size} صلاحية مفعّلة
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                    {Object.entries(groupedPermissions).map(([module, list]) => (
                      <PermissionGroup
                        key={module}
                        moduleName={module}
                        permissions={list}
                        selected={selectedRolePermissions}
                        onToggle={handleTogglePermission}
                        busy={busy}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </ScrollReveal>
        </div>
      )}

      <AnimatePresence>
        {selectedUser && (
          <UserDetailsPanel user={selectedUser} roles={roles} onClose={() => setSelectedUser(null)} />
        )}
      </AnimatePresence>

      <Modal
        open={openUserForm}
        onClose={() => !busy && setOpenUserForm(false)}
        title="إضافة مستخدم"
        subtitle="أنشئ حساب دخول وحدد الدور المناسب"
        icon={UserPlus}
        size="md"
      >
        <UserForm roles={roles} loading={busy} onCancel={() => setOpenUserForm(false)} onSubmit={handleCreateUser} />
      </Modal>

      <Modal
        open={!!editUser}
        onClose={() => !busy && setEditUser(null)}
        title="تعديل مستخدم"
        subtitle={editUser?.email}
        icon={Edit3}
        size="md"
      >
        {editUser && (
          <UserForm
            initial={editUser}
            roles={roles}
            loading={busy}
            onCancel={() => setEditUser(null)}
            onSubmit={handleUpdateUser}
          />
        )}
      </Modal>

      <Modal
        open={openRoleForm}
        onClose={() => !busy && setOpenRoleForm(false)}
        title="إضافة دور"
        subtitle="حدد اسم الدور والصلاحيات الأساسية"
        icon={ShieldCheck}
        size="lg"
      >
        <RoleForm
          permissions={permissions}
          loading={busy}
          onCancel={() => setOpenRoleForm(false)}
          onSubmit={handleCreateRole}
        />
      </Modal>

      <Modal
        open={!!editRole}
        onClose={() => !busy && setEditRole(null)}
        title="تعديل الدور"
        subtitle={editRole?.name}
        icon={Settings}
        size="lg"
      >
        {editRole && (
          <RoleForm
            initial={editRole}
            permissions={permissions}
            loading={busy}
            onCancel={() => setEditRole(null)}
            onSubmit={handleUpdateRole}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteUser}
        onClose={() => !busy && setConfirmDeleteUser(null)}
        onConfirm={handleDeleteUser}
        title="حذف المستخدم"
        description={`سيتم حذف المستخدم "${confirmDeleteUser?.name || ""}" من النظام.`}
        confirmText="حذف"
        loading={busy}
        variant="danger"
      />

      <ConfirmDialog
        open={!!confirmDeleteRole}
        onClose={() => !busy && setConfirmDeleteRole(null)}
        onConfirm={handleDeleteRole}
        title="حذف الدور"
        description={`سيتم حذف الدور "${confirmDeleteRole?.name || ""}". تأكد أنه غير مرتبط بمستخدمين مهمين.`}
        confirmText="حذف"
        loading={busy}
        variant="danger"
      />
    </div>
  );
}

function SmallStat({ title, value, icon: Icon, color, note }) {
  const palette = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    violet: "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${palette[color] || palette.blue}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-slate-500">{title}</p>
          <p className="mt-3 font-mono text-3xl font-black text-slate-900">{Number(value || 0).toLocaleString()}</p>
          <p className="mt-2 text-[11px] font-bold text-slate-400">{note}</p>
        </div>
      </div>
    </motion.div>
  );
}

function UserRow({ user, onView, onEdit, onToggle, onDelete }) {
  const roleName = getRoleName(user);
  const isActive = user.is_active !== false && !user.deleted_at;

  return (
    <motion.tr initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="ep-row">
      <td>
        <div className="flex min-w-[220px] items-center gap-3 text-right" dir="rtl">
          <UserAvatar user={user} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-black text-slate-900">{user.name || "—"}</p>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{user.phone || "—"}</p>
          </div>
        </div>
      </td>
      <td className="font-mono text-xs text-slate-700" dir="ltr">{user.email || "—"}</td>
      <td><Badge color={ROLE_COLORS[roleName] || "teal"}>{roleName}</Badge></td>
      <td>{isActive ? <Badge color="emerald" dot>نشط</Badge> : <Badge color="rose" dot>غير نشط</Badge>}</td>
      <td className="font-mono text-xs font-black text-slate-700" dir="ltr">
        {formatMoney(user.initial_balance || user.vault_balance || 0)} USD
      </td>
      <td>
        <div className="flex items-center justify-center gap-1">
          <IconBtn icon={Eye} onClick={onView} color="teal" />
          <IconBtn icon={Edit3} onClick={onEdit} />
          <IconBtn icon={Power} onClick={onToggle} color={isActive ? "amber" : "emerald"} />
          <IconBtn icon={Trash2} onClick={onDelete} color="rose" />
        </div>
      </td>
    </motion.tr>
  );
}

function PermissionGroup({ moduleName, permissions, selected, onToggle, busy }) {
  const [open, setOpen] = useState(true);
  const enabled = permissions.filter((p) => selected.has(getPermissionName(p))).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-3 bg-slate-50/70 px-4 py-3 text-right transition hover:bg-slate-50"
      >
        <ChevronDown className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
        <div>
          <p className="text-sm font-black text-slate-900">{MODULE_LABELS[moduleName] || moduleName}</p>
          <p className="mt-0.5 text-[11px] font-bold text-slate-400">{enabled} من {permissions.length} صلاحية</p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="divide-y divide-slate-100 overflow-hidden"
          >
            {permissions.map((permission) => {
              const name = getPermissionName(permission);
              const active = selected.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  disabled={busy}
                  onClick={() => onToggle(name)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                    {active ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-800">{getPermissionAction(permission)}</p>
                    <p className="mt-0.5 text-[10px] font-mono text-slate-400" dir="ltr">{name}</p>
                  </div>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserForm({ initial, roles, loading, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    password: "",
    phone: initial?.phone || "",
    role: getRoleName(initial) === "—" ? roles[0]?.name || "" : getRoleName(initial),
    initial_balance: initial?.initial_balance || initial?.vault_balance || "",
    is_active: initial?.is_active !== false,
  });

  function submit(e) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      role: form.role,
      is_active: form.is_active,
    };

    if (!initial || form.password) payload.password = form.password;
    if (form.initial_balance !== "") payload.initial_balance = Number(form.initial_balance);
    if (!payload.phone) delete payload.phone;

    onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="space-y-4" dir="rtl">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الاسم">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ep-input" placeholder="اسم المستخدم" disabled={loading} />
        </Field>
        <Field label="البريد الإلكتروني">
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="ep-input" placeholder="user@example.com" dir="ltr" disabled={loading} />
        </Field>
        <Field label={initial ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور"}>
          <input required={!initial} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="ep-input" placeholder="********" dir="ltr" disabled={loading} />
        </Field>
        <Field label="رقم الهاتف">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="ep-input" placeholder="+970..." dir="ltr" disabled={loading} />
        </Field>
        <Field label="الدور">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="ep-input appearance-none" disabled={loading}>
            {roles.map((role) => <option key={role.id || role.name} value={role.name}>{getRoleLabel(role)}</option>)}
          </select>
        </Field>
        <Field label="رصيد الصندوق">
          <input type="number" step="0.01" value={form.initial_balance} onChange={(e) => setForm({ ...form, initial_balance: e.target.value })} className="ep-input" placeholder="0.00" dir="ltr" disabled={loading} />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-sm font-black text-slate-700">المستخدم نشط</span>
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} disabled={loading} />
      </label>

      <FormActions loading={loading} onCancel={onCancel} submitLabel={initial ? "حفظ التعديلات" : "حفظ المستخدم"} />
    </form>
  );
}

function RoleForm({ initial, permissions, loading, onCancel, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [selected, setSelected] = useState(new Set((initial?.permissions || []).map(getPermissionName)));

  function toggle(permissionName) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(permissionName)) next.delete(permissionName);
      else next.add(permissionName);
      return next;
    });
  }

  function submit(e) {
    e.preventDefault();
    onSubmit({ name: name.trim(), permissions: Array.from(selected) });
  }

  const grouped = useMemo(() => {
    const result = {};
    permissions.forEach((permission) => {
      const module = getPermissionModule(permission);
      if (!result[module]) result[module] = [];
      result[module].push(permission);
    });
    return result;
  }, [permissions]);

  return (
    <form onSubmit={submit} className="space-y-4" dir="rtl">
      <Field label="اسم الدور">
        <input required value={name} onChange={(e) => setName(e.target.value)} className="ep-input" placeholder="data_entry" dir="ltr" disabled={loading} />
      </Field>

      <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
        {Object.entries(grouped).map(([module, list]) => (
          <div key={module} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-right text-xs font-black text-slate-600">{MODULE_LABELS[module] || module}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {list.map((permission) => {
                const permissionName = getPermissionName(permission);
                const active = selected.has(permissionName);
                return (
                  <button
                    key={permissionName}
                    type="button"
                    onClick={() => toggle(permissionName)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold transition ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                  >
                    {active ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5" />}
                    <span>{getPermissionAction(permission)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <FormActions loading={loading} onCancel={onCancel} submitLabel={initial ? "تحديث الدور" : "حفظ الدور"} />
    </form>
  );
}

function UserDetailsPanel({ user, roles, onClose }) {
  const roleName = getRoleName(user);
  const role = roles.find((r) => r.name === roleName);
  const permissions = role?.permissions || user.permissions || [];

  return (
    <motion.div
      initial={{ x: -420 }}
      animate={{ x: 0 }}
      exit={{ x: -420 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white shadow-2xl"
      dir="rtl"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5">
        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-black text-slate-900">تفاصيل المستخدم</h2>
      </div>

      <div className="space-y-5 p-5">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-center">
          <UserAvatar user={user} size="lg" />
          <p className="mt-3 text-xl font-black text-slate-900">{user.name}</p>
          <p className="mt-1 font-mono text-xs text-slate-500" dir="ltr">{user.email}</p>
          <div className="mt-3 flex justify-center">
            <Badge color={ROLE_COLORS[roleName] || "teal"}>{roleName}</Badge>
          </div>
        </div>

        <InfoTile icon={Phone} label="الهاتف" value={user.phone || "—"} />
        <InfoTile icon={Wallet} label="رصيد الصندوق" value={`${formatMoney(user.initial_balance || user.vault_balance || 0)} USD`} />
        <InfoTile icon={Power} label="الحالة" value={user.is_active !== false ? "نشط" : "غير نشط"} />

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-black text-slate-900">صلاحيات الدور</h3>
          <div className="flex flex-wrap gap-2">
            {permissions.length === 0 ? (
              <span className="text-xs text-slate-400">لا توجد صلاحيات</span>
            ) : (
              permissions.map((permission) => (
                <span key={getPermissionName(permission)} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                  {getPermissionLabel(permission)}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function UserAvatar({ user, size = "md" }) {
  const name = user?.name || user?.email || "U";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const sizeClass = size === "lg" ? "mx-auto h-20 w-20 rounded-3xl text-xl" : "h-10 w-10 rounded-2xl text-xs";
  return (
    <div className={`relative flex shrink-0 items-center justify-center bg-gradient-to-br from-teal-500 to-teal-700 font-black text-white shadow-sm ${sizeClass}`}>
      {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full rounded-2xl object-cover" /> : initials}
      {user?.is_active !== false && <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />}
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, color = "slate", disabled }) {
  const palette = {
    slate: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    teal: "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
    rose: "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95 disabled:opacity-40 ${palette[color]}`}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-right">
        <p className="text-[11px] font-bold text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function FormActions({ loading, onCancel, submitLabel }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">إلغاء</button>
      <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:brightness-110 disabled:opacity-60" style={{ background: "hsl(179, 87%, 28%)" }}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {submitLabel}
      </button>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, index) => <div key={index} className="ep-skeleton h-14" />)}
    </div>
  );
}

export default UsersPermissionsPage;
