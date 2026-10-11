import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { CustomerAccountService } from '../../services/accountService';
import { Adjustment, Customer } from '../../types';
import { formatCurrency, formatJalaliDate, getTodayISO } from '../../utils/jalali';
import { exportToExcel } from '../../utils/exportExcel';
import { CustomerSelectSearch } from '../Common/CustomerSelectSearch';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { SortableHeader } from '../Common/SortableHeader';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import {
  Search,
  Plus,
  Scale,
  Download,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  History,
} from 'lucide-react';

interface AdjustmentManagerProps {
  initialCustomerId?: string;
}

export const AdjustmentManager: React.FC<AdjustmentManagerProps> = ({ initialCustomerId }) => {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'debit' | 'credit'>('all');

  const [showModal, setShowModal] = useState(false);
  const [historyAdjustment, setHistoryAdjustment] = useState<Adjustment | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [adjustmentDate, setAdjustmentDate] = useState<string>(getTodayISO());
  const [adjustmentType, setAdjustmentType] = useState<'debit' | 'credit'>('credit');
  const [amount, setAmount] = useState<number>(100000);
  const [description, setDescription] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    if (initialCustomerId) {
      setIsSubmitting(false);
      setSelectedCustomerId(initialCustomerId);
      setAdjustmentDate(getTodayISO());
      setAdjustmentType('credit');
      setAmount(100000);
      setDescription('');
      setErrorMessage('');
      setShowModal(true);
    }
  }, [initialCustomerId]);

  const loadData = () => {
    setAdjustments(StorageService.getAdjustments());
    setCustomers(StorageService.getCustomers().filter((c) => c.is_active));
  };

  const handleOpenAdd = () => {
    setIsSubmitting(false);
    setSelectedCustomerId(initialCustomerId || (customers[0]?.id || ''));
    setAdjustmentDate(getTodayISO());
    setAdjustmentType('credit');
    setAmount(100000);
    setDescription('');
    setErrorMessage('');
    setShowModal(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedCustomerId) {
      setErrorMessage('انتخاب مشتری الزامی است.');
      return;
    }
    if (amount <= 0) {
      setErrorMessage('مبلغ تعدیل باید بزرگتر از صفر باشد.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('شرح و علت تعدیل حساب الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = CustomerAccountService.recordAdjustment({
        customer_id: selectedCustomerId,
        adjustment_date: adjustmentDate,
        type: adjustmentType,
        amount,
        description: description.trim(),
      });

      if (!res.success) {
        setIsSubmitting(false);
        setErrorMessage(res.message || 'خطا در ثبت سند تعدیل');
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
      setErrorMessage(err?.message || 'خطای غیرمنتظره در ثبت سند تعدیل');
    }
  };

  const handleExportExcel = () => {
    const data = filteredAdjustments.map((a, idx) => ({
      ردیف: idx + 1,
      کد_مشتری: a.customer_code,
      نام_مشتری: a.customer_name,
      تاریخ_تعدیل: formatJalaliDate(a.adjustment_date),
      نوع_تعدیل: a.type === 'debit' ? 'بدهکار (افزایش بدهی)' : 'بستانکار (کاهش بدهی)',
      مبلغ_تومان: a.amount,
      شرح_علت: a.description,
      ثبت_کننده: a.created_by,
    }));

    exportToExcel({
      fileName: 'لیست_تعدیلات_حساب_مشتریان',
      sheetName: 'تعدیلات',
      data,
    });
  };

  const filteredAdjustments = adjustments.filter((a) => {
    const matchSearch =
      a.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.customer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchSearch) return false;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;

    return true;
  });

  // Sorting state - defaults to newest adjustments first (adjustment_date desc)
  const [sortKey, setSortKey] = useState<string>('adjustment_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'adjustment_date' ? 'desc' : 'asc');
    }
  };

  const sortedAdjustments = React.useMemo(() => {
    return [...filteredAdjustments].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'customer_name') {
        valA = a.customer_name || '';
        valB = b.customer_name || '';
      } else if (sortKey === 'adjustment_date') {
        valA = new Date(a.adjustment_date).getTime() || 0;
        valB = new Date(b.adjustment_date).getTime() || 0;
      } else if (sortKey === 'type') {
        valA = a.type || '';
        valB = b.type || '';
      } else if (sortKey === 'amount') {
        valA = a.amount || 0;
        valB = b.amount || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAdjustments, sortKey, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">
            تعدیلات مالی حساب مشتریان (Adjustments)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ثبت اسناد تعدیل بدهکار (افزایش بدهی) و تعدیل بستانکار (کاهش بدهی، تخفیفات پس از فروش، اصلاح اسناد)
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
            <span>ثبت تعدیل جدید</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجو در نام مشتری، کد، شرح تعدیل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Type Filter */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              typeFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه تعدیلات ({adjustments.length.toLocaleString('fa-IR')})
          </button>
          <button
            onClick={() => setTypeFilter('debit')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              typeFilter === 'debit' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            تعدیل بدهکار (افزایش بدهی)
          </button>
          <button
            onClick={() => setTypeFilter('credit')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              typeFilter === 'credit' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            تعدیل بستانکار (کاهش بدهی)
          </button>
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
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
                  label="تاریخ ثبت"
                  sortKey="adjustment_date"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="نوع تعدیل"
                  sortKey="type"
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
                <th className="py-3 px-4">شرح و علت تعدیل</th>
                <th className="py-3 px-4">ثبت‌کننده</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    تعدیل مالی یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedAdjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{a.customer_name}</div>
                      <div className="text-[11px] text-slate-600 font-mono">{a.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatJalaliDate(a.adjustment_date)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                          a.type === 'debit'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {a.type === 'debit' ? (
                          <>
                            <ArrowUpRight className="w-3 h-3" />
                            <span>بدهکار (افزایش بدهی)</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownLeft className="w-3 h-3" />
                            <span>بستانکار (کاهش بدهی)</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-slate-900">{formatCurrency(a.amount)}</td>
                    <td className="py-3 px-4 text-slate-700 max-w-sm">{a.description}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{a.created_by}</td>
                    <td className="py-3 px-4 text-center">
                      {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('adjustments.view')) && (
                        <button
                          type="button"
                          onClick={() => setHistoryAdjustment(a)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer"
                          title="تاریخچه و لاگ تعدیل"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">ثبت سند تعدیل حساب مشتری</h3>
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

            <form onSubmit={handleSaveAdjustment} className="space-y-3.5 text-xs">
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
                    نوع تعدیل <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={adjustmentType}
                    onChange={(e) => setAdjustmentType(e.target.value as 'debit' | 'credit')}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:outline-none"
                  >
                    <option value="credit">بستانکار (کاهش بدهی مشتری / پاداش)</option>
                    <option value="debit">بدهکار (افزایش بدهی مشتری / جریمه)</option>
                  </select>
                </div>

                <div>
                  <JalaliDatePicker
                    label="تاریخ تعدیل (خورشیدی)"
                    required
                    value={adjustmentDate}
                    onChange={(isoDate) => setAdjustmentDate(isoDate)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  مبلغ تعدیل (تومان) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-black text-slate-900 text-sm font-mono focus:outline-none"
                />
                <div className="text-[11px] text-blue-600 font-bold mt-1">
                  معادل: {formatCurrency(amount, true)}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  شرح و علت تعدیل <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="علت دقیق، شماره مصوبه هیات مدیره، اصلاحیه فاکتور..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none leading-relaxed"
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ثبت اطلاعات...</span>
                    </>
                  ) : (
                    <span>ثبت تعدیل مالی</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Audit History Modal */}
      {historyAdjustment && (
        <AuditHistoryModal
          isOpen={!!historyAdjustment}
          onClose={() => setHistoryAdjustment(null)}
          entityType="ADJUSTMENT"
          entityId={historyAdjustment.id}
          documentNumber={historyAdjustment.id}
          title="تاریخچه و رویدادهای سند تعدیل مالی"
          subtitle={`مشتری: ${historyAdjustment.customer_name} - نوع: ${historyAdjustment.type === 'debit' ? 'بدهکار' : 'بستانکار'} - مبلغ: ${formatCurrency(historyAdjustment.amount)}`}
        />
      )}
    </div>
  );
};
