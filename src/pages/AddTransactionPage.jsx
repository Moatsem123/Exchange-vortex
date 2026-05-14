import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  Calculator,
  CalendarDays,
  Check,
  Coins,
  CreditCard,
  FileText,
  Hash,
  Minus,
  Percent,
  Phone,
  Plus,
  Save,
  Search,
  UserPlus,
  UserRoundCheck,
  X,
} from "lucide-react";

import ScrollReveal from "../shared/ScrollReveal";

const existingCustomers = [
  { id: 1, name: "محمد أحمد", phone: "0599123456", type: "فرد", country: "الإمارات" },
  { id: 2, name: "سارة خالد", phone: "0599234567", type: "فرد", country: "السعودية" },
  { id: 3, name: "شركة الأفق للتجارة", phone: "0599345678", type: "شركة", country: "الإمارات" },
  { id: 4, name: "علي محمود", phone: "0599456789", type: "فرد", country: "الأردن" },
  { id: 5, name: "أحمد المحمود", phone: "0599567890", type: "فرد", country: "تركيا" },
];

const currencies = [
  { code: "USD", name: "الدولار الأمريكي", symbol: "$", rate: 1 },
  { code: "EUR", name: "اليورو", symbol: "€", rate: 0.92 },
  { code: "AED", name: "الدرهم الإماراتي", symbol: "د.إ", rate: 3.67 },
  { code: "SAR", name: "الريال السعودي", symbol: "ر.س", rate: 3.75 },
  { code: "JOD", name: "الدينار الأردني", symbol: "د.أ", rate: 0.71 },
  { code: "TRY", name: "الليرة التركية", symbol: "₺", rate: 32.5 },
];

function AddTransactionPage() {
  // Customer mode
  const [customerMode, setCustomerMode] = useState("existing");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);

  // New customer fields
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    type: "فرد",
    country: "",
  });

  // Transaction details
  const [txType, setTxType] = useState("receive");
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState("1.0000");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Commission
  const [commissionMode, setCommissionMode] = useState("none"); // none | add | subtract
  const [commissionPercent, setCommissionPercent] = useState("");
  const [notes, setNotes] = useState("");

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return existingCustomers;
    return existingCustomers.filter((c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
    );
  }, [customerSearch]);

  const computed = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const r = parseFloat(rate) || 1;
    const pct = parseFloat(commissionPercent) || 0;

    const usdValue = amt / r;
    let commissionValue = 0;
    let finalAmount = amt;

    if (commissionMode === "add" && pct > 0) {
      commissionValue = (amt * pct) / 100;
      finalAmount = amt + commissionValue;
    } else if (commissionMode === "subtract" && pct > 0) {
      commissionValue = (amt * pct) / 100;
      finalAmount = amt - commissionValue;
    }

    return {
      usdValue,
      commissionValue,
      finalAmount,
      finalUsdValue: finalAmount / r,
    };
  }, [amount, rate, commissionMode, commissionPercent]);

  const currentCurrency = currencies.find((c) => c.code === currency);

  function handleSubmit(event) {
    event.preventDefault();
    // Same business logic shape kept — only console for now
    const payload = {
      customerMode,
      customer: customerMode === "existing" ? selectedCustomer : newCustomer,
      type: txType,
      currency,
      amount: parseFloat(amount),
      rate: parseFloat(rate),
      referenceNumber,
      transactionDate,
      commissionMode,
      commissionPercent: parseFloat(commissionPercent) || 0,
      finalAmount: computed.finalAmount,
      usdValue: computed.finalUsdValue,
      notes,
    };
    console.log("Transaction payload:", payload);
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* Page header */}
      <ScrollReveal>
        <div className="text-right">
          <h1 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
            إضافة عملية جديدة
          </h1>
          <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">
            اختر العميل وأدخل تفاصيل الحركة المالية والعمولة إن وُجدت.
          </p>
        </div>
      </ScrollReveal>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {/* 1) Customer mode */}
            <ScrollReveal delay={0.05}>
              <Panel title="نوع العميل" subtitle="اختر إن كنت تتعامل مع عميل موجود أو جديد">
                <div className="grid grid-cols-2 gap-3">
                  <ModeToggle
                    active={customerMode === "existing"}
                    onClick={() => setCustomerMode("existing")}
                    icon={UserRoundCheck}
                    label="عميل موجود"
                    desc="اختيار من القائمة"
                  />
                  <ModeToggle
                    active={customerMode === "new"}
                    onClick={() => setCustomerMode("new")}
                    icon={UserPlus}
                    label="عميل جديد"
                    desc="إدخال بيانات جديدة"
                  />
                </div>

                <AnimatePresence mode="wait">
                  {customerMode === "existing" ? (
                    <motion.div
                      key="existing"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-4"
                    >
                      <FieldLabel>اختيار العميل</FieldLabel>
                      <div className="relative">
                        <div
                          className="group flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition-colors duration-200 hover:bg-white focus-within:border-slate-400 focus-within:bg-white"
                          onClick={() => setCustomerDropdownOpen(true)}
                        >
                          <Search className="h-4 w-4 shrink-0 text-slate-400" />
                          <input
                            type="text"
                            value={
                              selectedCustomer
                                ? selectedCustomer.name
                                : customerSearch
                            }
                            onChange={(e) => {
                              setCustomerSearch(e.target.value);
                              setSelectedCustomer(null);
                              setCustomerDropdownOpen(true);
                            }}
                            onFocus={() => setCustomerDropdownOpen(true)}
                            placeholder="ابحث بالاسم أو رقم الهاتف..."
                            className="h-full flex-1 bg-transparent px-3 text-right text-sm text-slate-900 outline-none placeholder:text-slate-400"
                          />
                          {selectedCustomer && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(null);
                                setCustomerSearch("");
                              }}
                              className="ml-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <AnimatePresence>
                          {customerDropdownOpen && !selectedCustomer && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.18 }}
                              className="absolute inset-x-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-md"
                            >
                              {filteredCustomers.length === 0 ? (
                                <div className="px-4 py-6 text-center text-xs text-slate-500">
                                  لا توجد نتائج
                                </div>
                              ) : (
                                filteredCustomers.map((c) => (
                                  <button
                                    type="button"
                                    key={c.id}
                                    onClick={() => {
                                      setSelectedCustomer(c);
                                      setCustomerDropdownOpen(false);
                                      setCustomerSearch("");
                                    }}
                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right transition-colors duration-150 hover:bg-slate-100"
                                  >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                                      {c.type === "شركة" ? (
                                        <Building2 className="h-4 w-4" />
                                      ) : (
                                        <UserRoundCheck className="h-4 w-4" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1 text-right">
                                      <p className="truncate text-sm font-bold text-slate-800">
                                        {c.name}
                                      </p>
                                      <p className="truncate text-[11px] text-slate-500">
                                        {c.phone} · {c.country}
                                      </p>
                                    </div>
                                  </button>
                                ))
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {selectedCustomer && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-right"
                        >
                          <InfoRow label="النوع" value={selectedCustomer.type} />
                          <InfoRow label="الهاتف" value={selectedCustomer.phone} />
                          <InfoRow label="البلد" value={selectedCustomer.country} />
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="new"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="mt-4 grid gap-3 sm:grid-cols-2"
                    >
                      <Field label="اسم العميل" icon={UserPlus}>
                        <input
                          type="text"
                          value={newCustomer.name}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, name: e.target.value })
                          }
                          placeholder="مثال: محمد أحمد"
                          className="field-input"
                        />
                      </Field>
                      <Field label="رقم الجوال" icon={Phone}>
                        <input
                          type="tel"
                          value={newCustomer.phone}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, phone: e.target.value })
                          }
                          placeholder="05XXXXXXXX"
                          className="field-input"
                        />
                      </Field>
                      <FieldSelect label="نوع الحساب">
                        <select
                          value={newCustomer.type}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, type: e.target.value })
                          }
                          className="field-input appearance-none pr-4"
                        >
                          <option value="فرد">فرد</option>
                          <option value="شركة">شركة</option>
                        </select>
                      </FieldSelect>
                      <Field label="البلد">
                        <input
                          type="text"
                          value={newCustomer.country}
                          onChange={(e) =>
                            setNewCustomer({ ...newCustomer, country: e.target.value })
                          }
                          placeholder="مثال: الإمارات"
                          className="field-input"
                        />
                      </Field>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Panel>
            </ScrollReveal>

            {/* 2) Transaction details */}
            <ScrollReveal delay={0.1}>
              <Panel title="تفاصيل العملية" subtitle="نوع الحركة، العملة والمبلغ">
                <div className="grid grid-cols-2 gap-3">
                  <ModeToggle
                    active={txType === "receive"}
                    onClick={() => setTxType("receive")}
                    icon={ArrowDown}
                    label="استلام"
                    desc="إيداع للصندوق"
                  />
                  <ModeToggle
                    active={txType === "send"}
                    onClick={() => setTxType("send")}
                    icon={ArrowUp}
                    label="تسليم"
                    desc="سحب من الصندوق"
                  />
                </div>

                <div className="mt-4">
                  <FieldLabel>اختيار العملة</FieldLabel>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {currencies.map((c) => (
                      <button
                        type="button"
                        key={c.code}
                        onClick={() => {
                          setCurrency(c.code);
                          setRate(String(c.rate));
                        }}
                        className={[
                          "flex flex-col items-center justify-center rounded-xl border p-3 transition-colors duration-200",
                          currency === c.code
                            ? "border-slate-700 bg-slate-800 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <span className="text-base font-black">{c.symbol}</span>
                        <span className="mt-1 text-[10px] font-bold tracking-wider">
                          {c.code}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label={`المبلغ (${currentCurrency.code})`} icon={CreditCard}>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="field-input"
                      inputMode="decimal"
                    />
                  </Field>

                  <Field label="سعر الصرف مقابل الدولار" icon={Coins}>
                    <input
                      type="number"
                      step="0.0001"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="1.0000"
                      className="field-input"
                      inputMode="decimal"
                    />
                  </Field>

                  <Field label="رقم مرجعي (اختياري)" icon={Hash}>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="REF-XXXX"
                      className="field-input"
                    />
                  </Field>

                  <Field label="تاريخ العملية" icon={CalendarDays}>
                    <input
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="field-input"
                    />
                  </Field>
                </div>
              </Panel>
            </ScrollReveal>

            {/* 3) Commission */}
            <ScrollReveal delay={0.15}>
              <Panel title="العمولة / النسبة" subtitle="إضافة أو خصم نسبة من المبلغ">
                <div className="grid grid-cols-3 gap-3">
                  <ModeToggle
                    active={commissionMode === "none"}
                    onClick={() => {
                      setCommissionMode("none");
                      setCommissionPercent("");
                    }}
                    icon={X}
                    label="بدون"
                    desc="لا يوجد عمولة"
                  />
                  <ModeToggle
                    active={commissionMode === "add"}
                    onClick={() => setCommissionMode("add")}
                    icon={Plus}
                    label="إضافة"
                    desc="فوق المبلغ"
                  />
                  <ModeToggle
                    active={commissionMode === "subtract"}
                    onClick={() => setCommissionMode("subtract")}
                    icon={Minus}
                    label="خصم"
                    desc="من المبلغ"
                  />
                </div>

                <AnimatePresence>
                  {commissionMode !== "none" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4">
                        <FieldLabel>اختيار نسبة سريعة</FieldLabel>
                        <div className="mb-3 flex flex-wrap gap-2">
                          {[1, 2, 3, 5, 10].map((p) => (
                            <button
                              type="button"
                              key={p}
                              onClick={() => setCommissionPercent(String(p))}
                              className={[
                                "rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors duration-200",
                                commissionPercent === String(p)
                                  ? "border-slate-700 bg-slate-800 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                              ].join(" ")}
                            >
                              {p}%
                            </button>
                          ))}
                        </div>

                        <Field label="نسبة مخصصة (%)" icon={Percent}>
                          <input
                            type="number"
                            step="0.1"
                            value={commissionPercent}
                            onChange={(e) => setCommissionPercent(e.target.value)}
                            placeholder="مثال: 2.5"
                            className="field-input"
                            inputMode="decimal"
                          />
                        </Field>

                        {parseFloat(commissionPercent) > 0 && (
                          <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
                            <span className="font-mono font-black text-slate-800 tabular-nums">
                              {commissionMode === "add" ? "+" : "−"}{" "}
                              {computed.commissionValue.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {currentCurrency.code}
                            </span>
                            <span className="text-slate-500">
                              قيمة العمولة المحسوبة:
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Panel>
            </ScrollReveal>

            {/* 4) Notes */}
            <ScrollReveal delay={0.2}>
              <Panel title="ملاحظات إضافية" subtitle="معلومات اختيارية حول العملية">
                <Field label="ملاحظات" icon={FileText}>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="أدخل أي ملاحظات أو تفاصيل إضافية..."
                    className="field-input resize-none py-3"
                  />
                </Field>
              </Panel>
            </ScrollReveal>
          </div>

          {/* Sticky summary */}
          <ScrollReveal delay={0.25}>
            <div className="sticky top-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between text-right">
                <Calculator className="h-5 w-5 text-slate-400" />
                <div>
                  <h3 className="text-base font-black text-slate-900">ملخص العملية</h3>
                  <p className="mt-1 text-xs text-slate-500">المراجعة قبل الحفظ</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <SummaryRow
                  label="نوع العملية"
                  value={txType === "receive" ? "استلام" : "تسليم"}
                  highlight={txType === "receive" ? "emerald" : "slate"}
                />
                <SummaryRow
                  label="العميل"
                  value={
                    customerMode === "existing"
                      ? selectedCustomer?.name || "—"
                      : newCustomer.name || "—"
                  }
                />
                <SummaryRow
                  label="العملة"
                  value={`${currentCurrency.symbol} ${currentCurrency.code}`}
                />
                <SummaryRow
                  label="المبلغ"
                  value={`${(parseFloat(amount) || 0).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })} ${currentCurrency.code}`}
                  mono
                />
                {commissionMode !== "none" && parseFloat(commissionPercent) > 0 && (
                  <SummaryRow
                    label={commissionMode === "add" ? "+ عمولة" : "− خصم"}
                    value={`${computed.commissionValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })} ${currentCurrency.code} (${commissionPercent}%)`}
                    mono
                  />
                )}

                <div className="my-3 h-px bg-slate-200" />

                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3">
                  <span className="font-mono text-base font-black tabular-nums text-slate-900">
                    {computed.finalAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    {currentCurrency.code}
                  </span>
                  <span className="text-xs font-bold text-slate-500">
                    المبلغ النهائي
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold tabular-nums text-slate-700">
                    ≈ ${computed.finalUsdValue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-slate-500">القيمة بالدولار</span>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button type="submit" className="btn-muted-primary">
                  <Save className="h-4 w-4" />
                  <span>حفظ العملية</span>
                </button>
                <button type="button" className="btn-muted-ghost">
                  إلغاء
                </button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </form>

      {/* Local utility styles — calm, dim, no shimmer */}
      <style>{`
        .field-input {
          width: 100%;
          height: 100%;
          background: transparent;
          border: 0;
          padding: 0 12px;
          text-align: right;
          font-size: 13px;
          color: #0f172a;
          outline: none;
        }
        .field-input::placeholder { color: #94a3b8; }
        textarea.field-input {
          padding: 12px;
          font-family: inherit;
        }

        .btn-muted-primary {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 11px 16px;
          background: #1e293b;
          color: #ffffff;
          border: 0;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .btn-muted-primary:hover { background: #334155; }
        .btn-muted-primary:active { background: #0f172a; }

        .btn-muted-ghost {
          width: 100%;
          padding: 11px 16px;
          background: #ffffff;
          color: #475569;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.2s ease, color 0.2s ease;
        }
        .btn-muted-ghost:hover { background: #f8fafc; color: #1e293b; }
      `}</style>
    </div>
  );
}

/* ─────────── Sub-components ─────────── */

function Panel({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-right">
        <h3 className="text-base font-black text-slate-900">{title}</h3>
        {subtitle && (
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function ModeToggle({ active, onClick, icon: Icon, label, desc }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "group flex items-center gap-3 rounded-xl border p-3 text-right transition-colors duration-200",
        active
          ? "border-slate-700 bg-slate-800 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
          active
            ? "border-white/20 bg-white/10 text-white"
            : "border-slate-200 bg-slate-50 text-slate-600",
        ].join(" ")}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 text-right">
        <p
          className={[
            "text-sm font-black",
            active ? "text-white" : "text-slate-800",
          ].join(" ")}
        >
          {label}
        </p>
        <p
          className={[
            "mt-0.5 text-[11px]",
            active ? "text-slate-300" : "text-slate-500",
          ].join(" ")}
        >
          {desc}
        </p>
      </div>
      {active && <Check className="h-4 w-4 shrink-0 text-white" />}
    </button>
  );
}

function FieldLabel({ children }) {
  return (
    <label className="mb-2 block text-right text-xs font-bold text-slate-700">
      {children}
    </label>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition-colors duration-200 hover:bg-white focus-within:border-slate-400 focus-within:bg-white">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
        {children}
      </div>
    </div>
  );
}

function FieldSelect({ label, children }) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-12 items-center rounded-xl border border-slate-200 bg-slate-50 px-4 transition-colors duration-200 hover:bg-white focus-within:border-slate-400 focus-within:bg-white">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-black text-slate-800">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, highlight, mono = false }) {
  const colors = {
    emerald: "text-emerald-600",
    slate: "text-slate-700",
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={[
          "truncate font-bold",
          mono ? "font-mono tabular-nums" : "",
          highlight ? colors[highlight] : "text-slate-800",
        ].join(" ")}
      >
        {value}
      </span>
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
    </div>
  );
}

export default AddTransactionPage;