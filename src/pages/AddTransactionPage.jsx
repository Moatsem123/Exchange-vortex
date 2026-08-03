import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BadgePlus,
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
import { BOX_TYPE_OPTIONS, getBoxTypeLabel } from "../shared/boxTypes";
import {
  COMMISSION_PAYER_OPTIONS,
  getCommissionPayerMeta,
  getSupplierDirectionMeta,
  SUPPLIER_DIRECTION_OPTIONS,
} from "../shared/operationWorkflow";

const PAGE_TYPES = [
  {
    key: "operation",
    label: "عملية",
    desc: "عملية تحويل بين العميل والمورد أو الصندوق",
    icon: BadgePlus,
  },
];

const FUNDING_TYPES = [
  {
    key: "supplier",
    label: "عملية مورد",
    desc: "عملية بين مورد وعميل باتجاه مالي محدد",
    icon: Building2,
  },
  {
    key: "box",
    label: "صندوق",
    desc: "مصدر الأموال من صندوق",
    icon: Wallet,
  },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "معلقة" },
  { value: "completed", label: "مكتملة" },
];

function getStatusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label || "معلقة";
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
  const toast = useToast();

  const [pageType, setPageType] = useState("operation");
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

  const [referenceNumber, setReferenceNumber] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split("T")[0]);
  const [transactionTime, setTransactionTime] = useState(new Date().toTimeString().slice(0, 5));
  const [operationStatus, setOperationStatus] = useState("pending");
  const [supplierDirection, setSupplierDirection] = useState("supplier_pays_intermediary");

  const [commissionMode, setCommissionMode] = useState("none");
  const [commissionType, setCommissionType] = useState("percentage");
  const [commissionValue, setCommissionValue] = useState("");
  const [commissionPayer, setCommissionPayer] = useState("customer");
  const [customerCommissionAmount, setCustomerCommissionAmount] = useState("");
  const [supplierCommissionAmount, setSupplierCommissionAmount] = useState("");

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
  const effectiveCommissionPayer = commissionMode === "none" || !isSupplierFunding ? "customer" : commissionPayer;

  const sourceAmount = useMemo(() => {
    if (isTransfer) return transferAmount;
    if (isSupplierFunding) return supplierAmount;
    if (isBoxFunding) return boxAmount;
    return "";
  }, [isTransfer, isSupplierFunding, isBoxFunding, transferAmount, supplierAmount, boxAmount]);

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

    const customerCommission =
      commissionMode !== "apply"
        ? 0
        : effectiveCommissionPayer === "supplier"
          ? 0
          : effectiveCommissionPayer === "both"
            ? numberValue(customerCommissionAmount)
            : commissionAmount;
    const supplierCommission =
      commissionMode !== "apply"
        ? 0
        : effectiveCommissionPayer === "supplier"
          ? commissionAmount
          : effectiveCommissionPayer === "both"
            ? numberValue(supplierCommissionAmount)
            : 0;
    const final = Math.max(parsedAmount - customerCommission, 0);
    const usd = final / parsedRate;

    return {
      baseAmount: parsedAmount,
      sourceAmount: numberValue(sourceAmount),
      commissionAmount,
      customerCommissionAmount: customerCommission,
      supplierCommissionAmount: supplierCommission,
      final,
      usd,
      rate: parsedRate,
    };
  }, [
    activeAmount,
    activeExchangeRate,
    commissionMode,
    effectiveCommissionPayer,
    commissionType,
    commissionValue,
    customerCommissionAmount,
    sourceAmount,
    supplierCommissionAmount,
  ]);

  const availableCommissionPayers = useMemo(
    () => COMMISSION_PAYER_OPTIONS.filter((option) => option.value === "customer" || isSupplierFunding),
    [isSupplierFunding]
  );

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
        if (!supplierId) validationErrors.supplier = "اختر المورد";
        if (!supplierDirection) validationErrors.supplier_direction = "اختر اتجاه المورد";

        if (!supplierAmount || Number(supplierAmount) <= 0) {
          validationErrors.supplier_amount = "أدخل مبلغ المورد";
        }

        if (!supplierExchangeRate || Number(supplierExchangeRate) <= 0) {
          validationErrors.supplier_exchange_rate = "أدخل سعر صرف المورد";
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

      if (effectiveCommissionPayer !== "customer" && !isSupplierFunding) {
        validationErrors.commission_payer = "عمولة المورد تحتاج عملية مورد";
      }

      if (effectiveCommissionPayer === "both") {
        if (!customerCommissionAmount || Number(customerCommissionAmount) < 0) {
          validationErrors.customer_commission_amount = "أدخل عمولة العميل";
        }

        if (!supplierCommissionAmount || Number(supplierCommissionAmount) < 0) {
          validationErrors.supplier_commission_amount = "أدخل عمولة المورد";
        }

        const splitTotal = Number(customerCommissionAmount || 0) + Number(supplierCommissionAmount || 0);

        if (Math.abs(splitTotal - computed.commissionAmount) > 0.00009) {
          validationErrors.commission_split = "مجموع عمولة الطرفين يجب أن يساوي إجمالي العمولة";
        }
      }

      if (Number(commissionValue) > 0 && computed.customerCommissionAmount > 0 && computed.final <= 0) {
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
        note || null,
        referenceNumber ? `REF: ${referenceNumber}` : null,
        transactionTime ? `TIME: ${transactionTime}` : null,
        `TYPE: transfer`,
        `COMMISSION_MODE: ${commissionMode === "none" ? "none" : effectiveCommissionPayer}`,
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
        supplier_direction: null,

        customer_currency: transferCurrency,
        customer_amount: Number(transferAmount),
        customer_exchange_rate: Number(transferExchangeRate),

        commission_type: commissionType,
        commission_rate: commissionNumber,
        commission_payer: "customer",
        customer_commission_amount: computed.commissionAmount,
        supplier_commission_amount: 0,

        notes: mergedNotes || null,
      };
    }

    const mergedNotes = [
      note || null,
      referenceNumber ? `REF: ${referenceNumber}` : null,
      transactionTime ? `TIME: ${transactionTime}` : null,
      `TYPE: operation`,
      `FUNDING_SOURCE: ${fundingSource}`,
      `COMMISSION_MODE: ${commissionMode === "none" ? "none" : effectiveCommissionPayer}`,
      `NET_AFTER_COMMISSION: ${computed.final}`,
      commissionMode === "apply" ? `CUSTOMER_COMMISSION: ${computed.customerCommissionAmount}` : null,
      commissionMode === "apply" ? `SUPPLIER_COMMISSION: ${computed.supplierCommissionAmount}` : null,
      isSupplierFunding && supplierDirection ? `SUPPLIER_DIRECTION: ${supplierDirection}` : null,
      isBoxFunding && boxType ? `BOX_TYPE: ${boxType}` : null,
      isBoxFunding && boxCurrency ? `BOX_CURRENCY: ${boxCurrency}` : null,
      isBoxFunding && boxAmount ? `BOX_AMOUNT: ${boxAmount}` : null,
      isBoxFunding && boxExchangeRate ? `BOX_EXCHANGE_RATE: ${boxExchangeRate}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    return {
      transaction_date: transactionDate,
      status: isBoxFunding ? "completed" : operationStatus,
      funding_source: fundingSource,

      supplier_id: isSupplierFunding ? Number(supplierId) : null,
      box_id: isBoxFunding ? Number(boxId) : null,
      customer_id: Number(customerId),

      supplier_currency: isSupplierFunding ? supplierCurrency : null,
      supplier_amount: isSupplierFunding ? Number(supplierAmount) : null,
      supplier_exchange_rate: isSupplierFunding ? Number(supplierExchangeRate) : null,
      supplier_direction: isSupplierFunding ? supplierDirection : null,

      customer_currency: customerCurrency,
      customer_amount: Number(customerAmount),
      customer_exchange_rate: Number(customerExchangeRate),

      commission_type: commissionMode === "none" ? "fixed" : commissionType,
      commission_rate: commissionNumber,
      commission_payer: commissionMode === "none" ? "customer" : effectiveCommissionPayer,
      customer_commission_amount: computed.customerCommissionAmount,
      supplier_commission_amount: computed.supplierCommissionAmount,

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
        title="إضافة عملية جديدة"
        subtitle="أضف عملية تحويل مع بيانات العميل والمورد أو الصندوق"
        icon={BadgePlus}
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="نوع العملية" subtitle="اختر نوع العملية التي ترغب في تنفيذها">
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
            <Section title="تفاصيل العملية" subtitle="أدخل بيانات العملية بدقة" icon={FileText}>
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
                              setSupplierDirection("supplier_pays_intermediary");
                              setOperationStatus("completed");
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
                      <Field label="المورد" required error={errors.supplier || errors.supplier_id}>
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

                      <div className="md:col-span-2">
                        <Field label="اتجاه المورد" required error={errors.supplier_direction}>
                          <SupplierDirectionPicker value={supplierDirection} onChange={setSupplierDirection} />
                        </Field>
                      </div>

                      <Field label="مبلغ المورد" required error={errors.supplier_amount}>
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

                      <Field label="عملة المورد" required error={errors.supplier_currency}>
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

                      <Field label="سعر صرف المورد" required error={errors.supplier_exchange_rate}>
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

                      <Field label="الوقت">
                        <input type="time" value={transactionTime} onChange={(e) => setTransactionTime(e.target.value)} className="ep-input" />
                      </Field>

                      <Field label="التاريخ">
                        <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="ep-input" />
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

                      <Field label="حالة العملية">
                        <StatusSelect value={operationStatus} onChange={setOperationStatus} />
                      </Field>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

                      <Field label="الوقت">
                        <input type="time" value={transactionTime} onChange={(e) => setTransactionTime(e.target.value)} className="ep-input" />
                      </Field>

                      <Field label="التاريخ">
                        <input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className="ep-input" />
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
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <Section title="العمولة" subtitle="معاينة فقط، والخادم هو مصدر الحقيقة بعد الحفظ" icon={Percent}>
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
                          setCommissionPayer("customer");
                          setCustomerCommissionAmount("");
                          setSupplierCommissionAmount("");
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

                  <div className="md:col-span-2">
                    <Field label="طرف دفع العمولة" error={errors.commission_payer || errors.commission_split}>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                        {availableCommissionPayers.map((option) => {
                          const active = effectiveCommissionPayer === option.value;
                          const Icon = option.value === "customer" ? UserIcon : option.value === "supplier" ? Building2 : Percent;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setCommissionPayer(option.value);

                                if (option.value !== "both") {
                                  setCustomerCommissionAmount("");
                                  setSupplierCommissionAmount("");
                                }
                              }}
                              className={`flex min-h-20 flex-col items-end justify-center gap-1 rounded-xl border-2 px-3 py-2 text-right transition ${
                                active
                                  ? "border-teal-500 bg-teal-50/50 text-teal-700"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span className="flex items-center gap-2 text-sm font-black">
                                <Icon className="h-4 w-4" />
                                {option.label}
                              </span>
                              <span className="text-xs font-bold leading-5 text-slate-500">{option.description}</span>
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>

                  {effectiveCommissionPayer === "both" && (
                    <>
                      <Field label={`عمولة العميل ${activeCurrency}`} error={errors.customer_commission_amount}>
                        <input
                          type="number"
                          step="0.01"
                          value={customerCommissionAmount}
                          onChange={(e) => setCustomerCommissionAmount(e.target.value)}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>

                      <Field label={`عمولة المورد ${activeCurrency}`} error={errors.supplier_commission_amount}>
                        <input
                          type="number"
                          step="0.01"
                          value={supplierCommissionAmount}
                          onChange={(e) => setSupplierCommissionAmount(e.target.value)}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="ep-input"
                        />
                      </Field>
                    </>
                  )}
                </motion.div>
              )}
            </Section>

            <Section title="الوصف" icon={FileText}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="أدخل وصفًا مختصرًا للعملية (اختياري)..."
                className="ep-input resize-none py-3"
                style={{ height: "auto" }}
              />
            </Section>
          </div>

          <aside className="space-y-3">
            <div className="ep-card-static min-w-0 overflow-hidden p-5 lg:sticky lg:top-24">
              <div className="mb-4 flex items-center justify-between">
                <Calculator className="h-5 w-5 text-slate-400" />

                <div className="text-right">
                  <h3 className="text-base font-black text-slate-900">ملخص العملية</h3>
                  <p className="text-xs text-slate-500">المراجعة قبل الحفظ</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <SummaryRow label="نوع العملية" value={PAGE_TYPES.find((type) => type.key === pageType)?.label || "—"} />
                <SummaryRow label="حالة العملية" value={isTransfer || isBoxFunding ? "مكتملة" : getStatusLabel(operationStatus)} />

                {referenceNumber && <SummaryRow label="الرقم المرجعي" value={referenceNumber} />}

                {isOperation && (
                  <SummaryRow label="مصدر الأموال" value={FUNDING_TYPES.find((type) => type.key === fundingSource)?.label || "—"} />
                )}

                {isOperation && <SummaryRow label="العميل" value={selectedCustomer?.name || "—"} />}
                {isOperation && isSupplierFunding && <SummaryRow label="المورد" value={selectedSupplier?.name || "—"} />}
                {isOperation && isSupplierFunding && (
                  <SummaryRow label="اتجاه المورد" value={getSupplierDirectionMeta(supplierDirection).label} />
                )}

                {isOperation && isBoxFunding && (
                  <>
                    <SummaryRow label="نوع الصندوق" value={getBoxTypeLabel(boxType)} />
                    <SummaryRow label="الصندوق" value={selectedBox?.name || "—"} />
                  </>
                )}

                {isTransfer && <SummaryRow label="نوع الصندوق المرسل" value={getBoxTypeLabel(boxType)} />}
                {isTransfer && <SummaryRow label="الصندوق المرسل" value={selectedBox?.name || "—"} />}
                {isTransfer && <SummaryRow label="نوع الصندوق المستلم" value={getBoxTypeLabel(toBoxType)} />}
                {isTransfer && <SummaryRow label="الصندوق المستلم" value={selectedToBox?.name || "—"} />}

                <SummaryRow label="العملة" value={`${currentCur?.symbol || ""} ${activeCurrency}`} />

                <SummaryRow
                  label={isTransfer ? "المبلغ قبل العمولة" : "مبلغ العميل قبل العمولة"}
                  value={`${formatMoney(computed.baseAmount)} ${activeCurrency}`}
                  mono
                />

                {isOperation && isSupplierFunding && (
                  <SummaryRow
                    label="مبلغ المورد"
                    value={`${formatMoney(numberValue(supplierAmount))} ${supplierCurrency}`}
                    mono
                  />
                )}

                {isOperation && isBoxFunding && (
                  <SummaryRow
                    label="مبلغ الصندوق"
                    value={`${formatMoney(numberValue(boxAmount))} ${boxCurrency}`}
                    mono
                  />
                )}

                <SummaryRow
                  label="سعر الصرف"
                  value={formatMoney(computed.rate, { decimals: 4 })}
                  mono
                />

                {commissionMode === "apply" && computed.commissionAmount > 0 && (
                  <>
                    <SummaryRow
                      label="العمولة"
                      value={
                        commissionType === "percentage"
                          ? `${formatMoney(numberValue(commissionValue))}% = ${formatMoney(computed.commissionAmount)} ${activeCurrency}`
                          : `${formatMoney(computed.commissionAmount)} ${activeCurrency}`
                      }
                      mono
                    />
                    <SummaryRow label="طرف العمولة" value={getCommissionPayerMeta(effectiveCommissionPayer).label} />
                    <SummaryRow
                      label="عمولة العميل"
                      value={`${formatMoney(computed.customerCommissionAmount)} ${activeCurrency}`}
                      mono
                    />
                    {isSupplierFunding && (
                      <SummaryRow
                        label="عمولة المورد"
                        value={`${formatMoney(computed.supplierCommissionAmount)} ${activeCurrency}`}
                        mono
                      />
                    )}
                  </>
                )}

                <div className="my-3 h-px bg-slate-200" />

                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-right text-[11px] font-bold text-slate-500">صافي العميل بعد حصته من العمولة</p>

                  <p dir="ltr" className="mt-1 text-right font-mono text-2xl font-black tabular-nums text-slate-900">
                    {formatMoney(computed.final)} <span className="text-sm text-slate-500">{activeCurrency}</span>
                  </p>

                  <p dir="ltr" className="mt-1 text-right font-mono text-xs text-slate-500">
                    ≈ ${formatMoney(computed.usd)}
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                <button type="submit" disabled={loading} className="ep-btn ep-btn-primary h-11 w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  حفظ العملية
                </button>

                <button type="button" onClick={() => navigate("/transactions")} className="ep-btn ep-btn-ghost h-11 w-full">
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

function SupplierDirectionPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {SUPPLIER_DIRECTION_OPTIONS.map((option) => {
        const active = value === option.value;
        const meta = getSupplierDirectionMeta(option.value);
        const Icon = option.value === "supplier_pays_intermediary" ? Building2 : Wallet;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex min-h-24 items-center gap-3 rounded-2xl border-2 p-4 text-right transition ${
              active ? "border-teal-500 bg-teal-50/70" : "border-slate-200 bg-white hover:bg-slate-50"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                active ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-900">{option.label}</p>
              <p className="mt-1 text-[11px] font-bold text-slate-500">{option.description}</p>
              <p className="mt-1 text-[11px] text-slate-400">{meta.cashImpact}</p>
            </div>
          </button>
        );
      })}
    </div>
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
