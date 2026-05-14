import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  Download,
  Edit3,
  Eye,
  Filter,
  MoreVertical,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";

import AnimatedNumber from "../shared/AnimatedNumber";
import ScrollReveal from "../shared/ScrollReveal";
import customersService from "../services/customers";


function mapCustomer(c) {
  return {
    id: c.id,
    name: c.name,
    email: c.email || c.note || "—",
    type: c.category === "company" ? "شركة" : "فرد",
    balance: c.balance ? `${c.balance.currency || ""} ${c.balance.amount || 0}` : "—",
    phone: c.phone,
    lastActivity: c.updated_at ? new Date(c.updated_at).toLocaleDateString("ar") : "—",
    status: c.is_active === false ? "غير نشط" : "نشط",
    _raw: c, 
  };
}

const customerStats = [
  {
    title: "إجمالي العملاء",
    value: 1248,
    icon: UsersRound,
    color: "cyan",
    note: "+12% منذ الشهر الماضي",
  },
  {
    title: "العملاء النشطون",
    value: 892,
    icon: UserRoundCheck,
    color: "blue",
    note: "71% نشاط",
  },
  {
    title: "إجمالي الأرصدة",
    value: 45200000,
    prefix: "$",
    icon: WalletCards,
    color: "violet",
    note: "+3.4% هذا الأسبوع",
  },
];

const initialCustomers = [
  {
    id: "ACC-98234-AED",
    name: "محمد أحمد",
    email: "mohammed.a@example.com",
    type: "فرد",
    balance: "AED 145,000.00",
    phone: "0599123456",
    lastActivity: "منذ ساعتين",
    status: "نشط",
  },
  {
    id: "ACC-87122-USD",
    name: "سارة خالد",
    email: "sara.k@example.com",
    type: "فرد",
    balance: "USD 32,450.50",
    phone: "0599234567",
    lastActivity: "أمس",
    status: "نشط",
  },
  {
    id: "CORP-44321-EUR",
    name: "شركة الأفق للتجارة",
    email: "info@horizon-trd.com",
    type: "شركة",
    balance: "EUR 210,000.00",
    phone: "0599345678",
    lastActivity: "منذ 3 أيام",
    status: "غير نشط",
  },
  {
    id: "ACC-11298-AED",
    name: "علي محمود",
    email: "ali.m@example.com",
    type: "فرد",
    balance: "AED 5,200.00",
    phone: "0599456789",
    lastActivity: "اليوم 10:30 ص",
    status: "معلق",
  },
];

const tableRowVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      delay: index * 0.07,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [editCustomer, setEditCustomer] = useState(null);


  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        const res = await customersService.list({ per_page: 50 });
     
        const list = Array.isArray(res) ? res : res.data || [];
        setCustomers(list.map(mapCustomer));
      } catch (err) {
        console.error("فشل تحميل العملاء:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, []);

  async function handleAddCustomer(newCustomer) {
    try {
    
      const res = await customersService.create(newCustomer);
      const created = res.data || res;
      setCustomers((prev) => [mapCustomer(created), ...prev]);
    } catch (err) {
      alert(err.response?.data?.message || "فشل إضافة العميل");
    }
  }

  async function handleDeleteCustomer(customerId) {
    if (!confirm("هل أنت متأكد من حذف العميل؟")) return;
    try {
      await customersService.remove(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      setActionId(null);
    } catch (err) {
      alert(err.response?.data?.message || "فشل حذف العميل");
    }
  }

  async function handleUpdateCustomer(updatedCustomer) {
    try {
      const res = await customersService.update(updatedCustomer.id, {
        name: updatedCustomer.name,
        phone: updatedCustomer.phone,
        category: updatedCustomer.type === "شركة" ? "company" : "regular",
      });
      const updated = res.data || res;
      setCustomers((prev) =>
        prev.map((c) => (c.id === updated.id ? mapCustomer(updated) : c))
      );
      setEditCustomer(null);
      setActionId(null);
    } catch (err) {
      alert(err.response?.data?.message || "فشل تعديل العميل");
    }
  }

  return (
    <div className="space-y-5">
      <AddCustomerModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddCustomer={handleAddCustomer}
      />

      <CustomerViewModal
        customer={viewCustomer}
        onClose={() => setViewCustomer(null)}
      />

      <CustomerEditModal
        customer={editCustomer}
        onClose={() => setEditCustomer(null)}
        onSave={handleUpdateCustomer}
      />


      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <ScrollReveal>
          <div className="min-w-0 text-right">
            <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
              العملاء
            </h1>
            <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
              إدارة سجلات العملاء وأرصدتهم وحساباتهم المالية.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-slate-700 active:bg-slate-900 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة عميل</span>
          </button>
        </ScrollReveal>
      </div>

 
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {customerStats.map((item, index) => (
          <ScrollReveal key={item.title} delay={index * 0.08}>
            <CustomerStatCard item={item} />
          </ScrollReveal>
        ))}
      </section>


      <ScrollReveal delay={0.1}>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-teal-400/30 hover:shadow-[0_10px_24px_-14px_rgba(30,41,59,0.18)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="group relative w-full lg:max-w-xl">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-focus-within:text-teal-500" />
              <input
                placeholder="البحث عن عميل بالاسم أو رقم الحساب..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-12 pl-4 text-right text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-teal-400/50 hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(45,212,191,0.12)]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-400/40 hover:text-teal-700 hover:shadow-[0_8px_22px_-8px_rgba(45,212,191,0.30)] active:translate-y-0 active:scale-[0.98]">
                <Filter className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                تصفية
              </button>

              <button className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-400/40 hover:text-teal-700 hover:shadow-[0_8px_22px_-8px_rgba(45,212,191,0.30)] active:translate-y-0 active:scale-[0.98]">
                <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
                تصدير
              </button>
            </div>
          </div>
        </div>
      </ScrollReveal>

 
      <ScrollReveal delay={0.14}>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-teal-400/30 hover:shadow-[0_14px_38px_-14px_rgba(45,212,191,0.20)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-right text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
                  <th className="px-5 py-4 font-bold">اسم العميل</th>
                  <th className="px-5 py-4 font-bold">رقم الحساب</th>
                  <th className="px-5 py-4 font-bold">الرصيد الحالي</th>
                  <th className="px-5 py-4 font-bold">آخر نشاط</th>
                  <th className="px-5 py-4 font-bold">الحالة</th>
                  <th className="px-5 py-4 text-center font-bold">الإجراءات</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer, index) => (
                  <motion.tr
                    key={customer.id}
                    variants={tableRowVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.25 }}
                    custom={index}
                    className="group border-b border-slate-100 transition-all duration-300 hover:bg-teal-50/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-4">
                        <div className="w-[220px] text-right">
                          <p className="text-base font-black leading-6 text-slate-900 transition-colors duration-300 group-hover:text-teal-700">
                            {customer.name}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {customer.email}
                          </p>
                        </div>

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50 text-teal-600 transition-all duration-300 group-hover:scale-110 group-hover:border-teal-400 group-hover:bg-teal-100 group-hover:shadow-[0_6px_18px_-4px_rgba(45,212,191,0.40)]">
                          {customer.type === "شركة" ? (
                            <Building2 className="h-5 w-5" />
                          ) : (
                            <UserRoundCheck className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div
                        dir="ltr"
                        className="text-right font-mono text-sm font-semibold tracking-wide text-slate-700 transition-colors duration-300 group-hover:text-teal-600"
                      >
                        {customer.id}
                      </div>
                    </td>

                    <td className="px-5 py-4 font-black text-slate-900 tabular-nums">
                      {customer.balance}
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      {customer.lastActivity}
                    </td>

                    <td className="px-5 py-4">
                      <CustomerStatus status={customer.status} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setViewCustomer(customer)}
                          className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-600 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-teal-400 hover:bg-teal-100 hover:shadow-[0_6px_18px_-4px_rgba(45,212,191,0.40)] active:scale-95"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setActionId((prev) =>
                                prev === customer.id ? null : customer.id
                              )
                            }
                            className="group/dots relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:border-slate-300 hover:text-slate-900 active:scale-95"
                          >
                            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-slate-200/70 to-transparent transition-transform duration-700 group-hover/dots:translate-x-full" />
                            <span className="pointer-events-none absolute inset-0 scale-0 rounded-xl bg-slate-100 opacity-0 transition-all duration-500 group-hover/dots:scale-100 group-hover/dots:opacity-100" />
                            <MoreVertical className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover/dots:scale-110" />
                          </button>

                          <AnimatePresence>
                            {actionId === customer.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 8, scale: 0.94 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.94 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                className="absolute left-0 top-12 z-50 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.14)]"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditCustomer(customer);
                                    setActionId(null);
                                  }}
                                  className="group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:bg-teal-50 hover:text-teal-700"
                                >
                                  <Edit3 className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
                                  تعديل
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomer(customer.id)}
                                  className="group flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-700"
                                >
                                  <Trash2 className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                                  حذف
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

         
          <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>عرض 1 إلى {customers.length} من 1,248 عميل</span>

            <div className="flex items-center gap-2">
              <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-400/40 hover:text-slate-900 active:translate-y-0 active:scale-[0.98]">
                السابق
              </button>

              <button className="rounded-lg bg-slate-800 px-3 py-2 font-bold text-white transition-colors duration-200 hover:bg-slate-700">
                1
              </button>

              <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-400/40 hover:text-slate-900 active:translate-y-0 active:scale-[0.98]">
                التالي
              </button>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}

function AddCustomerModal({ open, onClose, onAddCustomer }) {
  const [formData, setFormData] = useState({
    name: "",
    accountType: "فرد",
    balance: "",
    phone: "",
  });

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      return;
    }


    const newCustomer = {
      name: formData.name,
      phone: formData.phone,
      category: formData.accountType === "شركة" ? "company" : "regular",
      country: "Jordan",
      note: formData.balance ? `Initial balance: ${formData.balance}` : "",
    };

    onAddCustomer(newCustomer);

    setFormData({
      name: "",
      accountType: "فرد",
      balance: "",
      phone: "",
    });

    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/15 sm:p-5"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-300 hover:rotate-90 hover:border-rose-300 hover:text-rose-600"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-right">
                <h2 className="text-xl font-black text-slate-900">
                  إضافة عميل جديد
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  أدخل بيانات العميل الأساسية.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <FormInput
                label="اسم العميل"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="أدخل اسم العميل"
              />

              <FormSelect
                label="نوع الحساب"
                name="accountType"
                value={formData.accountType}
                onChange={handleChange}
              />

              <FormInput
                label="الرصيد"
                name="balance"
                value={formData.balance}
                onChange={handleChange}
                placeholder="مثال: 25000"
                inputMode="decimal"
              />

              <FormInput
                label="رقم الجوال"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="05XXXXXXXX"
              />

              <div className="mt-2 flex items-center justify-start gap-2">
                <button
                  type="submit"
                  className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-slate-700 active:bg-slate-900"
                >
                  حفظ العميل
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CustomerViewModal({ customer, onClose }) {
  return (
    <AnimatePresence>
      {customer && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/15 sm:p-5"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-300 hover:rotate-90 hover:border-rose-300 hover:text-rose-600"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-right">
                <h2 className="text-xl font-black text-slate-900">
                  معلومات العميل
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  تفاصيل الحساب والرصيد والحالة.
                </p>
              </div>
            </div>

            <motion.div
              variants={{
                visible: { transition: { staggerChildren: 0.05 } },
              }}
              initial="hidden"
              animate="visible"
              className="grid gap-3 sm:grid-cols-2"
            >
              <InfoBox label="اسم العميل" value={customer.name} />
              <InfoBox label="نوع الحساب" value={customer.type} />
              <InfoBox label="رقم الحساب" value={customer.id} dir="ltr" />
              <InfoBox label="الرصيد الحالي" value={customer.balance} />
              <InfoBox label="رقم الجوال" value={customer.phone || customer.email} />
              <InfoBox label="آخر نشاط" value={customer.lastActivity} />
              <InfoBox label="الحالة" value={customer.status} />
              <InfoBox label="التواصل" value={customer.email} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CustomerEditModal({ customer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    accountType: "فرد",
    balance: "",
    phone: "",
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        accountType: customer.type || "فرد",
        balance: customer.balance || "",
        phone: customer.phone || customer.email || "",
      });
    }
  }, [customer]);

  if (!customer) return null;

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.balance.trim() ||
      !formData.phone.trim()
    ) {
      return;
    }

    onSave({
      ...customer,
      name: formData.name,
      type: formData.accountType,
      balance: formData.balance,
      phone: formData.phone,
      email: formData.phone,
      lastActivity: "الآن",
    });
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/15 sm:p-5"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all duration-300 hover:rotate-90 hover:border-rose-300 hover:text-rose-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-right">
              <h2 className="text-xl font-black text-slate-900">تعديل العميل</h2>
              <p className="mt-1 text-xs text-slate-500">
                عدّل بيانات العميل الحالية.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <FormInput
              label="اسم العميل"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="أدخل اسم العميل"
            />

            <FormSelect
              label="نوع الحساب"
              name="accountType"
              value={formData.accountType}
              onChange={handleChange}
            />

            <FormInput
              label="الرصيد"
              name="balance"
              value={formData.balance}
              onChange={handleChange}
              placeholder="مثال: AED 25000"
              inputMode="decimal"
            />

            <FormInput
              label="رقم الجوال"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="05XXXXXXXX"
            />

            <div className="mt-2 flex items-center justify-start gap-2">
              <button
                type="submit"
                className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-bold text-white transition-colors duration-200 hover:bg-slate-700 active:bg-slate-900"
              >
                حفظ التعديل
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition-colors duration-200 hover:bg-slate-50 hover:text-slate-900"
              >
                إلغاء
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function FormInput({
  label,
  name,
  value,
  onChange,
  placeholder,
  inputMode = "text",
}) {
  return (
    <div>
      <label className="mb-2 block text-right text-xs font-bold text-slate-700">
        {label}
      </label>

      <input
        type="text"
        inputMode={inputMode}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-right text-sm text-slate-900 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-teal-400/50 hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(45,212,191,0.12)]"
      />
    </div>
  );
}

function FormSelect({ label, name, value, onChange }) {
  return (
    <div>
      <label className="mb-2 block text-right text-xs font-bold text-slate-700">
        {label}
      </label>

      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 pr-4 pl-12 text-right text-sm text-slate-900 outline-none transition-all duration-300 hover:border-teal-400/50 hover:bg-white focus:border-teal-500 focus:bg-white focus:shadow-[0_0_0_4px_rgba(45,212,191,0.12)]"
        >
          <option value="فرد">فرد</option>
          <option value="شركة">شركة</option>
        </select>

        <ChevronDown className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function InfoBox({ label, value, dir = "rtl" }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
      }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-right transition-all duration-300 hover:border-teal-400/40 hover:bg-white hover:shadow-[0_8px_22px_-10px_rgba(45,212,191,0.30)]"
    >
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p dir={dir} className="mt-2 text-sm font-black text-slate-900">
        {value}
      </p>
    </motion.div>
  );
}

function CustomerStatCard({ item }) {
  const Icon = item.icon;

  const colors = {
    cyan: { fill: "#f0fdfa", border: "#99f6e4", text: "#0d9488", glow: "rgba(45,212,191,0.22)" },
    blue: { fill: "#ecfeff", border: "#a5f3fc", text: "#0891b2", glow: "rgba(34,211,238,0.22)" },
    violet: { fill: "#ccfbf1", border: "#5eead4", text: "#115e59", glow: "rgba(20,184,166,0.20)" },
  };

  const c = colors[item.color];

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="group relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] transition-all duration-500 hover:border-teal-400/40 hover:shadow-[0_14px_30px_-16px_rgba(30,41,59,0.20)]"
    >
      <div
        className="pointer-events-none absolute -left-8 -top-8 h-32 w-32 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: c.glow }}
      />

      <div
        className="pointer-events-none absolute inset-x-5 top-0 h-[2px] origin-left scale-x-0 rounded-full transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: `linear-gradient(to left, ${c.text}, transparent)` }}
      />

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div
          className="rounded-xl border p-3 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-4deg]"
          style={{ background: c.fill, borderColor: c.border, color: c.text }}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="text-right">
          <p className="text-xs font-semibold text-slate-500">{item.title}</p>

          <div className="mt-5 text-3xl font-black text-slate-800 sm:text-4xl">
            <AnimatedNumber
              value={item.value}
              prefix={item.prefix || ""}
              suffix=""
            />
          </div>

          <p className="mt-3 text-xs font-bold text-emerald-600">{item.note}</p>
        </div>
      </div>
    </motion.div>
  );
}

function CustomerStatus({ status }) {
  const styles = {
    نشط: "border-emerald-200 bg-emerald-50 text-emerald-700",
    "غير نشط": "border-slate-200 bg-slate-50 text-slate-600",
    معلق: "border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black transition-all duration-300 group-hover:scale-105 ${styles[status]}`}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

export default CustomersPage;