import { useEffect, useState } from "react";
import { Coins, Plus, Edit3, Trash2, TrendingUp, Search, Loader2, Save } from "lucide-react";
import PageHeader from "../shared/PageHeader";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Badge from "../shared/Badge";
import Modal from "../shared/Modal";
import ConfirmDialog from "../shared/ConfirmDialog";
import { useToast } from "../shared/Toast";
import currenciesService from "../services/currencies";
import { extractApiError, unwrapList, formatDate, formatMoney } from "../shared/helpers";

function CurrenciesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [editCur, setEditCur] = useState(null);
  const [confirmDisable, setConfirmDisable] = useState(null);
  const [rateModal, setRateModal] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await currenciesService.list({ ...(search.trim() && { search: search.trim() }) });
      setItems(unwrapList(res).items);
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const t = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [search]);

  async function handleCreate(p) {
    setBusy(true);
    try {
      await currenciesService.create(p);
      toast.success("تمت إضافة العملة");
      setOpenAdd(false);
      load();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  async function handleUpdate(code, p) {
    setBusy(true);
    try {
      await currenciesService.update(code, p);
      toast.success("تم تحديث العملة");
      setEditCur(null);
      load();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  async function handleDisable() {
    if (!confirmDisable) return;
    setBusy(true);
    try {
      await currenciesService.disable(confirmDisable.code);
      toast.success("تم تعطيل العملة");
      setConfirmDisable(null);
      load();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  async function handleUpdateRate(code, data) {
    setBusy(true);
    try {
      await currenciesService.updateRate(code, data);
      toast.success("تم تحديث سعر الصرف");
      setRateModal(null);
      load();
    } catch (err) { toast.error(extractApiError(err)); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="العملات"
        subtitle="إدارة العملات المدعومة في النظام وأسعارها مقابل الدولار"
        icon={Coins}
        actions={
          <button type="button" onClick={() => setOpenAdd(true)} className="ep-btn ep-btn-primary">
            <Plus className="h-4 w-4" />
            إضافة عملة
          </button>
        }
      />

      <div className="ep-card-static p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث عن عملة..." className="ep-input pr-11" />
        </div>
      </div>

      <div className="ep-card-static overflow-hidden">
        {error && !loading ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ep-skeleton h-14" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="لا توجد عملات" description="ابدأ بإضافة عملة جديدة" />
        ) : (
          <div className="overflow-x-auto">
            <table className="ep-table min-w-[900px]">
              <thead>
                <tr>
                  <th>العملة</th>
                  <th>الرمز</th>
                  <th>السعر مقابل USD</th>
                  <th>الحالة</th>
                  <th>آخر تحديث</th>
                  <th className="text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.code}>
                    <td>
                      <div className="flex items-center justify-end gap-3">
                        <div className="text-right">
                          <p className="font-bold text-slate-900">{c.name_ar || c.name}</p>
                          <p className="text-[11px] text-slate-400">{c.name}</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 font-black text-slate-700 text-xs">
                          {c.code}
                        </div>
                      </div>
                    </td>
                    <td><span className="text-lg font-black text-slate-900">{c.symbol}</span></td>
                    <td>
                      <span dir="ltr" className="font-mono font-black text-slate-900 tabular-nums">
                        {formatMoney(c.rate_to_usd, { decimals: 4 })}
                      </span>
                    </td>
                    <td>
                      <Badge color={c.is_active !== false ? "emerald" : "slate"} dot>
                        {c.is_active !== false ? "مفعّل" : "معطّل"}
                      </Badge>
                    </td>
                    <td className="text-xs text-slate-500">{formatDate(c.updated_at, { withTime: true })}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <IconBtn icon={TrendingUp} onClick={() => setRateModal(c)} title="تحديث السعر" color="violet" />
                        <IconBtn icon={Edit3} onClick={() => setEditCur(c)} title="تعديل" />
                        {c.is_active !== false && (
                          <IconBtn icon={Trash2} onClick={() => setConfirmDisable(c)} title="تعطيل" color="rose" />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="إضافة عملة جديدة" size="md">
        <CurrencyForm onSubmit={handleCreate} loading={busy} onCancel={() => setOpenAdd(false)} />
      </Modal>

      <Modal open={!!editCur} onClose={() => setEditCur(null)} title="تعديل العملة" subtitle={editCur?.code} size="md">
        {editCur && (
          <CurrencyForm
            initial={editCur}
            onSubmit={(p) => handleUpdate(editCur.code, p)}
            loading={busy}
            onCancel={() => setEditCur(null)}
            isEdit
          />
        )}
      </Modal>

      <Modal open={!!rateModal} onClose={() => setRateModal(null)} title="تحديث سعر الصرف" subtitle={rateModal?.code} size="sm">
        {rateModal && (
          <RateUpdateForm
            current={rateModal}
            onSubmit={(d) => handleUpdateRate(rateModal.code, d)}
            loading={busy}
            onCancel={() => setRateModal(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmDisable}
        onClose={() => setConfirmDisable(null)}
        onConfirm={handleDisable}
        title="تعطيل العملة"
        description={`سيتم تعطيل العملة "${confirmDisable?.code}".`}
        confirmText="تعطيل"
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
    violet: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
  };
  return (
    <button type="button" onClick={onClick} title={title} className={`flex h-9 w-9 items-center justify-center rounded-lg border transition active:scale-95 ${p[color]}`}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

function CurrencyForm({ initial, onSubmit, loading, onCancel, isEdit }) {
  const [form, setForm] = useState({
    code: initial?.code || "",
    name: initial?.name || "",
    name_ar: initial?.name_ar || "",
    symbol: initial?.symbol || "",
    rate_to_usd: initial?.rate_to_usd || 1,
    is_active: initial?.is_active ?? true,
  });

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">رمز العملة *</span>
          <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="USD" maxLength={3} disabled={isEdit} className="ep-input uppercase" dir="ltr" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">الرمز</span>
          <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="$" className="ep-input" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">الاسم *</span>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="US Dollar" className="ep-input" dir="ltr" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">الاسم بالعربية</span>
          <input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} placeholder="دولار أمريكي" className="ep-input" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-slate-700">السعر مقابل USD *</span>
          <input type="number" step="0.0001" value={form.rate_to_usd} onChange={(e) => setForm({ ...form, rate_to_usd: parseFloat(e.target.value) })} className="ep-input" dir="ltr" />
        </label>
        <label className="flex items-end gap-2 pb-1">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="h-4 w-4 accent-teal-600" />
          <span className="text-xs font-bold text-slate-700">عملة مفعّلة</span>
        </label>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">إلغاء</button>
        <button type="submit" disabled={loading} className="ep-btn ep-btn-primary">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isEdit ? "حفظ التعديلات" : "إضافة العملة"}
        </button>
      </div>
    </form>
  );
}

function RateUpdateForm({ current, onSubmit, loading, onCancel }) {
  const [rate, setRate] = useState(current?.rate_to_usd || 1);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ rate: parseFloat(rate), date });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-right">
        <p className="text-xs text-slate-500">السعر الحالي</p>
        <p dir="ltr" className="font-mono text-2xl font-black text-slate-900 tabular-nums">
          {formatMoney(current?.rate_to_usd, { decimals: 4 })}
        </p>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-700">السعر الجديد *</span>
        <input type="number" step="0.0001" required value={rate} onChange={(e) => setRate(e.target.value)} className="ep-input text-lg font-bold" dir="ltr" />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-bold text-slate-700">تاريخ التحديث</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="ep-input" />
      </label>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} disabled={loading} className="ep-btn ep-btn-ghost">إلغاء</button>
        <button type="submit" disabled={loading} className="ep-btn ep-btn-primary">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          تحديث السعر
        </button>
      </div>
    </form>
  );
}

export default CurrenciesPage;