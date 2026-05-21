import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  Mail,
  Calendar,
  CheckCheck,
  Trash2,
  Check,
  ShieldAlert,
  ArrowRightLeft,
  TrendingUp,
  UserPlus,
  FileText,
  Settings as SettingsIcon,
  Filter,
  MoreVertical,
  Eye,
  Inbox,
} from "lucide-react";

import PageHeader from "../shared/PageHeader";
import StatCard from "../shared/StatCard";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import Pagination from "../shared/Pagination";
import ScrollReveal from "../shared/ScrollReveal";
import { useToast } from "../shared/Toast";
import notificationsService from "../services/notifications";
import { extractApiError, formatRelative, unwrapList } from "../shared/helpers";

const PER_PAGE = 8;

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "unread", label: "غير مقروءة" },
  { key: "financial", label: "مالية" },
  { key: "system", label: "النظام" },
  { key: "customer", label: "العملاء" },
];

function NotificationsPage() {
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({
    total: 0,
    current_page: 1,
    last_page: 1,
    per_page: PER_PAGE,
  });

  const [unreadTotal, setUnreadTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUnread = useCallback(async () => {
    try {
      const res = await notificationsService.unreadCount();
      const count = res?.data?.count ?? res?.count ?? res?.data ?? 0;
      setUnreadTotal(Number(count) || 0);
    } catch {
      setUnreadTotal(0);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        per_page: PER_PAGE,
        ...(filter === "unread" && { is_read: false }),
        ...(["financial", "system", "customer"].includes(filter) && {
          category: filter,
        }),
      };

      const res = await notificationsService.list(params);
      const { items: list, meta: m } = unwrapList(res);

      setItems(list);
      setMeta({
        total: Number(m?.total ?? list.length),
        current_page: Number(m?.current_page ?? page),
        last_page: Number(m?.last_page ?? 1),
        per_page: Number(m?.per_page ?? PER_PAGE),
      });

      setActiveItem((prev) => prev || list[0] || null);
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => {
    load();
    loadUnread();
  }, [load, loadUnread]);

  async function markRead(id) {
    try {
      await notificationsService.markRead(id);

      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );

      setActiveItem((prev) =>
        prev?.id === id ? { ...prev, is_read: true } : prev
      );

      loadUnread();
    } catch (err) {
      toast.error(extractApiError(err));
    }
  }

  async function markAllRead() {
    try {
      await notificationsService.markAllRead();

      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setActiveItem((prev) => (prev ? { ...prev, is_read: true } : prev));
      setUnreadTotal(0);

      toast.success("تم تعليم كل الإشعارات كمقروءة");
    } catch (err) {
      toast.error(extractApiError(err));
    }
  }

  async function removeOne(id) {
    try {
      await notificationsService.remove(id);

      setItems((prev) => prev.filter((n) => n.id !== id));
      setSelected((prev) => prev.filter((x) => x !== id));

      if (activeItem?.id === id) setActiveItem(null);

      loadUnread();
      toast.success("تم حذف الإشعار");
    } catch (err) {
      toast.error(extractApiError(err));
    }
  }

  async function deleteSelected() {
    if (selected.length === 0) return;

    try {
      await Promise.all(selected.map((id) => notificationsService.remove(id)));

      setItems((prev) => prev.filter((n) => !selected.includes(n.id)));

      if (activeItem && selected.includes(activeItem.id)) setActiveItem(null);

      setSelected([]);
      loadUnread();

      toast.success("تم حذف الإشعارات المحددة");
    } catch (err) {
      toast.error(extractApiError(err));
    }
  }

  function toggleSelect(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const stats = useMemo(() => {
    return {
      total: meta.total || items.length,
      unread: unreadTotal || items.filter((n) => !n.is_read).length,
      today: items.filter((n) => isToday(n.created_at)).length,
      high: items.filter((n) => getPriority(n) === "high").length,
    };
  }, [items, meta.total, unreadTotal]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="الإشعارات"
        subtitle="تابع الأحداث المهمة والتحديثات الخاصة بالنظام"
        icon={Bell}
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="عالية الأولوية" value={stats.high} icon={AlertTriangle} color="rose" note="تحتاج متابعة سريعة" loading={loading} />
        <StatCard title="غير المقروءة" value={stats.unread} icon={Mail} color="violet" note="لم يتم فتحها بعد" loading={loading} />
        <StatCard title="اليوم" value={stats.today} icon={Calendar} color="blue" note="إشعارات وصلت اليوم" loading={loading} />
        <StatCard title="إجمالي الإشعارات" value={stats.total} icon={Bell} color="emerald" note="كل الإشعارات المسجلة" loading={loading} />
      </section>

      <ScrollReveal>
        <div className="ep-card-static p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setFilter(item.key);
                    setPage(1);
                    setSelected([]);
                    setActiveItem(null);
                  }}
                  className={[
                    "rounded-xl px-4 py-2 text-xs font-black transition",
                    filter === item.key
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {item.label}
                </button>
              ))}

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                <Filter className="h-3.5 w-3.5" />
                الفلتر
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  حذف المحدد ({selected.length})
                </button>
              )}

              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                تعليم الكل كمقروء
              </button>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
          <div className="ep-card-static overflow-hidden">
            {error && !loading ? (
              <ErrorState
                title="تعذر تحميل الإشعارات"
                description={extractApiError(error)}
                onRetry={load}
              />
            ) : loading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="ep-skeleton h-16 rounded-xl" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="لا توجد إشعارات"
                description="ستظهر هنا عند وصول أي تنبيه جديد"
              />
            ) : (
              <>
                <div className="divide-y divide-slate-100">
                  {items.map((notification) => (
                    <NotificationRow
                      key={notification.id}
                      notification={notification}
                      selected={selected.includes(notification.id)}
                      active={activeItem?.id === notification.id}
                      onSelect={() => setActiveItem(notification)}
                      onToggleSelect={() => toggleSelect(notification.id)}
                      onMarkRead={() => markRead(notification.id)}
                      onDelete={() => removeOne(notification.id)}
                    />
                  ))}
                </div>

                <div className="border-t border-slate-200">
                  <Pagination
                    current={meta.current_page || page}
                    last={meta.last_page || 1}
                    total={meta.total || items.length}
                    perPage={meta.per_page || PER_PAGE}
                    onChange={setPage}
                  />
                </div>
              </>
            )}
          </div>

          <NotificationDetails
            notification={activeItem}
            onMarkRead={markRead}
            onDelete={removeOne}
          />
        </div>
      </ScrollReveal>
    </div>
  );
}

function NotificationRow({
  notification,
  selected,
  active,
  onSelect,
  onToggleSelect,
  onMarkRead,
  onDelete,
}) {
  const cfg = getCategoryConfig(notification);
  const Icon = cfg.icon;
  const priorityMeta = getPriorityMeta(getPriority(notification));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className={[
        "group grid cursor-pointer grid-cols-[44px_1fr_90px_110px_90px] items-center gap-3 px-4 py-3 transition",
        active ? "bg-teal-50/70" : "hover:bg-slate-50/80",
      ].join(" ")}
    >
      <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 accent-teal-600"
        />
        {!notification.is_read && <span className="h-2 w-2 rounded-full bg-teal-500" />}
      </div>

      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-black text-slate-900">
          {getTitle(notification)}
        </p>
        <p className="mt-1 truncate text-xs font-bold text-slate-500">
          {getMessage(notification)}
        </p>
      </div>

      <div className="flex justify-center">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${cfg.color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex justify-center">
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${priorityMeta.className}`}>
          {priorityMeta.label}
        </span>
      </div>

      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
        {!notification.is_read && (
          <button
            type="button"
            onClick={onMarkRead}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            title="تعليم كمقروء"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
          title="حذف"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function NotificationDetails({ notification, onMarkRead, onDelete }) {
  if (!notification) {
    return (
      <div className="ep-card-static hidden p-5 xl:block">
        <EmptyState
          icon={Eye}
          title="اختر إشعارًا"
          description="اضغط على أي إشعار لعرض تفاصيله هنا"
        />
      </div>
    );
  }

  const cfg = getCategoryConfig(notification);
  const Icon = cfg.icon;
  const priorityMeta = getPriorityMeta(getPriority(notification));

  return (
    <div className="ep-card-static hidden overflow-hidden xl:block">
      <div className="border-b border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${priorityMeta.className}`}>
            {priorityMeta.label}
          </span>

          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${cfg.color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>

        <h3 className="mt-4 text-right text-lg font-black text-slate-900">
          {getTitle(notification)}
        </h3>

        <p className="mt-2 text-right text-xs font-bold text-slate-500">
          {formatRelative(notification.created_at)}
        </p>
      </div>

      <div className="p-5 text-right">
        <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-600">
          {getMessage(notification)}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoBox label="الحالة" value={notification.is_read ? "مقروء" : "غير مقروء"} />
          <InfoBox label="التصنيف" value={safeText(notification.category, safeText(notification.type, "عام"))} />
          <InfoBox label="الأولوية" value={priorityMeta.label} />
          <InfoBox label="رقم الإشعار" value={`#${notification.id}`} />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {!notification.is_read && (
            <button
              type="button"
              onClick={() => onMarkRead(notification.id)}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100"
            >
              <Check className="h-3.5 w-3.5" />
              تعليم كمقروء
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(notification.id)}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-right">
      <p className="text-[10px] font-bold text-slate-400">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-slate-800">
        {safeText(value)}
      </p>
    </div>
  );
}

function safeText(value, fallback = "—") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  return fallback;
}

function getTitle(notification) {
  return safeText(notification.title, safeText(notification.data?.title, "إشعار"));
}

function getMessage(notification) {
  return safeText(
    notification.message,
    safeText(
      notification.data?.message,
      safeText(notification.body, "لا توجد تفاصيل إضافية لهذا الإشعار")
    )
  );
}

function getPriority(notification) {
  return safeText(notification.priority, safeText(notification.data?.priority, "low"));
}

function getPriorityMeta(priority) {
  const map = {
    high: {
      label: "عالية",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    },
    medium: {
      label: "متوسطة",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    low: {
      label: "منخفضة",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
  };

  return map[priority] || map.low;
}

function getCategoryConfig(notification) {
  const text = safeText(notification.type, "") + " " + safeText(notification.category, "");

  if (text.includes("transaction") || text.includes("financial")) {
    return {
      icon: ArrowRightLeft,
      color: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (text.includes("rate") || text.includes("currency")) {
    return {
      icon: TrendingUp,
      color: "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  if (text.includes("security") || text.includes("alert")) {
    return {
      icon: ShieldAlert,
      color: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  if (text.includes("customer") || text.includes("user")) {
    return {
      icon: UserPlus,
      color: "border-violet-200 bg-violet-50 text-violet-700",
    };
  }

  if (text.includes("report")) {
    return {
      icon: FileText,
      color: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (text.includes("permission") || text.includes("setting")) {
    return {
      icon: SettingsIcon,
      color: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  return {
    icon: Bell,
    color: "border-slate-200 bg-slate-50 text-slate-700",
  };
}

function isToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default NotificationsPage;