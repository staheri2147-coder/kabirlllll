import React, { useState, useEffect, useMemo } from 'react';
import { StorageService } from '../../services/storageService';
import { exportElementAsPng } from '../../utils/exportImage';
import { exportToExcel } from '../../utils/exportExcel';
import { ensureArray } from '../../utils/itemUtils';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import {
  Customer,
  CustomerAccountSummary,
  CustomerTransaction,
  Invoice,
  Payment,
  Cheque,
  DeliveryNote,
  ReturnDoc,
  Material,
  ProductionLog,
  Employee,
  EmployeeTransaction,
  EmployeeLeave,
  Expense,
} from '../../types';
import {
  formatCurrency,
  formatJalaliDate,
  formatNumber,
  getTodayISO,
  toPersianDigits,
} from '../../utils/jalali';
import {
  BarChart3,
  Download,
  Printer,
  Search,
  Calendar,
  Layers,
  Scale,
  CreditCard,
  Receipt,
  Truck,
  RotateCcw,
  Boxes,
  ArrowUpRight,
  ArrowDownLeft,
  Image as ImageIcon,
  Loader2,
  Factory,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Package,
  Clock,
  Filter,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

type ReportTab =
  | 'overview'
  | 'sales'
  | 'customers'
  | 'production'
  | 'warehouse'
  | 'deliveries'
  | 'expenses'
  | 'payroll';

export const ReportCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportingImage, setIsExportingImage] = useState<boolean>(false);

  // Filter criteria
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Loaded system data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summaries, setSummaries] = useState<CustomerAccountSummary[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [returns, setReturns] = useState<ReturnDoc[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeTxs, setEmployeeTxs] = useState<EmployeeTransaction[]>([]);
  const [employeeLeaves, setEmployeeLeaves] = useState<EmployeeLeave[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    const custs = StorageService.getCustomers();
    setCustomers(custs);
    setSummaries(custs.map((c) => StorageService.getCustomerAccountSummary(c.id)));
    setTransactions(StorageService.getTransactions());
    setInvoices(StorageService.getInvoices());
    setPayments(StorageService.getPayments());
    setCheques(StorageService.getCheques());
    setDeliveries(StorageService.getDeliveries());
    setReturns(StorageService.getReturns());
    setMaterials(StorageService.getMaterials());
    setProductionLogs(StorageService.getProductionLogs());
    setEmployees(StorageService.getEmployees());
    setEmployeeTxs(StorageService.getEmployeeTransactions());
    setEmployeeLeaves(StorageService.getEmployeeLeaves());
    setExpenses(StorageService.getExpenses());
  };

  // Quick Date Preset Handlers
  const handleSetQuickDate = (type: 'today' | 'week' | 'month' | 'three_months' | 'year' | 'clear') => {
    const today = new Date();
    const todayStr = getTodayISO();

    if (type === 'clear') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }

    let past = new Date();
    if (type === 'week') {
      past.setDate(today.getDate() - 7);
    } else if (type === 'month') {
      past.setMonth(today.getMonth() - 1);
    } else if (type === 'three_months') {
      past.setMonth(today.getMonth() - 3);
    } else if (type === 'year') {
      past.setFullYear(today.getFullYear() - 1);
    }

    const pastStr = past.toISOString().slice(0, 10);
    setStartDate(pastStr);
    setEndDate(todayStr);
  };

  // Date In-Range Utility
  const isDateInRange = (dateStr?: string) => {
    if (!dateStr) return true;
    const cleanDate = dateStr.slice(0, 10);
    if (startDate && cleanDate < startDate) return false;
    if (endDate && cleanDate > endDate) return false;
    return true;
  };

  // =========================================================================
  // FILTERED DATASETS
  // =========================================================================

  // 1. Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!isDateInRange(inv.invoice_date)) return false;
      if (customerFilter !== 'all' && inv.customer_id !== customerFilter) return false;
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = inv.invoice_number?.toLowerCase().includes(q);
        const matchCus = inv.customer_name?.toLowerCase().includes(q);
        const matchCode = inv.customer_code?.toLowerCase().includes(q);
        if (!matchNum && !matchCus && !matchCode) return false;
      }
      return true;
    });
  }, [invoices, startDate, endDate, customerFilter, statusFilter, searchQuery]);

  // 2. Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (!isDateInRange(p.payment_date)) return false;
      if (customerFilter !== 'all' && p.customer_id !== customerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCus = p.customer_name?.toLowerCase().includes(q);
        const matchRef = p.reference_number?.toLowerCase().includes(q);
        if (!matchCus && !matchRef) return false;
      }
      return true;
    });
  }, [payments, startDate, endDate, customerFilter, searchQuery]);

  // 3. Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!isDateInRange(exp.expense_date)) return false;
      if (categoryFilter !== 'all' && exp.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = exp.title?.toLowerCase().includes(q);
        const matchBen = exp.beneficiary?.toLowerCase().includes(q);
        const matchCode = exp.code?.toLowerCase().includes(q);
        if (!matchTitle && !matchBen && !matchCode) return false;
      }
      return true;
    });
  }, [expenses, startDate, endDate, categoryFilter, searchQuery]);

  // 4. Filtered Production
  const filteredProduction = useMemo(() => {
    return productionLogs.filter((p) => {
      if (!isDateInRange(p.date)) return false;
      if (categoryFilter !== 'all' && p.line_name !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchProd = p.product_name?.toLowerCase().includes(q);
        const matchOp = p.operator_name?.toLowerCase().includes(q);
        if (!matchProd && !matchOp) return false;
      }
      return true;
    });
  }, [productionLogs, startDate, endDate, categoryFilter, searchQuery]);

  // 5. Filtered Customer Summaries
  const filteredCustomerSummaries = useMemo(() => {
    return summaries.filter((s) => {
      if (customerFilter !== 'all' && s.customer_id !== customerFilter) return false;
      if (statusFilter === 'debit' && s.status !== 'debit') return false;
      if (statusFilter === 'credit' && s.status !== 'credit') return false;
      if (statusFilter === 'settled' && s.status !== 'settled') return false;
      if (statusFilter === 'pending_delivery' && s.pending_delivery_meters <= 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.customer_name?.toLowerCase().includes(q);
        const matchCode = s.customer_code?.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [summaries, customerFilter, statusFilter, searchQuery]);

  // 6. Filtered Deliveries
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter((d) => {
      if (!isDateInRange(d.delivery_date)) return false;
      if (customerFilter !== 'all' && d.customer_id !== customerFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNum = d.delivery_number?.toLowerCase().includes(q);
        const matchCus = d.customer_name?.toLowerCase().includes(q);
        const matchDri = d.driver_name?.toLowerCase().includes(q);
        if (!matchNum && !matchCus && !matchDri) return false;
      }
      return true;
    });
  }, [deliveries, startDate, endDate, customerFilter, searchQuery]);

  // 7. Filtered Materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = m.name?.toLowerCase().includes(q);
        const matchCode = m.code?.toLowerCase().includes(q);
        const matchType = m.type?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchType) return false;
      }
      return true;
    });
  }, [materials, searchQuery]);

  // 8. Filtered Payroll / Personnel
  const filteredEmployeeSummaries = useMemo(() => {
    return employees.filter((emp) => {
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = emp.name?.toLowerCase().includes(q);
        const matchCode = emp.code?.toLowerCase().includes(q);
        const matchPos = emp.position?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPos) return false;
      }
      return true;
    });
  }, [employees, statusFilter, searchQuery]);

  // =========================================================================
  // MACRO FINANCIAL CALCULATIONS (FOR OVERVIEW)
  // =========================================================================
  const totalSalesRevenue = filteredInvoices
    .filter((i) => i.status === 'active')
    .reduce((acc, i) => acc + (i.final_total || 0), 0);

  const totalSalesSubtotal = filteredInvoices
    .filter((i) => i.status === 'active')
    .reduce((acc, i) => acc + (i.subtotal || 0), 0);

  const totalDiscountsGiven = filteredInvoices
    .filter((i) => i.status === 'active')
    .reduce((acc, i) => acc + (i.discount || 0), 0);

  const totalTaxCollected = filteredInvoices
    .filter((i) => i.status === 'active')
    .reduce((acc, i) => acc + (i.tax || 0), 0);

  const totalMetersSold = filteredInvoices
    .filter((i) => i.status === 'active')
    .reduce(
      (acc, i) => acc + ensureArray(i.items).reduce((sum, item) => sum + (item.quantity_meters || 0), 0),
      0
    );

  const totalPaymentsReceived = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const totalExpensesAmount = filteredExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);

  const totalPayrollPaid = employeeTxs
    .filter((t) => t.type === 'payment' && isDateInRange(t.date))
    .reduce((acc, t) => acc + (t.amount || 0), 0);

  const totalProductionMeters = filteredProduction.reduce((acc, p) => acc + (p.meters_produced || 0), 0);
  const totalProductionWeight = filteredProduction.reduce((acc, p) => acc + (p.weight_kg || 0), 0);
  const totalProductionWaste = filteredProduction.reduce((acc, p) => acc + (p.waste_kg || 0), 0);

  const totalCustomerDebtBalance = summaries
    .filter((s) => s.status === 'debit')
    .reduce((acc, s) => acc + s.balance, 0);

  const totalCustomerCreditBalance = summaries
    .filter((s) => s.status === 'credit')
    .reduce((acc, s) => acc + Math.abs(s.balance), 0);

  const totalPendingDeliveryMeters = summaries.reduce(
    (acc, s) => acc + (s.pending_delivery_meters || 0),
    0
  );

  const netOperatingMargin = totalSalesRevenue - (totalExpensesAmount + totalPayrollPaid);

  // =========================================================================
  // EXPORT HANDLERS (EXCEL & IMAGE)
  // =========================================================================
  const handleExportImage = async () => {
    setIsExportingImage(true);
    const tabLabels: Record<ReportTab, string> = {
      overview: 'عملکرد_کلی_و_مالی',
      sales: 'فروش_و_فاکتورها',
      customers: 'تراز_مشتریان_و_بدهکاران',
      production: 'تولید_و_راندمان_خطوط',
      warehouse: 'انبار_و_مواد_اولیه',
      deliveries: 'بارگیری_و_لجستیک',
      expenses: 'هزینه_های_کارخانه',
      payroll: 'پرسنل_و_حقوق_دستمزد',
    };
    const success = await exportElementAsPng(
      'report-center-printable-container',
      `گزارش_${tabLabels[activeTab]}_${new Date().toISOString().slice(0, 10)}`
    );
    setIsExportingImage(false);
    if (!success) {
      alert('خطا در صدور خروجی تصویر گزارش.');
    }
  };

  const handleExportExcel = () => {
    if (activeTab === 'sales') {
      const data = filteredInvoices.map((inv, idx) => ({
        ردیف: idx + 1,
        شماره_فاکتور: inv.invoice_number,
        تاریخ: formatJalaliDate(inv.invoice_date),
        کد_مشتری: inv.customer_code,
        نام_مشتری: inv.customer_name,
        جمع_اقلام_تومان: inv.subtotal,
        تخفیف_تومان: inv.discount,
        مالیات_تومان: inv.tax,
        مبلغ_نهایی_فاکتور_تومان: inv.final_total,
        وضعیت: inv.status === 'active' ? 'فعال' : 'لغو شده',
      }));
      exportToExcel({ fileName: 'گزارش_فروش_و_فاکتورها', sheetName: 'فروش', data });
    } else if (activeTab === 'customers') {
      const data = filteredCustomerSummaries.map((s, idx) => ({
        ردیف: idx + 1,
        کد_مشتری: s.customer_code,
        نام_مشتری: s.customer_name,
        کل_بدهکار_تومان: s.total_debit,
        کل_بستانکار_تومان: s.total_credit,
        مانده_نهایی_تومان: s.balance,
        وضعیت: s.status === 'debit' ? 'بدهکار' : s.status === 'credit' ? 'بستانکار' : 'تسویه',
        متراژ_در_صف_تحویل: s.pending_delivery_meters,
      }));
      exportToExcel({ fileName: 'گزارش_تراز_مشتریان', sheetName: 'مشتریان', data });
    } else if (activeTab === 'production') {
      const data = filteredProduction.map((p, idx) => ({
        ردیف: idx + 1,
        تاریخ: formatJalaliDate(p.date),
        خط_تولید: p.line_name,
        نام_محصول: p.product_name,
        متراژ_تولید_متر: p.meters_produced,
        وزن_تولید_کیلوگرم: p.weight_kg,
        ضایعات_کیلوگرم: p.waste_kg,
        اپراتور: p.operator_name,
      }));
      exportToExcel({ fileName: 'گزارش_تولید_کارخانه', sheetName: 'تولید', data });
    } else if (activeTab === 'expenses') {
      const data = filteredExpenses.map((exp, idx) => ({
        ردیف: idx + 1,
        کد_هزینه: exp.code,
        تاریخ: formatJalaliDate(exp.expense_date),
        عنوان_هزینه: exp.title,
        سرفصل: exp.category,
        مبلغ_تومان: exp.amount,
        ذینفع_طرف_حساب: exp.beneficiary,
        روش_پرداخت: exp.payment_method,
      }));
      exportToExcel({ fileName: 'گزارش_هزینه_های_کارخانه', sheetName: 'هزینه‌ها', data });
    } else if (activeTab === 'deliveries') {
      const data = filteredDeliveries.map((d, idx) => ({
        ردیف: idx + 1,
        شماره_حواله: d.delivery_number,
        تاریخ_تحویل: formatJalaliDate(d.delivery_date),
        نام_مشتری: d.customer_name,
        راننده: d.driver_name,
        خودرو: d.vehicle_info,
        متراژ_کل_بار: ensureArray(d.items).reduce((acc, it) => acc + (it.quantity_meters || 0), 0),
        وضعیت_رسید: d.received_by_customer ? 'تحویل شد' : 'در حال حمل',
      }));
      exportToExcel({ fileName: 'گزارش_حواله_های_تحویل_بار', sheetName: 'تحویل بار', data });
    } else if (activeTab === 'warehouse') {
      const data = filteredMaterials.map((m, idx) => ({
        ردیف: idx + 1,
        کد_کالا: m.code,
        نام_ماده: m.name,
        نوع_گرید: m.type,
        موجودی_کیلوگرم: m.stock_kg,
        حداقل_هشدار_کیلوگرم: m.min_alert_kg,
        میانگین_قیمت_خرید: m.average_cost,
        ارزش_کل_ریالی: m.stock_kg * (m.average_cost || 0),
      }));
      exportToExcel({ fileName: 'گزارش_موجودی_انبار_مواد_اولیه', sheetName: 'انبار مواد', data });
    } else if (activeTab === 'payroll') {
      const data = filteredEmployeeSummaries.map((e, idx) => ({
        ردیف: idx + 1,
        کد_پرسنلی: e.code,
        نام_و_نام_خانوادگی: e.name,
        سمت: e.position,
        حقوق_پایه: e.salary_base,
        مانده_حساب: e.balance,
        وضعیت: e.status === 'active' ? 'شاغل' : 'غیرفعال',
      }));
      exportToExcel({ fileName: 'گزارش_حقوق_و_پرسنل', sheetName: 'پرسنل', data });
    } else {
      // Overview export
      const data = [
        { شاخص: 'کل فروش خالص دوره (تومان)', مقدار: totalSalesRevenue },
        { شاخص: 'مجموع متراژ لوله فروخته‌شده (متر)', مقدار: totalMetersSold },
        { شاخص: 'کل وصولی‌های نقدی و بانکی (تومان)', مقدار: totalPaymentsReceived },
        { شاخص: 'کل مطالبات از مشتریان / بدهکاران (تومان)', مقدار: totalCustomerDebtBalance },
        { شاخص: 'کل تعهدات در صف تحویل کالا (متر)', مقدار: totalPendingDeliveryMeters },
        { شاخص: 'کل هزینه‌های جاری کارخانه (تومان)', مقدار: totalExpensesAmount },
        { شاخص: 'کل حقوق و دستمزد پرداختی پرسنل (تومان)', مقدار: totalPayrollPaid },
        { شاخص: 'تراز ناخالص عملیاتی (تومان)', مقدار: netOperatingMargin },
      ];
      exportToExcel({ fileName: 'خلاصه_عملکرد_جامع_کارخانه', sheetName: 'عملکرد کلی', data });
    }
  };

  const tabsConfig: { id: ReportTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'عملکرد کلی و مالی', icon: TrendingUp },
    { id: 'sales', label: 'فروش و فاکتورها', icon: Receipt },
    { id: 'customers', label: 'تراز و مطالبات مشتریان', icon: Scale },
    { id: 'production', label: 'تولید و راندمان کارخانه', icon: Factory },
    { id: 'warehouse', label: 'انبار و مواد اولیه', icon: Boxes },
    { id: 'deliveries', label: 'بارگیری و لجستیک', icon: Truck },
    { id: 'expenses', label: 'هزینه‌های کارخانه', icon: DollarSign },
    { id: 'payroll', label: 'پرسنل و دستمزد', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span>مرکز گزارشات و آمار تحلیلی</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              تحلیل عملکرد فروش، مطالبات، خطوط تولید اکسترودر، مواد اولیه، لجستیک و هزینه‌ها
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadAllData()}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
            title="بروزرسانی داده‌ها"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>خروجی اکسل (Excel)</span>
          </button>
          <button
            onClick={handleExportImage}
            disabled={isExportingImage}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition cursor-pointer disabled:opacity-60"
          >
            {isExportingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            <span>خروجی تصویر (PNG)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition cursor-pointer no-print"
          >
            <Printer className="w-4 h-4" />
            <span>چاپ گزارش</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 no-print">
        {tabsConfig.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Date Presets Toolbar (overflow-visible to ensure DatePicker portal doesn't clip) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 no-print overflow-visible relative z-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            <input
              type="text"
              placeholder="جستجو در نام مشتری، شماره فاکتور، سند، کد یا مشخصات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
            />
          </div>

          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-bold ml-1">بازه سریع:</span>
            <button
              onClick={() => handleSetQuickDate('today')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              امروز
            </button>
            <button
              onClick={() => handleSetQuickDate('week')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              ۷ روز اخیر
            </button>
            <button
              onClick={() => handleSetQuickDate('month')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              ۳۰ روز اخیر
            </button>
            <button
              onClick={() => handleSetQuickDate('three_months')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
            >
              ۳ ماهه
            </button>
            <button
              onClick={() => handleSetQuickDate('clear')}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition cursor-pointer"
            >
              حذف فیلتر زمانی
            </button>
          </div>
        </div>

        {/* Date Pickers and Specific Filters Row */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
          {/* Start Date */}
          <div className="w-48 overflow-visible relative z-30">
            <JalaliDatePicker
              label="از تاریخ:"
              value={startDate}
              onChange={(iso) => setStartDate(iso)}
              placeholder="انتخاب تاریخ شروع"
            />
          </div>

          {/* End Date */}
          <div className="w-48 overflow-visible relative z-30">
            <JalaliDatePicker
              label="تا تاریخ:"
              value={endDate}
              onChange={(iso) => setEndDate(iso)}
              placeholder="انتخاب تاریخ پایان"
            />
          </div>

          {/* Contextual dropdowns based on active tab */}
          {(activeTab === 'sales' || activeTab === 'customers' || activeTab === 'deliveries') && (
            <div className="min-w-[180px]">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">فیلتر مشتری:</label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">همه مشتریان ({toPersianDigits(customers.length)})</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="min-w-[160px]">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">وضعیت مانده حساب:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="debit">فقط بدهکاران</option>
                <option value="credit">فقط بستانکاران</option>
                <option value="settled">فقط تسویه شده</option>
                <option value="pending_delivery">دارای تعهد تحویل بار</option>
              </select>
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="min-w-[180px]">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">سرفصل هزینه:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="all">همه سرفصل‌ها</option>
                <option value="خرید ابزار، قطعات و لوازم یدکی">خرید ابزار، قطعات و لوازم</option>
                <option value="تعمیرات و نگهداری خطوط و تاسیسات">تعمیرات و نگهداری خطوط</option>
                <option value="قبوض انرژی، گاز، برق و سوخت">قبوض انرژی و سوخت</option>
                <option value="هزینه‌های حمل، باربری و نقلیه">حمل و باربری</option>
                <option value="پذیرایی، اداری و ملزومات کارخانه">پذیرایی و اداری</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Printable Content Container */}
      <div id="report-center-printable-container" className="space-y-6 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        {/* ========================================================================= */}
        {/* 1. OVERVIEW & FINANCIAL DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Sales Revenue */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">فروش خالص دوره</span>
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-lg font-black text-slate-900">
                  {formatCurrency(totalSalesRevenue)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>متراژ کل فروخته‌شده:</span>
                  <span className="font-bold text-blue-600">{toPersianDigits(formatNumber(totalMetersSold))} متر</span>
                </div>
              </div>

              {/* Collections Received */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">کل دریافتی‌های نقدی و بانکی</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-lg font-black text-emerald-700">
                  {formatCurrency(totalPaymentsReceived)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>تعداد تراکنش‌های واریز:</span>
                  <span className="font-bold text-slate-700">{toPersianDigits(filteredPayments.length)} فقره</span>
                </div>
              </div>

              {/* Outstanding Debtors */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">کل مانده مطالبات (طلب از مشتریان)</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-lg font-black text-rose-700">
                  {formatCurrency(totalCustomerDebtBalance)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>تعهد تحویل بار معوق:</span>
                  <span className="font-bold text-amber-600">{toPersianDigits(formatNumber(totalPendingDeliveryMeters))} متر</span>
                </div>
              </div>

              {/* Factory Expenses & Payroll */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">مجموع هزینه‌ها و حقوق</span>
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2 text-lg font-black text-amber-800">
                  {formatCurrency(totalExpensesAmount + totalPayrollPaid)}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                  <span>هزینه جاری / دستمزد:</span>
                  <span className="font-bold text-slate-700">
                    {toPersianDigits(filteredExpenses.length)} هزینه / {toPersianDigits(employees.length)} پرسنل
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Analysis Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Box: Revenue and Profitability Matrix */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>تراز عملکرد و تفاوت درآمد با هزینه‌های دوره</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-bold">فروش ناخالص (پیش از تخفیف):</span>
                    <span className="font-black text-slate-800">{formatCurrency(totalSalesSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-rose-600 font-bold">تخفیفات اعطا شده به مشتریان:</span>
                    <span className="font-black text-rose-600">- {formatCurrency(totalDiscountsGiven)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-bold">مالیات بر ارزش افزوده (۱۰٪):</span>
                    <span className="font-black text-slate-800">+ {formatCurrency(totalTaxCollected)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-amber-700 font-bold">هزینه‌های جاری کارخانه:</span>
                    <span className="font-black text-amber-700">- {formatCurrency(totalExpensesAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-amber-700 font-bold">حقوق و دستمزد پرداختی پرسنل:</span>
                    <span className="font-black text-amber-700">- {formatCurrency(totalPayrollPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-sm font-black bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-900">تراز ناخالص عملیاتی دوره:</span>
                    <span className={netOperatingMargin >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black'}>
                      {formatCurrency(netOperatingMargin)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Box: Production & Operations High-Level Snapshot */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
                <h3 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Factory className="w-4 h-4 text-emerald-600" />
                  <span>آمار خلاصه تولید و موجودی‌های کارخانه</span>
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-bold">کل متراژ تولیدشده لوله:</span>
                    <span className="font-black text-emerald-700">
                      {toPersianDigits(formatNumber(totalProductionMeters))} متر
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-bold">کل وزن لوله‌های تولیدشده:</span>
                    <span className="font-black text-slate-800">
                      {toPersianDigits(formatNumber(totalProductionWeight))} کیلوگرم
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-bold">ضایعات تولید ثبت‌شده:</span>
                    <span className="font-black text-rose-600">
                      {toPersianDigits(formatNumber(totalProductionWaste))} کیلوگرم
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-bold">کل حواله‌های تحویل و بارگیری:</span>
                    <span className="font-black text-slate-800">
                      {toPersianDigits(filteredDeliveries.length)} حواله بارگیری
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-200">
                    <span className="text-slate-600 font-bold">تعداد کل مشتریان فعال سامانه:</span>
                    <span className="font-black text-slate-800">
                      {toPersianDigits(customers.length)} شرکت و شخص
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 text-xs font-bold bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-700">درصد راندمان تولید مواد (Output Efficiency):</span>
                    <span className="text-emerald-700 font-black">
                      {totalProductionWeight > 0
                        ? toPersianDigits(
                            Math.round(
                              (totalProductionWeight / (totalProductionWeight + totalProductionWaste)) * 100
                            )
                          ) + ' ٪'
                        : '۱۰۰ ٪'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SALES & INVOICES REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'sales' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                تعداد فاکتورها: <strong className="text-slate-900">{toPersianDigits(filteredInvoices.length)}</strong>
              </span>
              <span className="text-xs font-bold text-slate-700">
                مجموع متراژ فاکتورها: <strong className="text-blue-600">{toPersianDigits(formatNumber(totalMetersSold))} متر</strong>
              </span>
              <span className="text-xs font-bold text-slate-700">
                مجموع مبلغ فروش: <strong className="text-emerald-700">{formatCurrency(totalSalesRevenue)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">شماره فاکتور</th>
                    <th className="p-3">تاریخ فاکتور</th>
                    <th className="p-3">نام و کد مشتری</th>
                    <th className="p-3">متراژ اقلام</th>
                    <th className="p-3">جمع اقلام (تومان)</th>
                    <th className="p-3">تخفیف</th>
                    <th className="p-3">مالیات ارزش افزوده</th>
                    <th className="p-3">مبلغ نهایی</th>
                    <th className="p-3">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-slate-400 font-medium">
                        هیچ فاکتوری با فیلترهای مشخص‌شده یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, idx) => {
                      const meters = ensureArray(inv.items).reduce((sum, it) => sum + (it.quantity_meters || 0), 0);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-500">{toPersianDigits(idx + 1)}</td>
                          <td className="p-3 font-mono font-bold text-blue-600">{inv.invoice_number}</td>
                          <td className="p-3 font-medium text-slate-600">{formatJalaliDate(inv.invoice_date)}</td>
                          <td className="p-3 font-bold text-slate-900">{inv.customer_name}</td>
                          <td className="p-3 font-bold text-slate-700">{toPersianDigits(formatNumber(meters))} م</td>
                          <td className="p-3 font-mono">{formatCurrency(inv.subtotal, false)}</td>
                          <td className="p-3 font-mono text-rose-600">
                            {inv.discount ? formatCurrency(inv.discount, false) : '-'}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {inv.tax ? formatCurrency(inv.tax, false) : '-'}
                          </td>
                          <td className="p-3 font-black text-slate-900">{formatCurrency(inv.final_total)}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                inv.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {inv.status === 'active' ? 'تایید و فعال' : 'لغو شده'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. CUSTOMER BALANCES & DEBTORS REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">
                تعداد مشتریان: <strong className="text-slate-900">{toPersianDigits(filteredCustomerSummaries.length)}</strong>
              </span>
              <span className="font-bold text-rose-700">
                مجموع طلب شرکت (بدهکاران): <strong>{formatCurrency(totalCustomerDebtBalance)}</strong>
              </span>
              <span className="font-bold text-emerald-700">
                مجموع بستانکاری مشتریان: <strong>{formatCurrency(totalCustomerCreditBalance)}</strong>
              </span>
              <span className="font-bold text-amber-700">
                مجموع تعهد تحویل بار: <strong>{toPersianDigits(formatNumber(totalPendingDeliveryMeters))} متر</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">کد مشتری</th>
                    <th className="p-3">نام و عنوان مشتری</th>
                    <th className="p-3">کل خریدها (بدهکار)</th>
                    <th className="p-3">کل پرداختی‌ها (بستانکار)</th>
                    <th className="p-3">مانده حساب نهایی</th>
                    <th className="p-3">وضعیت حساب</th>
                    <th className="p-3">متراژ در صف تحویل</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomerSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-slate-400 font-medium">
                        هیچ مشتری مطابق با فیلتر مشخص‌شده وجود ندارد.
                      </td>
                    </tr>
                  ) : (
                    filteredCustomerSummaries.map((s, idx) => (
                      <tr key={s.customer_id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-slate-500">{toPersianDigits(idx + 1)}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">{s.customer_code}</td>
                        <td className="p-3 font-bold text-slate-900 text-right pr-4">{s.customer_name}</td>
                        <td className="p-3 font-mono">{formatCurrency(s.total_debit, false)}</td>
                        <td className="p-3 font-mono">{formatCurrency(s.total_credit, false)}</td>
                        <td className="p-3 font-black">
                          <span
                            className={
                              s.status === 'debit'
                                ? 'text-rose-700'
                                : s.status === 'credit'
                                ? 'text-emerald-700'
                                : 'text-slate-700'
                            }
                          >
                            {formatCurrency(Math.abs(s.balance))}
                          </span>
                        </td>
                        <td className="p-3">
                          {s.status === 'debit' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              بدهکار (طلب کارخانه)
                            </span>
                          )}
                          {s.status === 'credit' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              بستانکار (پیش‌پرداخت)
                            </span>
                          )}
                          {s.status === 'settled' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">
                              تسویه
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {s.pending_delivery_meters > 0 ? (
                            <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              {toPersianDigits(formatNumber(s.pending_delivery_meters))} متر
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">۰</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. PRODUCTION & FACTORY OUTPUT */}
        {/* ========================================================================= */}
        {activeTab === 'production' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
              <span>
                تعداد نوبت‌های ثبت تولید: <strong className="text-slate-900">{toPersianDigits(filteredProduction.length)}</strong>
              </span>
              <span>
                مجموع متراژ تولید: <strong className="text-emerald-700">{toPersianDigits(formatNumber(totalProductionMeters))} متر</strong>
              </span>
              <span>
                مجموع وزن لوله‌ها: <strong className="text-slate-900">{toPersianDigits(formatNumber(totalProductionWeight))} کیلوگرم</strong>
              </span>
              <span>
                مجموع ضایعات: <strong className="text-rose-700">{toPersianDigits(formatNumber(totalProductionWaste))} کیلوگرم</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">تاریخ ثبت</th>
                    <th className="p-3">خط اکسترودر / شیفت</th>
                    <th className="p-3">محصول و سایز لوله</th>
                    <th className="p-3">متراژ تولید (متر)</th>
                    <th className="p-3">وزن خالص (kg)</th>
                    <th className="p-3">ضایعات (kg)</th>
                    <th className="p-3">اپراتور / مسئول</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProduction.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-slate-400 font-medium">
                        هیچ سابقه تولیدی در این بازه زمانی ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredProduction.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-slate-500">{toPersianDigits(idx + 1)}</td>
                        <td className="p-3 font-medium text-slate-600">{formatJalaliDate(p.date)}</td>
                        <td className="p-3 font-bold text-slate-900">{p.line_name}</td>
                        <td className="p-3 font-bold text-slate-800">{p.product_name}</td>
                        <td className="p-3 font-black text-emerald-700 font-mono">
                          {toPersianDigits(formatNumber(p.meters_produced))}
                        </td>
                        <td className="p-3 font-mono text-slate-800">
                          {toPersianDigits(formatNumber(p.weight_kg))}
                        </td>
                        <td className="p-3 font-mono text-rose-600">
                          {p.waste_kg ? toPersianDigits(formatNumber(p.waste_kg)) : '۰'}
                        </td>
                        <td className="p-3 text-slate-700 font-medium">{p.operator_name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. WAREHOUSE & RAW MATERIALS REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'warehouse' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
              <span>
                تعداد اقلام مواد اولیه: <strong className="text-slate-900">{toPersianDigits(filteredMaterials.length)} قلم</strong>
              </span>
              <span>
                مجموع موجودی مواد: <strong className="text-blue-600">
                  {toPersianDigits(formatNumber(filteredMaterials.reduce((acc, m) => acc + (m.stock_kg || 0), 0)))} کیلوگرم
                </strong>
              </span>
              <span>
                ارزش ریالی موجودی انبار: <strong className="text-emerald-700">
                  {formatCurrency(filteredMaterials.reduce((acc, m) => acc + m.stock_kg * (m.average_cost || 0), 0))}
                </strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">کد مواد</th>
                    <th className="p-3">عنوان ماده اولیه / گرانول</th>
                    <th className="p-3">نوع / گرید</th>
                    <th className="p-3">موجودی فعلی انبار</th>
                    <th className="p-3">حداقل هشدار</th>
                    <th className="p-3">میانگین نرخ خرید</th>
                    <th className="p-3">ارزش کل ریالی موجودی</th>
                    <th className="p-3">وضعیت انبار</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-slate-400 font-medium">
                        هیچ ماده اولیه‌ای یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredMaterials.map((m, idx) => {
                      const isLow = m.stock_kg <= m.min_alert_kg;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-500">{toPersianDigits(idx + 1)}</td>
                          <td className="p-3 font-mono font-bold text-slate-700">{m.code}</td>
                          <td className="p-3 font-bold text-slate-900">{m.name}</td>
                          <td className="p-3 font-medium text-slate-600">{m.type}</td>
                          <td className="p-3 font-black text-slate-900 font-mono">
                            {toPersianDigits(formatNumber(m.stock_kg))} kg
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {toPersianDigits(formatNumber(m.min_alert_kg))} kg
                          </td>
                          <td className="p-3 font-mono text-slate-700">
                            {formatCurrency(m.average_cost || 0, false)}
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-700">
                            {formatCurrency(m.stock_kg * (m.average_cost || 0))}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                isLow
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isLow ? 'کسری / سفارش مجدد' : 'مطلوب'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. LOGISTICS & DELIVERIES REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'deliveries' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
              <span>
                تعداد کل حواله‌ها: <strong className="text-slate-900">{toPersianDigits(filteredDeliveries.length)}</strong>
              </span>
              <span>
                مجموع متراژ تحویل‌شده: <strong className="text-blue-600">
                  {toPersianDigits(
                    formatNumber(
                      filteredDeliveries.reduce(
                        (acc, d) =>
                          acc + ensureArray(d.items).reduce((sum, it) => sum + (it.quantity_meters || 0), 0),
                        0
                      )
                    )
                  )} متر
                </strong>
              </span>
              <span>
                تعداد موارد مرجوعی: <strong className="text-rose-700">{toPersianDigits(returns.length)} مورد</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">شماره حواله</th>
                    <th className="p-3">تاریخ تحویل</th>
                    <th className="p-3">نام مشتری</th>
                    <th className="p-3">راننده و خودرو</th>
                    <th className="p-3">متراژ بار</th>
                    <th className="p-3">شرح بار</th>
                    <th className="p-3">وضعیت رسید مشتری</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-slate-400 font-medium">
                        هیچ حواله تحویلی در این بازه یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredDeliveries.map((d, idx) => {
                      const meters = ensureArray(d.items).reduce((acc, it) => acc + (it.quantity_meters || 0), 0);
                      return (
                        <tr key={d.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-500">{toPersianDigits(idx + 1)}</td>
                          <td className="p-3 font-mono font-bold text-blue-600">{d.delivery_number}</td>
                          <td className="p-3 font-medium text-slate-600">{formatJalaliDate(d.delivery_date)}</td>
                          <td className="p-3 font-bold text-slate-900">{d.customer_name}</td>
                          <td className="p-3 text-slate-700">
                            {d.driver_name} - {d.vehicle_info || 'خودرو متفرقه'}
                          </td>
                          <td className="p-3 font-black text-slate-900 font-mono">
                            {toPersianDigits(formatNumber(meters))} م
                          </td>
                          <td className="p-3 text-slate-600 text-[11px] max-w-xs truncate">
                            {d.description || ensureArray(d.items).map((it) => `${it.product_name} (${toPersianDigits(it.quantity_meters)}m)`).join(', ')}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                d.received_by_customer
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {d.received_by_customer ? 'رسید و تایید شد' : 'در حال حمل'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. FACTORY EXPENSES REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
              <span>
                تعداد اسناد هزینه: <strong className="text-slate-900">{toPersianDigits(filteredExpenses.length)}</strong>
              </span>
              <span>
                مجموع کل هزینه‌های دوره: <strong className="text-rose-700">{formatCurrency(totalExpensesAmount)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">کد سند</th>
                    <th className="p-3">تاریخ هزینه</th>
                    <th className="p-3">عنوان هزینه</th>
                    <th className="p-3">سرفصل دسته‌بندی</th>
                    <th className="p-3">ذینفع / طرف حساب</th>
                    <th className="p-3">روش پرداخت</th>
                    <th className="p-3">مبلغ هزینه (تومان)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-slate-400 font-medium">
                        هیچ هزینه‌ای با فیلترهای مشخص‌شده ثبت نشده است.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp, idx) => (
                      <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3 font-mono text-slate-500">{toPersianDigits(idx + 1)}</td>
                        <td className="p-3 font-mono font-bold text-slate-700">{exp.code}</td>
                        <td className="p-3 font-medium text-slate-600">{formatJalaliDate(exp.expense_date)}</td>
                        <td className="p-3 font-bold text-slate-900 text-right pr-4">{exp.title}</td>
                        <td className="p-3 font-bold text-blue-700 bg-blue-50/50 rounded-md">
                          {exp.category}
                        </td>
                        <td className="p-3 text-slate-700">{exp.beneficiary}</td>
                        <td className="p-3 text-slate-600">
                          {exp.payment_method === 'transfer'
                            ? 'حواله بانکی'
                            : exp.payment_method === 'cheque'
                            ? 'چک'
                            : exp.payment_method === 'card'
                            ? 'کارتخوان'
                            : 'نقد'}
                        </td>
                        <td className="p-3 font-black text-rose-700 font-mono">
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. PAYROLL & PERSONNEL REPORT */}
        {/* ========================================================================= */}
        {activeTab === 'payroll' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
              <span>
                تعداد کل پرسنل: <strong className="text-slate-900">{toPersianDigits(filteredEmployeeSummaries.length)}</strong>
              </span>
              <span>
                مجموع حقوق پایه ماهانه: <strong className="text-slate-900">
                  {formatCurrency(filteredEmployeeSummaries.reduce((acc, e) => acc + (e.salary_base || 0), 0))}
                </strong>
              </span>
              <span>
                کل پرداختی‌های انجام‌شده دوره: <strong className="text-emerald-700">{formatCurrency(totalPayrollPaid)}</strong>
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-center text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">ردیف</th>
                    <th className="p-3">کد پرسنلی</th>
                    <th className="p-3">نام و سمت سازمانی</th>
                    <th className="p-3">شماره تماس</th>
                    <th className="p-3">پایه حقوق (تومان)</th>
                    <th className="p-3">وضعیت مانده حساب کارمند</th>
                    <th className="p-3">وضعیت اشتغال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployeeSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-slate-400 font-medium">
                        پرسنلی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployeeSummaries.map((emp, idx) => {
                      const isCreditor = emp.balance > 0;
                      const isDebtor = emp.balance < 0;
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-mono text-slate-500">{toPersianDigits(idx + 1)}</td>
                          <td className="p-3 font-mono font-bold text-slate-700">{emp.code}</td>
                          <td className="p-3 text-right pr-4 font-bold text-slate-900">
                            <div>{emp.name}</div>
                            <div className="text-[11px] font-normal text-slate-500">{emp.position || 'پرسنل کارخانه'}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-600">{toPersianDigits(emp.phone1 || '-')}</td>
                          <td className="p-3 font-mono font-bold text-slate-800">{formatCurrency(emp.salary_base || 0, false)}</td>
                          <td className="p-3">
                            {isCreditor && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ArrowUpRight className="w-3 h-3" />
                                طلبکار: {formatCurrency(emp.balance)}
                              </span>
                            )}
                            {isDebtor && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <ArrowDownLeft className="w-3 h-3" />
                                بدهکار: {formatCurrency(Math.abs(emp.balance))}
                              </span>
                            )}
                            {emp.balance === 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                                تسویه
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                emp.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {emp.status === 'active' ? 'شاغل' : 'غیرفعال'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
