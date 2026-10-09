import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Employee, EmployeeLeave } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatJalaliDate, toPersianDigits } from '../../utils/jalali';
import { exportElementAsPng } from '../../utils/exportImage';
import { PrintHeader } from '../Print/PrintHeader';
import { PrintModalControlBar } from '../Print/PrintModalControlBar';
import { ZoomablePrintContainer } from '../Print/ZoomablePrintContainer';

interface LeavePrintModalProps {
  leave: EmployeeLeave;
  employee: Employee;
  onClose: () => void;
}

export const LeavePrintModal: React.FC<LeavePrintModalProps> = ({ leave, employee, onClose }) => {
  const [isExportingImage, setIsExportingImage] = useState(false);
  const company = StorageService.getCompanySettings();
  const companyName = company.business_name || (company as any).company_name || 'شرکت تولیدی لوله پلی‌اتیلن البرز';
  const [stampEnabled, setStampEnabled] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const isDaily = leave.type === 'daily';
  const durationText = isDaily
    ? `${toPersianDigits(leave.days_count || 1)} روز کاری`
    : `${toPersianDigits(leave.hours_text || `${leave.hours_count || 0} ساعت`)}`;

  const handleExportImage = async () => {
    setIsExportingImage(true);
    const dateStr = leave.type === 'daily' ? leave.from_date : leave.date;
    const success = await exportElementAsPng(
      'printable-leave-slip',
      `برگه_مرخصی_${employee.name.replace(/\s+/g, '_')}_${dateStr || 'ثبت'}`
    );
    setIsExportingImage(false);
    if (!success) {
      alert('خطا در ایجاد خروجی تصویر برگه مرخصی.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-hidden print-modal-container print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[95vh] flex flex-col relative overflow-hidden print-modal-card print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:w-full print:max-h-none print:overflow-visible">
        {/* Controls Bar - Pinned at top inside modal */}
        <div className="p-3 sm:px-5 sm:py-3.5 bg-slate-50 dark:bg-slate-800/95 border-b border-slate-200 dark:border-slate-700 shrink-0 no-print z-20">
          <PrintModalControlBar
            title={`برگه رسمی مرخصی - ${employee.name}`}
            badge={`پرسنلی: ${employee.code}`}
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

        {/* Printable Form Sheet (Interactive Auto-fit and Zoomable on Mobile & Desktop) */}
        <ZoomablePrintContainer elementId="printable-leave-slip">
          <div
            id="printable-leave-slip"
            className="w-[800px] min-w-[800px] md:w-full md:min-w-0 max-w-[210mm] min-h-[297mm] p-4 sm:p-8 bg-white border border-slate-300 rounded-lg print:border-none print:p-0 print:m-0 print:w-full print:min-w-0 print:max-w-full print:min-h-0 text-slate-900 text-xs font-sans shadow-xs print:shadow-none space-y-4"
          >
            {/* Standard Company Print Header */}
            <PrintHeader
              title={`فرم درخواست و مجوز رسمی مرخصی ${isDaily ? 'روزانه' : 'ساعتی'}`}
              docNumberLabel="شماره پرونده:"
              docCode={employee.code}
              date={leave.created_at || (isDaily ? leave.from_date : leave.date) || new Date()}
              dateLabel="تاریخ ثبت:"
            />

            {/* Section 1: Employee Personnel Dossier */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-slate-800 text-[11px] flex items-center justify-between">
                <span>۱. مشخصات فردی و پرسنلی متقاضی</span>
                <span className="text-[10px] text-slate-500 font-normal">واحد کارگزینی و منابع انسانی</span>
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
                  <span className="font-bold text-slate-800 text-xs whitespace-nowrap truncate">{employee.position || 'پرسنل تولید'}</span>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <span className="text-slate-500 block text-[10px] mb-0.5">وضعیت اشتغال:</span>
                  <span className="font-bold text-emerald-700 text-xs whitespace-nowrap">شاغل و فعال</span>
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
                  <span className="text-slate-500 block text-[10px] mb-0.5">شخص جانشین / هماهنگی سرپرست:</span>
                  <span className="font-bold text-slate-900 text-xs truncate block">
                    {leave.replacement_person ? leave.replacement_person : 'هماهنگ‌شده با سرپرست مستقیم'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Leave Specification Table */}
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-300 font-bold text-slate-800 text-[11px]">
                ۲. مشخصات و زمان‌بندی مرخصی درخواستی
              </div>
              <table className="w-full text-center border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-300 font-bold text-slate-800 text-center text-[10.5px]">
                  <tr>
                    <th className="py-2 px-2 border-l border-slate-300 text-center w-24 whitespace-nowrap">نوع مرخصی</th>
                    <th className="py-2 px-2 border-l border-slate-300 text-center w-28 whitespace-nowrap">دسته‌بندی قانونی</th>
                    <th className="py-2 px-2 border-l border-slate-300 text-center whitespace-nowrap">{isDaily ? 'تاریخ شروع' : 'تاریخ مرخصی'}</th>
                    <th className="py-2 px-2 border-l border-slate-300 text-center whitespace-nowrap">{isDaily ? 'تاریخ خاتمه' : 'بازه ساعتی'}</th>
                    <th className="py-2 px-2 border-l border-slate-300 text-center w-24 whitespace-nowrap">میزان مرخصی</th>
                    <th className="py-2 px-2 text-center w-24 whitespace-nowrap">وضعیت تایید</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium text-center text-[11px]">
                  <tr>
                    <td className="py-2.5 px-2 border-l border-slate-200 font-bold text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold ${isDaily ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                        {isDaily ? 'مرخصی روزانه' : 'مرخصی ساعتی'}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 border-l border-slate-200 font-bold text-slate-800 text-center whitespace-nowrap">
                      {leave.category || 'استحقاقی'}
                    </td>
                    <td className="py-2.5 px-2 border-l border-slate-200 font-mono font-bold text-center whitespace-nowrap">
                      {isDaily ? formatJalaliDate(leave.from_date) : formatJalaliDate(leave.date)}
                    </td>
                    <td className="py-2.5 px-2 border-l border-slate-200 font-mono font-bold text-center whitespace-nowrap">
                      {isDaily
                        ? formatJalaliDate(leave.to_date)
                        : `${toPersianDigits(leave.from_time || '')} الی ${toPersianDigits(leave.to_time || '')}`}
                    </td>
                    <td className="py-2.5 px-2 border-l border-slate-200 font-black text-slate-900 font-mono text-center text-xs whitespace-nowrap">
                      {durationText}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-emerald-800 whitespace-nowrap">
                      موافقت اولیه
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Section 3: Reason & Explanation */}
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/50">
              <span className="font-bold text-slate-800 block mb-1 text-[11px]">
                ۳. علت درخواست و توضیحات پرسنل:
              </span>
              <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                {leave.description ? leave.description : 'انجام امور ضروری شخصی و خانوادگی.'}
              </p>
            </div>

            {/* Section 4: Signatures & Stamp (امور اداری حذف شد) */}
            <div className="pt-4 border-t-2 border-slate-300">
              <div className="text-center font-bold text-slate-700 text-[11px] mb-3">
                تأییدیه‌ها و موافقت‌نامه رسمی مرخصی
              </div>
              <div className="grid grid-cols-2 gap-8 max-w-xl mx-auto text-center text-xs">
                {/* 1. Employee Signature */}
                <div className="border border-slate-300 rounded-lg p-3.5 min-h-[110px] flex flex-col justify-between items-center text-center bg-white">
                  <span className="font-bold text-slate-900">امضای متقاضی (پرسنل)</span>
                  <div className="h-10 flex items-end justify-center text-slate-300 text-xs font-mono">
                    ....................................
                  </div>
                  <span className="text-[10px] text-slate-400">محل امضا</span>
                </div>

                {/* 2. Management & Company Stamp */}
                <div className="border border-slate-300 rounded-lg p-3.5 min-h-[110px] flex flex-col justify-between items-center text-center bg-white">
                  <span className="font-bold text-slate-900">تأیید مدیریت کارخانه و مهر رسمی</span>
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

            {/* Official Legal Footer */}
            <div className="pt-3 border-t border-slate-200 text-[9.5px] text-slate-500 text-center flex items-center justify-between">
              <span>سامانه یکپارچه مدیریت کارگزینی و منابع انسانی {companyName}</span>
              <span>این سند پس از اخذ تاییدیه نهایی در سوابق پرسنلی و حقوق و دستمزد اعمال می‌گردد.</span>
            </div>
          </div>
        </ZoomablePrintContainer>
      </div>
    </div>,
    document.body
  );
};
