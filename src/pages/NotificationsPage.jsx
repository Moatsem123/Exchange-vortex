import {
  Bell,
  CheckCheck,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import notificationsService from "../services/notifications";
import { getErrorMessage } from "../services/api";
import PageHeader from "../shared/PageHeader";
import Badge from "../shared/Badge";
import EmptyState from "../shared/EmptyState";
import ErrorState from "../shared/ErrorState";
import LoadingSkeleton from "../shared/LoadingSkeleton";
import { formatDate, formatTime, getList } from "../shared/formatters";

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [search, setSearch] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    setLoading(true);
    setError("");

    try {
      const [listResponse, countResponse] = await Promise.all([
        notificationsService.list({
          per_page: 30,
          search: search || undefined,
          is_read: onlyUnread ? false : undefined,
        }),
        notificationsService.unreadCount(),
      ]);

      setNotifications(getList(listResponse));
      setUnread(
        Number(
          countResponse?.data?.count ||
            countResponse?.count ||
            countResponse?.data?.unread ||
            countResponse?.unread ||
            0
        )
      );
    } catch (err) {
      setError(getErrorMessage(err, "تعذر تحميل الإشعارات"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadNotifications, 300);
    return () => clearTimeout(timer);
  }, [search, onlyUnread]);

  const markAllRead = async () => {
    try {
      await notificationsService.markAllRead();
      await loadNotifications();
    } catch (err) {
      alert(getErrorMessage(err, "تعذر تحديث الإشعارات"));
    }
  };

  const markRead = async (id) => {
    try {
      await notificationsService.markRead(id);
      await loadNotifications();
    } catch (err) {
      alert(getErrorMessage(err, "تعذر تحديث الإشعار"));
    }
  };

  const deleteNotification = async (id) => {
    if (!confirm("هل تريد حذف هذا الإشعار؟")) {
      return;
    }

    try {
      await notificationsService.remove(id);
      await loadNotifications();
    } catch (err) {
      alert(getErrorMessage(err, "تعذر حذف الإشعار"));
    }
  };

  if (loading && !notifications.length) {
    return (
      <div>
        <PageHeader
          icon={<Bell size={26} />}
          title="الإشعارات"
          description="جاري تحميل الإشعارات"
        />
        <LoadingSkeleton rows={7} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadNotifications} />;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        icon={<Bell size={26} />}
        title="الإشعارات"
        description="متابعة تنبيهات النظام والأحداث المهمة"
        actions={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              onClick={loadNotifications}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-teal-200 hover:text-teal-700"
            >
              <RefreshCw size={18} />
            </button>

            <button
              onClick={markAllRead}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-teal-700 to-emerald-600 px-4 text-sm font-black text-white shadow-lg shadow-teal-100 transition hover:-translate-y-0.5 sm:flex-none"
            >
              <CheckCheck size={18} />
              قراءة الكل
            </button>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-bold text-slate-500">كل الإشعارات</p>
          <h3 className="mt-3 text-3xl font-black text-slate-950">{notifications.length}</h3>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
          <p className="text-sm font-bold text-slate-500">غير مقروءة</p>
          <h3 className="mt-3 text-3xl font-black text-rose-600">{unread}</h3>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:col-span-2">
          <p className="text-sm font-bold text-slate-500">حالة التنبيهات</p>
          <h3 className="mt-3 text-2xl font-black text-emerald-600">متصلة</h3>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_10px_35px_rgba(15,23,42,0.05)] sm:p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحث في الإشعارات..."
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 text-sm font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-300 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
            />
          </div>

          <button
            onClick={() => setOnlyUnread((value) => !value)}
            className={`h-12 rounded-2xl px-4 text-sm font-black transition ${
              onlyUnread
                ? "bg-[#071323] text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-teal-200 hover:text-teal-700"
            }`}
          >
            غير المقروءة فقط
          </button>
        </div>
      </section>

      <section className="space-y-3">
        {notifications.length ? (
          notifications.map((item) => {
            const isRead = Boolean(item.is_read || item.read_at);

            return (
              <div
                key={item.id}
                className={`rounded-[24px] border p-4 shadow-[0_10px_35px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 sm:p-5 ${
                  isRead
                    ? "border-slate-200 bg-white"
                    : "border-teal-200 bg-teal-50/60"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
                        isRead ? "bg-slate-100 text-slate-600" : "bg-teal-100 text-teal-700"
                      }`}
                    >
                      <Bell size={21} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-black text-slate-950">
                          {item.title || item.subject || "إشعار جديد"}
                        </h3>
                        <Badge
                          className={
                            isRead
                              ? "bg-slate-100 text-slate-600 ring-slate-200"
                              : "bg-teal-100 text-teal-700 ring-teal-200"
                          }
                        >
                          {isRead ? "مقروء" : "جديد"}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                        {item.message || item.body || item.description || "يوجد تحديث جديد في النظام"}
                      </p>

                      <p className="mt-3 text-xs font-bold text-slate-400">
                        {formatDate(item.created_at)} - {formatTime(item.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!isRead ? (
                      <button
                        onClick={() => markRead(item.id)}
                        className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                      >
                        <CheckCheck size={17} />
                      </button>
                    ) : null}

                    <button
                      onClick={() => deleteNotification(item.id)}
                      className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="لا توجد إشعارات"
            description="لا توجد إشعارات مطابقة للفلاتر الحالية"
          />
        )}
      </section>
    </div>
  );
}

export default NotificationsPage;