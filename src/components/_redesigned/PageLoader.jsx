import { motion } from "framer-motion";
import BrandOrbitLogo from "./BrandOrbitLogo";

function PageLoader() {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[9999] overflow-hidden bg-[#f4f6fb]"
      style={{ color: "#0f172a" }}
    >
      {/* Soft accents */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.05),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.08),transparent_32%)]" />

      <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(15,23,42,0.55)_0.8px,transparent_0.8px)] [background-size:18px_18px]" />

      {/* Decorative side glows */}
      <div className="pointer-events-none absolute -top-24 right-1/2 h-[420px] w-[420px] translate-x-1/2 rounded-full bg-slate-200/50 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <BrandOrbitLogo size={120} />
          </motion.div>

          <motion.h1
            className="mt-8 text-3xl font-extrabold tracking-tight sm:text-4xl"
            style={{ color: "#1e293b" }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Exchange Pro
          </motion.h1>

          <motion.p
            className="mt-2 text-sm font-bold sm:text-base"
            style={{ color: "#475569" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            نظام إدارة الصرافة
          </motion.p>

          <motion.div
            className="mt-3 h-[2px] w-16 rounded-full bg-gradient-to-l from-transparent via-slate-500 to-transparent"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.6, delay: 0.18 }}
          />

          <motion.div
            className="mt-7 h-1.5 w-56 overflow-hidden rounded-full bg-slate-200 shadow-inner"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-slate-700 via-slate-500 to-slate-400"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{
                duration: 2.3,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            />
          </motion.div>

          <motion.p
            className="mt-6 text-xs font-medium text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            جارٍ تحضير لوحة التحكم...
          </motion.p>
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
