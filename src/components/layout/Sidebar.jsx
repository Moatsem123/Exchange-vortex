import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  BadgePlus,
  BanknoteArrowDown,
  ChartNoAxesColumnIncreasing,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  UserRoundCheck,
} from "lucide-react";

import BrandOrbitLogo from "../../shared/BrandOrbitLogo";
import api from "../../services/api"; 


const navItems = [
  { label: "الرئيسية", path: "/dashboard", icon: LayoutDashboard },
  { label: "العملاء", path: "/customers", icon: UserRoundCheck },
  { label: "الحركات", path: "/transactions", icon: ArrowRightLeft },
  { label: "إضافة عملية", path: "/add-transaction", icon: BadgePlus },
  { label: "التقارير", path: "/reports", icon: ChartNoAxesColumnIncreasing },
];

function Sidebar() {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);


  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
   
      await api.post("/auth/logout");
    } catch {
   
    }
 
    localStorage.removeItem("token");
    delete api.defaults.headers.common["Authorization"];
  
    window.location.href = "/login";
  }

  return (
    <motion.aside
      initial={{ x: 30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="fixed right-0 top-0 z-40 hidden h-screen w-64 flex-col border-l border-slate-800 bg-[#1e293b] text-slate-200 xl:flex"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.10),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.08),transparent_45%)]" />

      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative border-b border-white/5 p-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-400/25 bg-teal-500/10 shadow-[0_0_24px_rgba(20,184,166,0.18)] transition-all duration-300 hover:scale-105 hover:border-teal-400/45">
            <BrandOrbitLogo size={44} withGlow={false} />
          </div>

          <div>
            <h2 className="text-xl font-black leading-5 text-white">
              Exchange Pro
            </h2>
            <p className="mt-1 text-xs text-slate-400">نظام إدارة الصرافة</p>
          </div>
        </div>
      </motion.div>

      <nav className="relative flex-1 space-y-1 px-3 py-4">
        {navItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.path}
              initial={{ x: 18, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{
                duration: 0.4,
                delay: 0.15 + index * 0.045,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  [
                    "group relative flex w-full items-center justify-between overflow-hidden rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ease-out",
                    isActive
                      ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(20,184,166,0.28)]"
                      : "text-slate-400 hover:translate-x-[-2px] hover:bg-white/[0.05] hover:text-white",
                  ].join(" ")
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-indicator"
                        className="absolute right-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-l-full bg-gradient-to-b from-teal-300 to-teal-600 shadow-[0_0_12px_rgba(20,184,166,0.65)]"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}

                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-teal-400/[0.07] to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                    <span className="relative z-10">{item.label}</span>

                    <Icon
                      className={[
                        "relative z-10 h-5 w-5 transition-all duration-300",
                        isActive
                          ? "scale-110 text-teal-300"
                          : "group-hover:scale-110 group-hover:text-teal-300",
                      ].join(" ")}
                    />
                  </>
                )}
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      <motion.div
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        className="relative border-t border-white/5 p-3"
      >
        <NavLink
          to="/add-transaction"
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-xs font-bold text-slate-200 ring-1 ring-white/10 transition-colors duration-200 hover:bg-white/10 hover:text-white"
        >
          <BanknoteArrowDown className="h-4 w-4" />
          <span>إضافة عملية جديدة</span>
        </NavLink>

        <button
          type="button"
          onClick={() => navigate("/change-password")}
          className="group mb-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-400 transition-all duration-300 hover:bg-white/[0.05] hover:text-white"
        >
          <KeyRound className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
          تغيير كلمة المرور
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="group flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-rose-300 transition-all duration-300 hover:bg-rose-500/10 hover:text-rose-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
          )}
          {loggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
        </button>
      </motion.div>
    </motion.aside>
  );
}

export function MobileBrand() {
  return (
    <div className="flex items-center justify-center py-4 xl:hidden">
      <div className="flex flex-col items-center text-center">
        <BrandOrbitLogo size={82} />

        <h2 className="mt-2 text-lg font-black text-teal-600 sm:text-xl">
          Exchange Pro
        </h2>

        <p className="mt-0.5 text-xs text-slate-500">نظام إدارة الصرافة</p>
      </div>
    </div>
  );
}

export default Sidebar;