import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, AlertCircle, Info, X } from "lucide-react";

const ToastContext = createContext(null);

const TYPES = {
  success: { icon: Check, iconBg: "bg-emerald-500" },
  error: { icon: X, iconBg: "bg-rose-500" },
  info: { icon: Info, iconBg: "bg-sky-500" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((p) => [...p, { id, type, message }]);
      setTimeout(() => remove(id), 3500);
    },
    [remove]
  );

  const api = {
    success: (m) => push("success", m),
    error: (m) => push("error", m),
    info: (m) => push("info", m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed top-5 left-1/2 z-[9999] flex -translate-x-1/2 flex-col items-center gap-2"
        dir="rtl"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const conf = TYPES[t.type] || TYPES.info;
            const Icon = conf.icon;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onClick={() => remove(t.id)}
                className="pointer-events-auto flex cursor-pointer items-center gap-3 rounded-full bg-[#2b2f36] px-4 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/5"
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${conf.iconBg}`}
                >
                  <Icon className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </div>
                <p className="whitespace-nowrap text-sm font-semibold text-white">
                  {t.message}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { success: () => {}, error: () => {}, info: () => {} };
  return ctx;
}