import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UsersRound,
  UserPlus,
  Search,
  Eye,
  Edit3,
  Trash2,
  RotateCcw,
  Power,
  Loader2,
  X,
  Save,
  Phone,
  Wallet,
  Mail,
  RefreshCw,
  Banknote,
  Filter,
  UserCheck,
  UserX,
  ShieldAlert,
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
import {
  ROLE_COLORS,
  normalizeArray,
  getRoleName,
  getRoleLabel,
  getPermissionName,
  getPermissionLabel,
} from "./usersPermissionsHelpers";

const PER_PAGE = 10;

function isOwnerUser(user) {
  return (
    user?.is_owner === true ||
    user?.email === "owner@exchange.com" ||
    getRoleName(user) === "owner" ||
    user?.roles?.some?.((role) => role?.name === "owner" || role === "owner")
  );
}

export default function UsersPage() {
  const toast = useToast();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [openUserForm, setOpenUserForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [vaultUser, setVaultUser] = useState(null);

  const roleOptions = useMemo(
    () => roles.map((role) => ({ value: role.name, label: getRoleLabel(role) })),
    [roles]
  );

  const stats = useMemo(() => {
    const active = users.filter((user) => user.is_active !== false && !user.deleted_at).length;
    const inactive = users.filter((user) => user.is_active === false && !user.deleted_at).length;
    const deleted = users.filter((user) => !!user.deleted_at).length;
    const admins = users.filter((user) =>
      ["owner", "admin", "manager"].includes(getRoleName(user))
    ).length;

    return {
      total: meta.total || users.length,
      active,
      inactive,
      deleted,
      admins,
    };
  }, [users, meta.total]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersRes, rolesRes] = await Promise.all([
        usersPermissionsService.users.list({
          page,
          per_page: PER_PAGE,
          with_trashed: false,
          ...(search && { search }),
          ...(roleFilter && { role: roleFilter }),
        }),
        usersPermissionsService.roles.list(),
      ]);

      const { items, meta: responseMeta } = unwrapList(usersRes);

      setUsers(items);
      setRoles(normalizeArray(rolesRes));
      setMeta({
        total: Number(responseMeta?.total ?? items.length),
        current_page: Number(responseMeta?.current_page ?? page),
        last_page: Number(responseMeta?.last_page ?? 1),
        per_page: Number(responseMeta?.per_page ?? PER_PAGE),
      });
    } catch (err) {
      setError(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  async function handleCreate(payload) {
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

  async function handleUpdate(payload) {
    if (!editUser) return;

    setBusy(true);

    try {
      const updatePayload = { ...payload };
      const nextRole = updatePayload.role;
      delete updatePayload.role;

      await usersPermissionsService.users.update(editUser.id, updatePayload);

      if (nextRole && nextRole !== getRoleName(editUser)) {
        await usersPermissionsService.users.changeRole(editUser.id, nextRole);
      }

      toast.success("تم تحديث بيانات المستخدم");
      setEditUser(null);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(user) {
    setBusy(true);

    try {
      await usersPermissionsService.users.toggleActive(user.id);
      toast.success(user.is_active !== false ? "تم تعطيل المستخدم" : "تم تفعيل المستخدم");
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirmDeleteUser) return;

    if (isOwnerUser(confirmDeleteUser)) {
      toast.error("لا يمكن حذف حساب المالك");
      setConfirmDeleteUser(null);
      return;
    }

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

  async function handleRestore(user) {
    setBusy(true);

    try {
      await usersPermissionsService.users.restore(user.id);
      toast.success("تمت استعادة المستخدم بنجاح");
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSetVault(id, data) {
    setBusy(true);

    try {
      await usersPermissionsService.users.setVaultBalance(id, data);
      toast.success("تم تحديث رصيد الصندوق");
      setVaultUser(null);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex min-w-0 overflow-hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700 shadow-sm">
            <UsersRound className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900">إدارة المستخدمين</h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              إضافة وتعديل وتعيين أدوار ومتابعة حسابات الدخول
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpenUserForm(true)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-md transition hover:brightness-110 active:scale-95"
          style={{ background: "hsl(179,87%,28%)" }}
        >
          <UserPlus className="h-4 w-4" />
          إضافة مستخدم
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="إجمالي المستخدمين"
          value={stats.total}
          icon={UsersRound}
          color="teal"
          note="كل الحسابات"
        />

        <StatCard
          label="نشطون"
          value={stats.active}
          icon={UserCheck}
          color="emerald"
          note="مسموح بالدخول"
        />

        <StatCard
          label="غير نشطون"
          value={stats.inactive}
          icon={UserX}
          color="rose"
          note="موقوف مؤقتاً"
        />

        <StatCard
          label="إداريون"
          value={stats.admins}
          icon={ShieldAlert}
          color="amber"
          note="صلاحيات موسّعة"
        />
      </div>

      <ScrollReveal>
        <div className="overflow-hidden min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3.5">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث بالاسم أو البريد..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-4 text-sm font-medium text-slate-700 outline-none transition focus:border-teal-400 focus:ring-4 focus:ring-teal-400/10"
                />
              </div>

              <div className="relative">
                <Filter className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="h-10 min-w-[150px] appearance-none rounded-xl border border-slate-200 bg-white pr-9 pl-4 text-xs font-bold text-slate-700 outline-none transition focus:border-teal-400"
                >
                  <option value="">كل الأدوار</option>
                  {roleOptions.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">
                {loading ? "جارٍ التحميل..." : `${meta.total ?? users.length} مستخدم`}
              </span>

              <button
                type="button"
                onClick={load}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {error && !loading ? (
            <ErrorState
              title="تعذّر تحميل المستخدمين"
              description={extractApiError(error)}
              onRetry={load}
            />
          ) : loading ? (
            <TableSkeleton />
          ) : users.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title="لا يوجد مستخدمون"
              description="لم يتم العثور على مستخدمين مطابقين للبحث"
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/40 text-right">
                      {["المستخدم", "البريد الإلكتروني", "الدور", "الحالة", "رصيد الصندوق", "إجراءات"].map(
                        (header, index) => (
                          <th
                            key={header}
                            className={`px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400 ${
                              index === 5 ? "text-center" : ""
                            }`}
                          >
                            {header}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100/80">
                    <AnimatePresence initial={false}>
                      {users.map((user, index) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          index={index}
                          busy={busy}
                          onView={() => setSelectedUser(user)}
                          onEdit={() => setEditUser(user)}
                          onVault={() => setVaultUser(user)}
                          onToggle={() => handleToggle(user)}
                          onRestore={() => handleRestore(user)}
                          onDelete={() => setConfirmDeleteUser(user)}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100">
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
        </div>
      </ScrollReveal>

      <AnimatePresence>
        {selectedUser && (
          <UserDetailsPanel
            user={selectedUser}
            roles={roles}
            onClose={() => setSelectedUser(null)}
          />
        )}
      </AnimatePresence>

      <Modal
        open={openUserForm}
        onClose={() => !busy && setOpenUserForm(false)}
        title="إضافة مستخدم جديد"
        subtitle="أنشئ حساب وحدد الدور المناسب"
        icon={UserPlus}
        size="md"
      >
        <UserForm
          roles={roles}
          loading={busy}
          onCancel={() => setOpenUserForm(false)}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal
        open={!!editUser}
        onClose={() => !busy && setEditUser(null)}
        title="تعديل بيانات المستخدم"
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
            onSubmit={handleUpdate}
          />
        )}
      </Modal>

      <Modal
        open={!!vaultUser}
        onClose={() => !busy && setVaultUser(null)}
        title="تعديل رصيد الصندوق"
        subtitle={vaultUser?.name}
        icon={Banknote}
        size="sm"
      >
        {vaultUser && (
          <VaultForm
            user={vaultUser}
            loading={busy}
            onCancel={() => setVaultUser(null)}
            onSubmit={(data) => handleSetVault(vaultUser.id, data)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteUser}
        onClose={() => !busy && setConfirmDeleteUser(null)}
        onConfirm={handleDelete}
        title="حذف المستخدم"
        description={`سيتم حذف المستخدم "${confirmDeleteUser?.name || ""}" من النظام. يمكن استعادته لاحقاً.`}
        confirmText="حذف"
        loading={busy}
        variant="danger"
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, note }) {
  const cls = {
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 8px 24px -6px rgba(0,0,0,.08)" }}
      className="rounded-2xl min-w-0 overflow-hidden border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${cls[color]}`}>
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 text-right">
          <p className="truncate text-xs font-bold text-slate-500">{label}</p>
          <p className="mt-2 font-mono text-3xl font-black text-slate-900">
            {Number(value || 0).toLocaleString()}
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-400">{note}</p>
        </div>
      </div>
    </motion.div>
  );
}

function UserRow({ user, index, busy, onView, onEdit, onVault, onToggle, onRestore, onDelete }) {
  const roleName = getRoleName(user);
  const isDeleted = !!user.deleted_at;
  const isActive = user.is_active !== false && !isDeleted;
  const balance = user.initial_balance ?? user.vault?.balance_usd ?? user.vault?.initial_balance ?? 0;
  const isOwner = isOwnerUser(user);

  return (
    <motion.tr
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`group transition-colors hover:bg-slate-50/60 ${isDeleted ? "opacity-55" : ""}`}
    >
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900">{user.name || "—"}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">{user.phone || "—"}</p>
          </div>
        </div>
      </td>

      <td className="px-5 py-4">
        <span className="font-mono text-xs text-slate-600" dir="ltr">
          {user.email || "—"}
        </span>
      </td>

      <td className="px-5 py-4">
        <Badge color={ROLE_COLORS[roleName] || "teal"}>
          {user.roles?.[0]?.label || roleName}
        </Badge>
      </td>

      <td className="px-5 py-4">
        {isDeleted ? (
          <Badge color="slate" dot>
            محذوف
          </Badge>
        ) : isActive ? (
          <Badge color="emerald" dot>
            نشط
          </Badge>
        ) : (
          <Badge color="rose" dot>
            موقوف
          </Badge>
        )}
      </td>

      <td className="px-5 py-4">
        <span className="font-mono text-xs font-semibold text-slate-700" dir="ltr">
          {formatMoney(balance)} USD
        </span>
      </td>

      <td className="px-5 py-4">
        <div className="flex items-center justify-center gap-1">
          <ActionBtn icon={Eye} onClick={onView} color="teal" title="عرض التفاصيل" disabled={busy} />

          {isDeleted ? (
            <ActionBtn icon={RotateCcw} onClick={onRestore} color="emerald" title="استعادة" disabled={busy} />
          ) : (
            <>
              <ActionBtn icon={Edit3} onClick={onEdit} color="slate" title="تعديل" disabled={busy} />
              <ActionBtn icon={Banknote} onClick={onVault} color="amber" title="رصيد الصندوق" disabled={busy} />
              <ActionBtn
                icon={Power}
                onClick={onToggle}
                color={isActive ? "rose" : "emerald"}
                title={isActive ? "تعطيل" : "تفعيل"}
                disabled={busy}
              />
            </>
          )}

          {!isOwner && (
            <ActionBtn icon={Trash2} onClick={onDelete} color="rose" title="حذف" disabled={busy} />
          )}
        </div>
      </td>
    </motion.tr>
  );
}

function UserDetailsPanel({ user, roles, onClose }) {
  const roleName = getRoleName(user);
  const roleObj = roles.find((role) => role.name === roleName);
  const perms = roleObj?.permissions || user.permissions || [];
  const isActive = user.is_active !== false && !user.deleted_at;
  const balance = user.initial_balance ?? user.vault?.balance_usd ?? user.vault?.initial_balance ?? 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
      />

      <motion.aside
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -400, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-sm flex-col border-l border-slate-200 bg-white shadow-2xl"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>

          <h2 className="text-base font-black text-slate-900">تفاصيل المستخدم</h2>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div className="rounded-2xl min-w-0 overflow-hidden border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 text-center">
            <UserAvatar user={user} size="lg" />
            <p className="mt-4 text-xl font-black text-slate-900">{user.name || "—"}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-500" dir="ltr">
              {user.email || "—"}
            </p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Badge color={ROLE_COLORS[roleName] || "teal"}>
                {user.roles?.[0]?.label || roleName}
              </Badge>

              {isActive ? (
                <Badge color="emerald" dot>
                  نشط
                </Badge>
              ) : (
                <Badge color="rose" dot>
                  غير نشط
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <InfoTile icon={Phone} label="رقم الهاتف" value={user.phone || "—"} />
            <InfoTile icon={Mail} label="البريد" value={user.email || "—"} mono />
            <InfoTile icon={Wallet} label="رصيد الصندوق" value={`${formatMoney(balance)} USD`} mono />
          </div>

          <div className="rounded-2xl min-w-0 overflow-hidden border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-slate-800">
              صلاحيات الدور
              {perms.length > 0 && (
                <span className="mr-2 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-700">
                  {perms.length}
                </span>
              )}
            </h3>

            {perms.length === 0 ? (
              <p className="text-xs text-slate-400">لا توجد صلاحيات مُسندة لهذا الدور</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {perms.map((permission) => (
                  <span
                    key={getPermissionName(permission)}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600"
                  >
                    {getPermissionLabel(permission)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

function UserForm({ initial, roles, loading, onCancel, onSubmit }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    password: "",
    phone: initial?.phone || "",
    role: getRoleName(initial) === "—" ? roles[0]?.name || "" : getRoleName(initial),
    initial_balance:
      initial?.initial_balance ??
      initial?.vault?.balance_usd ??
      initial?.vault?.initial_balance ??
      "",
    is_active: initial?.is_active !== false,
  });

  const set = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.value,
    }));
  };

  const setCheck = (key) => (event) => {
    setForm((current) => ({
      ...current,
      [key]: event.target.checked,
    }));
  };

  function submit(event) {
    event.preventDefault();

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      is_active: form.is_active,
    };

    if (form.phone.trim()) payload.phone = form.phone.trim();
    if (!initial || form.password) payload.password = form.password;
    if (form.initial_balance !== "") payload.initial_balance = Number(form.initial_balance);

    onSubmit(payload);
  }

  return (
    <form onSubmit={submit} className="space-y-4" dir="rtl">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الاسم الكامل">
          <input
            required
            value={form.name}
            onChange={set("name")}
            className="ep-input"
            placeholder="اسم المستخدم"
            disabled={loading}
          />
        </Field>

        <Field label="البريد الإلكتروني">
          <input
            required
            type="email"
            value={form.email}
            onChange={set("email")}
            className="ep-input"
            placeholder="user@example.com"
            dir="ltr"
            disabled={loading}
          />
        </Field>

        <Field label={initial ? "كلمة المرور الجديدة (اختياري)" : "كلمة المرور *"}>
          <input
            required={!initial}
            type="password"
            value={form.password}
            onChange={set("password")}
            className="ep-input"
            placeholder="••••••••"
            dir="ltr"
            disabled={loading}
          />
        </Field>

        <Field label="رقم الهاتف">
          <input
            value={form.phone}
            onChange={set("phone")}
            className="ep-input"
            placeholder="+970..."
            dir="ltr"
            disabled={loading}
          />
        </Field>

        <Field label="الدور الوظيفي">
          <select value={form.role} onChange={set("role")} className="ep-input" disabled={loading}>
            {roles.map((role) => (
              <option key={role.id ?? role.name} value={role.name}>
                {getRoleLabel(role)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="رصيد الصندوق الابتدائي (USD)">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.initial_balance}
            onChange={set("initial_balance")}
            className="ep-input"
            placeholder="0.00"
            dir="ltr"
            disabled={loading}
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition hover:bg-slate-50">
        <span className="text-sm font-bold text-slate-700">تفعيل الحساب</span>

        <input
          type="checkbox"
          checked={form.is_active}
          onChange={setCheck("is_active")}
          disabled={loading}
          className="h-4 w-4 accent-teal-600"
        />
      </label>

      <FormActions
        loading={loading}
        onCancel={onCancel}
        submitLabel={initial ? "حفظ التعديلات" : "إضافة المستخدم"}
      />
    </form>
  );
}

function VaultForm({ user, loading, onCancel, onSubmit }) {
  const [amount, setAmount] = useState(
    user.initial_balance ?? user.vault?.balance_usd ?? user.vault?.initial_balance ?? ""
  );

  function submit(event) {
    event.preventDefault();
    onSubmit({ initial_balance: Number(amount) });
  }

  return (
    <form onSubmit={submit} className="space-y-4" dir="rtl">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs font-bold text-amber-800">
          الرصيد الحالي:{" "}
          <span className="font-mono" dir="ltr">
            {formatMoney(user.initial_balance ?? user.vault?.balance_usd ?? 0)} USD
          </span>
        </p>
      </div>

      <Field label="الرصيد الجديد">
        <input
          required
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="ep-input"
          dir="ltr"
          disabled={loading}
        />
      </Field>

      <FormActions loading={loading} onCancel={onCancel} submitLabel="تحديث الرصيد" />
    </form>
  );
}

function UserAvatar({ user, size = "sm" }) {
  const initials = String(user?.name || user?.email || "?")
    .trim()
    .slice(0, 2)
    .toUpperCase();

  const cls =
    size === "lg"
      ? "mx-auto h-20 w-20 text-2xl"
      : "h-10 w-10 text-sm";

  return (
    <div
      className={`${cls} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 font-black text-white shadow-sm`}
    >
      {initials}
    </div>
  );
}

function InfoTile({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 text-right">
        <p className="text-[11px] font-bold text-slate-400">{label}</p>
        <p className={`mt-0.5 truncate text-sm font-black text-slate-700 ${mono ? "font-mono" : ""}`} dir={mono ? "ltr" : "rtl"}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function FormActions({ loading, onCancel, submitLabel }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="ep-btn ep-btn-ghost"
      >
        إلغاء
      </button>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60 active:scale-95"
        style={{ background: "hsl(179,87%,28%)" }}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {submitLabel}
      </button>
    </div>
  );
}

function ActionBtn({ icon: Icon, onClick, color, title, disabled }) {
  const cls = {
    teal: "text-teal-600 hover:bg-teal-50",
    slate: "text-slate-600 hover:bg-slate-100",
    amber: "text-amber-600 hover:bg-amber-50",
    emerald: "text-emerald-600 hover:bg-emerald-50",
    rose: "text-rose-600 hover:bg-rose-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
        cls[color] || cls.slate
      }`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="ep-skeleton h-14 rounded-xl" />
      ))}
    </div>
  );
}