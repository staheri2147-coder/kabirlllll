import React, { useState } from 'react';
import { Employee, EmploymentPeriod } from '../../types';
import { getTodayISO } from '../../utils/jalali';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { Briefcase, Calendar, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PeriodModalProps {
  employee: Employee;
  initialPeriod?: EmploymentPeriod | null;
  onClose: () => void;
  onSaved: (period: EmploymentPeriod) => void;
}

export const PeriodModal: React.FC<PeriodModalProps> = ({
  employee,
  initialPeriod,
  onClose,
  onSaved,
}) => {
  const isEditing = !!initialPeriod;

  const [startDate, setStartDate] = useState(initialPeriod?.start_date || getTodayISO());
  const [endDate, setEndDate] = useState(initialPeriod?.end_date || '');
  const [hasEndDate, setHasEndDate] = useState(!!initialPeriod?.end_date);
  const [contractType, setContractType] = useState<
    'رسمی' | 'قراردادی' | 'آزمایشی' | 'پروژه‌ای' | 'ساعتی' | 'روزانه'
  >(initialPeriod?.contract_type || 'قراردادی');
  const [position, setPosition] = useState(initialPeriod?.position || employee.position || '');
  const [reasonForLeaving, setReasonForLeaving] = useState<
    'پایان قرارداد' | 'استعفا' | 'تعدیل نیرو' | 'توافق طرفین' | 'بازنشستگی' | 'سایر'
  >(initialPeriod?.reason_for_leaving || 'پایان قرارداد');
  const [notes, setNotes] = useState(initialPeriod?.notes || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!startDate) {
      setError('لطفاً تاریخ شروع دوره همکاری را مشخص فرمایید.');
      return;
    }

    if (hasEndDate && !endDate) {
      setError('لطفاً تاریخ پایان همکاری را مشخص فرمایید.');
      return;
    }

    if (hasEndDate && endDate < startDate) {
      setError('تاریخ پایان همکاری نمی‌تواند قبل از تاریخ شروع باشد.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const savedPeriod: EmploymentPeriod = {
        id: initialPeriod ? initialPeriod.id : `period-${Date.now()}`,
        employee_id: employee.id,
        employee_name: employee.name,
        start_date: startDate,
        end_date: hasEndDate ? endDate : undefined,
        contract_type: contractType,
        position: position.trim() || employee.position,
        reason_for_leaving: hasEndDate ? reasonForLeaving : undefined,
        notes: notes.trim() || undefined,
        status: hasEndDate ? 'completed' : 'active',
        created_at: initialPeriod ? initialPeriod.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await onSaved(savedPeriod);
      setIsSubmitting(false);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'خطا در ذخیره دوره همکاری');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-sm">
                {isEditing ? 'ویرایش دوره همکاری' : 'ثبت دوره همکاری جدید (شروع به کار)'}
              </h3>
              <p className="text-[11px] text-slate-500">
                کارمند: {employee.name} (کد: {employee.code})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نوع قرارداد / استخدام:
              </label>
              <select
                value={contractType}
                onChange={(e: any) => setContractType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="قراردادی">قراردادی</option>
                <option value="رسمی">رسمی</option>
                <option value="آزمایشی">آزمایشی</option>
                <option value="پروژه‌ای">پروژه‌ای</option>
                <option value="ساعتی">ساعتی</option>
                <option value="روزانه">روزانه</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                سمت / شغل در این دوره:
              </label>
              <input
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="مثال: سرپرست شیفت تولید"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              تاریخ شروع همکاری:
            </label>
            <JalaliDatePicker value={startDate} onChange={setStartDate} />
          </div>

          {/* Toggle for End Date */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={hasEndDate}
                onChange={(e) => {
                  setHasEndDate(e.target.checked);
                  if (e.target.checked && !endDate) {
                    setEndDate(getTodayISO());
                  }
                }}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>این دوره همکاری به پایان رسیده است (ثبت تاریخ خاتمه کار)</span>
            </label>
          </div>

          {hasEndDate && (
            <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاریخ پایان / خاتمه همکاری:
                </label>
                <JalaliDatePicker value={endDate} onChange={setEndDate} />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  علت پایان همکاری:
                </label>
                <select
                  value={reasonForLeaving}
                  onChange={(e: any) => setReasonForLeaving(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="پایان قرارداد">اتمام مدت قرارداد</option>
                  <option value="استعفا">استعفای پرسنل</option>
                  <option value="توافق طرفین">توافق طرفین / قطع همکاری</option>
                  <option value="تعدیل نیرو">تعدیل نیرو</option>
                  <option value="بازنشستگی">بازنشستگی</option>
                  <option value="سایر">سایر موارد</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              توضیحات، شرایط یا بندهای قرارداد:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="توضیحات تکمیلی پیرامون این دوره همکاری..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال ذخیره...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ذخیره دوره همکاری</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
