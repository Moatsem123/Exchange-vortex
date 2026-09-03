import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgePlus,
  ArrowRightLeft,
  Check,
  Calculator,
  Save,
  X,
  Loader2,
  FileText,
  Percent,
  User as UserIcon,
  Wallet,
  Building2,
} from "lucide-react";

import PageHeader from "../shared/PageHeader";
import { useToast } from "../shared/Toast";
import operationsService from "../services/operations";
import customersService from "../services/customers";
import currenciesService from "../services/currencies";
import boxesService from "../services/boxes";
import { extractApiError, formatMoney, unwrapList } from "../shared/helpers";

const PAGE_TYPES = [
  {
    key: "operation",
    label: "عمليات",
    desc: "عملية تحويل حسب مصدر الأموال",
    icon: BadgePlus,
  },
  {
    key: "transfer",
    label: "تحويل بين حسابات النظام",
    desc: "تحويل مبلغ بين صناديق داخل النظام",
    icon: ArrowRightLeft,
  },
];

const FUNDING_TYPES = [
  {
    key: "supplier",
    label: "تاجر",
    desc: "مصدر الأموال من تاجر",
    icon: Building2,
  },
  {
    key: "box",
    label: "صندوق",
    desc: "مصدر الأموال من صندوق",
    icon: Wallet,
  },
];

const BOX_TYPE_OPTIONS = [
  { value: "turkish", label: "صناديق تركيا", hint: "TRY" },
  { value: "local_bank_wallet", label: "البنوك والمحافظ الرقمية", hint: "ILS / USD" },
  { value: "usdt_wallet", label: "المحافظ الإلكترونية", hint: "USDT" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "قيد التنفيذ" },
  { value: "completed", label: "مكتملة" },
  { value: "cancelled", label: "ملغاة" },
];

function getBoxTypeLabel(type) {
  return BOX_TYPE_OPTIONS.find((item) => item.value === type)?.label || "كل الصناديق";
}

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || "قيد التنفيذ";
}

function normalizeList(res) {
  const unwrapped = unwrapList(res);
  if (Array.isArray(unwrapped)) return unwrapped;
  if (Array.isArray(unwrapped?.items)) return unwrapped.items;
  if (Array.isArray(unwrapped?.data)) return unwrapped.data;
  return [];
}

function numberValue(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function AddTransactionPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const toast = useToast();

  const [pageType, setPageType] = useState(params.get("type") || "operation");
  const [fundingSource, setFundingSource] = useState("supplier");

  const [customerId, setCustomerId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [showCustList, setShowCustList] = useState(false);

  const [supplierId, setSupplierId] = useState(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [showSupplierList, setShowSupplierList] = useState(false);

  const [boxId, setBoxId] = useState(null);
  const [boxSearch, setBoxSearch] = useState("");
  const [boxes, setBoxes] = useState([]);
  const [showBoxList, setShowBoxList] = useState(false);

  const [toBoxId, setToBoxId] = useState(null);
  const [toBoxSearch, setToBoxSearch] = useState("");
  const [showToBoxList, setShowToBoxList] = useState(false);

  const [boxType, setBoxType] = useState("turkish");
  const [toBoxType, setToBoxType] = useState("local_bank_wallet");

  const [currencies, setCurrencies] = useState([]);

  const [customerCurrency, setCustomerCurrency] = useState("USD");
  const [customerAmount, setCustomerAmount] = useState("");
  const [customerExchangeRate, setCustomerExchangeRate] = useState("1.0000");

  const [supplierCurrency, setSupplierCurrency] = useState("USD");
  const [supplierAmount, setSupplierAmount] = useState("");
  const [supplierExchangeRate, setSupplierExchangeRate] = useState("1.0000");

  const [boxCurrency, setBoxCurrency] = useState("USD");
  const [boxAmount, setBoxAmount] = useState("");
  const [boxExchangeRate, setBoxExchangeRate] = useState("1.0000");

  const [transferCurrency, setTransferCurrency] = useState("USD");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferExchangeRate, setTransferExchangeRate] = useState("1.0000");

  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionTime, setTransactionTime] = useState(new Date().toTimeString().slice(0, 5));

  const [commissionMode, setCommissionMode] = useState("none");
  const [commissionType, setCommissionType] = useState("percentage");
  const [commissionValue, setCommissionValue] = useState("");

  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const isOperation = pageType === "operation";
  const isTransfer = pageType === "transfer";
  const isSupplierFunding = fundingSource === "supplier";
  const isBoxFunding = fundingSource === "box";

  useEffect(() => {
    customersService
      .list({ per_page: 100, type: "customer" })
      .then((res) => setCustomers(normalizeList(res).filter((item) => item.type !== "supplier")))
      .catch(() => setCustomers([]));

    customersService
      .list({ per_page: 100, type: "supplier" })
      .then((res) => setSuppliers(normalizeList(res).filter((item) => item.type === "supplier")))
      .catch(() => setSuppliers([]));

    boxesService
      .list({ per_page: 100 })
      .then((res) => setBoxes(normalizeList(res)))
      .catch(() => setBoxes([]));

    currenciesService
      .list({ is_active: true })
      .then((res) => setCurrencies(normalizeList(res)))
      .catch(() => setCurrencies([]));
  }, []);

  const selectedCustomer = customers.find((customer) => String(customer.id) === String(customerId));
  const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === String(supplierId));
  const selectedBox = boxes.find((box) => String(box.id) === String(boxId));
  const selectedToBox = boxes.find((box) => String(box.id) === String(toBoxId));

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return customers.slice(0, 10);

    return customers
      .filter(
        (customer) =>
          customer.name?.toLowerCase().includes(term) ||
          customer.customer_code?.toLowerCase().includes(term) ||
          customer.phone?.includes(term) ||
          customer.email?.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [customers, customerSearch]);

  const filteredSuppliers = useMemo(() => {
    const term = supplierSearch.trim().toLowerCase();
    if (!term) return suppliers.slice(0, 10);

    return suppliers
      .filter(
        (supplier) =>
          supplier.name?.toLowerCase().includes(term) ||
          supplier.customer_code?.toLowerCase().includes(term) ||
          supplier.phone?.includes(term) ||
          supplier.email?.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [suppliers, supplierSearch]);

  const filteredBoxes = useMemo(() => {
    const term = boxSearch.trim().toLowerCase();
    const list = boxes.filter(
      (box) =>
        (!boxType || box.type === boxType) &&
        String(box.id) !== String(toBoxId)
    );

    if (!term) return list.slice(0, 10);

    return list
      .filter(
        (box) =>
          box.name?.toLowerCase().includes(term) ||
          box.type?.toLowerCase().includes(term) ||
          getBoxTypeLabel(box.type).toLowerCase().includes(term) ||
          box.currency?.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [boxes, boxSearch, toBoxId, boxType]);

  const filteredToBoxes = useMemo(() => {
    const term = toBoxSearch.trim().toLowerCase();
    const list = boxes.filter(
      (box) =>
        (!toBoxType || box.type === toBoxType) &&
        String(box.id) !== String(boxId)
    );

    if (!term) return list.slice(0, 10);

    return list
      .filter(
        (box) =>
          box.name?.toLowerCase().includes(term) ||
          box.type?.toLowerCase().includes(term) ||
          getBoxTypeLabel(box.type).toLowerCase().includes(term) ||
          box.currency?.toLowerCase().includes(term)
      )
      .slice(0, 10);
  }, [boxes, toBoxSearch, boxId, toBoxType]);

  const activeAmount = isTransfer ? transferAmount : customerAmount;
  const activeCurrency = isTransfer ? transferCurrency : customerCurrency;
  const activeExchangeRate = isTransfer ? transferExchangeRate : customerExchangeRate;

  const sourceAmount = useMemo(() => {
    if (isTransfer) return transferAmount;
    if (isSupplierFunding) return supplierAmount;
    if (isBoxFunding) return boxAmount;
    return "";
  }, [isTransfer, isSupplierFunding, isBoxFunding, transferAmount, supplierAmount, boxAmount]);

  const sourceCurrency = useMemo(() => {
    if (isTransfer) return transferCurrency;
    if (isSupplierFunding) return supplierCurrency;
    if (isBoxFunding) return boxCurrency;
    return activeCurrency;
  }, [isTransfer, isSupplierFunding, isBoxFunding, transferCurrency, supplierCurrency, boxCurrency, activeCurrency]);

  const computed = useMemo(() => {
    const parsedAmount = numberValue(activeAmount);
    const parsedRate = numberValue(activeExchangeRate) || 1;
    const parsedCommission = numberValue(commissionValue);

    let commissionAmount = 0;

    if (commissionMode === "apply" && parsedCommission > 0) {
      commissionAmount =
        commissionType === "percentage"
          ? (parsedAmount * parsedCommission) / 100
          : parsedCommission;
    }

    const final = Math.max(parsedAmount - commissionAmount, 0);
    const usd = final / parsedRate;

    return {
      baseAmount: parsedAmount,
      sourceAmount: numberValue(sourceAmount),
      commissionAmount,
      final,
      usd,
      rate: parsedRate,
    };
  }, [activeAmount, activeExchangeRate, commissionMode, commissionType, commissionValue, sourceAmount]);

  function validate() {
    const validationErrors = {};

    if (isOperation) {
      if (!customerId) validationErrors.customer = "اختر العميل";

      if (!customerAmount || Number(customerAmount) <= 0) {
        validationErrors.customer_amount = "أدخل مبلغ العميل";
      }

      if (!customerExchangeRate || Number(customerExchangeRate) <= 0) {
        validationErrors.customer_exchange_rate = "أدخل سعر صرف العميل";
      }

      if (isSupplierFunding) {
        if (!supplierId) validationErrors.supplier = "اختر التاجر";
        if (!supplierCurrency) validationErrors.supplier_currency = "اختر عملة التاجر";

        if (!supplierAmount || Number(supplierAmount) <= 0) {
          validationErrors.supplier_amount = "أدخل مبلغ التاجر";
        }

        if (!supplierExchangeRate || Number(supplierExchangeRate) <= 0) {
          validationErrors.supplier_exchange_rate = "أدخل سعر صرف التاجر";
        }
      }

      if (isBoxFunding) {
        if (!boxType) validationErrors.box_type = "اختر نوع الصندوق";
        if (!boxId) validationErrors.box = "اختر الصندوق";

        if (!boxAmount || Number(boxAmount) <= 0) {
          validationErrors.box_amount = "أدخل مبلغ الصندوق";
        }

        if (!boxExchangeRate || Number(boxExchangeRate) <= 0) {
          validationErrors.box_exchange_rate = "أدخل سعر صرف الصندوق";
        }
      }
    }

    if (isTransfer) {
      if (!boxType) validationErrors.box_type = "اختر نوع الصندوق المرسل";
      if (!boxId) validationErrors.box = "اختر الصندوق المرسل";
      if (!toBoxType) validationErrors.to_box_type = "اختر نوع الصندوق المستلم";
      if (!toBoxId) validationErrors.to_box = "اختر الصندوق المستلم";

      if (boxId && toBoxId && String(boxId) === String(toBoxId)) {
        validationErrors.to_box = "لا يمكن اختيار نفس الصندوق";
      }

      if (!transferAmount || Number(transferAmount) <= 0) {
        validationErrors.amount = "أدخل مبلغاً صحيحاً";
      }

      if (!transferExchangeRate || Number(transferExchangeRate) <= 0) {
        validationErrors.exchangeRate = "أدخل سعر صرف صحيح";
      }
    }

    if (commissionMode === "apply") {
      if (!commissionValue || Number(commissionValue) <= 0) {
        validationErrors.commission = "أدخل قيمة العمولة";
      }

      if (Number(commissionValue) > 0 && computed.final <= 0) {
        validationErrors.commission = "العمولة لا يمكن أن تكون أكبر أو تساوي مبلغ العميل";
      }
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }

  function buildOperationPayload() {
    const commissionNumber = commissionMode === "none" ? 0 : Number(commissionValue || 0);

    if (isTransfer) {
      const mergedNotes = [
        note ? `NOTE: ${note}` : null,
        transactionTime ? `TIME: ${transactionTime}` : null,
        `TYPE: transfer`,
        `COMMISSION_MODE: subtract_from_customer`,
        `NET_AFTER_COMMISSION: ${computed.final}`,
        boxType ? `FROM_BOX_TYPE: ${boxType}` : null,
        toBoxType ? `TO_BOX_TYPE: ${toBoxType}` : null,
        toBoxId ? `TO_BOX_ID: ${toBoxId}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      return {
        transaction_date: transactionDate,
        status: "completed",
        funding_source: "box",

        supplier_id: null,
        box_id: Number(boxId),
        customer_id: null,

        supplier_currency: null,
        supplier_amount: null,
        supplier_exchange_rate: null,

        customer_currency: transferCurrency,
        customer_amount: Number(transferAmount),
        customer_exchange_rate: Number(transferExchangeRate),

        commission_type: commissionType,
        commission_rate: commissionNumber,

        notes: mergedNotes || null,
      };
    }

    const mergedNotes = [
      note ? `NOTE: ${note}` : null,
      transactionTime ? `TIME: ${transactionTime}` : null,
      `TYPE: operation`,
      `FUNDING_SOURCE: ${fundingSource}`,
      `COMMISSION_MODE: subtract_from_customer`,
      `NET_AFTER_COMMISSION: ${computed.final}`,
      isBoxFunding && boxType ? `BOX_TYPE: ${boxType}` : null,
      isBoxFunding && boxCurrency ? `BOX_CURRENCY: ${boxCurrency}` : null,
      isBoxFunding && boxAmount ? `BOX_AMOUNT: ${boxAmount}` : null,
      isBoxFunding && boxExchangeRate ? `BOX_EXCHANGE_RATE: ${boxExchangeRate}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      transaction_date: transactionDate,
      ...(isBoxFunding ? {} : { status: "pending" }),
      funding_source: fundingSource,

      supplier_id: isSupplierFunding ? Number(supplierId) : null,
      box_id: isBoxFunding ? Number(boxId) : null,
      customer_id: Number(customerId),

      supplier_currency: isSupplierFunding ? supplierCurrency : null,
      supplier_amount: isSupplierFunding ? Number(supplierAmount) : null,
      supplier_exchange_rate: isSupplierFunding ? Number(supplierExchangeRate) : null,

      customer_currency: customerCurrency,
      customer_amount: Number(customerAmount),
      customer_exchange_rate: Number(customerExchangeRate),

      commission_type: commissionType,
      commission_rate: commissionNumber,

      notes: mergedNotes || null,
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      await operationsService.create(buildOperationPayload());

      toast.success("تم حفظ العملية بنجاح");
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

  function resetParties() {
    setCustomerId(null);
    setCustomerSearch("");
    setSupplierId(null);
    setSupplierSearch("");
    setBoxId(null);
    setBoxSearch("");
    setBoxType("turkish");
    setToBoxId(null);
    setToBoxSearch("");
    setToBoxType("local_bank_wallet");
    setShowCustList(false);
    setShowSupplierList(false);
    setShowBoxList(false);
    setShowToBoxList(false);
  }

  const currentCur = currencies.find((item) => item.code === activeCurrency);

  return (
    <div className="space-y-5">
      <PageHeader
        title="إضافة معاملة جديدة"
        subtitle="أضف معاملة مالية جديدة وقم بتسجيل التفاصيل بدقة"
        icon={BadgePlus}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="نوع المعاملة" subtitle="اختر نوع المعاملة التي ترغب في تنفيذها">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {PAGE_TYPES.map((type) => {
              const Icon = type.icon;
              const active = pageType === type.key;

              return (
                <button
                  key={type.key}
                  type="button"
                  onClick={() => {
                    setPageType(type.key);
                    setErrors({});
                    resetParties();
                  }}
                  className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition ${
                    active ? "border-teal-500 bg-teal-50/60" : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  {active && (
                    <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <Section title="تفاصيل المعاملة" subtitle="أدخل بيانات المعاملة بدقة" icon={FileText}>
              {isOperation ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {FUNDING_TYPES.map((type) => {
                      const Icon = type.icon;
                      const active = fundingSource === type.key;

                      return (
                        <button
                          key={type.key}
                          type="button"
                          onClick={() => {
                            setFundingSource(type.key);
                            setErrors({});

                            if (type.key === "supplier") {
                              setBoxId(null);
                              setBoxSearch("");
                              setBoxType("turkish");
                              setBoxAmount("");
                              setShowBoxList(false);
                            }

                            if (type.key === "box") {
                              setSupplierId(null);
                              setSupplierSearch("");
                              setSupplierAmount("");
                              // removed operationStatus

                              setShowSupplierList(false);
                            }
                          }}
                          className={`relative flex items-center justify-between gap-3 rounded-2xl border-2 p-4 text-right transition ${
                            active ? "border-teal-500 bg-teal-50/60" : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          {active && (
                            <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                              <Check className="h-3 w-3" />
                            </div>
                          )}

                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                            <Icon className="h-5 w-5" />
                          </div>

                          <div className="flex-1">
                            <p className="font-black text-slate-900">{type.label}</p>
                            <p className="mt-1 text-[11px] text-slate-500">{type.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {isSupplierFunding ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="التاريخ">
                        <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="ep-input" />
                      </Field>

                      <Field label="الوقت">
                        <input type="time" value={transactionTime} onChange={(e) => setTransactionTime(e.target.value)} className="ep-input" />
                      </Field>

                      <Field label="التاجر" required error={errors.supplier || errors.supplier_id}>
                        <SearchDropdown
                          value={selectedSupplier ? selectedSupplier.name : supplierSearch}
                          placeholder="ابحث عن مورد..."
                          show={showSupplierList && !selectedSupplier}
                          items={filteredSuppliers}
                          icon={Building2}
                          onFocus={() => setShowSupplierList(true)}
                          onChange={(value) => {
                            setSupplierSearch(value);
                            setSupplierId(null);
                            setShowSupplierList(true);
                          }}
                          onClear={() => {
                            setSupplierId(null);
                            setSupplierSearch("");
                            setShowSupplierList(false);
                          }}
                          onSelect={(supplier) => {
                            setSupplierId(supplier.id);
                            setSupplierSearch("");
                            setShowSupplierList(false);
                          }}
                        />
                      </Field>

                      <Field label="العميل" required error={errors.customer || errors.customer_id}>
                        <SearchDropdown
                          value={selectedCustomer ? selectedCustomer.name : customerSearch}
                          placeholder="ابحث عن عميل..."
                          show={showCustList && !selectedCustomer}
                          items={filteredCustomers}
                          icon={UserIcon}
                          onFocus={() => setShowCustList(true)}
                          onChange={(value) => {
                            setCustomerSearch(value);
                            setCustomerId(null);
                            setShowCustList(true);
                          }}
                          onClear={() => {
                            setCustomerId(null);
                            setCustomerSearch("");
                            setShowCustList(false);
                          }}
                          onSelect={(customer) => {
                            setCustomerId(customer.id);
                            setCustomerSearch("");
                            setShowCustList(false);
                          }}
                        />
                      </Field>

                      <Field label="مبلغ التاجر" required error={errors.supplier_amount}>
                        <input
                          type="number"
                          step="0.01"
                          value={supplierAmount}
                          onChange={(e) => setSupplierAmount(e.target.value)}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>

                      <Field label="مبلغ العميل قبل العمولة" required error={errors.customer_amount}>
                        <input
                          type="number"
                          step="0.01"
                          value={customerAmount}
                          onChange={(e) => setCustomerAmount(e.target.value)}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>

                      <Field label="عملة التاجر" required error={errors.supplier_currency}>
                        <CurrencySelect
                          value={supplierCurrency}
                          currencies={currencies}
                          onChange={(code, rate) => {
                            setSupplierCurrency(code);
                            if (rate) setSupplierExchangeRate(String(rate));
                          }}
                        />
                      </Field>

                      <Field label="عملة العميل" required error={errors.customer_currency}>
                        <CurrencySelect
                          value={customerCurrency}
                          currencies={currencies}
                          onChange={(code, rate) => {
                            setCustomerCurrency(code);
                            if (rate) setCustomerExchangeRate(String(rate));
                          }}
                        />
                      </Field>

                      <Field label="سعر صرف التاجر" required error={errors.supplier_exchange_rate}>
                        <input
                          type="number"
                          step="0.0001"
                          value={supplierExchangeRate}
                          onChange={(e) => setSupplierExchangeRate(e.target.value)}
                          placeholder="1.0000"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>

                      <Field label="سعر صرف العميل" required error={errors.customer_exchange_rate}>
                        <input
                          type="number"
                          step="0.0001"
                          value={customerExchangeRate}
                          onChange={(e) => setCustomerExchangeRate(e.target.value)}
                          placeholder="1.0000"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>

                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field label="التاريخ">
                        <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="ep-input" />
                      </Field>

                      <Field label="الوقت">
                        <input type="time" value={transactionTime} onChange={(e) => setTransactionTime(e.target.value)} className="ep-input" />
                      </Field>

                      <Field label="نوع الصندوق" required error={errors.box_type}>
                        <BoxTypeSelect
                          value={boxType}
                          onChange={(value) => {
                            setBoxType(value);
                            setBoxId(null);
                            setBoxSearch("");
                            setShowBoxList(false);
                          }}
                        />
                      </Field>

                      <Field label="العميل" required error={errors.customer || errors.customer_id}>
                        <SearchDropdown
                          value={selectedCustomer ? selectedCustomer.name : customerSearch}
                          placeholder="ابحث عن عميل..."
                          show={showCustList && !selectedCustomer}
                          items={filteredCustomers}
                          icon={UserIcon}
                          onFocus={() => setShowCustList(true)}
                          onChange={(value) => {
                            setCustomerSearch(value);
                            setCustomerId(null);
                            setShowCustList(true);
                          }}
                          onClear={() => {
                            setCustomerId(null);
                            setCustomerSearch("");
                            setShowCustList(false);
                          }}
                          onSelect={(customer) => {
                            setCustomerId(customer.id);
                            setCustomerSearch("");
                            setShowCustList(false);
                          }}
                        />
                      </Field>

                      <Field label="الصندوق" required error={errors.box || errors.box_id}>
                        <SearchDropdown
                          value={selectedBox ? selectedBox.name : boxSearch}
                          placeholder={`اختر من ${getBoxTypeLabel(boxType)}...`}
                          show={showBoxList && !selectedBox}
                          items={filteredBoxes}
                          icon={Wallet}
                          extra={(box) => `${getBoxTypeLabel(box.type)} · ${box.currency || "USD"} · ${formatMoney(box.current_balance || 0)}`}
                          onFocus={() => setShowBoxList(true)}
                          onChange={(value) => {
                            setBoxSearch(value);
                            setBoxId(null);
                            setShowBoxList(true);
                          }}
                          onClear={() => {
                            setBoxId(null);
                            setBoxSearch("");
                            setShowBoxList(false);
                          }}
                          onSelect={(box) => {
                            setBoxId(box.id);
                            setBoxType(box.type || boxType);
                            setBoxSearch("");
                            setShowBoxList(false);
                            if (box.currency) setBoxCurrency(box.currency);
                          }}
                        />
                      </Field>

                      <Field label="مبلغ العميل قبل العمولة" required error={errors.customer_amount}>
                        <input
                          type="number"
                          step="0.01"
                          value={customerAmount}
                          onChange={(e) => setCustomerAmount(e.target.value)}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>

                      <Field label="مبلغ الصندوق" required error={errors.box_amount}>
                        <input
                          type="number"
                          step="0.01"
                          value={boxAmount}
                          onChange={(e) => setBoxAmount(e.target.value)}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>

                      <Field label="عملة العميل" required error={errors.customer_currency}>
                        <CurrencySelect
                          value={customerCurrency}
                          currencies={currencies}
                          onChange={(code, rate) => {
                            setCustomerCurrency(code);
                            if (rate) setCustomerExchangeRate(String(rate));
                          }}
                        />
                      </Field>

                      <Field label="عملة الصندوق" required error={errors.box_currency}>
                        <CurrencySelect
                          value={boxCurrency}
                          currencies={currencies}
                          onChange={(code, rate) => {
                            setBoxCurrency(code);
                            if (rate) setBoxExchangeRate(String(rate));
                          }}
                        />
                      </Field>

                      <Field label="سعر صرف العميل" required error={errors.customer_exchange_rate}>
                        <input
                          type="number"
                          step="0.0001"
                          value={customerExchangeRate}
                          onChange={(e) => setCustomerExchangeRate(e.target.value)}
                          placeholder="1.0000"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>

                      <Field label="سعر صرف الصندوق" required error={errors.box_exchange_rate}>
                        <input
                          type="number"
                          step="0.0001"
                          value={boxExchangeRate}
                          onChange={(e) => setBoxExchangeRate(e.target.value)}
                          placeholder="1.0000"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>

                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="التاريخ">
                    <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="ep-input" />
                  </Field>

                  <Field label="الوقت">
                    <input type="time" value={transactionTime} onChange={(e) => setTransactionTime(e.target.value)} className="ep-input" />
                  </Field>

                  <Field label="نوع الصندوق المرسل" required error={errors.box_type}>
                    <BoxTypeSelect
                      value={boxType}
                      onChange={(value) => {
                        setBoxType(value);
                        setBoxId(null);
                        setBoxSearch("");
                        setShowBoxList(false);
                      }}
                    />
                  </Field>

                  <Field label="الصندوق المرسل" required error={errors.box || errors.box_id}>
                    <SearchDropdown
                      value={selectedBox ? selectedBox.name : boxSearch}
                      placeholder={`اختر من ${getBoxTypeLabel(boxType)}...`}
                      show={showBoxList && !selectedBox}
                      items={filteredBoxes}
                      icon={Wallet}
                      extra={(box) => `${getBoxTypeLabel(box.type)} · ${box.currency || "USD"} · ${formatMoney(box.current_balance || 0)}`}
                      onFocus={() => setShowBoxList(true)}
                      onChange={(value) => {
                        setBoxSearch(value);
                        setBoxId(null);
                        setShowBoxList(true);
                      }}
                      onClear={() => {
                        setBoxId(null);
                        setBoxSearch("");
                        setShowBoxList(false);
                      }}
                      onSelect={(box) => {
                        setBoxId(box.id);
                        setBoxType(box.type || boxType);
                        setBoxSearch("");
                        setShowBoxList(false);

                        if (box.currency) setTransferCurrency(box.currency);

                        if (String(box.id) === String(toBoxId)) {
                          setToBoxId(null);
                          setToBoxSearch("");
                        }
                      }}
                    />
                  </Field>

                  <Field label="نوع الصندوق المستلم" required error={errors.to_box_type}>
                    <BoxTypeSelect
                      value={toBoxType}
                      onChange={(value) => {
                        setToBoxType(value);
                        setToBoxId(null);
                        setToBoxSearch("");
                        setShowToBoxList(false);
                      }}
                    />
                  </Field>

                  <Field label="الصندوق المستلم" required error={errors.to_box}>
                    <SearchDropdown
                      value={selectedToBox ? selectedToBox.name : toBoxSearch}
                      placeholder={`اختر من ${getBoxTypeLabel(toBoxType)}...`}
                      show={showToBoxList && !selectedToBox}
                      items={filteredToBoxes}
                      icon={Wallet}
                      extra={(box) => `${getBoxTypeLabel(box.type)} · ${box.currency || "USD"} · ${formatMoney(box.current_balance || 0)}`}
                      onFocus={() => setShowToBoxList(true)}
                      onChange={(value) => {
                        setToBoxSearch(value);
                        setToBoxId(null);
                        setShowToBoxList(true);
                      }}
                      onClear={() => {
                        setToBoxId(null);
                        setToBoxSearch("");
                        setShowToBoxList(false);
                      }}
                      onSelect={(box) => {
                        setToBoxId(box.id);
                        setToBoxType(box.type || toBoxType);
                        setToBoxSearch("");
                        setShowToBoxList(false);
                      }}
                    />
                  </Field>

                  <Field label="العملة" required error={errors.currency}>
                    <CurrencySelect
                      value={transferCurrency}
                      currencies={currencies}
                      onChange={(code, rate) => {
                        setTransferCurrency(code);
                        if (rate) setTransferExchangeRate(String(rate));
                      }}
                    />
                  </Field>

                  <Field label="المبلغ قبل العمولة" required error={errors.amount}>
                    <input
                      type="number"
                      step="0.01"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="0.00"
                      inputMode="decimal"
                      className="ep-input"
                    />
                  </Field>

                  <Field label="سعر الصرف" required error={errors.exchangeRate}>
                    <input
                      type="number"
                      step="0.0001"
                      value={transferExchangeRate}
                      onChange={(e) => setTransferExchangeRate(e.target.value)}
                      placeholder="1.0000"
                      inputMode="decimal"
                      className="ep-input"
                    />
                  </Field>

                  <Field label="رقم مرجعي">
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="REF-XXXX"
                      className="ep-input"
                    />
                  </Field>

                  <Field label="التاريخ">
                    <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="ep-input" />
                  </Field>

                  <Field label="الوقت">
                    <input type="time" value={transactionTime} onChange={(e) => setTransactionTime(e.target.value)} className="ep-input" />
                  </Field>
                </div>
              )}
            </Section>

            <Section title="العمولة" subtitle="العمولة تخصم من مبلغ العميل في الملخص" icon={Percent}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "none", label: "بدون عمولة", icon: X },
                  { key: "apply", label: "خصم عمولة من العميل", icon: Percent },
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

              {commissionMode === "apply" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2"
                >
                  <Field label="نوع العمولة" error={errors.commission_type}>
                    <select
                      value={commissionType}
                      onChange={(e) => setCommissionType(e.target.value)}
                      className="ep-input appearance-none"
                    >
                      <option value="percentage">نسبة مئوية %</option>
                      <option value="fixed">مبلغ ثابت</option>
                    </select>
                  </Field>

                  <Field label={commissionType === "percentage" ? "النسبة %" : `المبلغ ${activeCurrency}`} error={errors.commission}>
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

          {/* ─── Right column: live transaction summary ─── */}
          <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
            <div className="ep-card-static overflow-hidden p-5" dir="rtl">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
                  <Calculator className="h-4 w-4" />
                </div>
                <h3 className="flex-1 text-right text-sm font-black text-slate-900">ملخص المعاملة</h3>
              </div>

              <div className="space-y-3 text-sm">
                {/* Customer */}
                {isOperation && (
                  <SummaryRow
                    label="العميل"
                    value={selectedCustomer?.name || <span className="text-slate-400 text-xs">لم يُحدد بعد</span>}
                  />
                )}

                {/* Supplier or Box */}
                {isOperation && isSupplierFunding && (
                  <SummaryRow
                    label="التاجر"
                    value={selectedSupplier?.name || <span className="text-slate-400 text-xs">لم يُحدد بعد</span>}
                  />
                )}
                {isOperation && isBoxFunding && (
                  <SummaryRow
                    label="الصندوق"
                    value={selectedBox?.name || <span className="text-slate-400 text-xs">لم يُحدد بعد</span>}
                  />
                )}
                {isTransfer && (
                  <>
                    <SummaryRow
                      label="من الصندوق"
                      value={selectedBox?.name || <span className="text-slate-400 text-xs">لم يُحدد بعد</span>}
                    />
                    <SummaryRow
                      label="إلى الصندوق"
                      value={selectedToBox?.name || <span className="text-slate-400 text-xs">لم يُحدد بعد</span>}
                    />
                  </>
                )}

                <div className="my-2 border-t border-slate-100" />

                {/* Customer amounts */}
                {isOperation && (
                  <>
                    <SummaryRow
                      label="مبلغ العميل"
                      value={customerAmount ? `${formatMoney(Number(customerAmount))} ${customerCurrency}` : "—"}
                      mono
                    />
                    <SummaryRow label="عملة العميل" value={customerCurrency || "—"} />
                    <SummaryRow
                      label="سعر صرف العميل"
                      value={customerExchangeRate || "—"}
                      mono
                    />
                  </>
                )}

                {/* Supplier amounts */}
                {isOperation && isSupplierFunding && (
                  <>
                    <SummaryRow
                      label="مبلغ التاجر"
                      value={supplierAmount ? `${formatMoney(Number(supplierAmount))} ${supplierCurrency}` : "—"}
                      mono
                    />
                    <SummaryRow label="عملة التاجر" value={supplierCurrency || "—"} />
                    <SummaryRow
                      label="سعر صرف التاجر"
                      value={supplierExchangeRate || "—"}
                      mono
                    />
                  </>
                )}

                {/* Box amounts */}
                {isOperation && isBoxFunding && (
                  <>
                    <SummaryRow
                      label="مبلغ الصندوق"
                      value={boxAmount ? `${formatMoney(Number(boxAmount))} ${boxCurrency}` : "—"}
                      mono
                    />
                    <SummaryRow label="عملة الصندوق" value={boxCurrency || "—"} />
                    <SummaryRow
                      label="سعر صرف الصندوق"
                      value={boxExchangeRate || "—"}
                      mono
                    />
                  </>
                )}

                {/* Transfer amounts */}
                {isTransfer && (
                  <>
                    <SummaryRow
                      label="المبلغ"
                      value={transferAmount ? `${formatMoney(Number(transferAmount))} ${transferCurrency}` : "—"}
                      mono
                    />
                    <SummaryRow label="العملة" value={transferCurrency || "—"} />
                    <SummaryRow label="سعر الصرف" value={transferExchangeRate || "—"} mono />
                  </>
                )}

                {/* Commission */}
                {commissionMode === "apply" && commissionValue && (
                  <>
                    <div className="my-2 border-t border-slate-100" />
                    <SummaryRow
                      label="العمولة"
                      value={
                        commissionType === "percentage"
                          ? `${commissionValue}%  (${formatMoney(computed.commissionAmount)} ${activeCurrency})`
                          : `${formatMoney(computed.commissionAmount)} ${activeCurrency}`
                      }
                      mono
                    />
                    <SummaryRow
                      label="صافي المبلغ"
                      value={`${formatMoney(computed.final)} ${activeCurrency}`}
                      mono
                    />
                  </>
                )}

                <div className="my-2 border-t border-slate-100" />

                {/* Date & Time */}
                <SummaryRow label="التاريخ" value={transactionDate || "—"} mono />
                <SummaryRow label="الوقت" value={transactionTime || "—"} mono />
              </div>
            </div>

            <button type="submit" disabled={loading} className="ep-btn ep-btn-primary h-11 w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              حفظ المعاملة
            </button>

            <button type="button" onClick={() => navigate("/transactions")} className="ep-btn ep-btn-ghost h-11 w-full">
              إلغاء
            </button>
          </aside>

        </div>


      </form>
    </div>
  );
}

function BoxTypeSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="ep-input appearance-none">
      {BOX_TYPE_OPTIONS.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label} - {item.hint}
        </option>
      ))}
    </select>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="ep-input appearance-none">
      {STATUS_OPTIONS.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

function CurrencySelect({ value, currencies, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const selectedCurrency = currencies.find((item) => item.code === e.target.value);
        onChange(e.target.value, selectedCurrency?.rate_to_usd);
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
  );
}

function SearchDropdown({
  value,
  placeholder,
  show,
  items,
  icon: Icon,
  extra,
  onFocus,
  onChange,
  onClear,
  onSelect,
}) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="ep-input"
      />

      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute left-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}

      {show && items.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right hover:bg-slate-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                <Icon className="h-4 w-4" />
              </div>

              <div className="min-w-0 flex-1 text-right">
                <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {extra ? extra(item) : `${item.customer_code ? `#${item.customer_code}` : item.phone || "—"} · ${item.country || "—"}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
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