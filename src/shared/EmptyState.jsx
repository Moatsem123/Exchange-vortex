import { Inbox } from "lucide-react";
import { motion } from "framer-motion";

function EmptyState({ icon: Icon = Inbox, title = "لا توجد بيانات", description = "", action }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
        <Icon className="h-7 w-7" />
      </div>
      <div>
        <p className="text-sm font-black text-slate-700">{title}</p>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </motion.div>
  );
}

export default EmptyState;