import React, { useState, useEffect } from 'react';
import { Employee, EmployeeLeave, LeaveCategory, LeaveType } from '../../types';
import { StorageService } from '../../services/storageService';
import { getTodayISO, toPersianDigits, formatJalaliDate } from '../../utils/jalali';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  FileText,
  User,
} from 'lucide-react';

interface LeaveModalProps {
  employee: Employee;
  initialLeave?: EmployeeLeave | null;
  onClose: () => void;
  onSaved: (savedLeave: EmployeeLeave, shouldPrint?: boolean) => void;
}

export const LeaveModal: React.FC<LeaveModalProps> = ({
  employee,
  initialLeave,
  onClose,
  onSaved,
}) => {
  const [activeTab, setActiveTab] = useState<LeaveType>(initialLeave?.type || 'daily');

  // Daily Form State
  const [fromDate, setFromDate] = useState(initialLeave?.from_date || getTodayISO());
  const [toDate, setToDate] = useState(initialLeave?.to_date || getTodayISO());
  const [dailyDaysCount, setDailyDaysCount] = useState<number>(initialLeave?.days_count || 1);
  const [dailyCategory, setDailyCategory] = useState<LeaveCategory>(
    initialLeave?.category || 'استحقاقی'
  );
  const [dailyReplacement, setDailyReplacement] = useState(initialLeave?.replacement_person || '');
  const [dailyDescription, setDailyDescription] = useState(initialLeave?.description || '');

  // Hourly Form State
  const [hourlyDate, setHourlyDate] = useState(initialLeave?.date || getTodayISO());
  const [fromTime, setFromTime] = useState(initialLeave?.from_time || '09:00');
  const [toTime, setToTime] = useState(initialLeave?.to_time || '13:00');
  const [hourlyCategory, setHourlyCategory] = useState<LeaveCategory>(
    initialLeave?.category || 'استحقاقی'
  );
  const [hourlyDescription, setHourlyDescription] = useState(initialLeave?.description || '');

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-calculate daily days count when fromDate or toDate changes
  useEffect(() => {
    if (activeTab === 'daily') {
      try {
        const d1 = new Date(fromDate);
        const d2 = new Date(toDate);
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          const diffTime = d2.getTime() - d1.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays >= 0) {
            setDailyDaysCount(diffDays + 1);
          } else {
            setDailyDaysCount(1);
          }
        }
      } catch {
        setDailyDaysCount(1);
      }
    }
  }, [fromDate, toDate, activeTab]);

  // Calculate hourly duration
  const calculateHourlyDuration = (start: string, end: string) => {
    const [h1, m1] = start.split(':').map((v) => parseInt(v, 10) || 0);
    const [h2, m2] = end.split(':').map((v) => parseInt(v, 10) || 0);
    const totalMinutes = h2 * 60 + m2 - (h1 * 60 + m1);

    if (totalMinutes <= 0) {
      return { hoursCount: 0, hoursText: 'نامعتبر' };
    }

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const hoursCount = +(totalMinutes / 60).toFixed(2);

    let hoursText = '';
    if (hours > 0 && mins > 0) {
      hoursText = `${toPersianDigits(hours)} ساعت و ${toPersianDigits(mins)} دقیقه`;
    } else if (hours > 0) {
      hoursText = `${toPersianDigits(hours)} ساعت`;
    } else {
      hoursText = `${toPersianDigits(mins)} دقیقه`;
    }

    return { hoursCount, hoursText };
  };

  const { hoursCount, hoursText } = calculateHourlyDuration(fromTime, toTime);

  const handleSubmit = async (e: React.FormEvent, triggerPrint = false) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    if (activeTab === 'daily') {
      if (!fromDate || !toDate) {
        setFormError('لطفاً تاریخ شروع و پایان مرخصی را وارد فرمایید.');
        return;
      }
      if (new Date(fromDate) > new Date(toDate)) {
        setFormError('تاریخ پایان مرخصی نمی‌تواند قبل از تاریخ شروع باشد.');
        return;
      }
      if (dailyDaysCount <= 0) {
        setFormError('تعداد روزهای مرخصی باید حداقل ۱ روز باشد.');
        return;
      }

      setIsSubmitting(true);
      try {
        const leaveData: EmployeeLeave = {
          id: initialLeave ? initialLeave.id : '',
          employee_id: employee.id,
          employee_name: employee.name,
          employee_code: employee.code,
          type: 'daily',
          category: dailyCategory,
          from_date: fromDate,
          to_date: toDate,
          days_count: dailyDaysCount,
          description: dailyDescription.trim() || undefined,
          replacement_person: dailyReplacement.trim() || undefined,
          status: 'approved',
          created_at: initialLeave ? initialLeave.created_at : new Date().toISOString(),
        };

        const saved = StorageService.saveEmployeeLeave(leaveData);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
        }
        StorageService.pushToHost().catch(() => {});

        setIsSubmitting(false);
        onSaved(saved, triggerPrint);
      } catch (err: any) {
        setIsSubmitting(false);
        setFormError(err?.message || 'خطا در ثبت مرخصی');
      }
    } else {
      if (!hourlyDate) {
        setFormError('لطفاً تاریخ مرخصی ساعتی را وارد فرمایید.');
        return;
      }
      if (hoursCount <= 0) {
        setFormError('ساعت پایان باید بعد از ساعت شروع مرخصی باشد.');
        return;
      }

      setIsSubmitting(true);
      try {
        const leaveData: EmployeeLeave = {
          id: initialLeave ? initialLeave.id : '',
          employee_id: employee.id,
          employee_name: employee.name,
          employee_code: employee.code,
          type: 'hourly',
          category: hourlyCategory,
          date: hourlyDate,
          from_time: fromTime,
          to_time: toTime,
          hours_count: hoursCount,
          hours_text: hoursText,
          description: hourlyDescription.trim() || undefined,
          status: 'approved',
          created_at: initialLeave ? initialLeave.created_at : new Date().toISOString(),
        };

        const saved = StorageService.saveEmployeeLeave(leaveData);

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
        }
        StorageService.pushToHost().catch(() => {});

        setIsSubmitting(false);
        onSaved(saved, triggerPrint);
      } catch (err: any) {
        setIsSubmitting(false);
        setFormError(err?.message || 'خطا در ثبت مرخصی');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                {initialLeave ? 'ویرایش درخواست مرخصی' : 'ثبت مرخصی پرسنل'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                کارمند: <span className="font-bold text-slate-800">{employee.name}</span> ({employee.code})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection (Daily vs Hourly) */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>مرخصی روزانه</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('hourly')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeTab === 'hourly'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>مرخصی ساعتی</span>
          </button>
        </div>

        {formError && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-3.5 text-xs">
          {/* TAB 1: DAILY LEAVE */}
          {activeTab === 'daily' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <JalaliDatePicker
                  label="از تاریخ (شروع)"
                  value={fromDate}
                  onChange={(d) => setFromDate(d)}
                  required
                />
                <JalaliDatePicker
                  label="تا تاریخ (پایان)"
                  value={toDate}
                  onChange={(d) => setToDate(d)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    مدت مرخصی (تعداد روز محاسبه‌شده)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={dailyDaysCount}
                      onChange={(e) => setDailyDaysCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-bold text-center text-xs text-blue-700 font-mono"
                    />
                    <span className="text-slate-600 font-bold whitespace-nowrap">روز کاری</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع مرخصی</label>
                  <select
                    value={dailyCategory}
                    onChange={(e) => setDailyCategory(e.target.value as LeaveCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 font-bold"
                  >
                    <option value="استحقاقی">استحقاقی (سالانه)</option>
                    <option value="استعلاجی">استعلاجی (استراحت پزشکی)</option>
                    <option value="بدون حقوق">بدون حقوق</option>
                    <option value="تشویقی">تشویقی / ماموریت</option>
                    <option value="سایر">سایر موارد</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">فرد جانشین / هماهنگ‌شده (اختیاری)</label>
                <input
                  type="text"
                  placeholder="نام همکار جانشین در خط تولید یا واحد..."
                  value={dailyReplacement}
                  onChange={(e) => setDailyReplacement(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">علت و توضیحات مرخصی</label>
                <textarea
                  rows={2}
                  placeholder="شرح درخواست و علت مرخصی..."
                  value={dailyDescription}
                  onChange={(e) => setDailyDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 resize-none"
                />
              </div>
            </>
          )}

          {/* TAB 2: HOURLY LEAVE */}
          {activeTab === 'hourly' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <JalaliDatePicker
                  label="تاریخ مرخصی"
                  value={hourlyDate}
                  onChange={(d) => setHourlyDate(d)}
                  required
                />

                <div>
                  <label className="block text-slate-700 font-bold mb-1">نوع مرخصی</label>
                  <select
                    value={hourlyCategory}
                    onChange={(e) => setHourlyCategory(e.target.value as LeaveCategory)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 font-bold"
                  >
                    <option value="استحقاقی">استحقاقی (ساعتی)</option>
                    <option value="استعلاجی">استعلاجی / پزشکی</option>
                    <option value="بدون حقوق">بدون حقوق</option>
                    <option value="تشویقی">ماموریت اداری ساعتی</option>
                    <option value="سایر">سایر</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-center">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">از ساعت</label>
                  <input
                    type="time"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-center text-xs font-bold text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تا ساعت</label>
                  <input
                    type="time"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-center text-xs font-bold text-slate-900"
                    required
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-slate-700 font-bold mb-1">مدت زمان مرخصی</label>
                  <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 font-bold text-center text-[11px]">
                    {hoursText}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">علت و توضیحات مرخصی ساعتی</label>
                <textarea
                  rows={2}
                  placeholder="علت خروج یا مراجعه شخصی..."
                  value={hourlyDescription}
                  onChange={(e) => setHourlyDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 resize-none"
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer disabled:opacity-40"
            >
              انصراف
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSubmit(e, true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold border border-slate-300 transition cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>ثبت و چاپ برگه</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>در حال ثبت...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{initialLeave ? 'ذخیره تغییرات' : 'ثبت مرخصی'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
