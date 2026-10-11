import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { CustomerAccountService } from '../../services/accountService';
import { Payment, Customer, PaymentMethod } from '../../types';
import { formatCurrency, formatJalaliDate, getTodayISO, toPersianDigits } from '../../utils/jalali';
import { exportToExcel } from '../../utils/exportExcel';
import { CustomerSelectSearch } from '../Common/CustomerSelectSearch';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { SortableHeader } from '../Common/SortableHeader';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import {
  Search,
  Plus,
  CreditCard,
  Printer,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  History,
} from 'lucide-react';

interface PaymentManagerProps {
  initialCustomerId?: string;
  onPrintReceipt?: (payment: Payment) => void;
}

export const PaymentManager: React.FC<PaymentManagerProps> = ({
  initialCustomerId,
  onPrintReceipt,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  const [showModal, setShowModal] = useState(false);
  const [historyPayment, setHistoryPayment] = useState<Payment | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [paymentDate, setPaymentDate] = useState<string>(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [amount, setAmount] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Cheque Fields
  const [chequeNumber, setChequeNumber] = useState<string>('');
  const [bankName, setBankName] = useState<string>('ملی');
  const [dueDate, setDueDate] = useState<string>(getTodayISO());
  const [drawerName, setDrawerName] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    if (initialCustomerId) {
      setIsSubmitting(false);
      setSelectedCustomerId(initialCustomerId);
      setPaymentDate(getTodayISO());
      setPaymentMethod('transfer');
      setAmount(1000000);
      setReferenceNumber('');
      setDescription('واریز نقدی / حواله به حساب');
      setChequeNumber('');
      setBankName('ملی');
      setDueDate(getTodayISO());
      setDrawerName('');
      setErrorMessage('');
      setShowModal(true);
    }
  }, [initialCustomerId]);

  useEffect(() => {
    const handleDbSynced = () => {
      if (!showModal) {
        loadData();
      }
    };
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    return () => {
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
    };
  }, [showModal]);

  const loadData = () => {
    setPayments(StorageService.getPayments());
    setCustomers(StorageService.getCustomers().filter((c) => c.is_active));
  };

  const handleOpenAdd = () => {
    setIsSubmitting(false);
    setSelectedCustomerId(initialCustomerId || (customers[0]?.id || ''));
    setPaymentDate(getTodayISO());
    setPaymentMethod('transfer');
    setAmount(1000000);
    setReferenceNumber('');
    setDescription('واریز نقدی / حواله به حساب');
    setChequeNumber('');
    setBankName('ملی');
    setDueDate(getTodayISO());
    setDrawerName('');
    setErrorMessage('');
    setShowModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedCustomerId) {
      setErrorMessage('انتخاب مشتری الزامی است.');
      return;
    }
    if (amount <= 0) {
      setErrorMessage('مبلغ دریافتی باید بزرگتر از صفر باشد.');
      return;
    }

    if (paymentMethod === 'cheque') {
      if (!chequeNumber.trim()) {
        setErrorMessage('شماره چک صیادی الزامی است.');
        return;
      }
      if (!bankName.trim()) {
        setErrorMessage('نام بانک صادرکننده چک الزامی است.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = CustomerAccountService.recordPayment({
        customer_id: selectedCustomerId,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        amount,
        reference_number: referenceNumber.trim() || undefined,
        cheque_data:
          paymentMethod === 'cheque'
            ? {
                cheque_number: chequeNumber.trim(),
                bank_name: bankName.trim(),
                due_date: dueDate,
                description: drawerName.trim() ? `صاحب حساب: ${drawerName.trim()}` : undefined,
              }
            : undefined,
        description: description.trim() || undefined,
      });

      if (!res.success) {
        setIsSubmitting(false);
        setErrorMessage(res.message || 'خطا در ثبت دریافت وجه');
        return;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});
      setIsSubmitting(false);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'خطای غیرمنتظره در ثبت دریافتی');
    }
  };

  const handleExportExcel = () => {
    const data = filteredPayments.map((p, idx) => ({
      ردیف: idx + 1,
      کد_مشتری: p.customer_code,
      نام_مشتری: p.customer_name,
      تاریخ_دریافت: formatJalaliDate(p.payment_date),
      روش_پرداخت: p.payment_method,
      مبلغ_تومان: p.amount,
      شماره_پیگیری_چک: p.reference_number || p.cheque_number || '-',
      شرح_واریز: p.description || '-',
      ثبت_کننده: p.created_by,
    }));

    exportToExcel({
      fileName: 'لیست_دریافتی_ها_و_پرداخت_ها',
      sheetName: 'دریافت‌ها',
      data,
    });
  };

  const filteredPayments = payments.filter((p) => {
    const matchSearch =
      p.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reference_number && p.reference_number.includes(searchQuery)) ||
      (p.cheque_number && p.cheque_number.includes(searchQuery)) ||
      (p.description && p.description.includes(searchQuery));

    if (!matchSearch) return false;
    if (methodFilter !== 'all' && p.payment_method !== methodFilter) return false;

    return true;
  });

  // Sorting state - defaults to newest payments first (payment_date desc)
  const [sortKey, setSortKey] = useState<string>('payment_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'payment_date' ? 'desc' : 'asc');
    }
  };

  const sortedPayments = React.useMemo(() => {
    return [...filteredPayments].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'customer_name') {
        valA = a.customer_name || '';
        valB = b.customer_name || '';
      } else if (sortKey === 'payment_date') {
        valA = new Date(a.payment_date).getTime() || 0;
        valB = new Date(b.payment_date).getTime() || 0;
      } else if (sortKey === 'payment_method') {
        valA = a.payment_method || '';
        valB = b.payment_method || '';
      } else if (sortKey === 'amount') {
        valA = a.amount || 0;
        valB = b.amount || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPayments, sortKey, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">
            دریافت و پرداخت‌های مالی (Payments)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ثبت واریز نقدی، فیش حواله پایا/ساتنا، کارتخوان و ثبت چک‌های دریافتی صیادی
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>خروجی اکسل</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت دریافت وجه</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجو در نام مشتری، کد، شماره پیگیری، شماره چک یا شرح..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Method Filter */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setMethodFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              methodFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه روش‌ها
          </button>
          <button
            onClick={() => setMethodFilter('transfer')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              methodFilter === 'transfer' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            حواله بانکی
          </button>
          <button
            onClick={() => setMethodFilter('cheque')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              methodFilter === 'cheque' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            چک دریافتی
          </button>
          <button
            onClick={() => setMethodFilter('pos')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              methodFilter === 'pos' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            کارتخوان (POS)
          </button>
          <button
            onClick={() => setMethodFilter('cash')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              methodFilter === 'cash' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            نقدی
          </button>
        </div>
      </div>

      {/* Payments Container: Mobile Cards (<md) & Desktop Table (>=md) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="md:hidden p-3 sm:p-4 bg-slate-100/75 dark:bg-slate-950/40 space-y-3">
          {sortedPayments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              تراکنش دریافتی یافت نشد.
            </div>
          ) : (
            sortedPayments.map((p) => (
              <div
                key={`mob-pay-${p.id}`}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition overflow-hidden"
              >
                {/* Header: Customer + Code + Date */}
                <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {p.customer_name}
                    </span>
                    {p.customer_code && (
                      <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        {toPersianDigits(p.customer_code)}
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {formatJalaliDate(p.payment_date)}
                  </span>
                </div>

                {/* Body: Method, Amount, Ref/Cheque & Description */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {p.payment_method === 'cash' && 'وجه نقد'}
                      {p.payment_method === 'pos' && 'کارتخوان فروشگاه'}
                      {p.payment_method === 'transfer' && 'حواله بانکی'}
                      {p.payment_method === 'cheque' && 'چک صیادی'}
                      {p.payment_method === 'other' && 'سایر'}
                    </span>

                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(p.amount)} <span className="text-[10px] font-normal text-slate-500">تومان</span>
                    </span>
                  </div>

                  {(p.reference_number || p.cheque_number) && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 font-mono">
                      <span className="text-slate-400 text-[10px]">شماره پیگیری/چک:</span>
                      <span>{p.reference_number || p.cheque_number}</span>
                    </div>
                  )}

                  {p.description && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      {p.description}
                    </div>
                  )}
                </div>

                {/* Footer: Creator & Actions */}
                <div className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    ثبت: {p.created_by || 'سیستم'}
                  </span>

                  <div className="flex items-center gap-1">
                    {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('payments.view')) && (
                      <button
                        type="button"
                        onClick={() => setHistoryPayment(p)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                        title="تاریخچه پرداخت"
                      >
                        <History className="w-4 h-4" />
                      </button>
                    )}

                    {StorageService.hasPermission('payments.print') && onPrintReceipt && (
                      <button
                        onClick={() => onPrintReceipt(p)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-bold text-xs hover:bg-blue-100 transition flex items-center gap-1"
                        title="چاپ رسید"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>رسید</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <SortableHeader
                  label="مشتری"
                  sortKey="customer_name"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="تاریخ دریافت"
                  sortKey="payment_date"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="روش پرداخت"
                  sortKey="payment_method"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="مبلغ (تومان)"
                  sortKey="amount"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="right"
                />
                <th className="py-3 px-4">شماره پیگیری / شماره چک</th>
                <th className="py-3 px-4">شرح تراکنش</th>
                <th className="py-3 px-4">ثبت‌کننده</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    تراکنش دریافتی یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.customer_name}</div>
                      <div className="text-[11px] text-slate-600 font-mono">{p.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatJalaliDate(p.payment_date)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                        {p.payment_method === 'cash' && 'وجه نقد'}
                        {p.payment_method === 'pos' && 'کارتخوان فروشگاه'}
                        {p.payment_method === 'transfer' && 'حواله بانکی'}
                        {p.payment_method === 'cheque' && 'چک صیادی'}
                        {p.payment_method === 'other' && 'سایر'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-600">{formatCurrency(p.amount)}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{p.reference_number || p.cheque_number || '-'}</td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">{p.description || '-'}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{p.created_by}</td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('payments.view')) && (
                          <button
                            type="button"
                            onClick={() => setHistoryPayment(p)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer"
                            title="تاریخچه و لاگ پرداخت"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}
                        {StorageService.hasPermission('payments.print') && onPrintReceipt && (
                          <button
                            onClick={() => onPrintReceipt(p)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                            title="چاپ رسید دریافت وجه"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">ثبت دریافت وجه / چک از مشتری</h3>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSavePayment} className="space-y-3.5 text-xs">
              <div>
                <CustomerSelectSearch
                  label="انتخاب یا جستجوی مشتری"
                  required
                  selectedCustomerId={selectedCustomerId}
                  onSelectCustomer={(c) => {
                    setSelectedCustomerId(c.id);
                    setErrorMessage('');
                  }}
                  onCustomerCreated={(c) => {
                    loadData();
                    setSelectedCustomerId(c.id);
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    روش دریافت <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                  >
                    <option value="transfer">حواله بانکی (پایا / ساتنا)</option>
                    <option value="cheque">چک بانکی صیادی</option>
                    <option value="pos">کارتخوان فروشگاه (POS)</option>
                    <option value="cash">وجه نقد</option>
                    <option value="other">سایر</option>
                  </select>
                </div>

                <div>
                  <JalaliDatePicker
                    label="تاریخ دریافت (خورشیدی)"
                    required
                    value={paymentDate}
                    onChange={(isoDate) => setPaymentDate(isoDate)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  مبلغ دریافتی (تومان) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-sm font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                />
                <div className="text-[11px] text-emerald-600 font-bold mt-1">
                  معادل: {formatCurrency(amount, true)}
                </div>
              </div>

              {/* Conditional Cheque Fields */}
              {paymentMethod === 'cheque' ? (
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <div className="flex items-center gap-2 text-purple-900 font-bold">
                    <Layers className="w-4 h-4" />
                    <span>مشخصات چک صیادی دریافتی:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-purple-900 font-bold mb-1">
                        شماره صیاد / شماره چک <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="۱۶ رقمی صیادی یا سریال"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-purple-200 font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-purple-900 font-bold mb-1">
                        نام بانک صادرکننده <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: ملی، ملت، صادرات..."
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-purple-200 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <JalaliDatePicker
                        label="تاریخ سررسید چک (خورشیدی)"
                        required
                        value={dueDate}
                        onChange={(isoDate) => setDueDate(isoDate)}
                      />
                    </div>

                    <div>
                      <label className="block text-purple-900 font-bold mb-1">
                        نام صاحب حساب / صادرکننده
                      </label>
                      <input
                        type="text"
                        placeholder="اختیاری"
                        value={drawerName}
                        onChange={(e) => setDrawerName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-purple-200 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    شماره پیگیری / شماره ارجاع فیش بانکی
                  </label>
                  <input
                    type="text"
                    placeholder="شماره پیگیری تراکنش..."
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  شرح و توضیحات واریز
                </label>
                <textarea
                  rows={2}
                  placeholder="بابت تسویه فاکتور، بیعانه سفارش..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden leading-relaxed"
                />
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ثبت اطلاعات...</span>
                    </>
                  ) : (
                    <span>ثبت قطعی دریافتی</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Audit History Modal */}
      {historyPayment && (
        <AuditHistoryModal
          isOpen={!!historyPayment}
          onClose={() => setHistoryPayment(null)}
          entityType="PAYMENT"
          entityId={historyPayment.id}
          documentNumber={historyPayment.reference_number || historyPayment.cheque_number || historyPayment.id}
          title="تاریخچه و رویدادهای سند دریافت وجه"
          subtitle={`مشتری: ${historyPayment.customer_name} - مبلغ: ${formatCurrency(historyPayment.amount)}`}
        />
      )}
    </div>
  );
};
