import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home,
  UserRound,
  ArrowLeftRight,
  PlusCircle,
  Wallet,
  DollarSign,
  TrendingUp,
  BarChart3,
  Bell,
  Archive,
  ShieldCheck,
  KeyRound,
  Settings,
  LogOut,
} from "lucide-react";
import BrandOrbitLogo from "../../shared/BrandOrbitLogo";
import { useAuth } from "../../context/AuthContext";

function getRoleKeys(user) {
  const keys = [];

  if (typeof user?.role === "string") keys.push(user.role);

  if (user?.role && typeof user.role === "object") {
    keys.push(user.role.name, user.role.slug, user.role.key, user.role.code);
  }

  if (Array.isArray(user?.roles)) {
    user.roles.forEach((role) => {
      if (typeof role === "string") keys.push(role);
      if (role && typeof role === "object") {
        keys.push(role.name, role.slug, role.key, role.code);
      }
    });
  }

  return keys.filter(Boolean).map((key) => String(key).toLowerCase());
}

function getPermissionKeys(user) {
  const keys = [];

  function collect(value) {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach(collect);
      return;
    }

    if (typeof value === "string") {
      keys.push(value);
      return;
    }

    if (typeof value === "object") {
      keys.push(value.name, value.slug, value.key, value.code);
      collect(value.permissions);
    }
  }

  collect(user?.permissions);
  collect(user?.role?.permissions);
  collect(user?.roles);

  return keys.filter(Boolean).map((key) => String(key));
}

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
        permissions: ["customer.viewAny", "customer.view", "customers.view"],
      },
      {
        to: "/transactions",
        label: "المعاملات",
        icon: ArrowLeftRight,
        permissions: ["transaction.viewAny", "transaction.view", "transactions.view"],
      },
      {
        to: "/add-transaction",
        label: "إضافة معاملة",
        icon: PlusCircle,
        permissions: ["transaction.create", "transaction.store", "transactions.create"],
      },
      {
        to: "/funds",
        label: "الحسابات والصناديق",
        icon: Wallet,
        permissions: ["fund.viewAny", "fund.view", "funds.view"],
      },
      {
        to: "/currencies",
        label: "العملات",
        icon: DollarSign,
        permissions: ["currency.viewAny", "currency.view", "currencies.view"],
      },
      {
        to: "/exchange-rates",
        label: "أسعار الصرف",
        icon: TrendingUp,
        permissions: ["exchange-rate.viewAny", "exchange-rate.view", "exchange_rates.view"],
      },
      {
        to: "/reports",
        label: "التقارير",
        icon: BarChart3,
        permissions: ["report.daily", "report.monthly", "reports.view"],
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
        permissions: ["notification.viewAny", "notification.view", "notifications.view"],
      },
      {
        to: "/archive",
        label: "الأرشيف",
        icon: Archive,
        permissions: ["archive.viewAny", "archive.view"],
      },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      {
        to: "/users-permissions",
        label: "المستخدمون والصلاحيات",
        icon: ShieldCheck,
        ownerOrAdminOnly: true,
      },
      {
        to: "/change-password",
        label: "تغيير كلمة المرور",
        icon: KeyRound,
      },
      {
        to: "/settings",
        label: "الإعدادات",
        icon: Settings,
        ownerOrAdminOnly: true,
      },
    ],
  },
];

function Sidebar({ onClose, unreadCount = 0 }) {
  const { logout, isAdmin, user } = useAuth();

  const roleKeys = getRoleKeys(user);
  const permissions = getPermissionKeys(user);
  const userText = JSON.stringify(user || {}).toLowerCase();

  const isOwnerOrAdmin =
    isAdmin ||
    user?.is_admin === true ||
    user?.is_owner === true ||
    user?.email === "owner@exchange.com" ||
    roleKeys.includes("admin") ||
    roleKeys.includes("owner") ||
    roleKeys.includes("مدير") ||
    roleKeys.includes("مالك") ||
    userText.includes("admin") ||
    userText.includes("owner") ||
    userText.includes("مدير") ||
    userText.includes("مالك");

  function canSee(item) {
    if (isOwnerOrAdmin) return true;
    if (item.ownerOrAdminOnly) return false;
    if (!item.permissions) return true;
    return item.permissions.some((permission) => permissions.includes(permission));
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
            <div key={section.label} className="mb-3">
              <p className="mb-2 px-4 text-right text-[11px] font-black text-slate-500">
                {section.label}
              </p>

              <ul className="space-y-1">
                {items.map((item, idx) => {
                  const Icon = item.icon;

                  return (
                    <motion.li
                      key={item.to}
                      initial={{ x: 12, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.25, delay: idx * 0.02 }}
                    >
                      <NavLink
                        to={item.to}
                        end
                        onClick={onClose}
                        className={({ isActive }) =>
                          [
                            "group flex h-12 w-full items-center justify-between rounded-xl px-4 text-sm font-black transition",
                            isActive
                              ? "bg-teal-600 text-white"
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
                                  isActive
                                    ? "text-white"
                                    : "text-slate-400 group-hover:text-white",
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

      {/* Fixed logout button to match other menu items */}
      <div className="relative border-t border-white/5 px-3 py-3">
        <motion.button
          type="button"
          onClick={logout}
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
    </>
  );
}

export default Sidebar;