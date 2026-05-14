import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  BadgePlus,
  BellDot,
  CalendarDays,
  Camera,
  ChartNoAxesColumnIncreasing,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Receipt,
  Search,
  UserRound,
  UserRoundCheck,
  Users,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
} from "lucide-react";

import customersService from "../../services/customers";
import transactionsService from "../../services/transactions";
import BrandOrbitLogo from "../../shared/BrandOrbitLogo";


const navItems = [
  { label: "الرئيسية", path: "/dashboard", icon: LayoutDashboard },
  { label: "العملاء", path: "/customers", icon: UserRoundCheck },
  { label: "الحركات", path: "/transactions", icon: ArrowRightLeft },
  { label: "إضافة عملية", path: "/add-transaction", icon: BadgePlus },
  { label: "التقارير", path: "/reports", icon: ChartNoAxesColumnIncreasing },
];

function Topbar() {
  const [openNotif, setOpenNotif] = useState(false);
  const [openCal, setOpenCal] = useState(false);
  const [openMobileMenu, setOpenMobileMenu] = useState(false);
  const [avatar, setAvatar] = useState(null);

  const notifRef = useRef(null);
  const calRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setOpenNotif(false);
      }
      if (calRef.current && !calRef.current.contains(event.target)) {
        setOpenCal(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = openMobileMenu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openMobileMenu]);

  function handleAvatarPick(file) {
    if (!file) return;
    setAvatar(URL.createObjectURL(file));
  }

  return (
    <>
      <motion.header
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8"
      >

        <div className="flex items-center justify-between gap-3 xl:hidden">
          <BrandBlock />

          <button
            type="button"
            onClick={() => setOpenMobileMenu(true)}
            className="group relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_6px_16px_-8px_rgba(30,41,59,0.20)] active:translate-y-0 active:scale-[0.96]"
            aria-label="فتح القائمة"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-slate-200/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <Menu className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
          </button>
        </div>

 
        <div className="hidden items-center gap-5 xl:flex">
          <div className="min-w-0 flex-1">
            <GlobalSearch />
          </div>

          <div className="flex shrink-0 items-center gap-2.5">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAvatarPick(e.target.files?.[0])}
            />

            <div className="relative" ref={notifRef}>
              <TopActionIcon
                icon={BellDot}
                dot
                active={openNotif}
                onClick={() => {
                  setOpenNotif((p) => !p);
                  setOpenCal(false);
                }}
              />
              <NotificationsDropdown open={openNotif} onClose={() => setOpenNotif(false)} />
            </div>

            <div className="relative" ref={calRef}>
              <TopActionIcon
                icon={CalendarDays}
                active={openCal}
                onClick={() => {
                  setOpenCal((p) => !p);
                  setOpenNotif(false);
                }}
              />
              <CalendarPopup open={openCal} />
            </div>

            <span className="mx-1 h-8 w-px bg-slate-200" />

            <button
              type="button"
              onClick={() => {
                avatarInputRef.current?.click();
                setOpenNotif(false);
                setOpenCal(false);
              }}
              title={avatar ? "تغيير الصورة" : "إضافة صورة"}
              className="group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_6px_16px_-8px_rgba(30,41,59,0.20)]"
            >
              {avatar ? (
                <img src={avatar} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 ring-1 ring-slate-200">
                  <UserRound className="h-5 w-5 text-slate-700" />
                </div>
              )}
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition-all duration-300 group-hover:bg-black/35 group-hover:opacity-100">
                <Camera className="h-4 w-4" />
              </span>
            </button>

            <div className="text-right">
              <h2 className="text-sm font-black leading-4 text-slate-900">الفرع الرئيسي</h2>
              <p className="mt-1 text-[11px] font-bold text-slate-500">مدير النظام</p>
            </div>
          </div>
        </div>
      </motion.header>

      <MobileMenuDrawer
        open={openMobileMenu}
        onClose={() => setOpenMobileMenu(false)}
      />
    </>
  );
}

// # Global search
function GlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ customers: [], transactions: [] });

  const boxRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults({ customers: [], transactions: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [custRes, txnRes] = await Promise.all([
          customersService.list({ search: term, per_page: 5 }).catch(() => null),
          transactionsService.list({ search: term, per_page: 5 }).catch(() => null),
        ]);
        const customers = custRes ? (custRes.data || custRes) : [];
        const transactions = txnRes ? (txnRes.data || txnRes) : [];
        setResults({
          customers: Array.isArray(customers) ? customers : [],
          transactions: Array.isArray(transactions) ? transactions : [],
        });
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  function pickCustomer(c) {
    setOpen(false);
    setQuery("");
    navigate(`/customers?id=${c.id}`);
  }

  function pickTransaction(t) {
    setOpen(false);
    setQuery("");
    navigate(`/transactions?id=${t.id}`);
  }

  function handleKey(e) {
    if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const hasResults =
    results.customers.length > 0 || results.transactions.length > 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="group relative w-full">
        <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-focus-within:text-slate-700" />

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder="ابحث عن عميل أو حركة..."
          className="h-12 w-full rounded-full border border-slate-200 bg-slate-100/70 pr-12 pl-10 text-right text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 hover:bg-white focus:border-slate-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(30,41,59,0.08)]"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute left-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 max-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
          >
            {loading && (
              <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs font-bold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                جارٍ البحث...
              </div>
            )}

            {!loading && !hasResults && (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-slate-600">
                  لا توجد نتائج لـ "{query.trim()}"
                </p>
                <p className="text-[11px] text-slate-400">
                  جرّب اسم آخر أو رقم حركة
                </p>
              </div>
            )}

            {!loading && results.customers.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-black text-slate-400">
                  <Users className="h-3 w-3" />
                  العملاء
                </div>
                {results.customers.map((c) => (
                  <ResultRow
                    key={`c-${c.id}`}
                    icon={UserRoundCheck}
                    iconColor="text-teal-600"
                    iconBg="bg-teal-50"
                    title={c.name || "—"}
                    subtitle={c.phone || c.email || ""}
                    onClick={() => pickCustomer(c)}
                  />
                ))}
              </div>
            )}

            {!loading && results.transactions.length > 0 && (
              <div className="border-t border-slate-100 p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-[10px] font-black text-slate-400">
                  <Receipt className="h-3 w-3" />
                  الحركات
                </div>
                {results.transactions.map((t) => (
                  <ResultRow
                    key={`t-${t.id}`}
                    icon={ArrowRightLeft}
                    iconColor="text-slate-700"
                    iconBg="bg-slate-100"
                    title={`#${t.id} · ${t.amount || ""} ${t.currency || ""}`}
                    subtitle={t.customer?.name || t.type || ""}
                    onClick={() => pickTransaction(t)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultRow({ icon: Icon, iconColor, iconBg, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right transition-all duration-200 hover:bg-slate-50"
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} transition-transform duration-300 group-hover:scale-110`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p className="truncate text-sm font-bold text-slate-900">{title}</p>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      <ChevronLeft className="h-4 w-4 shrink-0 text-slate-300 transition-transform duration-300 group-hover:-translate-x-1 group-hover:text-slate-600" />
    </button>
  );
}

// # Drawer search
function DrawerSearch({ onPick }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ customers: [], transactions: [] });

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults({ customers: [], transactions: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [custRes, txnRes] = await Promise.all([
          customersService.list({ search: term, per_page: 5 }).catch(() => null),
          transactionsService.list({ search: term, per_page: 5 }).catch(() => null),
        ]);
        const customers = custRes ? custRes.data || custRes : [];
        const transactions = txnRes ? txnRes.data || txnRes : [];
        setResults({
          customers: Array.isArray(customers) ? customers : [],
          transactions: Array.isArray(transactions) ? transactions : [],
        });
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  function go(path) {
    onPick?.();
    navigate(path);
  }

  const hasResults =
    results.customers.length > 0 || results.transactions.length > 0;

  return (
    <div>
      <div className="group relative">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-focus-within:text-teal-300" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن عميل أو حركة..."
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pr-9 pl-3 text-right text-sm text-white outline-none transition-all duration-300 placeholder:text-slate-400 hover:bg-white/10 focus:border-teal-400/40 focus:bg-white/10 focus:shadow-[0_0_0_3px_rgba(20,184,166,0.15)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {query.trim().length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/5 bg-black/20"
        >
          {loading && (
            <div className="flex items-center justify-center gap-2 px-3 py-4 text-[11px] font-bold text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              جارٍ البحث...
            </div>
          )}

          {!loading && !hasResults && (
            <div className="px-3 py-4 text-center text-[11px] font-bold text-slate-400">
              لا توجد نتائج
            </div>
          )}

          {!loading && results.customers.length > 0 && (
            <div className="p-1.5">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-black text-slate-400">
                <Users className="h-3 w-3" />
                العملاء
              </div>
              {results.customers.map((c) => (
                <button
                  key={`dc-${c.id}`}
                  type="button"
                  onClick={() => go(`/customers?id=${c.id}`)}
                  className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-right transition-all duration-200 hover:bg-white/5"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-300">
                    <UserRoundCheck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-xs font-bold text-white">{c.name || "—"}</p>
                    {(c.phone || c.email) && (
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">{c.phone || c.email}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && results.transactions.length > 0 && (
            <div className="border-t border-white/5 p-1.5">
              <div className="flex items-center gap-1.5 px-2 py-1 text-[9px] font-black text-slate-400">
                <Receipt className="h-3 w-3" />
                الحركات
              </div>
              {results.transactions.map((t) => (
                <button
                  key={`dt-${t.id}`}
                  type="button"
                  onClick={() => go(`/transactions?id=${t.id}`)}
                  className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-right transition-all duration-200 hover:bg-white/5"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <p className="truncate text-xs font-bold text-white">
                      #{t.id} · {t.amount || ""} {t.currency || ""}
                    </p>
                    {(t.customer?.name || t.type) && (
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">
                        {t.customer?.name || t.type}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}


function MobileMenuDrawer({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm xl:hidden"
          />

          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 z-50 flex h-screen w-[280px] flex-col overflow-hidden border-l border-slate-800 bg-[#1e293b] text-slate-200 xl:hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.10),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.08),transparent_45%)]" />

            <div className="relative flex items-center justify-between border-b border-white/5 p-4">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-[#0f172a] shadow-[inset_0_0_0_1px_rgba(20,184,166,0.30)]">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.25),transparent_65%)]" />
                  <BrandOrbitLogo size={40} withGlow={false} />
                </div>
                <div className="text-right">
                  <h2 className="text-base font-black text-white">Exchange Pro</h2>
                  <p className="mt-0.5 text-[11px] text-slate-400">نظام إدارة الصرافة</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative flex items-center gap-3 border-b border-white/5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 ring-1 ring-teal-400/25">
                <UserRound className="h-5 w-5 text-teal-300" />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-sm font-black text-white">الفرع الرئيسي</p>
                <p className="mt-0.5 truncate text-[11px] font-bold text-slate-400">
                  مدير النظام
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-300 ring-1 ring-emerald-400/30">
                نشط
              </span>
            </div>

            <div className="relative border-b border-white/5 p-3">
              <DrawerSearch onPick={onClose} />
            </div>

            <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-4">
              <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                القائمة الرئيسية
              </div>
              {navItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={item.path}
                    initial={{ x: 18, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                      duration: 0.35,
                      delay: 0.1 + index * 0.05,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <NavLink
                      to={item.path}
                      onClick={onClose}
                      className={({ isActive }) =>
                        [
                          "group relative flex w-full items-center justify-between overflow-hidden rounded-xl px-3.5 py-3 text-sm font-bold transition-all duration-300",
                          isActive
                            ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(20,184,166,0.28)]"
                            : "text-slate-400 hover:bg-white/[0.05] hover:text-white",
                        ].join(" ")
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute right-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-l-full bg-gradient-to-b from-teal-300 to-teal-600 shadow-[0_0_12px_rgba(20,184,166,0.65)]" />
                          )}

                          <div className="flex items-center gap-3">
                            <div className={[
                              "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
                              isActive
                                ? "bg-teal-500/15 text-teal-300 ring-1 ring-teal-400/30"
                                : "bg-white/[0.03] text-slate-400 group-hover:bg-white/[0.06] group-hover:text-teal-300",
                            ].join(" ")}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="relative z-10">{item.label}</span>
                          </div>

                          <ChevronLeft
                            className={[
                              "h-4 w-4 transition-all duration-300",
                              isActive
                                ? "text-teal-300"
                                : "text-slate-600 group-hover:-translate-x-1 group-hover:text-teal-300",
                            ].join(" ")}
                          />
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                );
              })}
            </nav>

            <div className="relative border-t border-white/5 p-3">
              <Link
                to="/add-transaction"
                onClick={onClose}
                className="group mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-teal-500/15 to-teal-500/5 px-4 py-3 text-xs font-black text-teal-200 ring-1 ring-teal-400/25 transition-all duration-300 hover:from-teal-500/25 hover:to-teal-500/10 hover:text-white hover:ring-teal-400/40"
              >
                <BadgePlus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                <span>إضافة عملية جديدة</span>
              </Link>

              <Link
                to="/change-password"
                onClick={onClose}
                className="group mb-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 transition-all duration-300 hover:bg-white/[0.05] hover:text-white"
              >
                <KeyRound className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                تغيير كلمة المرور
              </Link>

              <DrawerLogoutButton onLogout={onClose} />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// # Drawer logout button
function DrawerLogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleClick() {
    if (loggingOut) return;
    setLoggingOut(true);
    await doLogout();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loggingOut}
      className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-rose-300 transition-all duration-300 hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loggingOut ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
      )}
      {loggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
    </button>
  );
}

// # Brand block (mobile/tablet)
function BrandBlock() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#0f172a] shadow-[inset_0_0_0_1px_rgba(20,184,166,0.30),0_6px_18px_-6px_rgba(15,23,42,0.30)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.20),transparent_65%)]" />
        <BrandOrbitLogo size={42} withGlow={false} />
      </div>
      <div className="min-w-0 text-right">
        <h2 className="truncate text-sm font-black leading-4 text-slate-900">
          الفرع الرئيسي
        </h2>
        <p className="mt-1 truncate text-[11px] font-bold text-slate-500">
          مدير النظام
        </p>
      </div>
    </div>
  );
}

// # Top action icon
function TopActionIcon({ icon: Icon, dot = false, active = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group relative flex h-12 w-12 items-center justify-center rounded-2xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-8px_rgba(30,41,59,0.20)] active:translate-y-0 active:scale-[0.98]",
        active
          ? "border-slate-300 text-slate-800"
          : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800",
      ].join(" ")}
    >
      <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
      {dot && (
        <span className="absolute right-3 top-3 flex h-2.5 w-2.5 items-center justify-center">
          <span className="absolute h-full w-full animate-ping rounded-full bg-rose-500/70" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
        </span>
      )}
    </button>
  );
}

// # Notifications dropdown
function NotificationsDropdown({ open, onClose }) {
  const notifications = [
    { id: 1, type: "in", title: "حركة استلام جديدة", desc: "محمد العتيبي · 25,000 USD", time: "منذ 5 دقائق", unread: true },
    { id: 2, type: "out", title: "تم تنفيذ تسليم", desc: "سارة الحربي · 18,750 SAR", time: "منذ 22 دقيقة", unread: true },
    { id: 3, type: "alert", title: "تنبيه أسعار صرف", desc: "USD/SAR ارتفع +0.35%", time: "منذ ساعة", unread: true },
    { id: 4, type: "in", title: "إيداع شركة الأفق", desc: "210,000 EUR", time: "أمس 4:12 م", unread: false },
    { id: 5, type: "out", title: "تم حذف حركة", desc: "TXN-44321-EUR", time: "أمس 11:08 ص", unread: false },
  ];

  const iconMap = {
    in: { Icon: ArrowDownLeft, bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-600" },
    out: { Icon: ArrowUpRight, bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-700" },
    alert: { Icon: AlertCircle, bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-600" },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-0 top-[calc(100%+12px)] z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
        >
          <div className="absolute -top-2 left-6 h-4 w-4 rotate-45 border-l border-t border-slate-200 bg-white" />
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-l from-slate-50 to-white px-4 py-3">
            <button type="button" className="text-[11px] font-bold text-slate-500 transition hover:text-slate-800">
              تعليم الكل كمقروء
            </button>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-600 ring-1 ring-rose-200">3</span>
              <h3 className="text-sm font-black text-slate-900">الإشعارات</h3>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {notifications.map((n) => {
              const conf = iconMap[n.type];
              const Icon = conf.Icon;
              return (
                <button
                  key={n.id}
                  type="button"
                  className="group flex w-full items-start gap-3 rounded-xl p-3 text-right transition-all duration-300 hover:bg-slate-50"
                >
                  {n.unread ? (
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-slate-700 to-slate-500 shadow-[0_0_6px_rgba(30,41,59,0.40)]" />
                  ) : (
                    <span className="mt-1 h-2 w-2 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 text-right">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {n.time}
                      </span>
                      <p className={["truncate text-sm transition-colors duration-200", n.unread ? "font-black text-slate-900" : "font-bold text-slate-600"].join(" ")}>
                        {n.title}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">{n.desc}</p>
                  </div>
                  <div className={["flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 group-hover:scale-110", conf.bg, conf.border, conf.text].join(" ")}>
                    <Icon className="h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-200 bg-slate-50/50 p-2">
            <button
              type="button"
              onClick={onClose}
              className="group flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-slate-700 transition-all duration-200 hover:bg-white hover:text-slate-900"
            >
              <span>عرض جميع الإشعارات</span>
              <ChevronLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// # Calendar popup
function CalendarPopup({ open }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const dayNames = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = new Date();
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function changeMonth(delta) {
    const next = new Date(viewDate);
    next.setMonth(viewDate.getMonth() + delta);
    setViewDate(next);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="absolute left-0 top-[calc(100%+12px)] z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
        >
          <div className="absolute -top-2 left-6 h-4 w-4 rotate-45 border-l border-t border-slate-200 bg-white" />

          <div className="mb-3 flex items-center justify-between rounded-xl bg-gradient-to-l from-slate-50 to-white p-2 ring-1 ring-slate-200/70">
            <button type="button" onClick={() => changeMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-white hover:text-slate-900 hover:shadow-sm">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="text-sm font-black text-slate-900">{monthNames[month]} {year}</div>
            <button type="button" onClick={() => changeMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-white hover:text-slate-900 hover:shadow-sm">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {dayNames.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, idx) => {
              if (!d) return <div key={idx} className="h-8" />;
              const date = new Date(year, month, d);
              const isToday = isSameDay(date, today);
              const isSelected = isSameDay(date, selected);
              return (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setSelected(date)}
                  className={[
                    "relative flex h-8 items-center justify-center rounded-lg text-xs font-bold transition-all duration-200",
                    isSelected
                      ? "bg-gradient-to-br from-slate-800 to-slate-700 text-white shadow-[0_4px_12px_-4px_rgba(30,41,59,0.40)]"
                      : isToday
                      ? "bg-slate-100 text-slate-900 ring-1 ring-slate-300"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                >
                  {d}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-slate-800" />
                  )}
                </motion.button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
            <button
              type="button"
              onClick={() => {
                setSelected(today);
                setViewDate(today);
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-700 transition hover:text-slate-900"
            >
              <Check className="h-3 w-3" />
              اليوم
            </button>
            <div className="text-[11px] font-bold text-slate-700">
              {selected.getDate()} {monthNames[selected.getMonth()]} {selected.getFullYear()}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Topbar;