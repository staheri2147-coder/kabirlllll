import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ProductionLog } from '../../types';
import { formatJalaliDate, formatNumber, toPersianDigits } from '../../utils/jalali';
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
  Factory,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface ProductionFilterReportProps {
  logs: ProductionLog[];
  onFilteredChange: (filtered: ProductionLog[]) => void;
}

export const ProductionFilterReport: React.FC<ProductionFilterReportProps> = ({
  logs,
  onFilteredChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filters
  const [sizeFilter, setSizeFilter] = useState('');
  const [pressureFilter, setPressureFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [customerName, setCustomerName] = useState('');
  const [dieMold, setDieMold] = useState('');
  const [pinNeedle, setPinNeedle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minMeters, setMinMeters] = useState('');
  const [maxMeters, setMaxMeters] = useState('');

  const handleReset = () => {
    setSizeFilter('');
    setPressureFilter('');
    setTypeFilter('all');
    setCustomerName('');
    setDieMold('');
    setPinNeedle('');
    setStartDate('');
    setEndDate('');
    setMinMeters('');
    setMaxMeters('');
  };

  const filtered = logs.filter((log) => {
    const logSize = log.size || log.pipe_size || '';
    if (sizeFilter.trim() && !logSize.toLowerCase().includes(sizeFilter.toLowerCase().trim())) {
      return false;
    }
    if (pressureFilter.trim() && (!log.pressure || !log.pressure.toLowerCase().includes(pressureFilter.toLowerCase().trim()))) {
      return false;
    }
    if (typeFilter !== 'all') {
      const logType = log.type || (log.material_type?.includes('PE80') ? 'PE80' : 'PE100');
      if (typeFilter === 'empty' && logType) return false;
      if (typeFilter !== 'empty' && logType !== typeFilter) return false;
    }
    if (customerName.trim() && (!log.customer_name || !log.customer_name.toLowerCase().includes(customerName.toLowerCase().trim()))) {
      return false;
    }
    if (dieMold.trim() && (!log.die_mold || !log.die_mold.toLowerCase().includes(dieMold.toLowerCase().trim()))) {
      return false;
    }
    if (pinNeedle.trim() && (!log.pin_needle || !log.pin_needle.toLowerCase().includes(pinNeedle.toLowerCase().trim()))) {
      return false;
    }
    if (startDate) {
      const pDate = log.production_date || log.created_at;
      const pTime = new Date(pDate).getTime();
      const sTime = new Date(startDate).getTime();
      if (!isNaN(pTime) && !isNaN(sTime) && pTime < sTime) return false;
    }
    if (endDate) {
      const pDate = log.production_date || log.created_at;
      const pTime = new Date(pDate).getTime();
      const eTime = new Date(endDate).getTime();
      if (!isNaN(pTime) && !isNaN(eTime) && pTime > eTime) return false;
    }
    const mtrs = typeof log.meters === 'number' ? log.meters : typeof log.meters_produced === 'number' ? log.meters_produced : 0;
    if (minMeters && Number(minMeters) > 0 && mtrs < Number(minMeters)) {
      return false;
    }
    if (maxMeters && Number(maxMeters) > 0 && mtrs > Number(maxMeters)) {
      return false;
    }
    return true;
  });

  const totalMetersProduced = filtered.reduce(
    (s, l) => s + (typeof l.meters === 'number' ? l.meters : typeof l.meters_produced === 'number' ? l.meters_produced : 0),
    0
  );
  const totalWeightKg = filtered.reduce(
    (s, l) => s + (typeof l.total_weight === 'number' ? l.total_weight : typeof l.weight_kg === 'number' ? l.weight_kg : 0),
    0
  );

  const handleExportExcel = () => {
    const data = filtered.map((l, idx) => ({
      ردیف: idx + 1,
      کد_گزارش: l.code || `PRD-${idx + 1}`,
      تاریخ_تولید: formatJalaliDate(l.production_date || l.created_at),
      سایز: l.size || l.pipe_size,
      فشار: l.pressure || '—',
      نوع_مواد: l.type || l.material_type || '—',
      سفارش_دهنده_مشتری: l.customer_name || '—',
      قالب_دای: l.die_mold || '—',
      سوزنی_پین: l.pin_needle || '—',
      ضخامت_جداره: l.thickness || '—',
      وزن_واحد_متر: l.weight_unit || '—',
      متراژ_تولید_شده_متر: l.meters || l.meters_produced || 0,
      وزن_کل_کیلوگرم: l.total_weight || l.weight_kg || 0,
      توضیحات: l.notes || '—',
    }));

    exportToExcel({
      fileName: 'گزارش_فیلترشده_خط_تولید',
      sheetName: 'گزارش تولید',
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
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                فیلترهای پیشرفته و چاپ گزارش خط تولید
              </span>
              {(sizeFilter || pressureFilter || typeFilter !== 'all' || customerName || dieMold || pinNeedle || startDate || endDate || minMeters || maxMeters) && (
                <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100 dark:ring-blue-900"></span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              فیلتر بر اساس تاریخ تولید، سایز، فشار کاری، گرید PE، قالب دای، سوزنی و متراژ
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
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">سایز لوله (میلی‌متر)</label>
              <input
                type="text"
                placeholder="مثال: 63, 110, 200..."
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">فشار کاری (بار)</label>
              <input
                type="text"
                placeholder="مثال: 10 بار, 16 بار..."
                value={pressureFilter}
                onChange={(e) => setPressureFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">نوع مواد (گرید)</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">همه مواد</option>
                <option value="PE100">PE100</option>
                <option value="PE80">PE80</option>
                <option value="empty">خالی / بدون گرید</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">سفارش‌دهنده / مشتری</label>
              <input
                type="text"
                placeholder="نام مشتری یا پروژه..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">قالب (دای)</label>
              <input
                type="text"
                placeholder="شماره یا نام قالب..."
                value={dieMold}
                onChange={(e) => setDieMold(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">سوزنی (پین)</label>
              <input
                type="text"
                placeholder="مشخصات پین/سوزنی..."
                value={pinNeedle}
                onChange={(e) => setPinNeedle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">از تاریخ تولید</label>
              <JalaliDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="انتخاب تاریخ شروع"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">تا تاریخ تولید</label>
              <JalaliDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="انتخاب تاریخ پایان"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">حداقل متراژ (متر)</label>
              <input
                type="number"
                placeholder="مثال: 500"
                value={minMeters}
                onChange={(e) => setMinMeters(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">حداکثر متراژ (متر)</label>
              <input
                type="number"
                placeholder="مثال: 10000"
                value={maxMeters}
                onChange={(e) => setMaxMeters(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
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
              <span>تعداد شیفت/گزارش: {toPersianDigits(filtered.length)} مورد</span>
              <span>•</span>
              <span className="text-blue-600 dark:text-blue-400">
                مجموع متراژ تولید: {formatNumber(totalMetersProduced)} متر
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                مجموع وزن: {formatNumber(totalWeightKg)} کیلوگرم
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ گزارش خط تولید (A4)</span>
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
        <ProductionPrintModal
          logs={filtered}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};

const ProductionPrintModal: React.FC<{
  logs: ProductionLog[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ logs, isOpen, onClose }) => {
  const [isExportingImage, setIsExportingImage] = useState(false);

  if (!isOpen) return null;

  const totalMetersProduced = logs.reduce(
    (s, l) => s + (typeof l.meters === 'number' ? l.meters : typeof l.meters_produced === 'number' ? l.meters_produced : 0),
    0
  );
  const totalWeightKg = logs.reduce(
    (s, l) => s + (typeof l.total_weight === 'number' ? l.total_weight : typeof l.weight_kg === 'number' ? l.weight_kg : 0),
    0
  );

  const handleExportImage = async () => {
    setIsExportingImage(true);
    const success = await exportElementAsPng(
      'printable-production-report',
      `گزارش_تولید_${new Date().toISOString().slice(0, 10)}`
    );
    setIsExportingImage(false);
    if (!success) {
      alert('خطا در ایجاد خروجی عکس گزارش تولید.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-y-auto print-modal-container print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-4 max-h-[94vh] flex flex-col print-modal-card print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:w-full print:max-h-none print:overflow-visible">
        {/* Controls (Hidden in Print) */}
        <PrintModalControlBar
          title="پیش‌نمایش چاپ گزارش تولید اکسترودر و خطوط لوله"
          badge={`${toPersianDigits(logs.length)} ردیف`}
          isExportingImage={isExportingImage}
          onExportImage={handleExportImage}
          onPrint={() => window.print()}
          onClose={onClose}
          printButtonText="ارسال به چاپگر (A4)"
        />

        {/* Printable Production Report (Interactive Auto-fit and Zoomable on Mobile & Desktop) */}
        <ZoomablePrintContainer elementId="printable-production-report">
          <div
            id="printable-production-report"
            className="w-[800px] min-w-[800px] md:w-full md:min-w-0 mx-auto border border-slate-300 rounded-lg p-4 sm:p-6 bg-white text-slate-900 text-xs font-sans space-y-4 print:w-full print:min-w-0"
          >
            <PrintHeader
              title="گزارش تجمیعی عملکرد خطوط تولید و اکستروژن لوله پلی‌اتیلن"
              docNumber={toPersianDigits(logs.length)}
              docNumberLabel="تعداد شیفت‌ها:"
            />

            <table className="w-full text-center border-collapse border border-slate-400 text-[10px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800">
                  <th className="p-1.5 border-l border-slate-400 w-7">ردیف</th>
                  <th className="p-1.5 border-l border-slate-400 w-16">تاریخ</th>
                  <th className="p-1.5 border-l border-slate-400 w-16">سایز (mm)</th>
                  <th className="p-1.5 border-l border-slate-400 w-16">فشار کاری</th>
                  <th className="p-1.5 border-l border-slate-400 w-16">گرید مواد</th>
                  <th className="p-1.5 border-l border-slate-400">مشتری / سفارش‌دهنده</th>
                  <th className="p-1.5 border-l border-slate-400 w-20">قالب / سوزنی</th>
                  <th className="p-1.5 border-l border-slate-400 w-20">وزن واحد (m)</th>
                  <th className="p-1.5 border-l border-slate-400 w-24">متراژ تولیدی</th>
                  <th className="p-1.5 w-24">وزن کل (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-slate-400">
                      هیچ گزارشی در این بازه تولید ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  logs.map((l, idx) => {
                    const mtrs = typeof l.meters === 'number' ? l.meters : typeof l.meters_produced === 'number' ? l.meters_produced : 0;
                    const wTotal = typeof l.total_weight === 'number' ? l.total_weight : typeof l.weight_kg === 'number' ? l.weight_kg : 0;
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="p-1 border-l border-slate-300 font-bold">{toPersianDigits(idx + 1)}</td>
                        <td className="p-1 border-l border-slate-300 font-mono">{formatJalaliDate(l.production_date || l.created_at)}</td>
                        <td className="p-1 border-l border-slate-300 font-bold text-blue-900">{l.size || l.pipe_size}</td>
                        <td className="p-1 border-l border-slate-300">{l.pressure || '—'}</td>
                        <td className="p-1 border-l border-slate-300 font-bold">{l.type || l.material_type || '—'}</td>
                        <td className="p-1 border-l border-slate-300 text-right pr-2 font-bold">{l.customer_name || '—'}</td>
                        <td className="p-1 border-l border-slate-300 text-[9.5px]">
                          <div>دای: {l.die_mold || '—'}</div>
                          <div>پین: {l.pin_needle || '—'}</div>
                        </td>
                        <td className="p-1 border-l border-slate-300 font-mono">{l.weight_unit ? `${toPersianDigits(l.weight_unit)} kg` : '—'}</td>
                        <td className="p-1 border-l border-slate-300 font-bold font-mono text-blue-800">
                          {formatNumber(mtrs)} متر
                        </td>
                        <td className="p-1 font-bold font-mono text-emerald-800">
                          {formatNumber(wTotal)} kg
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="border border-slate-400 rounded-lg p-3 bg-slate-50 flex items-center justify-between text-xs font-bold">
              <div>
                <span>تعداد کل رکوردها: </span>
                <span className="font-mono text-blue-900">{toPersianDigits(logs.length)} شیفت</span>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-blue-800">مجموع کل متراژ تولید: </span>
                  <span className="font-mono text-blue-900 text-sm font-black">{formatNumber(totalMetersProduced)} متر</span>
                </div>
                <div>
                  <span className="text-emerald-800">مجموع کل وزن تولید: </span>
                  <span className="font-mono text-emerald-900 text-sm font-black">{formatNumber(totalWeightKg)} kg</span>
                </div>
              </div>
            </div>

            <div className="pt-4 grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-700">
              <div>
                <span>سرپرست شیفت تولید</span>
                <div className="text-slate-300 mt-6">.......................</div>
              </div>
              <div>
                <span>کنترل کیفیت و آزمایشگاه</span>
                <div className="text-slate-300 mt-6">.......................</div>
              </div>
              <div>
                <span>مدیر فنی و تولید کارخانه</span>
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
