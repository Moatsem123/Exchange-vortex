import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function AppLayout() {
  const location = useLocation();

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.07),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(13,148,136,0.05),transparent_32%)]" />

      <div className="relative z-10 flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col xl:mr-64">
          <Topbar />

          <main className="flex-1 overflow-x-hidden p-4 sm:p-5 lg:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
