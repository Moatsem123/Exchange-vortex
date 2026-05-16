import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Home, UserRound, ArrowLeftRight, PlusCircle, Wallet, DollarSign,
  TrendingUp, BarChart3, Bell, Archive, ShieldCheck,
  KeyRound, Settings, LogOut,
} from "lucide-react";
import BrandOrbitLogo from "../../shared/BrandOrbitLogo";
import { useAuth } from "../../context/AuthContext";

const SECTIONS = [
  {
    label: "الرئيسية",
    items: [{ to: "/dashboard", label: "لوحة التحكم", icon: Home }],
  },
  {
    label: "النظام والإدارة",
    items: [
      { to: "/customers", label: "العملاء", icon: UserRound },
      { to: "/transactions", label: "المعاملات", icon: ArrowLeftRight },
      { to: "/add-transaction", label: "إضافة معاملة", icon: PlusCircle },
      { to: "/funds", label: "الحسابات والصناديق", icon: Wallet },
      { to: "/currencies", label: "العملات", icon: DollarSign },
      { to: "/exchange-rates", label: "أسعار الصرف", icon: TrendingUp },
      { to: "/reports", label: "التقارير", icon: BarChart3 },
    ],
  },
  {
    label: "المتابعة والتنبيهات",
    items: [
      { to: "/notifications", label: "الإشعارات", icon: Bell, badge: true },
      { to: "/archive", label: "الأرشيف", icon: Archive },
    ],
  },
  {
    label: "الإعدادات",
    items: [
      { to: "/users", label: "المستخدمون والصلاحيات", icon: ShieldCheck, adminOnly: true },
      { to: "/change-password", label: "تغيير كلمة المرور", icon: KeyRound },
      { to: "/settings", label: "الإعدادات", icon: Settings, adminOnly: true },
    ],
  },
];

function Sidebar({ onClose, unreadCount = 0 }) {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();

  return (
    <aside
      className="relative flex h-screen w-72 flex-col overflow-hidden text-slate-200"
      style={{ background: "hsl(212, 96%, 11%)" }}
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.14),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_50%)]" />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-64 opacity-25"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 80%, rgba(180, 144, 76, 0.18) 0%, transparent 45%), radial-gradient(circle at 75% 95%, rgba(190, 130, 60, 0.12) 0%, transparent 50%)",
        }}
      />

      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative border-b border-white/5 px-5 py-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-400/25 bg-teal-500/10 shadow-[0_0_24px_rgba(13,148,136,0.18)]">
            <BrandOrbitLogo size={42} withGlow={false} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black leading-5 text-white truncate">نظام إدارة الصرافة</h2>
            <p className="mt-1 text-[12px] text-slate-400">لوحة الإدارة</p>
          </div>
        </div>
      </motion.div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-4">
        {SECTIONS.map((section) => {
          const items = section.items.filter((it) => !it.adminOnly || isAdmin);
          if (items.length === 0) return null;

          return (
            <div key={section.label} className="mb-2">
              <p className="ep-sidebar-section">{section.label}</p>
              <ul className="space-y-1">
                {items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <motion.li
                      key={item.to}
                      initial={{ x: 12, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ duration: 0.3, delay: idx * 0.03 }}
                    >
                      <NavLink
                        to={item.to}
                        onClick={onClose}
                        className={({ isActive }) => `ep-sidebar-link ${isActive ? "active" : ""}`}
                      >
                        {({ isActive }) => (
                          <>
                            <div className="flex items-center gap-3">
                              <Icon className={`h-[18px] w-[18px] ${isActive ? "text-white" : "text-slate-400"}`} />
                              <span>{item.label}</span>
                            </div>
                            {item.badge && unreadCount > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-black text-white">
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

      <div className="relative border-t border-white/10 p-3">
        <button
          type="button"
          onClick={logout}
          className="ep-sidebar-link w-full justify-start hover:bg-rose-500/15 hover:text-rose-200"
        >
          <div className="flex items-center gap-3">
            <LogOut className="h-[18px] w-[18px]" />
            <span>تسجيل الخروج</span>
          </div>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;