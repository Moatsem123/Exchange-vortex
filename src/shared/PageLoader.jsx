import { motion } from "framer-motion";
import BrandOrbitLogo from "./BrandOrbitLogo";

function PageLoader() {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#f4f6fb] p-4"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.10),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.06),transparent_35%)]" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative flex w-full max-w-[360px] flex-col items-center text-center"
      >
        <div className="mb-5">
          <BrandOrbitLogo size={88} />
        </div>

        <h2 className="text-xl font-black text-slate-900 sm:text-2xl">
          Exchange Pro
        </h2>
        <p className="mt-1 text-sm font-bold text-slate-500">
          نظام إدارة الصرافة
        </p>

        <div className="mt-6 w-full max-w-[260px]">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <motion.div
              className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-teal-500 to-emerald-500"
              initial={{ width: "0%" }}
              animate={{ width: ["0%", "70%", "100%"] }}
              transition={{
                duration: 1.6,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            />
          </div>
          <p className="mt-3 text-xs font-bold text-slate-500">
            جاري تحميل لوحة التحكم...
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default PageLoader;