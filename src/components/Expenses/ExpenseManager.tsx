import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { Expense } from '../../types';
import { formatCurrency, formatJalaliDate, getTodayISO, toPersianDigits } from '../../utils/jalali';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { RialInput } from '../Common/RialInput';
import { ExpenseFilterReport } from './ExpenseFilterReport';
import { SortableHeader } from '../Common/SortableHeader';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import {
  Wallet,
  Plus,
  Search,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  History,
  Printer,
} from 'lucide-react';

interface ExpenseManagerProps {
  onPrintExpense?: (exp: Expense) => void;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({
  onPrintExpense,
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [historyExpense, setHistoryExpense] = useState<Expense | null>(null);

  const [form, setForm] = useState({
    code: '',
    title: '',
    amount: 0,
    expense_date: getTodayISO(),
    beneficiary: '',
    payment_method: 'transfer' as 'cash' | 'pos' | 'transfer' | 'cheque',
    reference_number: '',
    description: '',
  });
  const [formError, setFormError] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
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
    setExpenses(StorageService.getExpenses());
  };

  const handleOpenModal = (exp?: Expense) => {
    setIsSubmitting(false);
    if (exp) {
      setEditingExpense(exp);
      setForm({
        code: exp.code,
        title: exp.title,
        amount: exp.amount,
        expense_date: exp.expense_date,
        beneficiary: exp.beneficiary || '',
        payment_method: exp.payment_method || 'transfer',
        reference_number: exp.reference_number || '',
        description: exp.description || '',
      });
    } else {
      setEditingExpense(null);
      setForm({
        code: StorageService.generateExpenseCode(),
        title: '',
        amount: 0,
        expense_date: getTodayISO(),
        beneficiary: '',
        payment_method: 'transfer',
        reference_number: '',
        description: '',
      });
    }
    setFormError('');
    setShowModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.title.trim()) {
      setFormError('عنوان هزینه الزامی است.');
      return;
    }
    if (form.amount <= 0) {
      setFormError('مبلغ هزینه باید بزرگتر از صفر باشد.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const expData: Expense = {
        id: editingExpense ? editingExpense.id : `exp-${Date.now()}`,
        code: form.code.trim() || StorageService.generateExpenseCode(),
        title: form.title.trim(),
        category: 'سایر هزینه‌ها',
        amount: form.amount,
        expense_date: form.expense_date,
        beneficiary: form.beneficiary.trim() || undefined,
        payment_method: form.payment_method,
        reference_number: form.reference_number.trim() || undefined,
        description: form.description.trim() || undefined,
        created_by: 'حسابداری',
        created_at: editingExpense ? editingExpense.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      StorageService.saveExpense(expData);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});

      setIsSubmitting(false);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || 'خطای غیرمنتظره در ثبت هزینه');
    }
  };

  const handleDelete = (exp: Expense) => {
    if (!window.confirm(`آیا از حذف هزینه «${exp.title}» با کد ${exp.code} اطمینان دارید؟`)) return;
    StorageService.deleteExpense(exp.id);
    loadData();
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchSearch =
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.beneficiary && exp.beneficiary.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (exp.reference_number && exp.reference_number.includes(searchQuery)) ||
      (exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchSearch;
  });

  // Sorting state - defaults to newest expenses first (expense_date desc)
  const [sortKey, setSortKey] = useState<string>('expense_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'expense_date' ? 'desc' : 'asc');
    }
  };

  const sortedExpenses = React.useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'code') {
        valA = parseInt(String(a.code).replace(/\D/g, ''), 10) || 0;
        valB = parseInt(String(b.code).replace(/\D/g, ''), 10) || 0;
      } else if (sortKey === 'title') {
        valA = a.title || '';
        valB = b.title || '';
      } else if (sortKey === 'expense_date') {
        valA = new Date(a.expense_date).getTime() || 0;
        valB = new Date(b.expense_date).getTime() || 0;
      } else if (sortKey === 'beneficiary') {
        valA = a.beneficiary || '';
        valB = b.beneficiary || '';
      } else if (sortKey === 'amount') {
        valA = a.amount || 0;
        valB = b.amount || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredExpenses, sortKey, sortOrder]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <span>هزینه‌ها</span>
          </h1>
        </div>

        {StorageService.hasPermission('expenses.create') && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت هزینه جدید</span>
          </button>
        )}
      </div>

      {/* Advanced Filter & Print Report */}
      <ExpenseFilterReport
        expenses={expenses}
        onFilteredChange={() => {}}
      />

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجوی عنوان هزینه، کد سند، طرف حساب یا شماره پیگیری..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-slate-50/70 transition"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                <SortableHeader
                  label="کد سند"
                  sortKey="code"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                  className="w-28"
                />
                <SortableHeader
                  label="عنوان هزینه و شرح"
                  sortKey="title"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="تاریخ ثبت"
                  sortKey="expense_date"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                  className="w-28"
                />
                <SortableHeader
                  label="طرف حساب / ذینفع"
                  sortKey="beneficiary"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="مبلغ (ریال)"
                  sortKey="amount"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                  className="w-36 font-bold"
                />
                <th className="py-3.5 px-4 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    هیچ هزینه یا سندی با مشخصات واردشده یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 text-center font-mono">
                      {exp.code}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-bold text-slate-900">{exp.title}</div>
                      {exp.description && (
                        <div className="text-[11px] text-slate-400 font-medium truncate max-w-sm mx-auto mt-0.5">
                          {exp.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-center font-bold text-xs">
                      {formatJalaliDate(exp.expense_date)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="text-slate-800 font-bold">{exp.beneficiary || '—'}</div>
                      {exp.reference_number && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          پیگیری: {toPersianDigits(exp.reference_number)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-black text-rose-600 text-center font-mono">
                      {formatCurrency(exp.amount, false)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {StorageService.hasPermission('expenses.print') && (
                          <button
                            onClick={() => onPrintExpense && onPrintExpense(exp)}
                            title="چاپ سند هزینه"
                            className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('expenses.view')) && (
                          <button
                            type="button"
                            onClick={() => setHistoryExpense(exp)}
                            title="تاریخچه و لاگ سند هزینه"
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {StorageService.hasPermission('expenses.edit') && (
                          <button
                            onClick={() => handleOpenModal(exp)}
                            title="ویرایش سند هزینه"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {StorageService.hasPermission('expenses.delete') && (
                          <button
                            onClick={() => handleDelete(exp)}
                            title="حذف سند هزینه"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* CREATE / EDIT EXPENSE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingExpense ? 'ویرایش سند هزینه' : 'ثبت هزینه جدید'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    مشخصات، مبلغ و طرف حساب را وارد فرمایید.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    عنوان هزینه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: خرید تسمه و روغن خط ۲"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-900 text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">کد سند</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs font-bold text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <RialInput
                    label="مبلغ هزینه (ریال)"
                    value={form.amount}
                    onChange={(val) => setForm({ ...form, amount: val })}
                    required
                    placeholder="مبلغ به ریال"
                  />
                </div>

                <div className="sm:col-span-2">
                  <JalaliDatePicker
                    label="تاریخ پرداخت / هزینه"
                    value={form.expense_date}
                    onChange={(d) => setForm({ ...form, expense_date: d })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">طرف حساب / ذینفع</label>
                  <input
                    type="text"
                    placeholder="نام شخص یا فروشگاه..."
                    value={form.beneficiary}
                    onChange={(e) => setForm({ ...form, beneficiary: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">روش پرداخت</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        payment_method: e.target.value as 'cash' | 'pos' | 'transfer' | 'cheque',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 font-medium"
                  >
                    <option value="transfer">حواله پایا / ساتنا</option>
                    <option value="pos">کارت به کارت / پوز</option>
                    <option value="cash">نقدی / تنخواه</option>
                    <option value="cheque">چک بانکی</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">شماره پیگیری / فیش</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="شماره فیش یا شماره سند پیگیری..."
                    value={form.reference_number}
                    onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">توضیحات</label>
                  <textarea
                    rows={2}
                    placeholder="توضیحات تکمیلی..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ثبت اطلاعات...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingExpense ? 'ذخیره تغییرات' : 'ثبت سند هزینه'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Audit History Modal */}
      {historyExpense && (
        <AuditHistoryModal
          isOpen={!!historyExpense}
          onClose={() => setHistoryExpense(null)}
          entityType="EXPENSE"
          entityId={historyExpense.id}
          documentNumber={historyExpense.code}
          title="تاریخچه و رویدادهای سند هزینه"
          subtitle={`سند هزینه ${historyExpense.code} - عنوان: ${historyExpense.title}`}
        />
      )}
    </div>
  );
};
