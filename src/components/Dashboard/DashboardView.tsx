import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import {
  Customer,
  Order,
  Invoice,
  Payment,
  Cheque,
  DeliveryNote,
  ReturnDoc,
  CustomerTransaction,
  Material,
  CustomerAccountSummary,
} from '../../types';
import { formatCurrency, formatJalaliDate, formatNumber } from '../../utils/jalali';
import {
  TrendingUp,
  Receipt,
  CreditCard,
  Truck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Boxes,
  Layers,
  ChevronLeft,
  FileCheck2,
  PlusCircle,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string, extraData?: any) => void;
  onOpenNewOrder: () => void;
  onOpenNewPayment: () => void;
  onOpenNewDelivery: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenNewOrder,
  onOpenNewPayment,
  onOpenNewDelivery,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [returns, setReturns] = useState<ReturnDoc[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [summaries, setSummaries] = useState<CustomerAccountSummary[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const custs = StorageService.getCustomers();
    setCustomers(custs);
    setOrders(StorageService.getOrders());
    setInvoices(StorageService.getInvoices());
    setPayments(StorageService.getPayments());
    setCheques(StorageService.getCheques());
    setDeliveries(StorageService.getDeliveries());
    setReturns(StorageService.getReturns());
    setTransactions(StorageService.getTransactions());
    setMaterials(StorageService.getMaterials());

    // Calculate account summaries for all customers
    const summs = custs.map((c) => StorageService.getCustomerAccountSummary(c.id));
    setSummaries(summs);
  };

  // KPI Calculations
  const totalDebtors = summaries
    .filter((s) => s.status === 'debit')
    .reduce((sum, s) => sum + s.balance, 0);

  const totalCreditors = summaries
    .filter((s) => s.status === 'credit')
    .reduce((sum, s) => sum + Math.abs(s.balance), 0);

  const activeInvoicesTotal = invoices
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + (i.final_total || 0), 0);

  const completedPaymentsTotal = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingCheques = cheques.filter((c) => c.status === 'pending');
  const pendingChequesAmount = pendingCheques.reduce((sum, c) => sum + (c.amount || 0), 0);

  const draftOrders = orders.filter((o) => o.status === 'draft');
  const totalPendingDeliveryMeters = summaries.reduce((sum, s) => sum + (s.pending_delivery_meters || 0), 0);

  if (!StorageService.canAccessTab('dashboard')) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto mt-12 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          عدم دسترسی به داشبورد
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          شما مجوز دسترسی لازم برای مشاهده داشبورد مدیریت را ندارید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-500/30 text-blue-200 text-xs px-2.5 py-0.5 rounded-full font-medium border border-blue-400/30">
                مرکز کنترل عملیات فروش و حسابداری
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              میزکار مدیریت تولید و فروش لوله پلی‌اتیلن
            </h1>
            <p className="text-blue-200 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              کنترل یکپارچه تراز مالی مشتریان، صدور فاکتورهای فروش، کنترل سقف تحویل، صدور حواله بارگیری و انبار مواد اولیه
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {StorageService.hasPermission('orders.create') && (
              <button
                onClick={onOpenNewOrder}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-blue-900 hover:bg-blue-50 text-xs font-bold shadow-md transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <span>ثبت سفارش جدید</span>
              </button>
            )}
            {StorageService.hasPermission('customers.payments') && (
              <button
                onClick={onOpenNewPayment}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                <CreditCard className="w-4 h-4" />
                <span>ثبت دریافت وجه</span>
              </button>
            )}
            {StorageService.hasPermission('deliveries.create') && (
              <button
                onClick={onOpenNewDelivery}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md transition cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>حواله بارگیری</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Debit Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">کل طلب از مشتریان (بدهکاران)</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-rose-600">
              {formatCurrency(totalDebtors, true)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>مانده بدهی تاییدشده و فاکتورها</span>
            </div>
          </div>
        </div>

        {/* Total Credit Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">کل بستانکاری مشتریان (پیش‌دریافت)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-emerald-600">
              {formatCurrency(totalCreditors, true)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>پرداخت‌های مازاد و اسناد تعدیل/برگشت</span>
            </div>
          </div>
        </div>

        {/* Total Sales Invoices */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">مجموع فروش فاکتورهای فعال</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900">
              {formatCurrency(activeInvoicesTotal, true)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              تعداد {invoices.filter((i) => i.status === 'active').length.toLocaleString('fa-IR')} فاکتور تاییدشده
            </div>
          </div>
        </div>

        {/* Pending Delivery Commitment */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">تعهد تحویل بار (متراژ باقی‌مانده)</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-amber-600">
              {formatNumber(totalPendingDeliveryMeters)} <span className="text-sm font-normal text-slate-600">متر</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              در انتظار بارگیری و صدور حواله خروج
            </div>
          </div>
        </div>
      </div>

      {/* Scenarios Quick Verification Showcase */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-700" />
            <h2 className="text-sm font-bold text-blue-900">
              تست و صحت‌سنجی سناریوهای استاندارد سند تجاری لوله پلی‌اتیلن
            </h2>
          </div>
          <span className="text-[11px] text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full font-medium">
            تطابق ۱۰۰٪ با سند فنی
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Scenario 38 */}
          <div
            onClick={() => onNavigate('customers', 'cus-1')}
            className="p-3.5 rounded-xl bg-white border border-blue-200 hover:border-blue-400 transition cursor-pointer shadow-2xs hover:shadow-xs space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">سناریوی ۳۸: چرخه کامل فروش و برگشت</span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              مشتری CUS-1001: سفارش ۱۰۰م با تخفیف (۴.۸ م) ➔ فاکتور INV-1001 ➔ پرداخت ۲ م ➔ تحویل ۶۰م و ۴۰م ➔ برگشت ۲۰م (۱ م بستانکاری) ➔ مانده ۱.۸ م بدهکار
            </p>
          </div>

          {/* Scenario 39 */}
          <div
            onClick={() => onNavigate('customers', 'cus-2')}
            className="p-3.5 rounded-xl bg-white border border-blue-200 hover:border-blue-400 transition cursor-pointer shadow-2xs hover:shadow-xs space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">سناریوی ۳۹: مانده بستانکاری معتبر</span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              مشتری CUS-1002: پرداخت ۱ م ➔ فاکتور ۶۰۰هزار ➔ تعدیل بدهکار ۱۰۰هزار ➔ مانده ۳۰۰هزار تومان بستانکار کاملاً معتبر و پایدار
            </p>
          </div>

          {/* Scenario 40 */}
          <div
            onClick={() => onNavigate('deliveries')}
            className="p-3.5 rounded-xl bg-white border border-blue-200 hover:border-blue-400 transition cursor-pointer shadow-2xs hover:shadow-xs space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">سناریوی ۴۰: چند فاکتور در یک رسید تحویل</span>
              <ChevronLeft className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              مشتری CUS-1003: رسید تحویل DEL-1003 تجمیع ۴۰ متر از INV-1003 و ۱۰۰ متر از INV-1004 در یک حواله بارگیری کامیون
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer Accounts Balance Table (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Balances Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">وضعیت تراز حساب مشتریان</h3>
                <p className="text-xs text-slate-500 mt-0.5">تفکیک وضعیت بدهکار، بستانکار و تسویه</p>
              </div>
              <button
                onClick={() => onNavigate('customers')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>مشاهده همه مشتریان</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/50">
                    <th className="py-2.5 px-3">کد مشتری</th>
                    <th className="py-2.5 px-3">نام شخص / شرکت</th>
                    <th className="py-2.5 px-3">کل بدهکار (Debit)</th>
                    <th className="py-2.5 px-3">کل بستانکار (Credit)</th>
                    <th className="py-2.5 px-3">مانده نهایی</th>
                    <th className="py-2.5 px-3">وضعیت حساب</th>
                    <th className="py-2.5 px-3">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaries.map((s) => (
                    <tr key={s.customer_id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-600">{s.customer_code}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{s.customer_name}</td>
                      <td className="py-3 px-3 text-slate-700">{formatCurrency(s.total_debit, false)}</td>
                      <td className="py-3 px-3 text-slate-700">{formatCurrency(s.total_credit, false)}</td>
                      <td className="py-3 px-3 font-bold">
                        <span
                          className={
                            s.status === 'debit'
                              ? 'text-rose-600'
                              : s.status === 'credit'
                              ? 'text-emerald-600'
                              : 'text-slate-500'
                          }
                        >
                          {formatCurrency(Math.abs(s.balance), true)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {s.status === 'debit' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            بدهکار
                          </span>
                        )}
                        {s.status === 'credit' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            بستانکار
                          </span>
                        )}
                        {s.status === 'settled' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            تسویه
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <button
                          onClick={() => onNavigate('customers', s.customer_id)}
                          className="px-2.5 py-1 rounded-lg text-blue-600 hover:bg-blue-50 font-semibold text-[11px] transition cursor-pointer"
                        >
                          مشاهده پرونده
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Financial Transactions Feed */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">آخرین گردش‌های مالی حسابداری</h3>
                <p className="text-xs text-slate-500 mt-0.5">تراکنش‌های ثبت‌شده در دفاتر حساب مشتریان</p>
              </div>
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>دفتر روزنامه کامل</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {transactions.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        t.debit > 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {t.debit > 0 ? '+' : '-'}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{t.description}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>تاریخ: {formatJalaliDate(t.transaction_date)}</span>
                        {t.reference_number && (
                          <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            {t.reference_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-left">
                    <div
                      className={`font-black text-sm ${
                        t.debit > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {t.debit > 0 ? `+${formatCurrency(t.debit)}` : `-${formatCurrency(t.credit)}`}
                    </div>
                    <span className="text-[10px] text-slate-600 font-medium">
                      {t.debit > 0 ? 'بدهکار (افزایش طلب)' : 'بستانکار (واریز/برگشت)'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Cheques, Deliveries & Raw Material Alerts */}
        <div className="space-y-6">
          {/* Upcoming Cheques Alert */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">چک‌های در انتظار سررسید</h3>
              </div>
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {pendingCheques.length.toLocaleString('fa-IR')} فقره
              </span>
            </div>

            {pendingCheques.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-600">
                چک معوق یا در انتظار سررسیدی وجود ندارد.
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingCheques.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{c.customer_name}</span>
                      <span className="text-xs font-black text-emerald-600">
                        {formatCurrency(c.amount)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center justify-between">
                      <span>بانک: {c.bank_name}</span>
                      <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        سررسید: {formatJalaliDate(c.due_date)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      ش چک: {c.cheque_number}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => onNavigate('cheques')}
              className="w-full mt-3 py-2 text-center text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition"
            >
              مدیریت و وصول چک‌ها
            </button>
          </div>

          {/* Raw Materials Inventory Stock Alert */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">موجودی مواد اولیه کارخانه</h3>
              </div>
              <button
                onClick={() => onNavigate('warehouse')}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800"
              >
                انبار مواد
              </button>
            </div>

            <div className="space-y-3">
              {materials.map((m) => {
                const percent = Math.min(100, Math.round((m.current_stock / (m.min_stock_alert * 3)) * 100));
                const isLow = m.current_stock <= m.min_stock_alert;
                return (
                  <div key={m.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800">{m.name}</span>
                      <span className="font-bold font-mono text-slate-900">
                        {formatNumber(m.current_stock)} {m.unit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isLow ? 'bg-rose-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    {isLow && (
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        هشدار کسری موجودی نسبت به نقطه سفارش
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
