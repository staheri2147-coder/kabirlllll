import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { DeliveryNote, DeliveryItem } from '../../types';
import { formatJalaliDate, formatNumber, toPersianDigits } from '../../utils/jalali';
import { exportToExcel } from '../../utils/exportExcel';
import { exportElementAsPng } from '../../utils/exportImage';
import { formatCompactItemSummary } from '../../utils/formatItemSummary';
import { ensureArray } from '../../utils/itemUtils';
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
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

export interface FilteredDeliveryResult {
  delivery: DeliveryNote;
  matchingItems: DeliveryItem[];
  matchingTotalMeters: number;
}

interface DeliveryFilterPrintModalProps {
  filteredResults: FilteredDeliveryResult[];
  isOpen: boolean;
  onClose: () => void;
  filterSummaryText?: string;
}

export const DeliveryFilterReport: React.FC<{
  deliveries: DeliveryNote[];
  onFilteredChange: (filtered: DeliveryNote[], results?: FilteredDeliveryResult[]) => void;
}> = ({ deliveries, onFilteredChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // General Filters
  const [customerName, setCustomerName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'all' | 'valid' | 'cancelled'>('all');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Item Specific Filters (Size, Pressure, Type)
  const [sizeFilter, setSizeFilter] = useState('');
  const [pressureFilter, setPressureFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const handleReset = () => {
    setCustomerName('');
    setDriverName('');
    setVehiclePlate('');
    setStartDate('');
    setEndDate('');
    setStatus('all');
    setInvoiceNumber('');
    setSizeFilter('');
    setPressureFilter('');
    setTypeFilter('');
  };

  const hasActiveFilters = Boolean(
    customerName ||
      driverName ||
      vehiclePlate ||
      startDate ||
      endDate ||
      status !== 'all' ||
      invoiceNumber ||
      sizeFilter ||
      pressureFilter ||
      typeFilter
  );

  // Helper to match an item against size, pressure, type
  const isItemMatching = (item: DeliveryItem): boolean => {
    const itemSize = (item.size || '').toLowerCase().trim();
    const itemPressure = (item.pressure || '').toLowerCase().trim();
    const itemType = (item.type || '').toLowerCase().trim();
    const itemSpec = (item.product_spec || '').toLowerCase().trim();
    const itemName = (item.product_name || '').toLowerCase().trim();
    const combined = `${itemSize} ${itemPressure} ${itemType} ${itemSpec} ${itemName}`;

    // Size filter match
    if (sizeFilter.trim()) {
      const qSize = sizeFilter.trim().toLowerCase();
      const numOnly = qSize.replace(/[^\d]/g, '');
      const matchSize =
        itemSize.includes(qSize) ||
        (numOnly && itemSize.includes(numOnly)) ||
        combined.includes(qSize) ||
        (numOnly && combined.includes(`سایز ${numOnly}`)) ||
        (numOnly && combined.includes(`${numOnly} میلی`)) ||
        (numOnly && combined.includes(`${numOnly}mm`));
      if (!matchSize) return false;
    }

    // Pressure filter match
    if (pressureFilter.trim()) {
      const qPress = pressureFilter.trim().toLowerCase();
      const numOnly = qPress.replace(/[^\d.]/g, '');
      const matchPress =
        itemPressure.includes(qPress) ||
        (numOnly && itemPressure.includes(numOnly)) ||
        combined.includes(qPress) ||
        (numOnly && combined.includes(`${numOnly} بار`)) ||
        (numOnly && combined.includes(`${numOnly}bar`)) ||
        (numOnly && combined.includes(`pn${numOnly}`));
      if (!matchPress) return false;
    }

    // Type filter match
    if (typeFilter.trim() && typeFilter !== 'all') {
      const qType = typeFilter.trim().toLowerCase().replace(/\s+/g, '');
      const combinedClean = combined.replace(/\s+/g, '');
      const matchType = itemType.replace(/\s+/g, '').includes(qType) || combinedClean.includes(qType);
      if (!matchType) return false;
    }

    return true;
  };

  // Perform filtration
  const filteredResults: FilteredDeliveryResult[] = useMemo(() => {
    const results: FilteredDeliveryResult[] = [];

    deliveries.forEach((d) => {
      // General filters
      if (customerName.trim() && !d.customer_name?.toLowerCase().includes(customerName.toLowerCase().trim())) {
        return;
      }
      if (driverName.trim() && !d.driver_name?.toLowerCase().includes(driverName.toLowerCase().trim())) {
        return;
      }
      if (vehiclePlate.trim() && !d.vehicle_plate?.toLowerCase().includes(vehiclePlate.toLowerCase().trim())) {
        return;
      }
      if (status !== 'all') {
        if (status === 'valid' && d.status === 'cancelled') return;
        if (status === 'cancelled' && d.status !== 'cancelled') return;
      }
      if (invoiceNumber.trim()) {
        const matchInv = ensureArray(d.items).some((i) =>
          i.invoice_number?.toLowerCase().includes(invoiceNumber.toLowerCase().trim())
        );
        if (!matchInv) return;
      }
      if (startDate) {
        const dTime = new Date(d.delivery_date).getTime();
        const sTime = new Date(startDate).getTime();
        if (!isNaN(dTime) && !isNaN(sTime) && dTime < sTime) return;
      }
      if (endDate) {
        const dTime = new Date(d.delivery_date).getTime();
        const eTime = new Date(endDate).getTime();
        if (!isNaN(dTime) && !isNaN(eTime) && dTime > eTime) return;
      }

      // Check item-level filters
      const hasItemFilters = Boolean(sizeFilter.trim() || pressureFilter.trim() || (typeFilter.trim() && typeFilter !== 'all'));
      const allItems = ensureArray(d.items);

      if (hasItemFilters) {
        // Filter items in this delivery note
        const matchingItems = allItems.filter(isItemMatching);
        if (matchingItems.length === 0) {
          // No items in this delivery note match all item criteria -> exclude delivery note
          return;
        }
        const matchingMeters = matchingItems.reduce(
          (sum, item) => sum + (Number(item.quantity_meters) || 0),
          0
        );
        results.push({
          delivery: {
            ...d,
            // When item filters are applied, represent the matched items for the caller
            items: matchingItems,
            total_meters: matchingMeters,
          },
          matchingItems,
          matchingTotalMeters: matchingMeters,
        });
      } else {
        // No item filters active -> all items match
        const totalMtrs = allItems.reduce(
          (sum, item) => sum + (Number(item.quantity_meters) || 0),
          0
        );
        results.push({
          delivery: d,
          matchingItems: allItems,
          matchingTotalMeters: Number(d.total_meters) || totalMtrs,
        });
      }
    });

    return results;
  }, [
    deliveries,
    customerName,
    driverName,
    vehiclePlate,
    startDate,
    endDate,
    status,
    invoiceNumber,
    sizeFilter,
    pressureFilter,
    typeFilter,
  ]);

  // Real-time propagation to parent component
  useEffect(() => {
    const parentDeliveries = filteredResults.map((r) => r.delivery);
    onFilteredChange(parentDeliveries, filteredResults);
  }, [filteredResults, onFilteredChange]);

  // Calculated stats
  const totalDeliveriesCount = filteredResults.length;
  const totalDeliveredMeters = filteredResults.reduce(
    (s, r) => (r.delivery.status === 'cancelled' ? s : s + r.matchingTotalMeters),
    0
  );

  const handleExportExcel = () => {
    const data = filteredResults.map((r, idx) => {
      const del = r.delivery;
      const invNumbers = Array.from(new Set(ensureArray(r.matchingItems).map((i) => i.invoice_number || ''))).join('، ');
      
      // Format items string for Excel
      const itemsSummary = ensureArray(r.matchingItems)
        .map((item) => formatCompactItemSummary(item.quantity_meters, item))
        .join(' | ');

      return {
        ردیف: idx + 1,
        شماره_حواله: del.delivery_number,
        وضعیت: del.status === 'cancelled' ? 'لغو شده' : 'معتبر',
        نام_مشتری: del.customer_name,
        تاریخ_تحویل: formatJalaliDate(del.delivery_date),
        شماره_فاکتورها: invNumbers || '—',
        شرح_و_مشخصات_اقلام_تحویلی: itemsSummary || `${formatNumber(r.matchingTotalMeters)} متر`,
        مجموع_متراژ_قلم_های_منطبق_متر: r.matchingTotalMeters,
        نام_راننده: del.driver_name || '—',
        شماره_تماس_راننده: del.driver_phone || '—',
        خودرو_و_پلاک: `${del.vehicle_type || ''} ${del.vehicle_plate || ''}`.trim() || '—',
      };
    });

    exportToExcel({
      fileName: 'گزارش_فیلترشده_رسیدهای_تحویل',
      sheetName: 'رسیدهای تحویل',
      data,
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs mb-4">
      {/* Header Toggle */}
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
                فیلترهای پیشرفته و گزارش چاپی تحویل بار
              </span>
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-100 dark:ring-blue-900"></span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              فیلتر بلادرنگ بر اساس خریدار، سایز، فشار، گرید لوله، راننده، فاکتور و تاریخ
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

      {/* Expanded Filters Form */}
      {isOpen && (
        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-slate-800/60 mt-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">نام خریدار / مشتری</label>
              <input
                type="text"
                placeholder="جستجوی نام مشتری..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* SIZE FILTER */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">سایز لوله (میلی‌متر)</label>
              <input
                type="text"
                placeholder="مثال: 110 یا 63..."
                value={sizeFilter}
                onChange={(e) => setSizeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* PRESSURE FILTER */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">فشار کاری (بار / PN)</label>
              <input
                type="text"
                placeholder="مثال: 8 یا 10 یا 16..."
                value={pressureFilter}
                onChange={(e) => setPressureFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {/* TYPE / GRADE FILTER */}
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">نوع / گرید مواد</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="">همه انواع مواد</option>
                <option value="PE100">PE100 (پلی‌اتیلن ۱۰۰)</option>
                <option value="PE80">PE80 (پلی‌اتیلن ۸۰)</option>
                <option value="PE63">PE63</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">نام راننده / متصدی حمل</label>
              <input
                type="text"
                placeholder="نام راننده..."
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">شماره فاکتور</label>
              <input
                type="text"
                placeholder="مثال: INV-1001"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-mono outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">پلاک خودرو</label>
              <input
                type="text"
                placeholder="پلاک خودرو..."
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">وضعیت رسید</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">همه رسیدها</option>
                <option value="valid">معتبر و تحویل‌شده</option>
                <option value="cancelled">لغو شده</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">از تاریخ تحویل</label>
              <JalaliDatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="انتخاب تاریخ شروع"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-bold mb-1">تا تاریخ تحویل</label>
              <JalaliDatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="انتخاب تاریخ پایان"
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

          {/* Action and Summary Toolbar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-bold flex-wrap">
              <span>تعداد رسیدها: {toPersianDigits(totalDeliveriesCount)} فقره</span>
              <span>•</span>
              <span className="text-blue-600 dark:text-blue-400">
                مجموع متراژ تحویلی اقلام فیلترشده: {formatNumber(totalDeliveredMeters)} متر
              </span>
              {(sizeFilter || pressureFilter || (typeFilter && typeFilter !== 'all')) && (
                <span className="text-amber-600 dark:text-amber-400 text-[11px] bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 dark:border-amber-800">
                  (فقط اقلام دارای شرایط فیلتر در متراژ و جدول لحاظ شده‌اند)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPrintModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ گزارش فیلترشده (A4)</span>
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

      {/* Printable Report Modal */}
      {showPrintModal && (
        <DeliveryFilterPrintModal
          filteredResults={filteredResults}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};

const DeliveryFilterPrintModal: React.FC<DeliveryFilterPrintModalProps> = ({
  filteredResults,
  isOpen,
  onClose,
}) => {
  const [isExportingImage, setIsExportingImage] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportImage = async () => {
    setIsExportingImage(true);
    const success = await exportElementAsPng(
      'printable-filter-report',
      `گزارش_تحویل_کالا_و_رسیدها_${new Date().toISOString().slice(0, 10)}`
    );
    setIsExportingImage(false);
    if (!success) {
      alert('خطا در ذخیره تصویر گزارش تحویل بار.');
    }
  };

  const totalMeters = filteredResults.reduce(
    (s, r) => (r.delivery.status === 'cancelled' ? s : s + r.matchingTotalMeters),
    0
  );

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-y-auto print-modal-container print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-4 max-h-[94vh] flex flex-col print-modal-card print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:w-full print:max-h-none print:overflow-visible">
        {/* Controls (Hidden in Print) */}
        <PrintModalControlBar
          title="پیش‌نمایش چاپ گزارش تجمیعی حواله‌ها و رسیدهای تحویل بار"
          badge={`${toPersianDigits(filteredResults.length)} ردیف`}
          isExportingImage={isExportingImage}
          onExportImage={handleExportImage}
          onPrint={handlePrint}
          onClose={onClose}
          printButtonText="ارسال به چاپگر (A4)"
        />

        {/* Printable Report Sheet (Interactive Auto-fit and Zoomable on Mobile & Desktop) */}
        <ZoomablePrintContainer elementId="printable-filter-report">
          <div
            id="printable-filter-report"
            className="w-[800px] min-w-[800px] md:w-full md:min-w-0 mx-auto border border-slate-300 rounded-lg p-4 sm:p-6 bg-white text-slate-900 text-xs font-sans space-y-4 text-center print:w-full print:min-w-0"
          >
            <PrintHeader
              title="گزارش تجمیعی حواله‌ها و رسیدهای تحویل بار"
              docNumber={toPersianDigits(filteredResults.length)}
              docNumberLabel="تعداد اسناد:"
            />

            {/* Table - ALL CENTERED per user specification */}
            <table className="w-full text-center border-collapse border border-slate-400 text-[10.5px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800 text-center">
                  <th className="p-1.5 border-l border-slate-400 w-8 text-center">ردیف</th>
                  <th className="p-1.5 border-l border-slate-400 w-22 text-center">شماره حواله</th>
                  <th className="p-1.5 border-l border-slate-400 w-20 text-center">تاریخ تحویل</th>
                  <th className="p-1.5 border-l border-slate-400 w-36 text-center">نام خریدار / مشتری</th>
                  <th className="p-1.5 border-l border-slate-400 text-center">شرح، مشخصات و متراژ اقلام تحویلی</th>
                  <th className="p-1.5 border-l border-slate-400 w-24 text-center">شماره فاکتورها</th>
                  <th className="p-1.5 border-l border-slate-400 w-32 text-center">راننده و خودرو</th>
                  <th className="p-1.5 border-l border-slate-400 w-20 text-center">مجموع متراژ</th>
                  <th className="p-1.5 w-14 text-center">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-center">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      هیچ رسیدی با مشخصات فیلتر شده یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r, idx) => {
                    const del = r.delivery;
                    const invNumbers = Array.from(
                      new Set(r.matchingItems.map((i) => i.invoice_number || ''))
                    ).join('، ');

                    return (
                      <tr key={del.id} className="hover:bg-slate-50 text-center">
                        <td className="p-1.5 border-l border-slate-300 font-bold text-center">
                          {toPersianDigits(idx + 1)}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 font-mono font-bold text-center">
                          {del.delivery_number}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 font-mono text-center">
                          {formatJalaliDate(del.delivery_date)}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 font-bold text-center">
                          {del.customer_name}
                        </td>
                        {/* Compact Single-Line Item Description Format */}
                        <td className="p-1.5 border-l border-slate-300 text-center text-[10px]">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {r.matchingItems.map((item, iIdx) => (
                              <span
                                key={item.id || iIdx}
                                className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-medium whitespace-nowrap"
                              >
                                {formatCompactItemSummary(item.quantity_meters, item)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-1.5 border-l border-slate-300 font-mono text-[10px] text-center">
                          {invNumbers || '—'}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-[10px] text-center">
                          <div>{del.driver_name || '—'}</div>
                          {del.vehicle_plate && (
                            <div className="text-slate-500 font-mono">{del.vehicle_plate}</div>
                          )}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 font-black font-mono text-center text-blue-950">
                          {formatNumber(r.matchingTotalMeters)} متر
                        </td>
                        <td className="p-1.5 text-center">
                          {del.status === 'cancelled' ? (
                            <span className="text-rose-600 font-bold text-[10px]">لغو شده</span>
                          ) : (
                            <span className="text-emerald-700 font-bold text-[10px]">معتبر</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Summary Box */}
            <div className="border border-slate-400 rounded-lg p-3 bg-slate-50 flex items-center justify-between text-xs font-bold">
              <div>
                <span>تعداد کل حواله‌های تحویل: </span>
                <span className="font-mono text-blue-900">{toPersianDigits(filteredResults.length)} فقره</span>
              </div>
              <div>
                <span>مجموع کل متراژ تحویل داده شده: </span>
                <span className="font-mono text-emerald-800 text-sm">{formatNumber(totalMeters)} متر</span>
              </div>
            </div>

            {/* Signature Box */}
            <div className="pt-4 grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-700">
              <div className="text-center">
                <span>مسئول انبار و بارگیری</span>
                <div className="text-slate-300 mt-6">.......................</div>
              </div>
              <div className="text-center">
                <span>مسئول ترابری و لجستیک</span>
                <div className="text-slate-300 mt-6">.......................</div>
              </div>
              <div className="text-center">
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
