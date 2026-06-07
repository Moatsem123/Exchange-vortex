import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Bell,
  Menu,
  CalendarDays,
  UserRound,
  Check,
  Trash2,
  ChevronLeft,
  Loader2,
  ChevronDown,
  LogOut,
  KeyRound,
  Settings,
} from "lucide-react";
import notificationsService from "../../services/notifications";
import customersService from "../../services/customers";
import transactionsService from "../../services/transactions";
import { useAuth } from "../../context/AuthContext";
import { formatRelative } from "../../shared/helpers";

function Topbar({ onOpenSidebar, unreadCount, refreshUnreadCount }) {
  const [openNotif, setOpenNotif] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setOpenNotif(false);
      }
    }

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header
      className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl"
      dir="rtl"
    >
      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 xl:hidden"
          aria-label="فتح القائمة"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden items-center gap-2 text-xs font-bold text-slate-600 lg:flex">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <span>{today}</span>
        </div>

        <div className="flex-1 max-w-xl mx-auto">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setOpenNotif((p) => !p)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <NotificationsDropdown
              open={openNotif}
              onClose={() => setOpenNotif(false)}
              refreshUnreadCount={refreshUnreadCount}
            />
          </div>

          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const name = user?.name || user?.email || "المستخدم";
  const role = user?.role_label || user?.role || "—";
  const initials = (name || "م")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  function handleLogoutClick() {
    setOpen(false);
    setConfirmLogout(true);
  }

  function handleConfirmLogout() {
    setConfirmLogout(false);
    logout();
  }

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((p) => !p)}
          className={`flex items-center gap-2 rounded-xl border bg-white px-2 py-1 transition hover:bg-slate-50 ${
            open ? "border-teal-300 ring-2 ring-teal-100" : "border-slate-200"
          }`}
        >
          <ChevronDown
            className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform sm:block ${
              open ? "rotate-180 text-teal-600" : ""
            }`}
          />

          <div className="text-right hidden sm:block">
            <p className="text-xs font-black leading-tight text-slate-900 truncate max-w-[120px]">
              {name}
            </p>
            <p className="text-[10px] text-slate-500">{role}</p>
          </div>

          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 text-white font-black text-xs shadow-sm">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full rounded-lg object-cover" />
              ) : initials ? (
                <span>{initials}</span>
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </div>
            <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute left-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
            >
              <div
                className="relative flex items-center gap-3 p-4 text-white"
                style={{ background: "linear-gradient(to left, #0a1628, #1e2a44)" }}
              >
                <div className="text-right flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{name}</p>
                  <p className="text-[11px] text-white/70 truncate">{user?.email || ""}</p>
                  <span className="mt-1.5 inline-block rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold">
                    {role}
                  </span>
                </div>

                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 text-white font-black ring-2 ring-white/20">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="h-full w-full rounded-xl object-cover" />
                    ) : initials ? (
                      <span>{initials}</span>
                    ) : (
                      <UserRound className="h-6 w-6" />
                    )}
                  </div>
                  <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0a1628]" />
                </div>
              </div>

              <div className="p-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/change-password");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right transition hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-300" />
                  <div className="flex flex-1 items-center justify-end gap-3 text-right">
                    <div>
                      <p className="text-xs font-bold text-slate-900">تغيير كلمة المرور</p>
                      <p className="text-[10px] text-slate-400">حدّث كلمة مرورك</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <KeyRound className="h-4 w-4" />
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right transition hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-300" />
                  <div className="flex flex-1 items-center justify-end gap-3 text-right">
                    <div>
                      <p className="text-xs font-bold text-slate-900">الإعدادات</p>
                      <p className="text-[10px] text-slate-400">إدارة الحساب والتفضيلات</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Settings className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              </div>

              <div className="border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={handleLogoutClick}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right transition hover:bg-rose-50"
                >
                  <ChevronLeft className="h-4 w-4 text-rose-300" />
                  <div className="flex flex-1 items-center justify-end gap-3 text-right">
                    <div>
                      <p className="text-xs font-bold text-rose-700">تسجيل الخروج</p>
                      <p className="text-[10px] text-rose-400">إنهاء الجلسة الحالية</p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                      <LogOut className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LogoutConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}

function LogoutConfirmDialog({ open, onClose, onConfirm }) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir="rtl"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 text-right shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <LogOut className="h-5 w-5" />
              </div>

              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">تأكيد تسجيل الخروج</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  هل تريد تسجيل الخروج من النظام؟
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-start gap-2">
              <button
                type="button"
                onClick={onConfirm}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white transition hover:bg-rose-700"
              >
                تسجيل الخروج
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ customers: [], transactions: [] });
  const boxRef = useRef(null);

  useEffect(() => {
    function h(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }

    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setResults({ customers: [], transactions: [] });
      setLoading(false);
      return;
    }

    setLoading(true);

    const t = setTimeout(async () => {
      try {
        const [c, tx] = await Promise.all([
          customersService.list({ search: term, per_page: 5 }).catch(() => null),
          transactionsService.list({ search: term, per_page: 5 }).catch(() => null),
        ]);

        const customers = c?.data?.data || c?.data || (Array.isArray(c) ? c : []) || [];
        const transactions = tx?.data?.data || tx?.data || (Array.isArray(tx) ? tx : []) || [];

        setResults({
          customers: Array.isArray(customers) ? customers : [],
          transactions: Array.isArray(transactions) ? transactions : [],
        });
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [query]);

  const has = results.customers.length > 0 || results.transactions.length > 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="ابحث عن معاملة، عميل، تقرير..."
          className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 pl-4 text-right text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(13,148,136,0.10)]"
        />
      </div>

      <AnimatePresence>
        {open && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute left-0 right-0 top-full mt-2 max-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.14)] z-50"
          >
            {loading && (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ البحث...
              </div>
            )}

            {!loading && !has && (
              <div className="px-4 py-6 text-center text-xs text-slate-500">
                لا توجد نتائج لـ "{query}"
              </div>
            )}

            {!loading && results.customers.length > 0 && (
              <div className="p-2">
                <p className="px-2 py-1 text-[10px] font-black text-slate-400">العملاء</p>
                {results.customers.map((c) => (
                  <button
                    key={`c-${c.id}`}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      navigate(`/customers?id=${c.id}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-300" />
                    <div className="flex-1 text-right">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{c.phone || c.email || ""}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loading && results.transactions.length > 0 && (
              <div className="border-t border-slate-100 p-2">
                <p className="px-2 py-1 text-[10px] font-black text-slate-400">المعاملات</p>
                {results.transactions.map((t) => (
                  <button
                    key={`t-${t.id}`}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      navigate(`/transactions?id=${t.id}`);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4 text-slate-300" />
                    <div className="flex-1 text-right">
                      <p className="text-sm font-bold text-slate-900 truncate">
                        #{t.reference_number || t.id} · {t.amount} {t.currency_code || t.currency}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">{t.customer?.name || t.type}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotificationsDropdown({ open, onClose, refreshUnreadCount }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);

    notificationsService
      .list({ per_page: 8 })
      .then((res) => {
        const list = res?.data?.data || res?.data || (Array.isArray(res) ? res : []) || [];
        setItems(Array.isArray(list) ? list : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleMarkRead(id) {
    try {
      await notificationsService.markRead(id);
      setItems((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      refreshUnreadCount?.();
    } catch {}
  }

  async function handleMarkAll() {
    try {
      await notificationsService.markAllRead();
      setItems((p) => p.map((n) => ({ ...n, is_read: true })));
      refreshUnreadCount?.();
    } catch {}
  }

  async function handleDelete(id) {
    try {
      await notificationsService.remove(id);
      setItems((p) => p.filter((n) => n.id !== id));
      refreshUnreadCount?.();
    } catch {}
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="absolute left-0 top-[calc(100%+10px)] z-50 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-4 py-3">
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-[11px] font-bold text-teal-600 transition hover:text-teal-800"
            >
              تعليم الكل كمقروء
            </button>
            <h3 className="text-sm font-black text-slate-900">الإشعارات</h3>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ التحميل...
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="px-4 py-6 text-center text-xs text-slate-500">لا توجد إشعارات</div>
            )}

            {!loading &&
              items.map((n) => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 rounded-xl p-3 transition hover:bg-slate-50 ${
                    !n.is_read ? "bg-teal-50/40" : ""
                  }`}
                >
                  <div className="flex flex-col gap-1">
                    {!n.is_read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-teal-600 hover:bg-teal-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 text-right">
                    <p className={`text-xs leading-5 ${!n.is_read ? "font-black text-slate-900" : "font-bold text-slate-600"}`}>
                      {n.title || n.data?.title || "إشعار"}
                    </p>

                    {(n.message || n.data?.message) && (
                      <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-2">
                        {n.message || n.data?.message}
                      </p>
                    )}

                    <p className="mt-1 text-[10px] text-slate-400">{formatRelative(n.created_at)}</p>
                  </div>

                  {!n.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                </div>
              ))}
          </div>

          <div className="border-t border-slate-200 bg-slate-50/50 p-2">
            <Link
              to="/notifications"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-slate-700 transition hover:bg-white hover:text-slate-900"
            >
              <span>عرض جميع الإشعارات</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Topbar;