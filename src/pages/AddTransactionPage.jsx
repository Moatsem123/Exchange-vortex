import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgePlus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Check,
  Calculator,
  Save,
  X,
  Loader2,
  FileText,
  Percent,
  Plus,
  Minus,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import PageHeader from "../shared/PageHeader";
import { useToast } from "../shared/Toast";
import transactionsService from "../services/transactions";
import customersService from "../services/customers";
import currenciesService from "../services/currencies";
import { extractApiError, formatMoney, unwrapList } from "../shared/helpers";

const TX_TYPES = [
  {
    key: "receive",
    label: "إيداع",
    desc: "إضافة مبلغ إلى حساب عميل أو الصندوق",
    icon: ArrowDownLeft,
    color: "emerald",
  },
  {
    key: "send",
    label: "سحب",
    desc: "سحب مبلغ من حساب عميل أو الصندوق",
    icon: ArrowUpRight,
    color: "rose",
  },
  {
    key: "transfer",
    label: "تحويل بين حسابات النظام",
    desc: "تحويل مبلغ بين حسابين أو عميلين داخل النظام",
    icon: ArrowRightLeft,
    color: "blue",
  },
];

function getCustomerBalance(customer) {
  if (!customer) return 0;

  const value =
    customer.balance_usd ??
    customer.current_balance ??
    customer.balance ??
    customer.vault?.balance_usd ??
    customer.vault?.initial_balance ??
    customer.initial_balance ??
    0;

  return Number(value) || 0;
}

function AddTransactionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

  const [txType, setTxType] = useState(params.get("type") || "receive");
  const [customerId, setCustomerId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [showCustList, setShowCustList] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.0000");
  const [toCustomerId, setToCustomerId] = useState(null);
  const [toCustomerSearch, setToCustomerSearch] = useState("");
  const [showToCustList, setShowToCustList] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionTime, setTransactionTime] = useState(new Date().toTimeString().slice(0, 5));
  const [commissionMode, setCommissionMode] = useState("none");
  const [commissionType, setCommissionType] = useState("percentage");
  const [commissionValue, setCommissionValue] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    customersService
      .list({ per_page: 50 })
      .then((res) => setCustomers(unwrapList(res).items))
      .catch(() => setCustomers([]));

    currenciesService
      .list({ is_active: true })
      .then((res) => setCurrencies(unwrapList(res).items))
      .catch(() => setCurrencies([]));
  }, []);

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId));
  const selectedToCustomer = customers.find((customer) => String(customer.id) === String(toCustomerId));

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();

    const list =
      txType === "transfer"
        ? customers.filter((customer) => String(customer.id) !== String(toCustomerId))
        : customers;

    if (!term) return list.slice(0, 10);

    return list
      .filter(
        (customer) =>
          customer.name?.toLowerCase().includes(term) ||
          customer.phone?.includes(term) ||
          customer.email?.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [customers, customerSearch, toCustomerId, txType]);

  const filteredToCustomers = useMemo(() => {
    const term = toCustomerSearch.trim().toLowerCase();
    const available = customers.filter((customer) => String(customer.id) !== String(customerId));

    if (!term) return available.slice(0, 10);

    return available
      .filter(
        (customer) =>
          customer.name?.toLowerCase().includes(term) ||
          customer.phone?.includes(term) ||
          customer.email?.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [customers, customerId, toCustomerSearch]);

  const computed = useMemo(() => {
    const parsedAmount = parseFloat(amount) || 0;
    const parsedRate = parseFloat(exchangeRate) || 1;
    const parsedCommission = parseFloat(commissionValue) || 0;

    let commissionAmount = 0;

    if (commissionMode !== "none" && parsedCommission > 0) {
      commissionAmount =
        commissionType === "percentage" ? (parsedAmount * parsedCommission) / 100 : parsedCommission;
    }

    const sign = commissionMode === "subtract" ? -1 : commissionMode === "add" ? 1 : 0;
    const final = parsedAmount + sign * commissionAmount;
    const usd = final / parsedRate;

    return {
      commAmount: commissionAmount,
      final,
      usd,
      sign,
    };
  }, [amount, exchangeRate, commissionMode, commissionType, commissionValue]);

  function validate() {
    const validationErrors = {};

    if (txType === "transfer") {
      if (!customerId) {
        validationErrors.customer = "اختر الحساب أو العميل المرسل";
      }

      if (!toCustomerId) {
        validationErrors.to_customer = "اختر الحساب أو العميل المستلم";
      }

      if (customerId && toCustomerId && String(customerId) === String(toCustomerId)) {
        validationErrors.to_customer = "لا يمكن اختيار نفس العميل كمرسل ومستلم";
      }
    } else if (!customerId) {
      validationErrors.customer = "اختر عميلاً";
    }

    if (!amount || parseFloat(amount) <= 0) {
      validationErrors.amount = "أدخل مبلغاً صحيحاً";
    }

    if (!currency) {
      validationErrors.currency = "اختر العملة";
    }

    if (!exchangeRate || parseFloat(exchangeRate) <= 0) {
      validationErrors.exchangeRate = "أدخل سعر صرف صحيح";
    }

    setErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const basePayload = {
        type: txType,
        amount: parseFloat(amount),
        currency_code: currency,
        exchange_rate: parseFloat(exchangeRate),
        transaction_date: transactionDate,
        transaction_time: transactionTime,
        ...(referenceNumber && { reference_number: referenceNumber }),
        ...(note && { note }),
        ...(commissionMode !== "none" &&
          commissionValue && {
            commission_type: commissionType,
            [commissionType === "percentage" ? "commission_rate" : "commission_amount"]:
              parseFloat(commissionValue),
            commission_sign: computed.sign,
          }),
      };

      const payload =
        txType === "transfer"
          ? {
              ...basePayload,
              from_customer_id: customerId,
              to_customer_id: toCustomerId,
            }
          : {
              ...basePayload,
              customer_id: customerId,
            };

      await transactionsService.create(payload);

      toast.success("تم حفظ المعاملة بنجاح");
      navigate("/transactions");
    } catch (err) {
      const apiErrors = err.response?.data?.errors;

      if (apiErrors) {
        const mappedErrors = {};

        Object.keys(apiErrors).forEach((key) => {
          mappedErrors[key] = apiErrors[key][0];
        });

        setErrors(mappedErrors);
      }

      toast.error(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  const currentCur = currencies.find((item) => item.code === currency);

  return (
    <div className="space-y-5">
      <PageHeader
        title="إضافة معاملة جديدة"
        subtitle="أضف معاملة مالية جديدة وقم بتسجيل التفاصيل بدقة"
        icon={BadgePlus}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="نوع المعاملة" subtitle="اختر نوع المعاملة التي ترغب في تنفيذها">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {TX_TYPES.map((type) => {
              const Icon = type.icon;
              const active = txType === type.key;

              const palette = {
                emerald: active
                  ? "border-emerald-500 bg-emerald-50/60"
                  : "border-slate-200 bg-white hover:bg-slate-50",
                rose: active
                  ? "border-rose-500 bg-rose-50/60"
                  : "border-slate-200 bg-white hover:bg-slate-50",
                blue: active
                  ? "border-blue-500 bg-blue-50/60"
                  : "border-slate-200 bg-white hover:bg-slate-50",
              };

              const iconColor = {
                emerald: "bg-emerald-100 text-emerald-700",
                rose: "bg-rose-100 text-rose-700",
                blue: "bg-blue-100 text-blue-700",
              };

              return (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => {
                    setTxType(type.key);
                    setErrors({});

                    if (type.key !== "transfer") {
                      setToCustomerId(null);
                      setToCustomerSearch("");
                      setShowToCustList(false);
                    }
                  }}
                  className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition ${palette[type.color]}`}
                >
                  {active && (
                    <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconColor[type.color]}`}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="font-black text-slate-900">{type.label}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{type.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <Section title="تفاصيل المعاملة" subtitle="أدخل بيانات المعاملة بدقة" icon={FileText}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field
                  label={txType === "transfer" ? "من الحساب / العميل" : "العميل"}
                  required
                  error={errors.customer || errors.customer_id || errors.from_customer_id}
                >
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedCustomer ? selectedCustomer.name : customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustomerId(null);
                        setShowCustList(true);
                      }}
                      onFocus={() => setShowCustList(true)}
                      placeholder={
                        txType === "transfer"
                          ? "ابحث عن الحساب أو العميل المرسل..."
                          : "ابحث عن عميل..."
                      }
                      className="ep-input"
                    />

                    {selectedCustomer && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerId(null);
                          setCustomerSearch("");
                          setShowCustList(false);
                        }}
                        className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {showCustList && !selectedCustomer && filteredCustomers.length > 0 && (
                      <CustomerDropdown
                        customers={filteredCustomers}
                        showBalance={txType === "transfer"}
                        onSelect={(customer) => {
                          setCustomerId(customer.id);
                          setCustomerSearch("");
                          setShowCustList(false);

                          if (String(customer.id) === String(toCustomerId)) {
                            setToCustomerId(null);
                            setToCustomerSearch("");
                          }
                        }}
                      />
                    )}
                  </div>

                  {txType === "transfer" && selectedCustomer && <BalanceHint customer={selectedCustomer} />}
                </Field>

                <Field label="العملة" required error={errors.currency_code || errors.currency}>
                  <select
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);

                      const selectedCurrency = currencies.find((item) => item.code === e.target.value);

                      if (selectedCurrency?.rate_to_usd) {
                        setExchangeRate(String(selectedCurrency.rate_to_usd));
                      }
                    }}
                    className="ep-input appearance-none"
                  >
                    {currencies.length === 0 && <option value="USD">USD - الدولار الأمريكي</option>}

                    {currencies.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} - {item.name_ar || item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="المبلغ" required error={errors.amount}>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    inputMode="decimal"
                    className="ep-input"
                  />
                </Field>

                <Field
                  label="سعر الصرف (مقابل USD)"
                  required
                  error={errors.exchange_rate || errors.exchangeRate}
                >
                  <input
                    type="number"
                    step="0.0001"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    placeholder="1.0000"
                    inputMode="decimal"
                    className="ep-input"
                  />
                </Field>

                {txType === "transfer" && (
                  <Field
                    label="إلى الحساب / العميل"
                    required
                    error={errors.to_customer || errors.to_customer_id}
                  >
                    <div className="relative">
                      <input
                        type="text"
                        value={selectedToCustomer ? selectedToCustomer.name : toCustomerSearch}
                        onChange={(e) => {
                          setToCustomerSearch(e.target.value);
                          setToCustomerId(null);
                          setShowToCustList(true);
                        }}
                        onFocus={() => setShowToCustList(true)}
                        placeholder="ابحث عن الحساب أو العميل المستلم..."
                        className="ep-input"
                      />

                      {selectedToCustomer && (
                        <button
                          type="button"
                          onClick={() => {
                            setToCustomerId(null);
                            setToCustomerSearch("");
                            setShowToCustList(false);
                          }}
                          className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {showToCustList && !selectedToCustomer && filteredToCustomers.length > 0 && (
                        <CustomerDropdown
                          customers={filteredToCustomers}
                          showBalance
                          onSelect={(customer) => {
                            setToCustomerId(customer.id);
                            setToCustomerSearch("");
                            setShowToCustList(false);
                          }}
                        />
                      )}
                    </div>

                    {selectedToCustomer && <BalanceHint customer={selectedToCustomer} />}
                  </Field>
                )}

                <Field label="رقم مرجعي (اختياري)">
                  <input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="REF-XXXX"
                    className="ep-input"
                  />
                </Field>

                <Field label="التاريخ">
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="ep-input"
                  />
                </Field>

                <Field label="الوقت">
                  <input
                    type="time"
                    value={transactionTime}
                    onChange={(e) => setTransactionTime(e.target.value)}
                    className="ep-input"
                  />
                </Field>
              </div>
            </Section>

            <Section title="العمولة (اختياري)" subtitle="أضف عمولة أو خصم على المبلغ" icon={Percent}>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "none", label: "بدون", icon: X },
                  { key: "add", label: "إضافة", icon: Plus },
                  { key: "subtract", label: "خصم", icon: Minus },
                ].map((mode) => {
                  const Icon = mode.icon;
                  const active = commissionMode === mode.key;

                  return (
                    <button
                      key={mode.key}
                      type="button"
                      onClick={() => {
                        setCommissionMode(mode.key);

                        if (mode.key === "none") {
                          setCommissionValue("");
                        }
                      }}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-bold transition ${
                        active
                          ? "border-teal-500 bg-teal-50/50 text-teal-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>

              {commissionMode !== "none" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 grid grid-cols-2 gap-3"
                >
                  <Field label="نوع العمولة">
                    <select
                      value={commissionType}
                      onChange={(e) => setCommissionType(e.target.value)}
                      className="ep-input appearance-none"
                    >
                      <option value="percentage">نسبة مئوية %</option>
                      <option value="fixed">مبلغ ثابت</option>
                    </select>
                  </Field>

                  <Field label={commissionType === "percentage" ? "النسبة %" : `المبلغ ${currency}`}>
                    <input
                      type="number"
                      step="0.01"
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      placeholder="0.00"
                      inputMode="decimal"
                      className="ep-input"
                    />
                  </Field>
                </motion.div>
              )}
            </Section>

            <Section title="الوصف" icon={FileText}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="أدخل وصفًا مختصرًا للمعاملة (اختياري)..."
                className="ep-input resize-none py-3"
                style={{ height: "auto" }}
              />
            </Section>
          </div>

          <aside className="space-y-3">
            <div className="ep-card-static min-w-0 overflow-hidden sticky top-24 p-5">
              <div className="mb-4 flex items-center justify-between">
                <Calculator className="h-5 w-5 text-slate-400" />

                <div className="text-right">
                  <h3 className="text-base font-black text-slate-900">ملخص المعاملة</h3>
                  <p className="text-xs text-slate-500">المراجعة قبل الحفظ</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <SummaryRow
                  label="نوع المعاملة"
                  value={TX_TYPES.find((type) => type.key === txType)?.label || "—"}
                />

                <SummaryRow
                  label={txType === "transfer" ? "من" : "العميل"}
                  value={selectedCustomer?.name || "—"}
                />

                {txType === "transfer" && (
                  <SummaryRow
                    label="رصيد المرسل"
                    value={`${formatMoney(getCustomerBalance(selectedCustomer))} USD`}
                    mono
                  />
                )}

                {txType === "transfer" && (
                  <>
                    <SummaryRow label="إلى" value={selectedToCustomer?.name || "—"} />
                    <SummaryRow
                      label="رصيد المستلم"
                      value={`${formatMoney(getCustomerBalance(selectedToCustomer))} USD`}
                      mono
                    />
                  </>
                )}

                <SummaryRow label="العملة" value={`${currentCur?.symbol || ""} ${currency}`} />
                <SummaryRow
                  label="المبلغ الأساسي"
                  value={`${formatMoney(parseFloat(amount) || 0)} ${currency}`}
                  mono
                />
                <SummaryRow
                  label="سعر الصرف"
                  value={formatMoney(parseFloat(exchangeRate) || 0, { decimals: 4 })}
                  mono
                />

                {commissionMode !== "none" && computed.commAmount > 0 && (
                  <SummaryRow
                    label={commissionMode === "add" ? "+ عمولة" : "- خصم"}
                    value={`${formatMoney(computed.commAmount)} ${currency}`}
                    mono
                  />
                )}

                <div className="my-3 h-px bg-slate-200" />

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-right text-[11px] font-bold text-slate-500">
                    الإجمالي النهائي
                  </p>

                  <p
                    dir="ltr"
                    className="mt-1 text-right font-mono text-2xl font-black tabular-nums text-slate-900"
                  >
                    {formatMoney(computed.final)}{" "}
                    <span className="text-sm text-slate-500">{currency}</span>
                  </p>

                  <p dir="ltr" className="mt-1 text-right font-mono text-xs text-slate-500">
                    ≈ ${formatMoney(computed.usd)}
                  </p>
                </div>

                {txType === "transfer" && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-right">
                    <p className="text-[11px] font-black text-blue-700">ملاحظة التحويل</p>
                    <p className="mt-1 text-[11px] leading-5 text-blue-600">
                      سيتم خصم المبلغ من الحساب المرسل وإضافته إلى الحساب المستلم تلقائيًا.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 space-y-2">
                <button type="submit" disabled={loading} className="ep-btn ep-btn-primary h-11 w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ المعاملة
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/transactions")}
                  className="ep-btn ep-btn-ghost h-11 w-full"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}

function CustomerDropdown({ customers, onSelect, showBalance = false }) {
  return (
    <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
      {customers.map((customer) => (
        <button
          key={customer.id}
          type="button"
          onClick={() => onSelect(customer)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right hover:bg-slate-50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
            <UserIcon className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-sm font-bold text-slate-900">{customer.name}</p>
            <p className="truncate text-[11px] text-slate-500">
              {customer.phone || "—"} · {customer.country || "—"}
            </p>
          </div>

          {showBalance && (
            <div className="shrink-0 text-left">
              <p className="text-[10px] font-bold text-slate-400">الرصيد</p>
              <p dir="ltr" className="font-mono text-xs font-black text-slate-800">
                {formatMoney(getCustomerBalance(customer))} USD
              </p>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function BalanceHint({ customer }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50/50 px-3 py-2">
      <div className="flex items-center gap-2 text-teal-700">
        <Wallet className="h-4 w-4" />
        <span className="text-xs font-bold">رصيد العميل</span>
      </div>

      <span dir="ltr" className="font-mono text-xs font-black text-slate-800">
        {formatMoney(getCustomerBalance(customer))} USD
      </span>
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="ep-card-static min-w-0 overflow-hidden p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1 text-right">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>

        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>

      {children}

      {error && <p className="mt-1 text-[11px] font-bold text-rose-600">{error}</p>}
    </label>
  );
}

function SummaryRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`truncate font-bold text-slate-900 ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </span>

      <span className="shrink-0 text-xs text-slate-500">{label}</span>
    </div>
  );
}

export default AddTransactionPage;