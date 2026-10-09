import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { MaterialMovement } from '../../types';
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
  Boxes,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

interface WarehouseFilterReportProps {
  movements: MaterialMovement[];
  onFilteredChange: (filtered: MaterialMovement[]) => void;
}

export const WarehouseFilterReport: React.FC<WarehouseFilterReportProps> = ({
  movements,
  onFilteredChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Filters
  const [materialNameQuery, setMaterialNameQuery] = useState('');
  const [driverNameQuery, setDriverNameQuery] = useState('');
  const [vehiclePlateQuery, setVehiclePlateQuery] = useState('');
  const [referenceTypeQuery, setReferenceTypeQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'in' | 'out'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minQty, setMinQty] = useState('');
  const [maxQty, setMaxQty] = useState('');

  const handleReset = () => {
    setMaterialNameQuery('');
    setDriverNameQuery('');
    setVehiclePlateQuery('');
    setReferenceTypeQuery('');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setMinQty('');
    setMaxQty('');
  };

  const filtered = movements.filter((m) => {
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (materialNameQuery.trim() && !m.material_name.toLowerCase().includes(materialNameQuery.toLowerCase().trim())) {
      return false;
    }
    if (driverNameQuery.trim() && (!m.driver_name || !m.driver_name.toLowerCase().includes(driverNameQuery.toLowerCase().trim()))) {
      return false;
    }
    if (vehiclePlateQuery.trim() && (!m.vehicle_plate || !m.vehicle_plate.toLowerCase().includes(vehiclePlateQuery.toLowerCase().trim()))) {
      return false;
    }
    if (referenceTypeQuery.trim() && (!m.reference_type || !m.reference_type.toLowerCase().includes(referenceTypeQuery.toLowerCase().trim()))) {
      return false;
    }
    if (startDate) {
      const mTime = new Date(m.created_at).getTime();
      const sTime = new Date(startDate).getTime();
      if (!isNaN(mTime) && !isNaN(sTime) && mTime < sTime) return false;
    }
    if (endDate) {
      const mTime = new Date(m.created_at).getTime();
      const eTime = new Date(endDate).getTime();
      if (!isNaN(mTime) && !isNaN(eTime) && mTime > eTime) return false;
    }
    if (minQty && Number(minQty) > 0 && m.quantity < Number(minQty)) {
      return false;
    }
    if (maxQty && Number(maxQty) > 0 && m.quantity > Number(maxQty)) {
      return false;
    }
    return true;
  });

  const totalInQty = filtered.filter((m) => m.type === 'in').reduce((s, m) => s + (Number(m.quantity) || 0), 0);
  const totalOutQty = filtered.filter((m) => m.type === 'out').reduce((s, m) => s + (Number(m.quantity) || 0), 0);

  const handleExportExcel = () => {
    const data = filtered.map((m, idx) => ({
      ردیف: idx + 1,
      نوع_تراکنش: m.type === 'in' ? 'ورود به انبار' : 'خروج از انبار',
      تاریخ: formatJalaliDate(m.created_at),
      ماده_اولیه: m.material_name,
      وزن_کیلوگرم: m.quantity,
      تعداد_کیسه_بسته: m.bags_count || '—',
      راننده: m.driver_name || '—',
      پلاک_خودرو: m.vehicle_plate || '—',
      مرجع_یا_مشتری: m.reference_type || '—',
      توضیحات: m.description || '—',
    }));

    exportToExcel({
      fileName: 'گزارش_فیلترشده_گردش_مواد_اولیه',
      sheetName: 'گردش مواد اولیه',
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
                فیلترهای پیشرفته و چاپ گزارش انبار مواد اولیه
              </span>
              {(materialNameQuery || driverNameQuery || vehiclePlateQuery || referenceTypeQuery || typeFilter !== 'all' || startDate || endDate || minQty || maxQty) && (
                <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100 dark:ring-blue-900"></span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              فیلتر بر اساس نام گرید/ماده، ورود/خروج، بازه تاریخ، راننده، پلاک و تناژ
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
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">نوع گردش</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">همه گردش‌ها (ورود و خروج)</option>
                <option value="in">فقط ورود مواد اولیه</option>
                <option value="out">فقط خروج (مصرف) مواد اولیه</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">نام ماده اولیه / گرید</label>
              <input
                type="text"
                placeholder="مثال: PE100 EX3..."
                value={materialNameQuery}
                onChange={(e) => setMaterialNameQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">از تاریخ</label>
              <JalaliDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="انتخاب تاریخ شروع"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">تا تاریخ</label>
              <JalaliDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="انتخاب تاریخ پایان"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">نام راننده / متصدی</label>
              <input
                type="text"
                placeholder="نام راننده..."
                value={driverNameQuery}
                onChange={(e) => setDriverNameQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">پلاک خودرو</label>
              <input
                type="text"
                placeholder="پلاک خودرو..."
                value={vehiclePlateQuery}
                onChange={(e) => setVehiclePlateQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">حداقل وزن (کیلوگرم)</label>
              <input
                type="number"
                placeholder="مثال: 1000"
                value={minQty}
                onChange={(e) => setMinQty(e.target.value)}
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
              <span>تعداد رکوردها: {toPersianDigits(filtered.length)} سند</span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400">
                مجموع ورودی: {formatNumber(totalInQty)} کیلوگرم
              </span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400">
                مجموع خروجی/مصرف: {formatNumber(totalOutQty)} کیلوگرم
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ گزارش انبار (A4)</span>
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
        <WarehousePrintModal
          movements={filtered}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};

const WarehousePrintModal: React.FC<{
  movements: MaterialMovement[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ movements, isOpen, onClose }) => {
  const [isExportingImage, setIsExportingImage] = useState(false);

  if (!isOpen) return null;

  const totalInQty = movements.filter((m) => m.type === 'in').reduce((s, m) => s + (Number(m.quantity) || 0), 0);
  const totalOutQty = movements.filter((m) => m.type === 'out').reduce((s, m) => s + (Number(m.quantity) || 0), 0);

  const handleExportImage = async () => {
    setIsExportingImage(true);
    const success = await exportElementAsPng(
      'printable-warehouse-report',
      `گزارش_انبار_مواد_اولیه_${new Date().toISOString().slice(0, 10)}`
    );
    setIsExportingImage(false);
    if (!success) {
      alert('خطا در ایجاد خروجی تصویر گزارش انبار.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-y-auto print-modal-container print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-4 max-h-[94vh] flex flex-col print-modal-card print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:w-full print:max-h-none print:overflow-visible">
        <PrintModalControlBar
          title="پیش‌نمایش چاپ گزارش گردش و موجودی انبار مواد اولیه"
          badge={`${toPersianDigits(movements.length)} ردیف`}
          isExportingImage={isExportingImage}
          onExportImage={handleExportImage}
          onPrint={() => window.print()}
          onClose={onClose}
          printButtonText="ارسال به چاپگر (A4)"
        />

        {/* Printable Warehouse Report (Interactive Auto-fit and Zoomable on Mobile & Desktop) */}
        <ZoomablePrintContainer elementId="printable-warehouse-report">
          <div
            id="printable-warehouse-report"
            className="w-[800px] min-w-[800px] md:w-full md:min-w-0 mx-auto border border-slate-300 rounded-lg p-4 sm:p-6 bg-white text-slate-900 text-xs font-sans space-y-4 print:w-full print:min-w-0"
          >
            <PrintHeader
              title="گزارش تجمیعی اسناد ورود و خروج مواد اولیه انبار"
              docNumber={toPersianDigits(movements.length)}
              docNumberLabel="تعداد اسناد:"
            />

            <table className="w-full text-center border-collapse border border-slate-400 text-[10.5px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800">
                  <th className="p-1.5 border-l border-slate-400 w-8">ردیف</th>
                  <th className="p-1.5 border-l border-slate-400 w-20">نوع سند</th>
                  <th className="p-1.5 border-l border-slate-400 w-20">تاریخ ثبت</th>
                  <th className="p-1.5 border-l border-slate-400">نام ماده اولیه / گرید</th>
                  <th className="p-1.5 border-l border-slate-400 w-28">وزن (کیلوگرم)</th>
                  <th className="p-1.5 border-l border-slate-400 w-20">تعداد کیسه</th>
                  <th className="p-1.5 border-l border-slate-400">مشخصات راننده / خودرو</th>
                  <th className="p-1.5 w-32">توضیحات و ارجاع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400">
                      هیچ سند گردش مواد اولیه‌ای در این بازه یافت نشد.
                    </td>
                  </tr>
                ) : (
                  movements.map((m, idx) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-1.5 border-l border-slate-300 font-bold">{toPersianDigits(idx + 1)}</td>
                      <td className="p-1.5 border-l border-slate-300 font-bold">
                        <span className={m.type === 'in' ? 'text-emerald-700' : 'text-amber-700'}>
                          {m.type === 'in' ? 'ورود به انبار' : 'خروج (مصرف)'}
                        </span>
                      </td>
                      <td className="p-1.5 border-l border-slate-300 font-mono">{formatJalaliDate(m.created_at)}</td>
                      <td className="p-1.5 border-l border-slate-300 text-right pr-2 font-bold">{m.material_name}</td>
                      <td className="p-1.5 border-l border-slate-300 font-bold font-mono">
                        {formatNumber(m.quantity)} <span className="text-[9px] text-slate-500 font-normal">kg</span>
                      </td>
                      <td className="p-1.5 border-l border-slate-300 font-mono">{m.bags_count ? toPersianDigits(m.bags_count) : '—'}</td>
                      <td className="p-1.5 border-l border-slate-300 text-[10px]">
                        <div>{m.driver_name || '—'}</div>
                        {m.vehicle_plate && (
                          <div className="text-slate-500 font-mono">{m.vehicle_plate}</div>
                        )}
                      </td>
                      <td className="p-1.5 text-[10px] text-right pr-1">
                        <div>{m.reference_type || ''}</div>
                        <div className="text-slate-400 truncate max-w-[120px]">{m.description || '—'}</div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="border border-slate-400 rounded-lg p-3 bg-slate-50 flex items-center justify-between text-xs font-bold">
              <div>
                <span>تعداد کل اسناد: </span>
                <span className="font-mono text-blue-900">{toPersianDigits(movements.length)} سند</span>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-emerald-700">مجموع ورودی مواد اولیه: </span>
                  <span className="font-mono text-emerald-800 text-sm font-black">{formatNumber(totalInQty)} kg</span>
                </div>
                <div>
                  <span className="text-amber-700">مجموع خروجی/مصرف: </span>
                  <span className="font-mono text-amber-800 text-sm font-black">{formatNumber(totalOutQty)} kg</span>
                </div>
              </div>
            </div>

            <div className="pt-4 grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-700">
              <div>
                <span>انباردار مواد اولیه</span>
                <div className="text-slate-300 mt-6">.......................</div>
              </div>
              <div>
                <span>کنترل کیفیت (QC)</span>
                <div className="text-slate-300 mt-6">.......................</div>
              </div>
              <div>
                <span>مدیریت کارخانه</span>
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
