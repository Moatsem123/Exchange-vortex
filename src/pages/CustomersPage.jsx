import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UsersRound, Plus, Search, Filter, Eye, Edit3, Trash2,
  Phone, Mail, MapPin, UserRoundCheck, Building2, X, Loader2, RotateCcw,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import AmountText from "../shared/AmountText";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import customersService from "../services/customers";
import { extractApiError, formatRelative, unwrapList, getTransactionTypeMeta } from "../shared/helpers";

function CustomersPage() {
  const [searchParams] = useSearchParams();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [withTrashed, setWithTrashed] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState(searchParams.get("id") || null);
  const [selectedData, setSelectedData] = useState(null);

  const [openAdd, setOpenAdd] = useState(searchParams.get("action") === "add");
  const [editCustomer, setEditCustomer] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await customersService.list({
        page, per_page: 10,
        ...(search.trim() && { search: search.trim() }),
        with_trashed: withTrashed,
      });
      const { items: list, meta: m } = unwrapList(res);
      setItems(list);
      if (m) setMeta((p) => ({ ...p, ...m }));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [search, withTrashed, page]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedData(null);
      return;
    }
    async function loadDetail() {
      try {
        const [c, b, txns] = await Promise.all([
          customersService.show(selectedId).catch(() => null),
          customersService.balance(selectedId).catch(() => null),
          customersService.transactions(selectedId, { per_page: 5 }).catch(() => null),
        ]);
        setSelectedData({
          customer: c?.data || c,
          balance: b?.data || b,
          transactions: unwrapList(txns).items,
        });
      } catch {}
    }
    loadDetail();
  }, [selectedId]);

  async function handleCreate(payload) {
    setBusy(true);
    try {
      await customersService.create(payload);
      toast.success("تمت إضافة العميل بنجاح");
      setOpenAdd(false);
      load();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  async function handleUpdate(id, payload) {
    setBusy(true);
    try {
      await customersService.update(id, payload);
      toast.success("تم تحديث بيانات العميل");
      setEditCustomer(null);
      load();
      if (selectedId === id) setSelectedId(String(id));
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await customersService.remove(confirmDelete.id);
      toast.success("تم حذف العميل");
      setConfirmDelete(null);
      if (selectedId === String(confirmDelete.id)) setSelectedId(null);
      load();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  async function handleRestore(c) {
    setBusy(true);
    try {
      await customersService.restore(c.id);
      toast.success("تمت استعادة العميل");
      setConfirmRestore(null);
      load();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="العملاء"
        subtitle="إدارة ومتابعة جميع عملاء شركة الصرافة"
        icon={UsersRound}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWithTrashed((p) => !p)}
              className={`ep-btn ${withTrashed ? "ep-btn-primary" : "ep-btn-ghost"}`}
            >
              <Filter className="h-3.5 w-3.5" />
              {withTrashed ? "بما فيهم المحذوفون" : "النشطون فقط"}
            </button>
            <button type="button" onClick={() => setOpenAdd(true)} className="ep-btn ep-btn-primary">
              <Plus className="h-4 w-4" />
              إضافة عميل
            </button>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="إجمالي العملاء" value={meta.total || items.length} icon={UsersRound} color="violet" />
        <StatCard title="العملاء النشطون" value={items.filter((c) => !c.deleted_at).length} icon={UserRoundCheck} color="emerald" />
        <StatCard title="هذه الصفحة" value={items.length} icon={UsersRound} color="blue" />
        <StatCard title="الصفحة الحالية" value={meta.current_page || 1} suffix={` / ${meta.last_page || 1}`} icon={Building2} color="teal" />
      </section>

      <div className="ep-card-static p-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="ابحث بالاسم، الهاتف، البريد الإلكتروني..."
            className="ep-input pr-11"
          />
        </div>
      </div>

      <div className="ep-card-static overflow-hidden">
        {error && !loading ? (
          <ErrorState title="تعذّر تحميل العملاء" onRetry={load} />
        ) : loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ep-skeleton h-14" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="لا يوجد عملاء" description="ابدأ بإضافة عميل جديد" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="ep-table min-w-[1000px]">
                <thead>
                  <tr>
                    <th>العميل</th>
                    <th>الهاتف</th>
                    <th>التصنيف</th>
                    <th>البلد</th>
                    <th>الحالة</th>
                    <th>تاريخ الإنشاء</th>
                    <th className="text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(String(c.id))}
                      className={`cursor-pointer ${selectedId === String(c.id) ? "bg-teal-50/60" : ""}`}
                    >
                      <td>
                        <div className="flex items-center justify-end gap-3">
                          <div className="text-right">
                            <p className="font-bold text-slate-900">{c.name}</p>
                            {c.note && <p className="text-[11px] text-slate-400 truncate max-w-[200px]">{c.note}</p>}
                          </div>
                          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.category === "company" ? "bg-violet-50 text-violet-600 border-violet-200" : "bg-teal-50 text-teal-600 border-teal-200"} border`}>
                            {c.category === "company" ? <Building2 className="h-5 w-5" /> : <UserRoundCheck className="h-5 w-5" />}
                          </div>
                        </div>
                      </td>
                      <td><span dir="ltr" className="text-xs font-mono text-slate-700">{c.phone || "—"}</span></td>
                      <td>
                        <Badge color={c.category === "company" ? "violet" : "teal"}>
                          {c.category === "company" ? "شركة" : "فرد"}
                        </Badge>
                      </td>
                      <td className="text-xs text-slate-600">{c.country || "—"}</td>
                      <td>
                        {c.deleted_at ? <Badge color="rose" dot>محذوف</Badge> : <Badge color="emerald" dot>نشط</Badge>}
                      </td>
                      <td className="text-xs text-slate-500">{formatRelative(c.created_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <IconBtn icon={Eye} onClick={() => setSelectedId(String(c.id))} title="عرض" color="teal" />
                          {!c.deleted_at && (
                            <>
                              <IconBtn icon={Edit3} onClick={() => setEditCustomer(c)} title="تعديل" />
                              <IconBtn icon={Trash2} onClick={() => setConfirmDelete(c)} title="حذف" color="rose" />
                            </>
                          )}
                          {c.deleted_at && (
                            <IconBtn icon={RotateCcw} onClick={() => setConfirmRestore(c)} title="استعادة" color="emerald" />
                          )}
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
                total={meta.total || items.length}
                perPage={meta.per_page || 10}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {selectedData && <CustomerDetailPanel data={selectedData} onClose={() => setSelectedId(null)} />}

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="إضافة عميل جديد" subtitle="أدخل بيانات العميل الأساسية" size="md">
        <CustomerForm onSubmit={handleCreate} loading={busy} onCancel={() => setOpenAdd(false)} />
      </Modal>

      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="تعديل العميل" subtitle={editCustomer?.name} size="md">
        {editCustomer && (
          <CustomerForm
            initial={editCustomer}
            onSubmit={(p) => handleUpdate(editCustomer.id, p)}
            loading={busy}
            onCancel={() => setEditCustomer(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDelete}
        title="حذف العميل"
        description={`سيتم نقل العميل "${confirmDelete?.name}" إلى الأرشيف.`}
        confirmText="حذف"
        loading={busy}
        variant="danger"
      />

      <ConfirmDialog
        open={!!confirmRestore}
        onClose={() => setConfirmRestore(null)}
        onConfirm={() => handleRestore(confirmRestore)}
        title="استعادة العميل"
        description={`هل تريد استعادة العميل "${confirmRestore?.name}"؟`}
        confirmText="استعادة"
        loading={busy}
        variant="success"
      />
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title, color = "slate" }) {
  const palette = {
    slate: "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    teal: "border-teal-200 bg-teal-50 text-teal-700 hover:bg-teal-100",
    rose: "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };
  return (
    <button type="button" title={title} onClick={onClick} className={`flex h-9 w-9 items-center justify-center rounded-lg border transition active:scale-95 ${palette[color]}`}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

function CustomerDetailPanel({ data, onClose }) {
  const c = data.customer || {};
  const balance = data.balance || {};
  const txns = data.transactions || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="ep-card-static overflow-hidden"
    >
      <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
        <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 text-right">
          <div>
            <h3 className="text-lg font-black text-slate-900">{c.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">تفاصيل العميل</p>
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${c.category === "company" ? "border-violet-200 bg-violet-50 text-violet-600" : "border-teal-200 bg-teal-50 text-teal-600"}`}>
            {c.category === "company" ? <Building2 className="h-6 w-6" /> : <UserRoundCheck className="h-6 w-6" />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-right">
            <p className="text-xs font-bold text-slate-500 mb-3">معلومات الاتصال</p>
            <div className="space-y-2.5">
              <InfoRow icon={Phone} label="الهاتف" value={c.phone} />
              <InfoRow icon={Mail} label="البريد" value={c.email} />
              <InfoRow icon={MapPin} label="البلد" value={c.country} />
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 text-right">
            <p className="text-xs font-bold text-emerald-700 mb-3">الرصيد الحالي</p>
            <div className="space-y-2">
              {Array.isArray(balance?.balances) && balance.balances.length > 0 ? (
                balance.balances.map((b, i) => (
                  <div key={i} className="flex items-center justify-between rounded-xl bg-white p-2.5">
                    <span className="text-xs font-bold text-slate-500">{b.currency || b.currency_code}</span>
                    <AmountText value={b.amount} currency={b.currency || b.currency_code} sign={undefined} withCurrency={false} />
                  </div>
                ))
              ) : balance?.amount !== undefined ? (
                <AmountText value={balance.amount} currency={balance.currency || balance.currency_code} className="text-xl" />
              ) : (
                <p className="text-xs text-slate-500">لا توجد أرصدة</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-bold text-slate-500 text-right">آخر المعاملات</p>
          {txns.length === 0 ? (
            <EmptyState title="لا توجد معاملات" description="لا توجد حركات سابقة لهذا العميل" />
          ) : (
            <div className="space-y-2">
              {txns.map((t) => {
                const type = getTransactionTypeMeta(t.type);
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                    <AmountText
                      value={t.amount}
                      currency={t.currency_code || t.currency}
                      sign={["send", "withdraw"].includes(t.type) ? "-" : "+"}
                    />
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <Badge color={type.color}>{type.label}</Badge>
                        <p className="mt-1 text-[10px] text-slate-500">{formatRelative(t.created_at)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span dir="ltr" className="text-xs font-bold text-slate-900">{value || "—"}</span>
    </div>
  );
}

function CustomerForm({ initial, onSubmit, loading, onCancel }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    phone: initial?.phone || "",
    category: initial?.category || "regular",
    country: initial?.country || "",
    note: initial?.note || "",
  });

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الاسم *">
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="اسم العميل" className="ep-input" />
        </Field>
        <Field label="رقم الهاتف">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+970..." className="ep-input" dir="ltr" />
        </Field>
        <Field label="التصنيف">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="ep-input appearance-none">
            <option value="regular">فرد</option>
            <option value="company">شركة</option>
            <option value="vip">VIP</option>
          </select>
        </Field>
        <Field label="البلد">
          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="البلد" className="ep-input" />
        </Field>
      </div>
      <Field label="ملاحظات">
        <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={3} placeholder="ملاحظات اختيارية..." className="ep-input py-3 resize-none" style={{ height: "auto" }} />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">إلغاء</button>
        <button type="submit" disabled={loading} className="ep-btn ep-btn-primary">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {initial ? "حفظ التعديلات" : "حفظ العميل"}
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

export default CustomersPage;