import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { CustomerAccountService } from '../../services/accountService';
import { Cheque, ChequeStatus } from '../../types';
import { formatCurrency, formatJalaliDate } from '../../utils/jalali';
import { exportToExcel } from '../../utils/exportExcel';
import { SortableHeader } from '../Common/SortableHeader';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import {
  Search,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Download,
  AlertTriangle,
  FileText,
  Calendar,
  History,
} from 'lucide-react';

export const ChequeManager: React.FC = () => {
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Change Status Modal
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [historyCheque, setHistoryCheque] = useState<Cheque | null>(null);
  const [newStatus, setNewStatus] = useState<ChequeStatus>('passed');
  const [statusDescription, setStatusDescription] = useState<string>('');

  useEffect(() => {
    loadCheques();
    const handleDbSynced = () => {
      if (!selectedCheque) {
        loadCheques();
      }
    };
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    return () => {
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
    };
  }, [selectedCheque]);

  const loadCheques = () => {
    setCheques(StorageService.getCheques());
  };

  const handleOpenChangeStatus = (cheque: Cheque) => {
    setSelectedCheque(cheque);
    setNewStatus(cheque.status);
    setStatusDescription('');
  };

  const handleSaveStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheque) return;

    const res = CustomerAccountService.updateChequeStatus(
      selectedCheque.id,
      newStatus,
      statusDescription.trim() || undefined
    );

    if (!res.success) {
      alert(`خطا: ${res.message}`);
    } else {
      await StorageService.pushToHost();
      alert(res.message);
      setSelectedCheque(null);
      loadCheques();
    }
  };

  const handleExportExcel = () => {
    const data = filteredCheques.map((c, idx) => ({
      ردیف: idx + 1,
      کد_مشتری: c.customer_code,
      نام_مشتری: c.customer_name,
      شماره_چک_صیاد: c.cheque_number,
      بانک: c.bank_name,
      سررسید: formatJalaliDate(c.due_date),
      مبلغ_تومان: c.amount,
      صادرکننده: c.drawer_name || '-',
      وضعیت:
        c.status === 'pending'
          ? 'در انتظار سررسید'
          : c.status === 'deposited'
          ? 'واگذار به بانک'
          : c.status === 'passed'
          ? 'وصول شده'
          : c.status === 'rejected'
          ? 'برگشت خورده'
          : 'ابطال‌شده',
    }));

    exportToExcel({
      fileName: 'دفتر_چک_های_دریافتی',
      sheetName: 'چک‌ها',
      data,
    });
  };

  const filteredCheques = cheques.filter((c) => {
    const matchSearch =
      c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.customer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cheque_number.includes(searchQuery) ||
      c.bank_name.includes(searchQuery);

    if (!matchSearch) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;

    return true;
  });

  // Sorting state - defaults to newest cheques first (due_date desc)
  const [sortKey, setSortKey] = useState<string>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'due_date' ? 'desc' : 'asc');
    }
  };

  const sortedCheques = React.useMemo(() => {
    return [...filteredCheques].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'customer_name') {
        valA = a.customer_name || '';
        valB = b.customer_name || '';
      } else if (sortKey === 'cheque_number') {
        valA = parseInt(String(a.cheque_number).replace(/\D/g, ''), 10) || 0;
        valB = parseInt(String(b.cheque_number).replace(/\D/g, ''), 10) || 0;
      } else if (sortKey === 'due_date') {
        valA = new Date(a.due_date).getTime() || 0;
        valB = new Date(b.due_date).getTime() || 0;
      } else if (sortKey === 'amount') {
        valA = a.amount || 0;
        valB = b.amount || 0;
      } else if (sortKey === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCheques, sortKey, sortOrder]);

  const pendingSum = cheques.filter((c) => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
  const passedSum = cheques.filter((c) => c.status === 'passed').reduce((s, c) => s + (c.amount || 0), 0);
  const rejectedSum = cheques.filter((c) => c.status === 'rejected').reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">
            دفتر چک‌های دریافتی (Cheques Management)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ثبت، پیگیری سررسید، واگذاری به بانک، وصول و مدیریت چک‌های برگشتی صیادی
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>خروجی اکسل چک‌ها</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700">
            <span>در انتظار سررسید و وصول</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-lg font-black text-amber-600 mt-2">{formatCurrency(pendingSum, true)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {cheques.filter((c) => c.status === 'pending').length.toLocaleString('fa-IR')} فقره چک
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>چک‌های وصول‌شده</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-lg font-black text-emerald-600 mt-2">{formatCurrency(passedSum, true)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {cheques.filter((c) => c.status === 'passed').length.toLocaleString('fa-IR')} فقره وصولی قطعی
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-rose-700">
            <span>چک‌های برگشت‌خورده</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-lg font-black text-rose-600 mt-2">{formatCurrency(rejectedSum, true)}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {cheques.filter((c) => c.status === 'rejected').length.toLocaleString('fa-IR')} فقره برگشتی
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجو در شماره چک، نام مشتری، بانک یا نام صاحب حساب..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه چک‌ها ({cheques.length.toLocaleString('fa-IR')})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            در انتظار سررسید
          </button>
          <button
            onClick={() => setStatusFilter('deposited')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'deposited' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            واگذار به بانک
          </button>
          <button
            onClick={() => setStatusFilter('passed')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'passed' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            وصول‌شده
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'rejected' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            برگشت‌خورده
          </button>
        </div>
      </div>

      {/* Cheques Table */}
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
                  label="شماره چک صیادی"
                  sortKey="cheque_number"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="right"
                />
                <th className="py-3 px-4">بانک عامل</th>
                <SortableHeader
                  label="تاریخ سررسید"
                  sortKey="due_date"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="مبلغ چک (تومان)"
                  sortKey="amount"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="right"
                />
                <th className="py-3 px-4">صاحب حساب</th>
                <SortableHeader
                  label="وضعیت"
                  sortKey="status"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="right"
                />
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCheques.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    چکی با این مشخصات یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedCheques.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{c.customer_name}</div>
                      <div className="text-[11px] text-slate-600 font-mono">{c.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.cheque_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">{c.bank_name}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{formatJalaliDate(c.due_date)}</td>
                    <td className="py-3 px-4 font-black text-emerald-600">{formatCurrency(c.amount)}</td>
                    <td className="py-3 px-4 text-slate-600">{c.drawer_name || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : c.status === 'deposited'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : c.status === 'passed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : c.status === 'rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.status === 'pending' && 'در انتظار سررسید'}
                        {c.status === 'deposited' && 'واگذار به بانک'}
                        {c.status === 'passed' && 'وصول‌شده'}
                        {c.status === 'rejected' && 'برگشت‌خورده'}
                        {c.status === 'cancelled' && 'ابطال‌شده'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('cheques.view')) && (
                          <button
                            type="button"
                            onClick={() => setHistoryCheque(c)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition cursor-pointer"
                            title="تاریخچه و لاگ چک"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}
                        {StorageService.hasPermission('cheques.status') && (
                          <button
                            onClick={() => handleOpenChangeStatus(c)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            تعیین وضعیت
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

      {/* Change Cheque Status Modal */}
      {selectedCheque && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                تغییر وضعیت چک {selectedCheque.cheque_number}
              </h3>
              <button
                onClick={() => setSelectedCheque(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">مشتری:</span>
                <span className="font-bold text-slate-900">{selectedCheque.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">مبلغ چک:</span>
                <span className="font-black text-emerald-600">{formatCurrency(selectedCheque.amount, true)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">سررسید:</span>
                <span className="font-bold text-slate-800">{formatJalaliDate(selectedCheque.due_date)}</span>
              </div>
            </div>

            <form onSubmit={handleSaveStatusChange} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  وضعیت جدید چک <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ChequeStatus)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-900 focus:outline-none"
                >
                  <option value="pending">در انتظار سررسید (Pending)</option>
                  <option value="deposited">واگذار به بانک (در جریان وصول)</option>
                  <option value="passed">وصول‌شده قطعی (Passed)</option>
                  <option value="rejected">برگشت‌خورده (Rejected - ثبت بدهی مجدد)</option>
                  <option value="cancelled">ابطال‌شده (Cancelled)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  علت تغییر وضعیت / توضیحات
                </label>
                <textarea
                  rows={2}
                  placeholder="علت برگشت، شماره سند واریز، توضیحات بانک..."
                  value={statusDescription}
                  onChange={(e) => setStatusDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCheque(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
                >
                  ثبت وضعیت جدید
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Audit History Modal */}
      {historyCheque && (
        <AuditHistoryModal
          isOpen={!!historyCheque}
          onClose={() => setHistoryCheque(null)}
          entityType="CHEQUE"
          entityId={historyCheque.id}
          documentNumber={historyCheque.cheque_number}
          title="تاریخچه و رویدادهای چک صیادی"
          subtitle={`مشتری: ${historyCheque.customer_name} - چک شماره ${historyCheque.cheque_number} (${historyCheque.bank_name})`}
        />
      )}
    </div>
  );
};
