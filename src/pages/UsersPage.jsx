import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck, Plus, Edit3, Trash2, Power, UserRound, Search,
  Loader2, Briefcase, UsersRound, Filter, Check,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import usersService from "../services/users";
import { rolesService, permissionsService } from "../services/misc";
import { extractApiError, unwrapList, formatRelative } from "../shared/helpers";

function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 10 });
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [openAdd, setOpenAdd] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await usersService.list({
        page, per_page: 10,
        ...(search.trim() && { search: search.trim() }),
      });
      const { items, meta: m } = unwrapList(res);
      setUsers(items);
      if (m) setMeta((p) => ({ ...p, ...m }));
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const t = setTimeout(loadUsers, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [search, page]);

  useEffect(() => {
    rolesService.list().then((r) => {
      const list = unwrapList(r).items;
      setRoles(list);
      if (list[0]) setSelectedRole(list[0]);
    }).catch(() => setRoles([]));
    permissionsService.list().then((r) => setPermissions(unwrapList(r).items)).catch(() => setPermissions([]));
  }, []);

  async function handleCreate(p) {
    setBusy(true);
    try {
      await usersService.create(p);
      toast.success("تمت إضافة المستخدم");
      setOpenAdd(false);
      loadUsers();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  async function handleUpdate(id, p) {
    setBusy(true);
    try {
      await usersService.update(id, p);
      toast.success("تم تحديث المستخدم");
      setEditUser(null);
      loadUsers();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  async function handleToggle(u) {
    try {
      await usersService.toggleActive(u.id);
      toast.success("تم تحديث الحالة");
      loadUsers();
    } catch (err) { toast.error(extractApiError(err)); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await usersService.remove(confirmDelete.id);
      toast.success("تم حذف المستخدم");
      setConfirmDelete(null);
      loadUsers();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  const stats = useMemo(() => ({
    total: meta.total || users.length,
    active: users.filter((u) => u.is_active !== false && !u.deleted_at).length,
    roles: roles.length,
    admins: users.filter((u) => u.role === "admin" || u.is_admin).length,
  }), [users, roles, meta]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="المستخدمون والصلاحيات"
        subtitle="إدارة المستخدمين والأدوار والصلاحيات للتحكم في الوصول إلى النظام"
        icon={ShieldCheck}
        actions={
          <button type="button" onClick={() => setOpenAdd(true)} className="ep-btn ep-btn-primary">
            <Plus className="h-4 w-4" />
            إضافة مستخدم
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجمالي المستخدمين" value={stats.total} icon={UsersRound} color="emerald" />
        <StatCard title="المديرون" value={stats.admins} icon={ShieldCheck} color="violet" />
        <StatCard title="الموظفون النشطون" value={stats.active} icon={UserRound} color="blue" />
        <StatCard title="الأدوار" value={stats.roles} icon={Briefcase} color="amber" />
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="ep-card-static overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <button type="button" className="ep-btn ep-btn-ghost text-xs">
                <Filter className="h-3.5 w-3.5" />
                تصفية
              </button>
              <div className="relative flex-1 max-w-sm">
                <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="ابحث في المستخدمين..."
                  className="ep-input pr-9 h-10 text-xs"
                />
              </div>
              <h3 className="text-base font-black text-slate-900">قائمة المستخدمين</h3>
            </div>
          </div>

          {error && !loading ? (
            <ErrorState onRetry={loadUsers} />
          ) : loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ep-skeleton h-14" />)}
            </div>
          ) : users.length === 0 ? (
            <EmptyState title="لا يوجد مستخدمون" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="ep-table min-w-[700px]">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>البريد الإلكتروني</th>
                      <th>الحالة</th>
                      <th>آخر تسجيل دخول</th>
                      <th className="text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className="flex items-center justify-end gap-3">
                            <div className="text-right">
                              <p className="font-bold text-slate-900">{u.name}</p>
                              <p className="text-[11px] text-slate-400">{u.role_label || u.role || "—"}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white">
                              <UserRound className="h-5 w-5" />
                            </div>
                          </div>
                        </td>
                        <td><span dir="ltr" className="text-xs text-slate-700">{u.email || "—"}</span></td>
                        <td>
                          <Badge color={u.deleted_at ? "rose" : u.is_active === false ? "amber" : "emerald"} dot>
                            {u.deleted_at ? "محذوف" : u.is_active === false ? "غير نشط" : "نشط"}
                          </Badge>
                        </td>
                        <td className="text-xs text-slate-500">{formatRelative(u.last_login_at || u.updated_at)}</td>
                        <td>
                          <div className="flex items-center justify-center gap-1">
                            <IconBtn icon={Edit3} onClick={() => setEditUser(u)} title="تعديل" />
                            <IconBtn icon={Power} onClick={() => handleToggle(u)} title="تفعيل/تعطيل" color={u.is_active === false ? "emerald" : "amber"} />
                            <IconBtn icon={Trash2} onClick={() => setConfirmDelete(u)} title="حذف" color="rose" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200">
                <Pagination
                  current={meta.current_page || page}
                  last={meta.last_page || 1}
                  total={meta.total || users.length}
                  perPage={meta.per_page || 10}
                  onChange={setPage}
                />
              </div>
            </>
          )}
        </div>

        <div className="ep-card-static p-5">
          <h3 className="mb-4 text-right text-base font-black text-slate-900">الأدوار والصلاحيات</h3>

          <div className="mb-4 flex flex-wrap gap-2">
            {roles.length === 0 ? (
              <div className="text-xs text-slate-500">لم يتم تحميل الأدوار</div>
            ) : (
              roles.map((r) => (
                <button
                  key={r.id || r.name}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${selectedRole?.id === r.id ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                >
                  {r.label || r.name}
                </button>
              ))
            )}
          </div>

          {selectedRole && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="text-right">
                  <p className="font-black text-slate-900">{selectedRole.label || selectedRole.name}</p>
                  <p className="text-[11px] text-slate-500">{selectedRole.description || "—"}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>

              {permissions.length > 0 && <PermissionsTable permissions={permissions} role={selectedRole} />}
            </div>
          )}
        </div>
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="إضافة مستخدم جديد" size="md">
        <UserForm onSubmit={handleCreate} loading={busy} onCancel={() => setOpenAdd(false)} roles={roles} />
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="تعديل المستخدم" subtitle={editUser?.name} size="md">
        {editUser && (
          <UserForm
            initial={editUser}
            onSubmit={(p) => handleUpdate(editUser.id, p)}
            loading={busy}
            onCancel={() => setEditUser(null)}
            roles={roles}
            isEdit
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف المستخدم"
        description={`سيتم حذف المستخدم "${confirmDelete?.name}".`}
        confirmText="حذف"
        loading={busy}
        variant="danger"
      />
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title, color = "slate" }) {
  const p = {
    slate: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
    rose: "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
    amber: "border-amber-200 bg-amber-50 text-amber-600 hover:bg-amber-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };
  return (
    <button type="button" onClick={onClick} title={title} className={`flex h-9 w-9 items-center justify-center rounded-lg border transition active:scale-95 ${p[color]}`}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PermissionsTable({ permissions, role }) {
  const grouped = permissions.reduce((acc, p) => {
    const grp = p.group || p.module || "general";
    acc[grp] = acc[grp] || [];
    acc[grp].push(p);
    return acc;
  }, {});

  const rolePerms = new Set((role?.permissions || []).map((p) => p.name || p));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-right text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2 font-bold">القسم</th>
            <th className="py-2 text-center font-bold">عرض</th>
            <th className="py-2 text-center font-bold">إضافة</th>
            <th className="py-2 text-center font-bold">تعديل</th>
            <th className="py-2 text-center font-bold">حذف</th>
            <th className="py-2 text-center font-bold">موافقة</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([grp, list]) => {
            const has = (action) => list.some((p) => rolePerms.has(`${grp}.${action}`) || rolePerms.has(p.name));
            return (
              <tr key={grp} className="border-b border-slate-100">
                <td className="py-2 font-bold text-slate-700">{grp}</td>
                {["view", "create", "update", "delete", "approve"].map((a) => (
                  <td key={a} className="py-2 text-center">
                    {has(a) ? <Check className="mx-auto h-3.5 w-3.5 text-emerald-600" /> : <span className="text-slate-300">—</span>}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UserForm({ initial, onSubmit, loading, onCancel, roles, isEdit }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    role: initial?.role || roles?.[0]?.name || "user",
    password: "",
    password_confirmation: "",
    is_active: initial?.is_active ?? true,
  });

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form };
    if (isEdit && !payload.password) {
      delete payload.password;
      delete payload.password_confirmation;
    }
    onSubmit(payload);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الاسم *">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ep-input" />
        </Field>
        <Field label="البريد الإلكتروني *">
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="ep-input" dir="ltr" />
        </Field>
        <Field label="الدور">
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="ep-input appearance-none">
            {roles.length === 0 && (
              <>
                <option value="admin">مدير</option>
                <option value="user">موظف</option>
              </>
            )}
            {roles.map((r) => (
              <option key={r.id || r.name} value={r.name}>{r.label || r.name}</option>
            ))}
          </select>
        </Field>
        <label className="flex items-end gap-2 pb-1">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-teal-600" />
          <span className="text-xs font-bold text-slate-700">حساب نشط</span>
        </label>
        <Field label={isEdit ? "كلمة المرور (اتركه فارغًا للإبقاء)" : "كلمة المرور *"}>
          <input type="password" required={!isEdit} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="ep-input" />
        </Field>
        <Field label="تأكيد كلمة المرور">
          <input type="password" required={!isEdit && !!form.password} value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} className="ep-input" />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">إلغاء</button>
        <button type="submit" disabled={loading} className="ep-btn ep-btn-primary">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "حفظ التعديلات" : "إضافة المستخدم"}
        </button>
      </div>
    </form>
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

export default UsersPage;