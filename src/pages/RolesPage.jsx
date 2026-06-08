import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  Save,
  ChevronDown,
  Settings,
  RefreshCw,
  KeyRound,
  LayoutGrid,
} from "lucide-react";

import Badge from "../shared/Badge";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import ScrollReveal from "../shared/ScrollReveal";
import { useToast } from "../shared/Toast";
import { extractApiError } from "../shared/helpers";
import usersPermissionsService from "../services/usersPermissions";
import {
  ROLE_COLORS,
  MODULE_LABELS,
  normalizeArray,
  normalizePermissionsResponse,
  permissionKey,
  getRoleLabel,
  getPermissionAction,
  getPermissionModule,
  getPermissionModuleLabel,
  groupPermissions,
} from "./usersPermissionsHelpers";

function isOwnerRole(role) {
  return role?.name === "owner" || role?.key === "owner" || role?.slug === "owner";
}

export default function RolesPage() {
  const toast = useToast();

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [activeRoleId, setActiveRoleId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [openRoleForm, setOpenRoleForm] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [confirmDeleteRole, setConfirmDeleteRole] = useState(null);

  const activeRole = useMemo(
    () => roles.find((role) => String(role.id) === String(activeRoleId)) || roles[0] || null,
    [roles, activeRoleId]
  );

  const selectedPerms = useMemo(() => {
    const list = activeRole?.permissions || [];
    return new Set(list.map(permissionKey).filter(Boolean));
  }, [activeRole]);

  const groupedPermissions = useMemo(
    () => groupPermissions(permissions),
    [permissions]
  );

  const activeRoleIsOwner = isOwnerRole(activeRole);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [rolesRes, permsRes] = await Promise.all([
        usersPermissionsService.roles.list(),
        usersPermissionsService.permissions.list(),
      ]);

      const normalizedRoles = normalizeArray(rolesRes);
      const normalizedPermissions = normalizePermissionsResponse(permsRes);

      setRoles(normalizedRoles);
      setPermissions(normalizedPermissions);

      if (!activeRoleId && normalizedRoles[0]) {
        setActiveRoleId(normalizedRoles[0].id);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeRoleId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(payload) {
    setBusy(true);

    try {
      await usersPermissionsService.roles.create(payload);
      toast.success("تم إنشاء الدور بنجاح");
      setOpenRoleForm(false);
      await load();
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdate(payload) {
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

  async function handleDelete() {
    if (!confirmDeleteRole) return;

    if (isOwnerRole(confirmDeleteRole)) {
      toast.error("لا يمكن حذف دور المالك");
      setConfirmDeleteRole(null);
      return;
    }

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

  async function handleTogglePermission(permission) {
    if (!activeRole || busy) return;

    const key = permissionKey(permission);
    if (!key) return;

    setBusy(true);

    const next = new Set(selectedPerms);

    if (next.has(key)) next.delete(key);
    else next.add(key);

    try {
      await usersPermissionsService.roles.assignPermissions(
        activeRole.id,
        Array.from(next).filter(Boolean)
      );
      toast.success("تم تحديث صلاحيات الدور");
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
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-violet-100 text-violet-700 shadow-sm">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900">الأدوار والصلاحيات</h1>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              إنشاء الأدوار وتحديد ما يمكن لكل دور تنفيذه داخل النظام
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setOpenRoleForm(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold text-white shadow-md transition hover:brightness-110 active:scale-95"
            style={{ background: "hsl(179,87%,28%)" }}
          >
            <Plus className="h-4 w-4" />
            إضافة دور
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي الأدوار" value={roles.length} icon={ShieldCheck} color="violet" note="الأدوار المعرّفة" />
        <StatCard label="إجمالي الصلاحيات" value={permissions.length} icon={KeyRound} color="teal" note="كل صلاحيات النظام" />
        <StatCard label="صلاحيات الدور المحدد" value={selectedPerms.size} icon={LayoutGrid} color="amber" note={activeRole ? getRoleLabel(activeRole) : "—"} />
      </div>

      {error && !loading ? (
        <ErrorState title="تعذّر تحميل البيانات" description={extractApiError(error)} onRetry={load} />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_1fr]">
          <ScrollReveal>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3.5">
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-black text-slate-600">
                  {roles.length}
                </span>
                <h2 className="text-sm font-black text-slate-900">قائمة الأدوار</h2>
              </div>

              {loading ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="ep-skeleton h-[68px] rounded-xl" />
                  ))}
                </div>
              ) : roles.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="لا توجد أدوار" description="ابدأ بإنشاء دور جديد" />
              ) : (
                <nav className="space-y-1 p-3">
                  {roles.map((role) => {
                    const isActive = String(activeRole?.id) === String(role.id);
                    const permCount = (role.permissions || []).length;

                    return (
                      <motion.button
                        key={role.id}
                        type="button"
                        whileHover={{ x: isActive ? 0 : -2 }}
                        onClick={() => setActiveRoleId(role.id)}
                        className={`group w-full rounded-xl border px-4 py-3 text-right transition-all ${
                          isActive
                            ? "border-teal-400/60 bg-teal-600 text-white shadow-md shadow-teal-600/20"
                            : "border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-black transition ${isActive ? "bg-white/25 text-white" : "bg-slate-100 text-slate-500"}`}>
                            {permCount}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">{getRoleLabel(role)}</p>
                            <p className={`mt-0.5 truncate font-mono text-[10px] ${isActive ? "text-teal-200" : "text-slate-400"}`}>
                              {role.name}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </nav>
              )}
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {!activeRole ? (
                <EmptyState icon={ShieldCheck} title="اختر دوراً" description="اختر دوراً من القائمة لعرض وتعديل صلاحياته" />
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditRole(activeRole)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        تعديل الدور
                      </button>

                      {!activeRoleIsOwner && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRole(activeRole)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 active:scale-95"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          حذف
                        </button>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge color={ROLE_COLORS[activeRole.name] || "teal"}>
                          {getRoleLabel(activeRole)}
                        </Badge>
                        <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-600">
                          {activeRole.name}
                        </code>
                      </div>

                      <p className="mt-1.5 text-xs font-medium text-slate-400">
                        <span className="font-bold text-teal-600">{selectedPerms.size}</span>
                        {" "}من{" "}
                        <span className="font-bold text-slate-600">{permissions.length}</span>
                        {" "}صلاحية مُفعّلة
                      </p>
                    </div>
                  </div>

                  <div className="max-h-[680px] space-y-3 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-teal-700/25 hover:[&::-webkit-scrollbar-thumb]:bg-teal-700/45">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="ep-skeleton h-24 rounded-xl" />
                      ))
                    ) : (
                      Object.entries(groupedPermissions).map(([mod, list]) => (
                        <PermissionGroup
                          key={mod}
                          moduleName={mod}
                          permissions={list}
                          selected={selectedPerms}
                          onToggle={handleTogglePermission}
                          busy={busy}
                        />
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </ScrollReveal>
        </div>
      )}

      <Modal
        open={openRoleForm}
        onClose={() => !busy && setOpenRoleForm(false)}
        title="إضافة دور جديد"
        subtitle="حدد اسم الدور وصلاحياته الابتدائية"
        icon={ShieldCheck}
        size="lg"
      >
        <RoleForm
          permissions={permissions}
          loading={busy}
          onCancel={() => setOpenRoleForm(false)}
          onSubmit={handleCreate}
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
            onSubmit={handleUpdate}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteRole}
        onClose={() => !busy && setConfirmDeleteRole(null)}
        onConfirm={handleDelete}
        title="حذف الدور"
        description={`سيتم حذف الدور "${confirmDeleteRole?.name || ""}". تأكد أنه غير مرتبط بمستخدمين نشطين.`}
        confirmText="حذف"
        loading={busy}
        variant="danger"
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, note }) {
  const cls = {
    violet: "border-violet-200 bg-violet-50 text-violet-700",
    teal: "border-teal-200 bg-teal-50 text-teal-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: "0 8px 24px -6px rgba(0,0,0,.08)" }}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
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
          <p className="mt-1 truncate text-[11px] font-medium text-slate-400">{note}</p>
        </div>
      </div>
    </motion.div>
  );
}

function PermissionGroup({ moduleName, permissions, selected, onToggle, busy }) {
  const [open, setOpen] = useState(true);

  const enabledCount = permissions.filter((p) => selected.has(permissionKey(p))).length;
  const allEnabled = enabledCount === permissions.length && permissions.length > 0;
  const noneEnabled = enabledCount === 0;

  const dotColor = allEnabled ? "bg-emerald-500" : noneEnabled ? "bg-slate-300" : "bg-amber-400";

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 bg-slate-50/70 px-4 py-3 text-right transition hover:bg-slate-100"
      >
        <div className="flex items-center gap-2">
          <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.15 }}>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </motion.span>
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        </div>

        <div>
          <p className="text-sm font-black text-slate-800">
            {permissions[0]?.group_label || MODULE_LABELS[moduleName] || moduleName}
          </p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">
            {enabledCount} / {permissions.length} مُفعّل
          </p>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-3 bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-3">
              {permissions.map((permission) => {
                const key = permissionKey(permission);
                const active = selected.has(key);

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={busy}
                    onClick={() => onToggle(permission)}
                    className={`group flex min-h-[74px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-right transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                      active
                        ? "border-emerald-200 bg-emerald-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40"
                    }`}
                  >
                    <div className={`relative h-7 w-14 shrink-0 rounded-full transition-all duration-200 ${active ? "bg-emerald-500" : "bg-slate-300"}`}>
                      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${active ? "right-1" : "right-8"}`} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-800">
                        {permission.label || getPermissionAction(permission)}
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] text-slate-400" dir="ltr">
                        {key}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RoleForm({ initial, permissions, loading, onCancel, onSubmit }) {
  const [name, setName] = useState(initial?.name || "");
  const [selected, setSelected] = useState(
    new Set((initial?.permissions || []).map(permissionKey).filter(Boolean))
  );

  const grouped = useMemo(
    () => groupPermissions(permissions),
    [permissions]
  );

  function togglePerm(permission) {
    const key = permissionKey(permission);
    if (!key) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(permissions.map(permissionKey).filter(Boolean)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  function submit(e) {
    e.preventDefault();

    onSubmit({
      name: name.trim(),
      permissions: Array.from(selected).filter(Boolean),
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4" dir="rtl">
      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-600">
          اسم الدور <span className="font-mono text-slate-400">(بالإنجليزية)</span>
        </span>

        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="ep-input"
          placeholder="data_entry, auditor, ..."
          dir="ltr"
          disabled={loading}
        />
      </label>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button type="button" onClick={clearAll} className="text-[11px] font-bold text-rose-500 transition hover:text-rose-700">
              إلغاء الكل
            </button>

            <button type="button" onClick={selectAll} className="text-[11px] font-bold text-teal-600 transition hover:text-teal-800">
              تحديد الكل
            </button>
          </div>

          <span className="text-xs font-black text-slate-600">
            الصلاحيات
            <span className="mr-1 rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-700">
              {selected.size}
            </span>
          </span>
        </div>

        <div className="max-h-[55vh] space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-3 sm:max-h-[430px] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-teal-700/25 hover:[&::-webkit-scrollbar-thumb]:bg-teal-700/45">
          {Object.entries(grouped).map(([mod, list]) => {
            const enabledCount = list.filter((p) => selected.has(permissionKey(p))).length;
            const allOn = enabledCount === list.length && list.length > 0;
            const someOn = enabledCount > 0 && !allOn;

            return (
              <div key={mod} className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full transition ${allOn ? "bg-emerald-500" : someOn ? "bg-amber-400" : "bg-slate-300"}`} />
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                      {enabledCount}/{list.length}
                    </span>
                  </div>

                  <p className="text-xs font-black text-slate-700">
                    {list[0]?.group_label || MODULE_LABELS[mod] || mod}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((permission) => {
                    const key = permissionKey(permission);
                    const active = selected.has(key);

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={loading}
                        onClick={() => togglePerm(permission)}
                        className={`group flex min-h-[58px] items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-right transition-all duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${
                          active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:bg-teal-50/40"
                        }`}
                      >
                        <div className={`relative h-6 w-11 shrink-0 rounded-full transition-all duration-200 ${active ? "bg-emerald-500" : "bg-slate-300"}`}>
                          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-200 ${active ? "right-1" : "right-6"}`} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-xs font-black">
                            {permission.label || getPermissionAction(permission)}
                          </p>
                          <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400" dir="ltr">
                            {key}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">
          إلغاء
        </button>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60 active:scale-95"
          style={{ background: "hsl(179,87%,28%)" }}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {initial ? "تحديث الدور" : "حفظ الدور"}
        </button>
      </div>
    </form>
  );
}