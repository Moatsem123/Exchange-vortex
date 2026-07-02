import { useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Home,
  UserRound,
  ArrowLeftRight,
  PlusCircle,
  Wallet,
  DollarSign,
  BarChart3,
  Bell,
  Archive,
  ShieldCheck,
  KeyRound,
  Settings,
  LogOut,
  ReceiptText,
  PiggyBank,
  Scale,
} from "lucide-react";
import BrandOrbitLogo from "../../shared/BrandOrbitLogo";
import { useAuth } from "../../context/AuthContext";

const SECTIONS = [
  {
    label: "الرئيسية",
    items: [
      {
        to: "/dashboard",
        label: "لوحة التحكم",
        icon: Home,
      },
    ],
  },
  {
    label: "النظام والإدارة",
    items: [
      {
        to: "/customers",
        label: "العملاء",
        icon: UserRound,
        permissions: [
          "customer.viewAny",
          "customer.view",
          "customer.create",
          "customer.update",
          "customer.delete",
          "customer.viewBalance",
          "customer.viewStatement",
        ],
      },
      {
        to: "/transactions",
        label: "المعاملات",
        icon: ArrowLeftRight,
        permissions: [
          "transaction.viewAny",
          "transaction.view",
          "transaction.create",
          "transaction.update",
          "transaction.delete",
          "transaction.restore",
          "transaction.forceDelete",
          "transaction.export",
          "operation.viewAny",
          "operation.view",
          "operation.create",
          "operation.update",
          "operation.complete",
          "operation.cancel",
        ],
      },
      {
        to: "/add-transaction",
        label: "إضافة معاملة",
        icon: PlusCircle,
        permissions: ["transaction.create", "operation.create"],
      },
      {
        to: "/boxes",
        label: "الصناديق",
        icon: Wallet,
        permissions: [
          "vault.viewAny",
          "vault.view",
          "vault.update",
          "box.viewAny",
          "box.view",
          "box.create",
          "box.update",
          "box.delete",
          "box.adjust",
        ],
      },
      {
        to: "/capital",
        label: "رأس المال",
        icon: PiggyBank,
        permissions: [
          "capital.viewAny",
          "capital.view",
          "capital.manage",
          "capital.deposit",
          "capital.withdraw",
          "capital.transfer",
          "capital.transferToBox",
        ],
      },
      {
        to: "/expenses",
        label: "المصروفات",
        icon: ReceiptText,
        permissions: [
          "expense.viewAny",
          "expense.view",
          "expense.create",
          "expense.update",
          "expense.delete",
          "capital.view",
          "capital.manage",
        ],
      },
      {
        to: "/reconciliation",
        label: "التسوية العامة",
        icon: Scale,
        permissions: [
          "reconciliation.viewAny",
          "reconciliation.view",
          "reconciliation.run",
          "reconciliation.history",
          "reconciliation.manage",
          "capital.view",
          "box.viewAny",
        ],
      },
      {
        to: "/currencies",
        label: "العملات وأسعار الصرف",
        icon: DollarSign,
        permissions: [
          "currency.viewAny",
          "currency.manage",
          "exchange_rate.update",
          "exchange-rate.viewAny",
          "exchange-rate.update",
        ],
      },
      {
        to: "/reports",
        label: "التقارير",
        icon: BarChart3,
        permissions: [
          "report.daily",
          "report.monthly",
          "report.export",
          "report.viewAll",
          "report.profit",
          "report.capital",
          "report.expense",
        ],
      },
    ],
  },
  {
    label: "المتابعة والتنبيهات",
    items: [
      {
        to: "/notifications",
        label: "الإشعارات",
        icon: Bell,
        badge: true,
        permissions: ["notification.viewAny", "notification.read", "notification.delete"],
      },
      {
        to: "/archive",
        label: "الأرشيف",
        icon: Archive,
        permissions: ["archive.view", "archive.restore"],
      },
    ],
  },
  {
    label: "إدارة الصفحات والمستخدمون",
    items: [
      {
        to: "/users",
        label: "المستخدمون",
        icon: UserRound,
        permissions: [
          "user.viewAny",
          "user.view",
          "user.create",
          "user.update",
          "user.delete",
          "user.setVaultBalance",
        ],
      },
      {
        to: "/roles",
        label: "الأدوار",
        icon: ShieldCheck,
        ownerOrAdminOnly: true,
      },
      {
        to: "/permissions",
        label: "الصلاحيات",
        icon: KeyRound,
        ownerOrAdminOnly: true,
      },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      {
        to: "/change-password",
        label: "تغيير كلمة المرور",
        icon: KeyRound,
      },
      {
        to: "/settings",
        label: "الإعدادات",
        icon: Settings,
        permissions: ["settings.view", "settings.manage", "setting.view", "setting.update"],
      },
    ],
  },
];

function Sidebar({ onClose, unreadCount = 0 }) {
  const { logout, isAdmin, user, permissions = [], roleKeys = [], hasPermission } = useAuth();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const isOwnerOrAdmin =
    isAdmin ||
    user?.is_admin === true ||
    user?.is_owner === true ||
    user?.email === "owner@exchange.com" ||
    roleKeys.includes("owner") ||
    roleKeys.includes("admin") ||
    roleKeys.includes("super-admin") ||
    roleKeys.includes("super_admin") ||
    roleKeys.includes("مالك");

  function canSee(item) {
    if (isOwnerOrAdmin) return true;
    if (item.ownerOrAdminOnly) return false;
    if (!item.permissions || item.permissions.length === 0) return true;

    if (typeof hasPermission === "function") {
      return hasPermission(item.permissions);
    }

    return item.permissions.some((permission) => permissions.includes(permission));
  }

  function handleConfirmLogout() {
    setConfirmLogout(false);
    onClose?.();
    logout();
  }

  return (
    <>
      <style>{`
        .sidebar-nav::-webkit-scrollbar {
          display: none;
        }

        .sidebar-nav {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <aside
        className="relative flex h-screen w-72 flex-col overflow-hidden text-slate-200"
        style={{ background: "hsl(212, 96%, 11%)" }}
        dir="rtl"
      >
        <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.14),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_50%)]" />

        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="relative border-b border-white/5 px-5 py-5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-400/25 bg-teal-500/10">
              <BrandOrbitLogo size={42} withGlow={false} />
            </div>

            <div className="min-w-0 flex-1 text-right">
              <h2 className="truncate text-lg font-black leading-5 text-white">
                نظام إدارة الصرافة
              </h2>
              <p className="mt-1 text-[12px] text-slate-400">لوحة الإدارة</p>
            </div>
          </div>
        </motion.div>

        <nav className="sidebar-nav relative flex-1 overflow-y-auto px-3 py-4">
          {SECTIONS.map((section) => {
            const items = section.items.filter(canSee);
            if (items.length === 0) return null;

            return (
              <div key={section.label} className="mb-4">
                <p className="mb-2 px-4 text-right text-[11px] font-black text-slate-500">
                  {section.label}
                </p>

                <ul className="space-y-1">
                  {items.map((item, index) => {
                    const Icon = item.icon;

                    return (
                      <motion.li
                        key={item.to}
                        initial={{ x: 12, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.25, delay: index * 0.02 }}
                      >
                        <NavLink
                          to={item.to}
                          end
                          onClick={onClose}
                          className={({ isActive }) =>
                            [
                              "group flex h-12 w-full items-center justify-between rounded-xl px-4 text-sm font-black transition",
                              isActive
                                ? "bg-teal-600 text-white shadow-lg shadow-teal-900/20"
                                : "text-slate-300 hover:bg-white/5 hover:text-white",
                            ].join(" ")
                          }
                        >
                          {({ isActive }) => (
                            <>
                              <div className="flex w-full items-center justify-between gap-3">
                                <span className="truncate text-right">{item.label}</span>

                                <Icon
                                  className={[
                                    "h-[18px] w-[18px] shrink-0 transition",
                                    isActive ? "text-white" : "text-slate-400 group-hover:text-white",
                                  ].join(" ")}
                                />
                              </div>

                              {item.badge && unreadCount > 0 && (
                                <span className="mr-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-black text-white">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              )}
                            </>
                          )}
                        </NavLink>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="relative border-t border-white/5 px-3 py-3">
          <motion.button
            type="button"
            onClick={() => setConfirmLogout(true)}
            initial={{ x: 12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="group flex h-12 w-full items-center justify-between rounded-xl px-4 text-sm font-black text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-200"
          >
            <div className="flex w-full items-center justify-between gap-3">
              <span className="truncate text-right">تسجيل الخروج</span>
              <LogOut className="h-[18px] w-[18px] shrink-0 text-slate-400 transition group-hover:text-rose-300" />
            </div>
          </motion.button>
        </div>
      </aside>

      <LogoutConfirmDialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}

function LogoutConfirmDialog({ open, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
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
    </AnimatePresence>
  );
}

export default Sidebar;