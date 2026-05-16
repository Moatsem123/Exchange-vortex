import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell, AlertTriangle, Mail, Calendar, CheckCheck, Trash2, Check,
  ShieldAlert, ArrowRightLeft, TrendingUp, UserPlus,
  FileText, Settings as SettingsIcon,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Pagination from "../shared/Pagination";
import { useToast } from "../shared/Toast";
import notificationsService from "../services/notifications";
import { extractApiError, formatRelative, unwrapList } from "../shared/helpers";

const CATEGORIES = [
  { key: "all", label: "الكل" },
  { key: "unread", label: "غير مقروءة" },
  { key: "financial", label: "مالية" },
  { key: "system", label: "النظام" },
  { key: "customer", label: "العملاء" },
];

function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1, per_page: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("all");
  const [selected, setSelected] = useState([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page, per_page: 20,
        ...(category === "unread" && { is_read: false }),
        ...(["financial", "system", "customer"].includes(category) && { category }),
      };
      const res = await notificationsService.list(params);
      const { items: list, meta: m } = unwrapList(res);
      setItems(list);
      if (m) setMeta((p) => ({ ...p, ...m }));
    } catch (err) { setError(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, category]);

  async function markRead(id) {
    try {
      await notificationsService.markRead(id);
      setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) { toast.error(extractApiError(err)); }
  }

  async function markAllRead() {
    try {
      await notificationsService.markAllRead();
      setItems((p) => p.map((n) => ({ ...n, is_read: true })));
      toast.success("تم تعليم الكل كمقروء");
    } catch (err) { toast.error(extractApiError(err)); }
  }

  async function removeOne(id) {
    try {
      await notificationsService.remove(id);
      setItems((p) => p.filter((n) => n.id !== id));
      toast.success("تم حذف الإشعار");
    } catch (err) { toast.error(extractApiError(err)); }
  }

  async function deleteSelected() {
    try {
      await Promise.all(selected.map((id) => notificationsService.remove(id)));
      setItems((p) => p.filter((n) => !selected.includes(n.id)));
      setSelected([]);
      toast.success("تم حذف المحدد");
    } catch (err) { toast.error(extractApiError(err)); }
  }

  function toggleSelect(id) {
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  const stats = {
    total: meta.total || items.length,
    unread: items.filter((n) => !n.is_read).length,
    today: items.filter((n) => isToday(n.created_at)).length,
    highPriority: items.filter((n) => n.priority === "high").length,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإشعارات"
        subtitle="تابع الأحداث المهمة والتحديثات الخاصة بالنظام"
        icon={Bell}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="عالية الأولوية" value={stats.highPriority} icon={AlertTriangle} color="rose" />
        <StatCard title="غير المقروءة" value={stats.unread} icon={Mail} color="violet" />
        <StatCard title="اليوم" value={stats.today} icon={Calendar} color="blue" />
        <StatCard title="إجمالي الإشعارات" value={stats.total} icon={Bell} color="emerald" />
      </section>

      <div className="ep-card-static p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => { setCategory(c.key); setPage(1); }}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${category === c.key ? "bg-slate-800 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button type="button" onClick={deleteSelected} className="ep-btn ep-btn-danger">
                <Trash2 className="h-3.5 w-3.5" />
                حذف المحدد ({selected.length})
              </button>
            )}
            <button type="button" onClick={markAllRead} className="ep-btn ep-btn-ghost">
              <CheckCheck className="h-3.5 w-3.5" />
              تعليم الكل كمقروء
            </button>
          </div>
        </div>
      </div>

      <div className="ep-card-static overflow-hidden">
        {error && !loading ? (
          <ErrorState onRetry={load} />
        ) : loading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ep-skeleton h-16" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="لا توجد إشعارات" description="ستظهر هنا عند وصول أي تنبيه جديد" />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {items.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  selected={selected.includes(n.id)}
                  onToggleSelect={() => toggleSelect(n.id)}
                  onMarkRead={() => markRead(n.id)}
                  onDelete={() => removeOne(n.id)}
                />
              ))}
            </div>

            <div className="border-t border-slate-200">
              <Pagination
                current={meta.current_page || page}
                last={meta.last_page || 1}
                total={meta.total || items.length}
                perPage={meta.per_page || 20}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NotificationItem({ n, selected, onToggleSelect, onMarkRead, onDelete }) {
  const cfg = getCategoryConfig(n);
  const Icon = cfg.icon;
  const priority = n.priority || "low";
  const priColors = {
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-slate-50 text-slate-600 border-slate-200",
  };
  const priLabels = { high: "عالية", medium: "متوسطة", low: "منخفضة" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex items-start gap-3 p-4 transition hover:bg-slate-50/50 ${!n.is_read ? "bg-teal-50/30" : ""}`}
    >
      <input type="checkbox" checked={selected} onChange={onToggleSelect} className="mt-1.5 h-4 w-4 accent-teal-600" />

      <div className="flex flex-col gap-1.5">
        {!n.is_read && (
          <button type="button" onClick={onMarkRead} className="flex h-7 w-7 items-center justify-center rounded-md text-teal-600 hover:bg-teal-50" title="تعليم كمقروء">
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button type="button" onClick={onDelete} className="flex h-7 w-7 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50" title="حذف">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-slate-400">{formatRelative(n.created_at)}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${priColors[priority]}`}>
              {priLabels[priority]}
            </span>
          </div>

          <div className="flex-1 min-w-0 text-right">
            <p className={`text-sm leading-5 ${!n.is_read ? "font-black text-slate-900" : "font-bold text-slate-700"}`}>
              {n.title || n.data?.title || "إشعار"}
            </p>
            {(n.message || n.data?.message) && (
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{n.message || n.data?.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cfg.color}`}>
        <Icon className="h-5 w-5" />
      </div>

      {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
    </motion.div>
  );
}

function getCategoryConfig(n) {
  const t = (n.type || n.category || "").toLowerCase();
  if (t.includes("transaction") || t.includes("financial")) return { icon: ArrowRightLeft, color: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  if (t.includes("rate") || t.includes("currency")) return { icon: TrendingUp, color: "border-blue-200 bg-blue-50 text-blue-700" };
  if (t.includes("security") || t.includes("alert")) return { icon: ShieldAlert, color: "border-rose-200 bg-rose-50 text-rose-700" };
  if (t.includes("customer") || t.includes("user")) return { icon: UserPlus, color: "border-violet-200 bg-violet-50 text-violet-700" };
  if (t.includes("report")) return { icon: FileText, color: "border-amber-200 bg-amber-50 text-amber-700" };
  if (t.includes("permission") || t.includes("setting")) return { icon: SettingsIcon, color: "border-slate-200 bg-slate-50 text-slate-700" };
  return { icon: Bell, color: "border-slate-200 bg-slate-50 text-slate-700" };
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const t = new Date();
  return d.toDateString() === t.toDateString();
}

export default NotificationsPage;