import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Expense } from '../../types';
import { formatCurrency, formatJalaliDate, toPersianDigits } from '../../utils/jalali';
import { exportToExcel } from '../../utils/exportExcel';
import { exportElementAsPng } from '../../utils/exportImage';
import { PrintHeader } from '../Print/PrintHeader';
import { PrintModalControlBar } from '../Print/PrintModalControlBar';
import { ZoomablePrintContainer } from '../Print/ZoomablePrintContainer';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import {
  Filter,
  Printer,
  Download,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  X,
  Wallet,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface ExpenseFilterReportProps {
  expenses: Expense[];
  onFilteredChange: (filtered: Expense[]) => void;
}

export const ExpenseFilterReport: React.FC<ExpenseFilterReportProps> = ({
  expenses,
  onFilteredChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filters
  const [titleQuery, setTitleQuery] = useState('');
  const [beneficiaryQuery, setBeneficiaryQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const handleReset = () => {
    setTitleQuery('');
    setBeneficiaryQuery('');
    setPaymentMethod('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  const filtered = expenses.filter((exp) => {
    if (titleQuery.trim() && !exp.title.toLowerCase().includes(titleQuery.toLowerCase().trim()) && !exp.code.toLowerCase().includes(titleQuery.toLowerCase().trim())) {
      return false;
    }
    if (beneficiaryQuery.trim() && (!exp.beneficiary || !exp.beneficiary.toLowerCase().includes(beneficiaryQuery.toLowerCase().trim()))) {
      return false;
    }
    if (paymentMethod !== 'all' && exp.payment_method !== paymentMethod) {
      return false;
    }
    if (startDate) {
      const expTime = new Date(exp.expense_date).getTime();
      const sTime = new Date(startDate).getTime();
      if (!isNaN(expTime) && !isNaN(sTime) && expTime < sTime) return false;
    }
    if (endDate) {
      const expTime = new Date(exp.expense_date).getTime();
      const eTime = new Date(endDate).getTime();
      if (!isNaN(expTime) && !isNaN(eTime) && expTime > eTime) return false;
    }
    if (minAmount && Number(minAmount) > 0 && exp.amount < Number(minAmount)) {
      return false;
    }
    if (maxAmount && Number(maxAmount) > 0 && exp.amount > Number(maxAmount)) {
      return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const handleExportExcel = () => {
    const data = filtered.map((e, idx) => ({
      ردیف: idx + 1,
      کد_سند: e.code,
      عنوان_هزینه: e.title,
      تاریخ: formatJalaliDate(e.expense_date),
      طرف_حساب_ذینفع: e.beneficiary || '—',
      روش_پرداخت: e.payment_method === 'cash' ? 'نقدی' : e.payment_method === 'pos' ? 'کارتخوان' : e.payment_method === 'transfer' ? 'حواله/پایا' : 'چک',
      شماره_رهگیری: e.reference_number || '—',
      مبلغ_ریال: e.amount,
      توضیحات: e.description || '—',
    }));

    exportToExcel({
      fileName: 'گزارش_فیلترشده_هزینه_ها',
      sheetName: 'هزینه‌ها',
      data,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs mb-4">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                فیلترهای پیشرفته و چاپ گزارش هزینه‌ها
              </span>
              {(titleQuery || beneficiaryQuery || paymentMethod !== 'all' || startDate || endDate || minAmount || maxAmount) && (
                <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-amber-100 dark:ring-amber-900"></span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              فیلتر بر اساس بازه تاریخ، عنوان هزینه، طرف حساب، روش پرداخت و مبلغ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            {isOpen ? 'بستن پنل فیلتر' : 'مشاهده فیلترها و چاپ'}
          </span>
          <div className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/60 mt-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">عنوان / کد هزینه</label>
              <input
                type="text"
                placeholder="عنوان هزینه یا کد..."
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">طرف حساب / ذینفع</label>
              <input
                type="text"
                placeholder="نام شخص یا شرکت..."
                value={beneficiaryQuery}
                onChange={(e) => setBeneficiaryQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">از تاریخ هزینه</label>
              <JalaliDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="انتخاب تاریخ شروع"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">تا تاریخ هزینه</label>
              <JalaliDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="انتخاب تاریخ پایان"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">روش پرداخت</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">همه روش‌ها</option>
                <option value="transfer">انتقال بانکی / پایا</option>
                <option value="pos">کارتخوان (POS)</option>
                <option value="cash">نقدی</option>
                <option value="cheque">چک</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">حداقل مبلغ (ریال)</label>
              <input
                type="number"
                placeholder="مثال: 1000000"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">حداکثر مبلغ (ریال)</label>
              <input
                type="number"
                placeholder="مثال: 50000000"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>حذف فیلترها</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-bold">
              <span>تعداد هزینه‌ها: {toPersianDigits(filtered.length)} سند</span>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400">
                مجموع مبلغ هزینه‌ها: {formatCurrency(totalAmount, false)} ریال
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ گزارش هزینه‌ها (A4)</span>
              </button>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>خروجی اکسل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintModal && (
        <ExpensePrintModal
          expenses={filtered}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};

const ExpensePrintModal: React.FC<{
  expenses: Expense[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ expenses, isOpen, onClose }) => {
  const [isExportingImage, setIsExportingImage] = useState(false);

  if (!isOpen) return null;

  const totalAmount = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const handleExportImage = async () => {
    setIsExportingImage(true);
    const success = await exportElementAsPng(
      'printable-expense-report',
      `گزارش_هزینه_ها_${new Date().toISOString().slice(0, 10)}`
    );
    setIsExportingImage(false);
    if (!success) {
      alert('خطا در ایجاد خروجی عکس گزارش هزینه‌ها.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-y-auto print-modal-container print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-4 max-h-[94vh] flex flex-col print-modal-card print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:w-full print:max-h-none print:overflow-visible">
        {/* Controls (Hidden in Print) */}
        <PrintModalControlBar
          title="پیش‌نمایش چاپ گزارش هزینه‌های عمومی و جاری"
          badge={`${toPersianDigits(expenses.length)} ردیف`}
          isExportingImage={isExportingImage}
          onExportImage={handleExportImage}
          onPrint={() => window.print()}
          onClose={onClose}
          printButtonText="ارسال به چاپگر (A4)"
        />

        {/* Printable Expense Report (Interactive Auto-fit and Zoomable on Mobile & Desktop) */}
        <ZoomablePrintContainer elementId="printable-expense-report">
          <div
            id="printable-expense-report"
            className="w-[800px] min-w-[800px] md:w-full md:min-w-0 mx-auto border border-slate-300 rounded-lg p-4 sm:p-6 bg-white text-slate-900 text-xs font-sans space-y-4 print:w-full print:min-w-0"
          >
            <PrintHeader
              title="گزارش تجمیعی اسناد هزینه‌های عمومی و جاری کارخانه"
              docNumber={toPersianDigits(expenses.length)}
              docNumberLabel="تعداد اسناد:"
            />

            <table className="w-full text-center border-collapse border border-slate-400 text-[10.5px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800">
                  <th className="p-1.5 border-l border-slate-400 w-8">ردیف</th>
                  <th className="p-1.5 border-l border-slate-400 w-20">کد سند</th>
                  <th className="p-1.5 border-l border-slate-400 w-20">تاریخ ثبت</th>
                  <th className="p-1.5 border-l border-slate-400">عنوان و شرح هزینه</th>
                  <th className="p-1.5 border-l border-slate-400">طرف حساب / ذینفع</th>
                  <th className="p-1.5 border-l border-slate-400 w-24">روش پرداخت</th>
                  <th className="p-1.5 border-l border-slate-400 w-28 text-rose-700">مبلغ (ریال)</th>
                  <th className="p-1.5 w-24">شماره سند/رهگیری</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      هیچ سند هزینه‌ای در این بازه یافت نشد.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp, idx) => (
                    <tr key={exp.id} className="hover:bg-slate-50">
                      <td className="p-1.5 border-l border-slate-300 font-bold">{toPersianDigits(idx + 1)}</td>
                      <td className="p-1.5 border-l border-slate-300 font-mono font-bold">{exp.code}</td>
                      <td className="p-1.5 border-l border-slate-300 font-mono">{formatJalaliDate(exp.expense_date)}</td>
                      <td className="p-1.5 border-l border-slate-300 text-right pr-2">
                        <div className="font-bold">{exp.title}</div>
                        {exp.description && (
                          <div className="text-[9.5px] text-slate-500">{exp.description}</div>
                        )}
                      </td>
                      <td className="p-1.5 border-l border-slate-300 font-semibold">{exp.beneficiary || '—'}</td>
                      <td className="p-1.5 border-l border-slate-300 text-[10px]">
                        {exp.payment_method === 'cash'
                          ? 'نقدی'
                          : exp.payment_method === 'pos'
                          ? 'کارتخوان'
                          : exp.payment_method === 'transfer'
                          ? 'حواله/پایا'
                          : 'چک'}
                      </td>
                      <td className="p-1.5 border-l border-slate-300 font-bold font-mono text-rose-700">
                        {formatCurrency(exp.amount, false)}
                      </td>
                      <td className="p-1.5 font-mono text-[10px]">{exp.reference_number || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="border border-slate-400 rounded-lg p-3 bg-slate-50 flex items-center justify-between text-xs font-bold">
              <div>
                <span>تعداد کل اسناد هزینه: </span>
                <span className="font-mono text-blue-900">{toPersianDigits(expenses.length)} سند</span>
              </div>
              <div>
                <span>مجموع کل مبلغ هزینه‌ها: </span>
                <span className="font-mono text-rose-700 text-sm font-black">{formatCurrency(totalAmount, false)} ریال</span>
              </div>
            </div>

            <div className="pt-4 grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-700">
              <div>
                <span>تنظیم‌کننده / امور مالی</span>
                <div className="text-slate-300 mt-6">.......................</div>
              </div>
              <div>
                <span>مدیر مالی و حسابداری</span>
                <div className="text-slate-300 mt-6">.......................</div>
              </div>
              <div>
                <span>مدیریت عامل</span>
                <div className="text-slate-300 mt-6">.......................</div>
              </div>
            </div>
          </div>
        </ZoomablePrintContainer>
      </div>
    </div>,
    document.body
  );
};
