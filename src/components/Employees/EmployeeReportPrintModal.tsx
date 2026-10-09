import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Employee, EmployeeTransaction, EmployeeLeave, EmploymentPeriod } from '../../types';
import { StorageService } from '../../services/storageService';
import { PrintHeader } from '../Print/PrintHeader';
import { PrintFooter } from '../Print/PrintFooter';
import { PrintModalControlBar } from '../Print/PrintModalControlBar';
import { ZoomablePrintContainer } from '../Print/ZoomablePrintContainer';
import {
  formatCurrency,
  formatJalaliDate,
  toPersianDigits,
  getDaysPassedInCurrentJalaliYear,
} from '../../utils/jalali';
import { exportElementAsPng } from '../../utils/exportImage';

interface EmployeeReportPrintModalProps {
  reportType: 'ledger' | 'leaves' | 'periods';
  employee: Employee;
  transactions?: EmployeeTransaction[];
  leaves?: EmployeeLeave[];
  periods?: EmploymentPeriod[];
  onClose: () => void;
}

export const EmployeeReportPrintModal: React.FC<EmployeeReportPrintModalProps> = ({
  reportType,
  employee,
  transactions = [],
  leaves = [],
  periods = [],
  onClose,
}) => {
  const [isExportingImage, setIsExportingImage] = useState(false);
  const company = StorageService.getCompanySettings();
  const companyName = company.business_name || (company as any).company_name || 'شرکت تولیدی لوله پلی‌اتیلن البرز';
  const [stampEnabled, setStampEnabled] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const handleExportImage = async () => {
    setIsExportingImage(true);
    const typeLabel =
      reportType === 'ledger'
        ? 'صورتحساب_مالی'
        : reportType === 'leaves'
        ? 'سوابق_مرخصی'
        : 'سوابق_همکاری';
    const success = await exportElementAsPng(
      'printable-employee-report',
      `گزارش_${typeLabel}_${employee.name.replace(/\s+/g, '_')}_${employee.code}`
    );
    setIsExportingImage(false);
    if (!success) {
      alert('خطا در ایجاد خروجی تصویر گزارش پرسنل.');
    }
  };

  const getReportTitle = () => {
    switch (reportType) {
      case 'ledger':
        return 'صورت‌حساب گردش مالی و کارکرد پرسنل';
      case 'leaves':
        return 'گزارش جامع سوابق مرخصی پرسنل';
      case 'periods':
        return 'کاربرگ سوابق همکاری و قراردادهای پرسنل (شروع و پایان کار)';
      default:
        return 'گزارش پرسنلی';
    }
  };

  // Financial calculations
  const totalAccrued = transactions
    .filter((t) => t.type === 'accrual')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPaid = transactions
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  // Leave calculations
  let totalDailyDays = 0;
  let totalHourlyHours = 0;
  leaves.forEach((l) => {
    if (l.type === 'daily') totalDailyDays += l.days_count || 1;
    if (l.type === 'hourly') totalHourlyHours += l.hours_count || 0;
  });
  const totalEquivalentDays = +(totalDailyDays + totalHourlyHours / 8).toFixed(1);

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-hidden print-modal-container print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[95vh] flex flex-col relative overflow-hidden print-modal-card print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:w-full print:max-h-none print:overflow-visible">
        {/* Modal Top Control Bar (Pinned inside modal at top) */}
        <div className="p-3 sm:px-5 sm:py-3.5 bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 shrink-0 no-print z-20">
          <PrintModalControlBar
            title={`پیش‌نمایش و چاپ ${getReportTitle()}`}
            badge={`پرسنل: ${employee.name} (${employee.code})`}
            isExportingImage={isExportingImage}
            onExportImage={handleExportImage}
            onPrint={handlePrint}
            onClose={onClose}
            printButtonText="ارسال به چاپگر (Print)"
            extraControls={
              company.stamp_signature_url ? (
                <label className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={stampEnabled}
                    onChange={(e) => setStampEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                  />
                  <span>درج مهر شرکت</span>
                </label>
              ) : undefined
            }
          />
        </div>

        {/* Printable Area (Interactive Auto-fit and Zoomable on Mobile & Desktop) */}
        <ZoomablePrintContainer elementId="printable-employee-report">
          <div
            id="printable-employee-report"
            className="w-[800px] min-w-[800px] md:w-full md:min-w-0 max-w-[210mm] min-h-[297mm] p-6 sm:p-8 bg-white border border-slate-300 rounded-lg print:border-none print:p-0 print:m-0 print:w-full print:min-w-0 print:max-w-full print:min-h-0 text-slate-900 text-xs font-sans shadow-xs print:shadow-none flex flex-col justify-between mx-auto"
          >
            <div className="space-y-4">
              {/* Standard Company Print Header */}
              <PrintHeader title={getReportTitle()} docCode={employee.code} />
            </div>

            {/* Employee Profile Summary Box */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-slate-800 text-[11px] flex items-center justify-between">
                <span>مشخصات پرسنلی و اطلاعات شناسنامه‌ای</span>
                <span className="text-[10px] text-slate-500 font-normal">واحد کارگزینی و حسابداری</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-slate-50/50 text-xs">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] mb-0.5">نام و نام خانوادگی:</span>
                  <span className="font-black text-slate-900 text-xs whitespace-nowrap">{employee.name}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] mb-0.5">کد پرسنلی:</span>
                  <span className="font-bold font-mono text-slate-900 text-xs whitespace-nowrap">{toPersianDigits(employee.code)}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] mb-0.5">سمت / واحد سازمانی:</span>
                  <span className="font-bold text-slate-800 text-xs whitespace-nowrap truncate">{employee.position || 'پرسنل کارخانه'}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] mb-0.5">وضعیت اشتغال:</span>
                  <span className={`font-bold text-xs whitespace-nowrap ${employee.status === 'active' ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {employee.status === 'active' ? 'شاغل و فعال' : 'غیرفعال / پایان همکاری'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] mb-0.5">کد ملی:</span>
                  <span className="font-mono font-bold text-slate-800 text-xs whitespace-nowrap">
                    {employee.national_id ? toPersianDigits(employee.national_id) : '—'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] mb-0.5">شماره تماس:</span>
                  <span className="font-mono font-bold text-slate-800 text-xs whitespace-nowrap">
                    {employee.phone1 ? toPersianDigits(employee.phone1) : '—'}
                  </span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200 col-span-2">
                  <span className="text-slate-500 block text-[10px] mb-0.5">مانده حساب نهایی:</span>
                  <span className="font-black text-slate-900 text-xs whitespace-nowrap">
                    {employee.balance > 0 ? (
                      <span className="text-emerald-700">طلبکار: {formatCurrency(employee.balance)}</span>
                    ) : employee.balance < 0 ? (
                      <span className="text-rose-700">بدهکار: {formatCurrency(Math.abs(employee.balance))}</span>
                    ) : (
                      <span className="text-slate-600">تسویه حساب کامل</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* REPORT TYPE 1: FINANCIAL LEDGER */}
            {reportType === 'ledger' && (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800 text-center text-[10.5px]">
                      <tr>
                        <th className="py-2 px-2 border-l border-slate-300 w-10 text-center whitespace-nowrap">ردیف</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-24 text-center whitespace-nowrap">تاریخ سند</th>
                        <th className="py-2 px-2 border-l border-slate-300 text-center whitespace-nowrap">شرح و بابت تراکنش</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-28 text-center whitespace-nowrap">طلب (حقوق/کارکرد)</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-28 text-center whitespace-nowrap">پرداخت (واریزی)</th>
                        <th className="py-2 px-2 border-slate-300 w-28 text-center whitespace-nowrap">روش / پیگیری</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center text-[11px]">
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            هیچ تراکنش مالی ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((t, idx) => (
                          <tr key={t.id} className="odd:bg-white even:bg-slate-50/50">
                            <td className="py-2 px-2 border-l border-slate-300 font-mono text-slate-500 text-center whitespace-nowrap">
                              {toPersianDigits(idx + 1)}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 font-mono text-center whitespace-nowrap">
                              {formatJalaliDate(t.date)}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 text-center font-medium">
                              {t.description || '-'}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 font-mono font-bold text-center whitespace-nowrap">
                              {t.type === 'accrual' ? formatCurrency(t.amount) : '-'}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 font-mono font-bold text-center whitespace-nowrap">
                              {t.type === 'payment' ? formatCurrency(t.amount) : '-'}
                            </td>
                            <td className="py-2 px-2 font-mono text-[10.5px] text-slate-600 text-center whitespace-nowrap">
                              {t.reference_number || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Summary Box */}
                <div className="bg-slate-100 border border-slate-400 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-4 font-bold text-xs">
                  <div>جمع کل مبالغ (ریال):</div>
                  <div className="flex items-center gap-6 font-mono">
                    <span className="text-emerald-800">بستانکاری: {formatCurrency(totalAccrued)}</span>
                    <span className="text-rose-800">پرداختی: {formatCurrency(totalPaid)}</span>
                    <span className="text-slate-900">{employee.balance >= 0 ? `مانده: ${formatCurrency(employee.balance)} طلبکار` : `مانده: ${formatCurrency(Math.abs(employee.balance))} بدهکار`}</span>
                  </div>
                </div>
              </div>
            )}

            {/* REPORT TYPE 2: LEAVE HISTORY */}
            {reportType === 'leaves' && (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800 text-center text-[10.5px]">
                      <tr>
                        <th className="py-2 px-2 border-l border-slate-300 w-10 text-center whitespace-nowrap">ردیف</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-16 text-center whitespace-nowrap">نوع</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-20 text-center whitespace-nowrap">دسته‌بندی</th>
                        <th className="py-2 px-2 border-l border-slate-300 text-center whitespace-nowrap">تاریخ / بازه زمانی</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-20 text-center whitespace-nowrap">مدت</th>
                        <th className="py-2 px-2 border-l border-slate-300 text-center whitespace-nowrap">علت / شرح</th>
                        <th className="py-2 px-2 border-slate-300 w-24 text-center whitespace-nowrap">جانشین</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center text-[11px]">
                      {leaves.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-slate-400">
                            هیچ سابقه مرخصی ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        leaves.map((l, idx) => {
                          const isDaily = l.type === 'daily';
                          const durText = isDaily
                            ? `${toPersianDigits(l.days_count || 1)} روز`
                            : l.hours_text || `${toPersianDigits(l.hours_count || 0)} ساعت`;

                          return (
                            <tr key={l.id} className="odd:bg-white even:bg-slate-50/50">
                              <td className="py-2 px-2 border-l border-slate-300 font-mono text-slate-500 text-center whitespace-nowrap">
                                {toPersianDigits(idx + 1)}
                              </td>
                              <td className="py-2 px-2 border-l border-slate-300 font-bold text-center whitespace-nowrap">
                                {isDaily ? 'روزانه' : 'ساعتی'}
                              </td>
                              <td className="py-2 px-2 border-l border-slate-300 text-center whitespace-nowrap">{l.category}</td>
                              <td className="py-2 px-2 border-l border-slate-300 font-mono text-center whitespace-nowrap text-[10.5px]">
                                {isDaily ? (
                                  <span>
                                    {formatJalaliDate(l.from_date)}
                                    {l.from_date !== l.to_date && ` الی ${formatJalaliDate(l.to_date)}`}
                                  </span>
                                ) : (
                                  <span>
                                    {formatJalaliDate(l.date)} ({toPersianDigits(l.from_time || '')} - {toPersianDigits(l.to_time || '')})
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 border-l border-slate-300 font-bold font-mono text-center whitespace-nowrap">
                                {durText}
                              </td>
                              <td className="py-2 px-2 border-l border-slate-300 text-center">
                                {l.description || '-'}
                              </td>
                              <td className="py-2 px-2 text-center whitespace-nowrap text-[10.5px]">{l.replacement_person || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Summary Box */}
                <div className="bg-slate-100 border border-slate-400 rounded-lg p-2.5 flex items-center justify-between text-xs font-bold">
                  <div>مجموع کل مرخصی‌های استفاده شده:</div>
                  <div className="font-mono text-slate-900">
                    {toPersianDigits(totalEquivalentDays)} روز معادل ({toPersianDigits(totalDailyDays)} روز و {toPersianDigits(totalHourlyHours)} ساعت)
                  </div>
                </div>
              </div>
            )}

            {/* REPORT TYPE 3: EMPLOYMENT PERIODS */}
            {reportType === 'periods' && (
              <div className="space-y-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border-collapse border border-slate-300">
                    <thead className="bg-slate-100 font-bold border-b border-slate-300 text-slate-800 text-center text-[10.5px]">
                      <tr>
                        <th className="py-2 px-2 border-l border-slate-300 w-10 text-center whitespace-nowrap">ردیف</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-20 text-center whitespace-nowrap">نوع قرارداد</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-24 text-center whitespace-nowrap">سمت در دوره</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-24 text-center whitespace-nowrap">تاریخ شروع</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-24 text-center whitespace-nowrap">تاریخ پایان</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-20 text-center whitespace-nowrap">وضعیت</th>
                        <th className="py-2 px-2 border-l border-slate-300 w-24 text-center whitespace-nowrap">علت پایان کار</th>
                        <th className="py-2 px-2 border-slate-300 text-center whitespace-nowrap">توضیحات و توافقات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-center text-[11px]">
                      {periods.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-400">
                            هیچ سابقه دوره همکاری ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        periods.map((p, idx) => (
                          <tr key={p.id} className="odd:bg-white even:bg-slate-50/50">
                            <td className="py-2 px-2 border-l border-slate-300 font-mono text-slate-500 text-center whitespace-nowrap">
                              {toPersianDigits(idx + 1)}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 font-bold text-center whitespace-nowrap">
                              {p.contract_type || 'قراردادی'}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 font-medium text-center whitespace-nowrap">
                              {p.position || employee.position || '-'}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 font-mono font-bold text-center whitespace-nowrap">
                              {formatJalaliDate(p.start_date)}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 font-mono font-bold text-center whitespace-nowrap">
                              {p.end_date ? formatJalaliDate(p.end_date) : 'تاکنون (در حال اشتغال)'}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 font-bold text-center whitespace-nowrap">
                              {p.status === 'active' && !p.end_date ? 'مشغول به کار' : 'خاتمه یافته'}
                            </td>
                            <td className="py-2 px-2 border-l border-slate-300 text-center text-[10.5px]">
                              {p.reason_for_leaving || '-'}
                            </td>
                            <td className="py-2 px-2 text-center text-[10.5px]">{p.notes || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Standard Report Signatures Section (امور اداری حذف شد) */}
            <div className="pt-6 mt-6 border-t-2 border-slate-300">
              <div className="text-center font-bold text-slate-700 text-[11px] mb-3">
                تأییدیه و گواهی صحت گردش حساب و سوابق پرسنلی
              </div>
              <div className="grid grid-cols-2 gap-8 max-w-xl mx-auto text-center text-xs">
                {/* 1. Employee Signature */}
                <div className="border border-slate-300 rounded-lg p-3.5 min-h-[110px] flex flex-col justify-between items-center text-center bg-white">
                  <span className="font-bold text-slate-900">امضای پرسنل مربوطه</span>
                  <div className="h-10 flex items-end justify-center text-slate-300 text-xs font-mono">
                    ....................................
                  </div>
                  <span className="text-[10px] text-slate-400">محل امضا</span>
                </div>

                {/* 2. Management & Company Stamp */}
                <div className="border border-slate-300 rounded-lg p-3.5 min-h-[110px] flex flex-col justify-between items-center text-center bg-white">
                  <span className="font-bold text-slate-900">تأیید مدیریت مالی و کارخانه و مهر رسمی</span>
                  {stampEnabled && company.stamp_signature_url ? (
                    <div className="my-0.5 flex items-center justify-center relative pointer-events-none">
                      <img
                        src={company.stamp_signature_url}
                        alt="مهر رسمی شرکت"
                        className="h-14 max-w-[140px] object-contain mix-blend-multiply opacity-95 transition"
                      />
                    </div>
                  ) : (
                    <div className="h-10 flex items-end justify-center text-slate-300 text-xs font-mono">
                      ....................................
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400">محل امضا و مهر</span>
                </div>
              </div>
            </div>
            <PrintFooter />
          </div>
        </ZoomablePrintContainer>
      </div>
    </div>,
    document.body
  );
};
