import { motion } from "framer-motion";

function PageHeader({ title, subtitle, icon: Icon, actions, breadcrumb }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="flex items-start justify-start gap-4 text-right">
        {actions && <div className="flex shrink-0 items-center gap-2 sm:hidden">{actions}</div>}

        <div className="min-w-0 flex-1 text-right">
          {breadcrumb && <p className="mb-1 text-xs font-medium text-slate-400" dir="rtl">{breadcrumb}</p>}
          <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">{subtitle}</p>}
        </div>

        {Icon && (
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-700 shadow-sm sm:flex">
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>

      {actions && <div className="hidden shrink-0 items-center gap-2 sm:flex">{actions}</div>}
    </motion.div>
  );
}

export default PageHeader;