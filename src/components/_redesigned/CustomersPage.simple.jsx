// ===============================================================
// CustomersPage.simple.jsx — مثال بسيط لاستعمال خدمة العملاء
// ===============================================================
// النمط: useState للبيانات + useEffect لما تفتح الصفحة + try/catch
// نفس النمط بنفع لأي صفحة (حركات، عملات، تقارير ...)
// ===============================================================

import { useEffect, useState } from "react";
import customersService from "../services/customersService";

function CustomersPage() {
  // 1) ثلاث حالات أساسية: البيانات، التحميل، الخطأ
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2) أول ما تفتح الصفحة → استلم البيانات من الـ API
  useEffect(() => {
    async function fetchCustomers() {
      try {
        setLoading(true);
        const res = await customersService.getAll();
        // Laravel غالبًا يرجّع { data: [...] } — لو رجّع مصفوفة مباشرة بشتغل برضو
        setCustomers(res.data || res);
      } catch (err) {
        setError(err.message || "فشل تحميل العملاء");
      } finally {
        setLoading(false);
      }
    }

    fetchCustomers();
  }, []);

  // 3) إضافة عميل جديد (سلم بيانات للـ API)
  async function handleAdd() {
    try {
      const newCustomer = await customersService.create({
        name: "عميل جديد",
        phone: "0790000000",
      });
      // أضفه على القائمة الحالية بدون إعادة تحميل
      setCustomers((prev) => [...prev, newCustomer.data || newCustomer]);
    } catch (err) {
      alert(err.message || "فشل إضافة العميل");
    }
  }

  // 4) حذف عميل
  async function handleDelete(id) {
    if (!confirm("متأكد بدك تحذف؟")) return;
    try {
      await customersService.remove(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.message || "فشل الحذف");
    }
  }

  // 5) العرض
  if (loading) return <div className="p-6">جارٍ التحميل...</div>;
  if (error) return <div className="p-6 text-rose-600">{error}</div>;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900">العملاء</h1>
        <button
          onClick={handleAdd}
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700"
        >
          إضافة عميل
        </button>
      </div>

      <div className="space-y-2">
        {customers.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3"
          >
            <span className="font-bold text-slate-900">{c.name}</span>
            <button
              onClick={() => handleDelete(c.id)}
              className="rounded-lg bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              حذف
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default CustomersPage;
