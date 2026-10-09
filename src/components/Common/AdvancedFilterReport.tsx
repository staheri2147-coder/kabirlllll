import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { exportToExcel } from '../../utils/exportExcel';
import { exportElementAsPng } from '../../utils/exportImage';
import { formatCurrency, formatJalaliDate, formatNumber, toPersianDigits } from '../../utils/jalali';
import { formatCompactItemSummary } from '../../utils/formatItemSummary';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { PrintHeader } from '../Print/PrintHeader';
import { PrintModalControlBar } from '../Print/PrintModalControlBar';
import { ZoomablePrintContainer } from '../Print/ZoomablePrintContainer';
import {
  Filter,
  Download,
  Printer,
  Image as ImageIcon,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Layers,
  Loader2,
  Calendar,
  User,
  Activity,
  SlidersHorizontal,
  Search,
  X,
} from 'lucide-react';

export interface FilterOptions {
  customerName: string;
  startDate: string;
  endDate: string;
  size: string;
  pressure: string;
  type: string;
  status: string;
  minAmount: string;
  maxAmount: string;
}

export interface ReportItem {
  id: string;
  number: string;
  date: string;
  customerName: string;
  customerCode?: string;
  status: string;
  statusLabel: string;
  itemsSummary: string;
  itemsCount: number;
  totalMeters: number;
  finalTotal: number;
  details: {
    productName: string;
    size?: string;
    pressure?: string;
    type?: string;
    meters: number;
    deliveredMeters?: number;
    remainingMeters?: number;
    unitPrice: number;
    totalPrice: number;
  }[];
}

interface AdvancedFilterReportProps {
  title: string;
  reportType: 'orders' | 'invoices';
  allItems: ReportItem[];
  availableSizes?: string[];
  availablePressures?: string[];
  availableTypes?: string[];
  statusOptions: { value: string; label: string }[];
  onFilteredItemsChange: (items: ReportItem[]) => void;
}

export const AdvancedFilterReport: React.FC<AdvancedFilterReportProps> = ({
  title,
  reportType,
  allItems,
  statusOptions,
  onFilteredItemsChange,
}) => {
  // Collapsed by default as requested
  const [isOpen, setIsOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [showPrintReportModal, setShowPrintReportModal] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);

  // Time constraint is off/empty by default
  const initialFilters: FilterOptions = {
    customerName: '',
    startDate: '',
    endDate: '',
    size: '',
    pressure: '',
    type: '',
    status: 'all',
    minAmount: '',
    maxAmount: '',
  };

  const [filters, setFilters] = useState<FilterOptions>(initialFilters);

  // Apply filters + quick search
  const filteredItems = React.useMemo(() => {
    const isItemFilterActive = Boolean(filters.size.trim() || filters.pressure.trim() || filters.type);

    const results: ReportItem[] = [];

    for (const originalItem of allItems) {
      // 1. Quick Search Box (Search across customer name, code, document number, item summary, status)
      if (quickSearch.trim()) {
        const q = quickSearch.trim().toLowerCase();
        const matchSearch =
          originalItem.customerName.toLowerCase().includes(q) ||
          (originalItem.customerCode && originalItem.customerCode.toLowerCase().includes(q)) ||
          originalItem.number.toLowerCase().includes(q) ||
          originalItem.itemsSummary.toLowerCase().includes(q) ||
          originalItem.statusLabel.toLowerCase().includes(q);
        if (!matchSearch) continue;
      }

      // 2. Customer Filter
      if (filters.customerName.trim()) {
        const q = filters.customerName.trim().toLowerCase();
        const matchCust =
          originalItem.customerName.toLowerCase().includes(q) ||
          (originalItem.customerCode && originalItem.customerCode.toLowerCase().includes(q));
        if (!matchCust) continue;
      }

      // 3. Date range (Off by default, active only when filled)
      if (filters.startDate && originalItem.date < filters.startDate) continue;
      if (filters.endDate && originalItem.date > filters.endDate) continue;

      // 4. Status
      if (filters.status !== 'all' && originalItem.status !== filters.status) continue;

      // 5. Multi-attribute Item-Level Filter (AND condition on each line item)
      let matchingDetails = originalItem.details;
      if (isItemFilterActive) {
        matchingDetails = originalItem.details.filter((d) => {
          // Size filter check
          if (filters.size.trim()) {
            const sQuery = filters.size.trim().toLowerCase();
            if (!d.size || !d.size.toLowerCase().includes(sQuery)) return false;
          }

          // Pressure filter check
          if (filters.pressure.trim()) {
            const pQuery = filters.pressure.trim().toLowerCase();
            if (!d.pressure || !d.pressure.toLowerCase().includes(pQuery)) return false;
          }

          // Type filter check
          if (filters.type) {
            if (filters.type === 'none') {
              if (d.type && d.type.trim() !== '') return false;
            } else {
              const tQuery = filters.type.toLowerCase().replace(/\s+/g, '');
              if (!d.type || !d.type.toLowerCase().replace(/\s+/g, '').includes(tQuery)) return false;
            }
          }

          return true;
        });

        // If no line item inside this document met ALL active item criteria, exclude the entire document
        if (matchingDetails.length === 0) continue;
      }

      // Compute matching totals
      let calculatedMeters: number;
      let calculatedTotal: number;
      let calculatedSummary: string;

      if (isItemFilterActive) {
        calculatedMeters = matchingDetails.reduce((acc, d) => acc + (d.meters || 0), 0);
        calculatedTotal = matchingDetails.reduce(
          (acc, d) => acc + (d.totalPrice || (d.meters * d.unitPrice) || 0),
          0
        );
        calculatedSummary = matchingDetails
          .map((d) =>
            formatCompactItemSummary(d.meters, {
              size: d.size,
              pressure: d.pressure,
              type: d.type,
              product_name: d.productName,
            })
          )
          .join(' | ');
      } else {
        calculatedMeters = originalItem.totalMeters;
        calculatedTotal = originalItem.finalTotal;
        calculatedSummary = originalItem.itemsSummary;
      }

      // 6. Amount range filter (calculated based on matching items)
      const minAmt = parseFloat(filters.minAmount);
      if (!isNaN(minAmt) && calculatedTotal < minAmt) continue;

      const maxAmt = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmt) && calculatedTotal > maxAmt) continue;

      results.push({
        ...originalItem,
        details: matchingDetails,
        itemsCount: matchingDetails.length,
        totalMeters: calculatedMeters,
        finalTotal: calculatedTotal,
        itemsSummary: calculatedSummary,
      });
    }

    return results;
  }, [allItems, quickSearch, filters]);

  // Notify parent of filtered items
  React.useEffect(() => {
    onFilteredItemsChange(filteredItems);
  }, [filteredItems, onFilteredItemsChange]);

  // Aggregate Totals
  const totalCount = filteredItems.length;
  const totalMetersSum = filteredItems.reduce((acc, curr) => acc + curr.totalMeters, 0);
  const totalAmountSum = filteredItems.reduce((acc, curr) => acc + curr.finalTotal, 0);

  // Active filter labels for description
  const activeFilterDescriptions: string[] = [];
  if (quickSearch.trim()) activeFilterDescriptions.push(`جستجو: "${quickSearch.trim()}"`);
  if (filters.customerName) activeFilterDescriptions.push(`مشتری: ${filters.customerName}`);
  if (filters.startDate) activeFilterDescriptions.push(`از تاریخ: ${formatJalaliDate(filters.startDate)}`);
  if (filters.endDate) activeFilterDescriptions.push(`تا تاریخ: ${formatJalaliDate(filters.endDate)}`);
  if (filters.size) activeFilterDescriptions.push(`سایز: ${filters.size}`);
  if (filters.pressure) activeFilterDescriptions.push(`فشار: ${filters.pressure}`);
  if (filters.type) {
    const typeLabel =
      filters.type === 'none'
        ? 'بدون نوع (خالی)'
        : filters.type === 'PE100'
        ? 'PE100'
        : filters.type === 'PE80'
        ? 'PE80'
        : filters.type;
    activeFilterDescriptions.push(`نوع: ${typeLabel}`);
  }
  if (filters.status !== 'all') {
    const stObj = statusOptions.find((s) => s.value === filters.status);
    if (stObj) activeFilterDescriptions.push(`وضعیت: ${stObj.label}`);
  }
  if (filters.minAmount) activeFilterDescriptions.push(`حداقل مبلغ: ${formatCurrency(Number(filters.minAmount), false)} ریال`);
  if (filters.maxAmount) activeFilterDescriptions.push(`حداکثر مبلغ: ${formatCurrency(Number(filters.maxAmount), false)} ریال`);

  const hasAdvancedFilters =
    Boolean(filters.customerName) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    Boolean(filters.size) ||
    Boolean(filters.pressure) ||
    Boolean(filters.type) ||
    filters.status !== 'all' ||
    Boolean(filters.minAmount) ||
    Boolean(filters.maxAmount);

  const hasAnyFilter = hasAdvancedFilters || Boolean(quickSearch.trim());

  const handleReset = () => {
    setQuickSearch('');
    setFilters(initialFilters);
  };

  // Export Excel with Filters & Totals
  const handleExportExcel = () => {
    const excelRows = filteredItems.map((item, index) => ({
      ردیف: index + 1,
      شماره: item.number,
      تاریخ: formatJalaliDate(item.date),
      نام_مشتری: item.customerName,
      کد_مشتری: item.customerCode || '—',
      وضعیت: item.statusLabel,
      شرح_و_مشخصات_اقلام: item.itemsSummary,
      مبلغ_کل_ریال: item.finalTotal,
    }));

    // Add Summary row at bottom
    excelRows.push({
      ردیف: 'مجموع کل',
      شماره: `${toPersianDigits(totalCount)} فقره`,
      تاریخ: '—',
      نام_مشتری: '—',
      کد_مشتری: '—',
      وضعیت: '—',
      شرح_و_مشخصات_اقلام: hasAnyFilter
        ? `فیلترهای اعمال‌شده: ${activeFilterDescriptions.join(' | ')} (مجموع متراژ: ${formatNumber(totalMetersSum)} متر)`
        : `مجموع متراژ: ${formatNumber(totalMetersSum)} متر`,
      مبلغ_کل_ریال: totalAmountSum,
    } as any);

    exportToExcel({
      fileName: `گزارش_${reportType === 'invoices' ? 'فاکتورها' : 'سفارشات'}_${Date.now()}`,
      sheetName: 'گزارش فیلترشده',
      data: excelRows,
    });
  };

  const handleExportReportImage = async () => {
    setIsExportingImage(true);
    const success = await exportElementAsPng(
      'printable-filter-report',
      `گزارش_فیلترشده_${reportType === 'invoices' ? 'فاکتورها' : 'سفارشات'}`
    );
    setIsExportingImage(false);
    if (!success) {
      alert('خطا در ایجاد تصویر گزارش.');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-visible relative z-10 transition">
      {/* Top Search Bar & Controls */}
      <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Quick Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو بر اساس نام یا کد مشتری، شماره سند، مشخصات کالا..."
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            className="w-full pr-10 pl-9 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 text-xs sm:text-sm font-medium transition placeholder:text-slate-400 shadow-2xs"
          />
          {quickSearch && (
            <button
              type="button"
              onClick={() => setQuickSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Buttons: Filter Toggle, Excel, Print */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer border ${
              isOpen || hasAdvancedFilters
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            <span>فیلترها</span>
            {hasAdvancedFilters && (
              <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-bold text-[10px]">
                {toPersianDigits(
                  [
                    filters.customerName,
                    filters.startDate,
                    filters.endDate,
                    filters.size,
                    filters.pressure,
                    filters.type,
                    filters.status !== 'all' ? filters.status : '',
                    filters.minAmount,
                    filters.maxAmount,
                  ].filter(Boolean).length
                )}
              </span>
            )}
            {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
            title="دریافت خروجی فایل اکسل گزارش"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خروجی</span>
            <span>اکسل</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPrintReportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition cursor-pointer"
            title="مشاهده، چاپ و PDF گزارش"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>چاپ / PDF</span>
          </button>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-medium transition cursor-pointer"
              title="پاکسازی همه فیلترها و جستجو"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">حذف فیلترها</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filter Parameters Panel */}
      {isOpen && (
        <div className="p-4 sm:p-5 space-y-4 bg-white border-b border-slate-100 animate-fade-in text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {/* 1. Customer Name or Code */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">نام یا کد مشتری</label>
              <input
                type="text"
                placeholder="نام خریدار یا کد مشتری..."
                value={filters.customerName}
                onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
              />
            </div>

            {/* 2. Date Range: Start Date */}
            <div>
              <JalaliDatePicker
                label="از تاریخ (پیش‌فرض بدون محدودیت)"
                value={filters.startDate}
                onChange={(val) => setFilters({ ...filters, startDate: val })}
              />
            </div>

            {/* 3. Date Range: End Date */}
            <div>
              <JalaliDatePicker
                label="تا تاریخ (پیش‌فرض بدون محدودیت)"
                value={filters.endDate}
                onChange={(val) => setFilters({ ...filters, endDate: val })}
              />
            </div>

            {/* 4. Status */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">وضعیت</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
              >
                {statusOptions.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 5. Size (Manual Text Input by user) */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">سایز (ورود دستی کاربر)</label>
              <input
                type="text"
                placeholder="مثلاً: ۱۶، ۲۰، ۳۲، ۱۱۰..."
                value={filters.size}
                onChange={(e) => setFilters({ ...filters, size: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
              />
            </div>

            {/* 6. Pressure (Manual Text Input by user) */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">فشار کاری (ورود دستی کاربر)</label>
              <input
                type="text"
                placeholder="مثلاً: ۴، ۶، ۱۰، ۱۶..."
                value={filters.pressure}
                onChange={(e) => setFilters({ ...filters, pressure: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
              />
            </div>

            {/* 7. Type (Dropdown: all, empty/none, PE100, PE80) */}
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">نوع مواد اولیه</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-medium"
              >
                <option value="">همه موارد</option>
                <option value="none">بدون نوع (خالی)</option>
                <option value="PE100">PE 100</option>
                <option value="PE80">PE 80</option>
              </select>
            </div>

            {/* 8. Min & Max Amount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">حداقل مبلغ (ریال)</label>
                <input
                  type="number"
                  placeholder="از مبلغ..."
                  value={filters.minAmount}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-mono text-left text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">حداکثر مبلغ (ریال)</label>
                <input
                  type="number"
                  placeholder="تا مبلغ..."
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 font-mono text-left text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Metrics Bar of Filtered Data - Only shown when filters or search are active */}
      {hasAnyFilter && (
        <div className="bg-slate-50/60 p-3 sm:px-5 flex flex-wrap items-center justify-between gap-4 text-xs animate-fade-in border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">تعداد موارد مشمول:</span>
              <span className="font-black text-slate-900 font-mono text-sm">
                {toPersianDigits(totalCount)}
              </span>
              <span className="text-slate-500 text-[11px]">مورد</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">مجموع متراژ مشمول:</span>
              <span className="font-black text-blue-700 font-mono text-sm">
                {formatNumber(totalMetersSum)}
              </span>
              <span className="text-slate-500 text-[11px]">متر</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">مجموع مبالغ نهایی:</span>
              <span className="font-black text-emerald-700 font-mono text-sm">
                {formatCurrency(totalAmountSum, false)}
              </span>
              <span className="text-slate-500 text-[11px]">ریال</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 truncate max-w-md">
            <span className="font-bold text-slate-700 ml-1">فیلترهای فعال:</span>
            <span>{activeFilterDescriptions.join(' • ')}</span>
          </div>
        </div>
      )}

      {/* PRINT / PDF / IMAGE REPORT MODAL - Rendered with Portal to prevent print styling issues */}
      {showPrintReportModal &&
        createPortal(
          <div className="print-modal-container fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-hidden print:p-0 print:static print:bg-white print:overflow-visible">
            <div className="print-modal-card bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] relative overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:w-full print:max-h-none print:overflow-visible print:border-0">
              {/* Responsive Modal Controls */}
              <div className="p-3 sm:px-6 bg-slate-50/90 shrink-0 no-print z-10">
                <PrintModalControlBar
                  title={`گزارش جامع فیلترشده ${title}`}
                  badge="A4 رسمی"
                  isExportingImage={isExportingImage}
                  onExportImage={handleExportReportImage}
                  onPrint={handlePrintReport}
                  onClose={() => setShowPrintReportModal(false)}
                  printButtonText="چاپ گزارش (Print / PDF)"
                />
              </div>

        {/* PRINTABLE REPORT DOCUMENT (Interactive Auto-fit and Zoomable on Mobile & Desktop) */}
        <ZoomablePrintContainer elementId="printable-filter-report">
          <div
            id="printable-filter-report"
            className="w-[800px] min-w-[800px] md:w-full md:min-w-0 max-w-[210mm] min-h-[297mm] p-4 sm:p-8 bg-white border border-slate-300 rounded-lg print:border-none print:p-0 print:m-0 print:w-full print:min-w-0 print:max-w-full print:min-h-0 text-slate-900 text-xs font-sans shadow-xs print:shadow-none"
          >
            {/* Unified Header (Logo & Company right, Title center, Date left) */}
                  <PrintHeader
                    title={`گزارش جامع ${reportType === 'invoices' ? 'فاکتورهای فروش' : 'سفارشات مشتریان'}`}
                    date={new Date()}
                    dateLabel="تاریخ تهیه:"
                  />

                  {/* Active Filters Mention in Report */}
                  <div className="bg-slate-50 border border-slate-300 rounded-lg p-2.5 mb-4 text-[11px]">
                    <div className="font-bold text-slate-800 mb-1">فیلترها و معیارهای اعمال‌شده در این گزارش:</div>
                    <div className="text-slate-700 leading-relaxed">
                      {hasAnyFilter ? (
                        <div className="flex flex-wrap gap-2">
                          {activeFilterDescriptions.map((f, i) => (
                            <span key={i} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold">
                              {f}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span>کلیه اسناد و داده‌ها بدون محدودیت فیلتر درج گردیده‌اند.</span>
                      )}
                    </div>
                  </div>

                  {/* Report Table - Fully centered columns and cells */}
                  <div className="border border-slate-400 rounded-lg overflow-hidden mb-4">
                    <table className="w-full text-center text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-400">
                          <th className="py-2 px-1 border-l border-slate-300 w-10 text-center">ردیف</th>
                          <th className="py-2 px-1.5 border-l border-slate-300 w-20 text-center whitespace-nowrap">شماره سند</th>
                          <th className="py-2 px-1.5 border-l border-slate-300 w-20 text-center whitespace-nowrap">تاریخ</th>
                          <th className="py-2 px-2 border-l border-slate-300 w-44 text-center">نام مشتری</th>
                          <th className="py-2 px-1.5 border-l border-slate-300 w-20 text-center whitespace-nowrap">وضعیت</th>
                          <th className="py-2 px-2 border-l border-slate-300 text-center">شرح و مشخصات اقلام</th>
                          <th className="py-2 px-2 text-center w-32 whitespace-nowrap">مبلغ کل (ریال)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredItems.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-50/50">
                            <td className="py-2 px-1 border-l border-slate-200 font-bold text-center">{toPersianDigits(idx + 1)}</td>
                            <td className="py-2 px-1.5 border-l border-slate-200 font-mono font-bold text-slate-800 text-center whitespace-nowrap">
                              {item.number}
                            </td>
                            <td className="py-2 px-1.5 border-l border-slate-200 text-center whitespace-nowrap">{formatJalaliDate(item.date)}</td>
                            <td className="py-2 px-2 border-l border-slate-200 font-bold text-center text-slate-900">
                              <div>{item.customerName}</div>
                            </td>
                            <td className="py-2 px-1.5 border-l border-slate-200 font-medium text-center whitespace-nowrap">{item.statusLabel}</td>
                            <td className="py-2 px-2 border-l border-slate-200 text-center text-slate-800">
                              {/* Centered vertical list of items */}
                              <div className="flex flex-col items-center justify-center gap-1 py-0.5">
                                {item.details && item.details.length > 0 ? (
                                  item.details.map((d, dIdx) => (
                                    <div
                                      key={dIdx}
                                      className="inline-flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded whitespace-nowrap leading-tight text-center max-w-full"
                                    >
                                      <span className="whitespace-nowrap">
                                        {formatCompactItemSummary(d.meters, {
                                          size: d.size,
                                          pressure: d.pressure,
                                          type: d.type,
                                          product_name: d.productName,
                                        })}
                                      </span>
                                      {reportType === 'invoices' && typeof d.remainingMeters === 'number' && (
                                        <span
                                          className={`mr-1 px-1.5 py-0.2 rounded text-[9.5px] font-bold whitespace-nowrap ${
                                            d.remainingMeters === 0
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : d.remainingMeters < d.meters
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-rose-100 text-rose-800'
                                          }`}
                                        >
                                          (مانده: {formatNumber(d.remainingMeters)} متر)
                                        </span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-slate-600">{item.itemsSummary || '—'}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-2 px-2 font-black text-center text-slate-900 whitespace-nowrap">
                              {formatCurrency(item.finalTotal, false)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Final Summary Box (Only appears once at the end of the last page) */}
                  <div className="bg-slate-100 border border-slate-400 rounded-lg p-3 flex flex-wrap items-center justify-between gap-4 font-black text-slate-900 text-xs">
                    <div>جمع کل گزارش:</div>
                    <div className="flex items-center gap-6">
                      <span className="text-blue-900 font-bold text-xs">
                        مجموع کل متراژ اقلام: <span className="font-mono">{formatNumber(totalMetersSum)}</span> متر
                      </span>
                      <span className="text-emerald-900 font-black text-xs whitespace-nowrap">
                        {formatCurrency(totalAmountSum, false)} ریال
                      </span>
                    </div>
                  </div>
                </div>
              </ZoomablePrintContainer>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

