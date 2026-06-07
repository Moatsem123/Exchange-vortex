import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import notificationsService from "../../services/notifications";

function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const res = await notificationsService.unreadCount();
      const count = res?.data?.count ?? res?.count ?? res?.data ?? 0;
      setUnreadCount(Number(count) || 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  useEffect(() => {
    const intervalId = setInterval(refreshUnreadCount, 60000);
    return () => clearInterval(intervalId);
  }, [refreshUnreadCount]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#f4f6fb] text-slate-900" dir="rtl">
      <div className="fixed right-0 top-0 z-30 hidden h-screen xl:block">
        <Sidebar unreadCount={unreadCount} />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm xl:hidden"
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 z-50 xl:hidden"
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="absolute -left-12 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur"
                >
                  <X className="h-5 w-5" />
                </button>

                <Sidebar onClose={() => setMobileOpen(false)} unreadCount={unreadCount} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-col xl:mr-72">
        <Topbar
          onOpenSidebar={() => setMobileOpen(true)}
          unreadCount={unreadCount}
          refreshUnreadCount={refreshUnreadCount}
        />

        <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto max-w-screen-2xl"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default AppLayout;