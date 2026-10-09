import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { exportElementAsPng } from '../../utils/exportImage';
import { StorageService } from '../../services/storageService';
import {
  Invoice,
  Order,
  DeliveryNote,
  ReturnDoc,
  Payment,
  CustomerAccountSummary,
  CustomerTransaction,
} from '../../types';
import { formatCurrency, formatJalaliDate, formatNumber, toPersianDigits } from '../../utils/jalali';
import { formatCompactItemSummary } from '../../utils/formatItemSummary';
import { PrintHeader } from './PrintHeader';
import { PrintFooter } from './PrintFooter';
import { PrintModalControlBar } from './PrintModalControlBar';
import { ZoomablePrintContainer } from './ZoomablePrintContainer';
import { Printer, X, Image as ImageIcon, Loader2 } from 'lucide-react';

export type PrintDocType =
  | 'invoice'
  | 'proforma'
  | 'delivery'
  | 'return'
  | 'payment'
  | 'ledger'
  | 'expense';

interface DocumentPrintModalProps {
  type: PrintDocType;
  data: any;
  onClose: () => void;
}

export const DocumentPrintModal: React.FC<DocumentPrintModalProps> = ({
  type,
  data,
  onClose,
}) => {
  const [company, setCompany] = useState(() => StorageService.getCompanySettings());
  const [customers, setCustomers] = useState(() => StorageService.getCustomers());

  useEffect(() => {
    const handleSync = () => {
      setCompany(StorageService.getCompanySettings());
      setCustomers(StorageService.getCustomers());
    };
    window.addEventListener('polyethylene-db-synced', handleSync);
    return () => window.removeEventListener('polyethylene-db-synced', handleSync);
  }, []);

  // Resolve customer info with storage fallback
  const matchedCustomer = customers.find(
    (c) =>
      (data.customer_id && c.id === data.customer_id) ||
      (data.customer_code && c.code === data.customer_code) ||
      (data.customer_name &&
        (c.name === data.customer_name ||
          c.name.includes(data.customer_name) ||
          data.customer_name.includes(c.name)))
  );

  const customerName = data.customer_name || matchedCustomer?.name || '—';
  const customerNationalId =
    data.customer_national_id ||
    matchedCustomer?.national_id ||
    data.national_id ||
    '—';
  const customerPhone =
    data.customer_phone ||
    matchedCustomer?.phone ||
    data.phone ||
    '—';
  const customerAddress =
    data.shipping_address ||
    data.destination_address ||
    data.customer_address ||
    matchedCustomer?.address ||
    data.address ||
    '—';

  const companyName = company.business_name || 'شرکت لوله پلی‌اتیلن';
  const companyNationalId = company.national_id || '—';
  const companyPhone = company.phone || '—';
  const companyAddress = company.address || '—';

  const [isExportingImage, setIsExportingImage] = useState(false);
  const [stampEnabled, setStampEnabled] = useState<boolean>(
    Boolean(data?.stamp_signature_enabled)
  );

  const handlePrint = () => {
    window.print();
  };

  const handleExportImage = async () => {
    const docNum =
      data.invoice_number ||
      data.order_number ||
      data.delivery_number ||
      data.return_number ||
      data.reference_number ||
      'doc';
    const typeLabel =
      type === 'invoice'
        ? 'فاکتور'
        : type === 'proforma'
        ? 'پیش_فاکتور'
        : type === 'delivery'
        ? 'حواله_تحویل'
        : type === 'return'
        ? 'برگشت_از_فروش'
        : type === 'payment'
        ? 'رسید_دریافت'
        : 'صورتحساب';

    setIsExportingImage(true);
    const success = await exportElementAsPng('printable-document', `${typeLabel}_${docNum}`);
    setIsExportingImage(false);
    if (!success) {
      alert('خطا در ایجاد خروجی عکس سند.');
    }
  };

  useEffect(() => {
    if (data?.autoDownloadImage) {
      const timer = setTimeout(() => {
        handleExportImage();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [data?.autoDownloadImage]);

  return createPortal(
    <div className="print-modal-container fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-hidden print:p-0 print:static print:bg-white print:overflow-visible">
      <div className="print-modal-card bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-300 dark:border-slate-700 flex flex-col max-h-[95vh] h-auto relative overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:w-full print:max-h-none print:h-auto print:overflow-visible">
        {/* Responsive Modal Controls Bar (Always pinned at top of modal inside viewport, never scrolling away) */}
        <div className="p-3 sm:px-5 sm:py-3.5 bg-slate-50 border-b border-slate-200 shrink-0 no-print z-20">
          <PrintModalControlBar
            title={
              type === 'invoice'
                ? 'پیش‌نمایش چاپ فاکتور رسمی فروش'
                : type === 'proforma'
                ? 'پیش‌نمایش چاپ پیش‌فاکتور رسمی'
                : type === 'delivery'
                ? 'پیش‌نمایش چاپ حواله تحویل بار'
                : type === 'return'
                ? 'پیش‌نمایش چاپ برگه مرجوعی کالا'
                : type === 'payment'
                ? 'پیش‌نمایش رسید دریافت وجه'
                : type === 'expense'
                ? 'پیش‌نمایش چاپ سند هزینه'
                : 'پیش‌نمایش صورتحساب مالی مشتری'
            }
            badge="A4 استاندارد"
            isExportingImage={isExportingImage}
            onExportImage={handleExportImage}
            onPrint={handlePrint}
            onClose={onClose}
            extraControls={
              company.stamp_signature_url ? (
                <label className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={stampEnabled}
                    onChange={(e) => setStampEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                  />
                  <span>درج مهر و امضای رسمی</span>
                </label>
              ) : undefined
            }
          />
        </div>

        {/* PRINTABLE DOCUMENT WRAPPER (Interactive Auto-fit and Zoomable on Mobile & Desktop) */}
        <ZoomablePrintContainer elementId="printable-document">
          {/* UNIFIED PRINT HEADER (Logo & Company on Right, Title in Center, Date & Doc Number on Left) */}
          <PrintHeader
            title={
              type === 'invoice'
                ? 'فاکتور فروش کالا'
                : type === 'proforma'
                ? 'پیش‌فاکتور فروش'
                : type === 'delivery'
                ? 'حواله خروج و رسید تحویل بار'
                : type === 'return'
                ? 'صورتجلسه برگشت از فروش کالا'
                : type === 'payment'
                ? 'رسید دریافت وجه / چک'
                : type === 'expense'
                ? 'سند پرداخت هزینه'
                : 'صورتحساب مشتری'
            }
            subtitle={company.brand_subtitle || 'تولید کننده انواع لوله های پلی اتیلن'}
            docNumber={
              data.invoice_number ||
              data.order_number ||
              data.delivery_number ||
              data.return_number ||
              data.reference_number ||
              data.code ||
              undefined
            }
            docNumberLabel={
              type === 'invoice'
                ? 'شماره فاکتور:'
                : type === 'proforma'
                ? 'شماره سفارش:'
                : type === 'delivery'
                ? 'شماره حواله:'
                : type === 'return'
                ? 'شماره سند:'
                : type === 'expense'
                ? 'کد سند هزینه:'
                : 'شماره پیگیری:'
            }
            date={
              data.invoice_date ||
              data.order_date ||
              data.delivery_date ||
              data.return_date ||
              data.payment_date ||
              data.expense_date ||
              new Date()
            }
            dateLabel={
              type === 'invoice'
                ? 'تاریخ فاکتور:'
                : type === 'proforma'
                ? 'تاریخ صدور:'
                : type === 'delivery'
                ? 'تاریخ تحویل:'
                : type === 'expense'
                ? 'تاریخ هزینه:'
                : 'تاریخ:'
            }
          />

          {/* SELLER & BUYER BOX (FOR INVOICE / PROFORMA / DELIVERY / RETURN / LEDGER) */}
          {['invoice', 'proforma', 'delivery', 'return', 'ledger'].includes(type) && (
            <div className="border border-slate-400 rounded-lg overflow-hidden mb-3 divide-y divide-slate-400 text-[11px]">
              {/* Buyer Box (Top) */}
              <div className="p-2.5 bg-slate-50/90 space-y-1.5">
                {/* Line 1: Name on right, National ID starting at 50% center */}
                <div className="grid grid-cols-2 gap-x-4 items-center">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-600 font-bold whitespace-nowrap">نام خریدار:</span>
                    <span className="font-bold text-slate-900 truncate">{customerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-bold whitespace-nowrap">شماره / شناسه ملی:</span>
                    <span className="font-bold text-slate-800">
                      {customerNationalId !== '—' ? toPersianDigits(customerNationalId) : '—'}
                    </span>
                  </div>
                </div>
                {/* Line 2: Phone on right, Address starting at 50% center */}
                <div className="grid grid-cols-2 gap-x-4 items-center">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-600 font-bold whitespace-nowrap">تلفن:</span>
                    <span className="text-slate-800 truncate">
                      {customerPhone !== '—' ? toPersianDigits(customerPhone) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-600 font-bold whitespace-nowrap">آدرس:</span>
                    <span className="text-slate-800 truncate">{customerAddress}</span>
                  </div>
                </div>
              </div>

              {/* Seller Box (Bottom) */}
              <div className="p-2.5 bg-slate-100/90 space-y-1.5">
                {/* Line 1: Seller Name on right, National ID starting at 50% center */}
                <div className="grid grid-cols-2 gap-x-4 items-center">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-600 font-bold whitespace-nowrap">نام فروشنده:</span>
                    <span className="font-bold text-slate-900 truncate">{companyName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-bold whitespace-nowrap">شناسه ملی:</span>
                    <span className="font-bold text-slate-800">
                      {companyNationalId !== '—' ? toPersianDigits(companyNationalId) : '—'}
                    </span>
                  </div>
                </div>
                {/* Line 2: Phone on right, Address starting at 50% center */}
                <div className="grid grid-cols-2 gap-x-4 items-center">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-600 font-bold whitespace-nowrap">تلفن:</span>
                    <span className="text-slate-800 truncate">
                      {companyPhone !== '—' ? toPersianDigits(companyPhone) : '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-600 font-bold whitespace-nowrap">آدرس:</span>
                    <span className="text-slate-800 truncate">{companyAddress}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {type === 'expense' && (
            <div className="space-y-4 text-xs my-4">
              <div className="border border-slate-400 rounded-lg overflow-hidden p-4 bg-slate-50/80 space-y-3.5">
                <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3">
                  <div>
                    <span className="text-slate-600 font-bold">عنوان هزینه: </span>
                    <span className="font-black text-slate-900 text-sm">{data.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold">کد سند: </span>
                    <span className="font-mono font-bold text-slate-800">{toPersianDigits(data.code)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3">
                  <div>
                    <span className="text-slate-600 font-bold">مبلغ پرداختی: </span>
                    <span className="font-black text-rose-700 text-sm">{formatCurrency(data.amount)} ریال</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold">تاریخ سند: </span>
                    <span className="font-bold text-slate-800">{formatJalaliDate(data.expense_date)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-slate-300 pb-3">
                  <div>
                    <span className="text-slate-600 font-bold">طرف حساب / ذینفع: </span>
                    <span className="font-bold text-slate-800">{data.beneficiary || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-600 font-bold">روش پرداخت: </span>
                    <span className="font-bold text-slate-800">
                      {data.payment_method === 'cash' ? 'نقدی' : data.payment_method === 'pos' ? 'کارت‌خوان' : data.payment_method === 'transfer' ? 'انتقال بانکی / پایا' : 'چک'}
                    </span>
                  </div>
                </div>

                {data.reference_number && (
                  <div className="border-b border-slate-300 pb-3">
                    <span className="text-slate-600 font-bold">شماره پیگیری / فیش: </span>
                    <span className="font-mono font-bold text-slate-800">{toPersianDigits(data.reference_number)}</span>
                  </div>
                )}

                {data.description && (
                  <div>
                    <span className="text-slate-600 font-bold">شرح و توضیحات: </span>
                    <span className="text-slate-800">{data.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TABLE & FINANCIALS FOR PROFORMA & INVOICE (UNIFIED CLEAN LAYOUT) */}
          {['proforma', 'invoice'].includes(type) && (
            <div className="space-y-3">
              <table className="w-full text-center border-collapse border border-slate-400 text-[10.5px]">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    <th className="p-1.5 border-l border-slate-400 text-center w-10">ردیف</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">شرح کالا</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">سایز</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">فشار</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">نوع</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">مقدار (متر)</th>
                    <th className="p-1.5 border-l border-slate-400 text-center font-bold">مبلغ واحد (ریال)</th>
                    <th className="p-1.5 text-center font-bold">مبلغ کل (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {data.items?.map((item: any, idx: number) => {
                    const itemTotal =
                      item.total_price ||
                      item.final_price ||
                      item.subtotal ||
                      Number(item.quantity_meters || 0) * Number(item.unit_price || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold">{toPersianDigits(idx + 1)}</td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold">
                          {item.product_name || 'لوله پلی اتیلن'}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold">
                          {item.size ? toPersianDigits(item.size) : '—'}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold">
                          {item.pressure ? toPersianDigits(item.pressure) : '—'}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-mono">
                          {item.type || '—'}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold">
                          {formatNumber(item.quantity_meters)}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold">
                          {formatCurrency(item.unit_price, false)}
                        </td>
                        <td className="p-1.5 text-center font-bold">
                          {formatCurrency(itemTotal, false)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Summary Box */}
              <div className="flex justify-end">
                <div className="w-80 border border-slate-400 rounded-lg overflow-hidden text-[11px] divide-y divide-slate-300">
                  <div className="flex justify-between p-1.5 bg-slate-50">
                    <span className="text-slate-700 font-bold">جمع ناخالص:</span>
                    <span className="font-bold text-slate-900">
                      {formatCurrency(data.subtotal, false)} <span className="text-slate-700 font-bold mr-0.5">ریال</span>
                    </span>
                  </div>
                  {Boolean(
                    (data.discount_enabled && data.discount > 0) ||
                      data.discount > 0 ||
                      data.discount_amount > 0
                  ) && (
                    <div className="flex justify-between p-1.5 text-rose-700">
                      <span className="font-bold">تخفیف:</span>
                      <span className="font-bold">
                        -{formatCurrency(data.discount || data.discount_amount, false)} <span className="font-bold mr-0.5">ریال</span>
                      </span>
                    </div>
                  )}
                  {Boolean(
                    (data.tax_enabled && data.tax_amount > 0) ||
                      data.tax_amount > 0 ||
                      data.vat_amount > 0
                  ) && (
                    <div className="flex justify-between p-1.5 text-slate-700">
                      <span className="font-bold">مالیات بر ارزش افزوده (۱۰٪):</span>
                      <span className="font-bold text-slate-900">
                        +{formatCurrency(data.tax_amount || data.vat_amount, false)} <span className="text-slate-700 font-bold mr-0.5">ریال</span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between p-2 bg-slate-100 font-black text-xs">
                    <span className="text-slate-900">مبلغ قابل پرداخت:</span>
                    <span className="text-blue-700 font-bold text-sm">
                      {formatCurrency(data.final_total, false)} <span className="text-blue-900 font-bold mr-0.5">ریال</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Description / Terms Box if present (combines document-specific description with default company settings note below it) */}
              {(() => {
                const docSpecificDesc = data.description ? data.description.trim() : '';
                const defaultNote = type === 'proforma'
                  ? (company.default_order_notes_enabled && company.default_order_notes_text ? company.default_order_notes_text.trim() : '')
                  : (company.default_invoice_notes_enabled && (company.default_invoice_notes_text || company.default_invoice_notes) ? (company.default_invoice_notes_text || company.default_invoice_notes || '').trim() : '');
                
                if (!docSpecificDesc && !defaultNote) return null;

                return (
                  <div className="border border-slate-400 rounded-lg p-2.5 bg-slate-50/70 text-[10.5px] space-y-1">
                    <div className="font-bold text-slate-800 flex items-center justify-between">
                      <span>{type === 'invoice' ? 'توضیحات و شرایط فاکتور:' : 'توضیحات و شرایط پیش‌فاکتور:'}</span>
                    </div>
                    {docSpecificDesc && (
                      <div className="text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                        {docSpecificDesc}
                      </div>
                    )}
                    {defaultNote && (
                      <div className={`text-slate-600 leading-relaxed whitespace-pre-line text-[10px] ${docSpecificDesc ? 'pt-1.5 border-t border-dashed border-slate-300' : ''}`}>
                        {defaultNote}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Dual Signatures Section (Matching for both Proforma and Invoice) */}
              <div className="mt-8 pt-5 pb-4 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-[11px] font-bold text-slate-700">
                <div className="flex flex-col justify-between items-center min-h-[90px]">
                  <div>مهر و امضای فروشنده</div>
                  {stampEnabled && company.stamp_signature_url ? (
                    <div className="my-1 flex items-center justify-center relative pointer-events-none">
                      <img
                        src={company.stamp_signature_url}
                        alt="مهر و امضای رسمی شرکت"
                        className="h-20 sm:h-24 max-w-[180px] object-contain mix-blend-multiply opacity-95 transition"
                      />
                    </div>
                  ) : (
                    <div className="h-12 flex items-end justify-center">
                      <div className="text-slate-300 text-xs">....................................</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between items-center min-h-[90px]">
                  <div>امضای خریدار / تحویل‌گیرنده</div>
                  <div className="h-12 flex items-end justify-center">
                    <div className="text-slate-300 text-xs">....................................</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABLE FOR DELIVERY NOTE */}
          {type === 'delivery' && (
            <div className="space-y-3">
              <table className="w-full text-center border-collapse border border-slate-400 text-[10.5px]">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    <th className="p-1.5 border-l border-slate-400 text-center w-10">ردیف</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">نام کالا</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">سایز</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">فشار</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">نوع</th>
                    <th className="p-1.5 text-center font-bold">متراژ (متر)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {data.items?.map((item: any, idx: number) => {
                    const productName = item.product_name || 'لوله پلی اتیلن';
                    const size = item.size || item.pipe_size || '—';
                    const pressure = item.pressure || item.working_pressure || '—';
                    const typeValue = item.type || item.grade || '—';
                    const meters = Number(item.quantity_meters || 0);

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold">{toPersianDigits(idx + 1)}</td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold">
                          {productName}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-mono">
                          {size !== '—' ? toPersianDigits(size) : '—'}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-mono">
                          {pressure !== '—' ? toPersianDigits(pressure) : '—'}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-mono">{typeValue}</td>
                        <td className="p-1.5 text-center font-black text-blue-700">
                          {formatNumber(meters)} متر
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* کادر توضیحات (شامل مشخصات حامل و توضیحات بارگیری + یادداشت پیش‌فرض تنظیمات در زیر آن) */}
              {(() => {
                const deliverySpecificDesc = data.description ? data.description.trim() : '';
                const defaultDeliveryNote = company.default_delivery_notes_enabled && company.default_delivery_notes_text
                  ? company.default_delivery_notes_text.trim()
                  : '';
                
                return (
                  <div className="p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-[11px] space-y-1">
                    <div className="font-bold text-slate-800">توضیحات و شرایط تحویل بار:</div>
                    {deliverySpecificDesc ? (
                      <div className="text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                        {deliverySpecificDesc}
                      </div>
                    ) : (
                      !defaultDeliveryNote && (
                        <div className="text-slate-700 leading-relaxed font-medium">
                          بارگیری و تحویل اقلام فوق طبق سفارش و فاکتورهای مربوطه انجام گردید.
                        </div>
                      )
                    )}
                    {defaultDeliveryNote && (
                      <div className={`text-slate-600 leading-relaxed whitespace-pre-line text-[10px] ${deliverySpecificDesc ? 'pt-1.5 border-t border-dashed border-slate-300' : ''}`}>
                        {defaultDeliveryNote}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* کادر مشخصات راننده */}
              <div className="p-2.5 bg-slate-100/90 border border-slate-300 rounded-lg text-[11px] grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800">مشخصات راننده / حامل:</span>
                  <span className="text-slate-900 font-bold">{data.driver_name || '—'}</span>
                  {data.driver_phone && (
                    <span className="text-slate-600 font-mono text-[10.5px]">
                      (تلفن: {toPersianDigits(data.driver_phone)})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800">خودرو و شماره پلاک:</span>
                  <span className="text-slate-900 font-bold">
                    {data.vehicle_type ? `${data.vehicle_type} - ` : ''}
                    {data.vehicle_plate ? toPersianDigits(data.vehicle_plate) : '—'}
                  </span>
                </div>
              </div>

              {/* امضای تحویل‌دهنده و تحویل‌گیرنده در یک خط با فاصله مناسب */}
              <div className="pt-6 pb-6 px-8 flex items-center justify-between text-xs font-bold text-slate-800">
                <div className="flex flex-col justify-between items-center min-h-[85px] text-center w-52">
                  <div>تحویل‌دهنده (انبار / شرکت)</div>
                  {stampEnabled && company.stamp_signature_url ? (
                    <div className="my-1 flex items-center justify-center relative pointer-events-none">
                      <img
                        src={company.stamp_signature_url}
                        alt="مهر و امضای شرکت"
                        className="h-16 max-w-[150px] object-contain mix-blend-multiply opacity-95 transition"
                      />
                    </div>
                  ) : (
                    <div className="h-10 flex items-end justify-center">
                      <div className="text-slate-300">................................................</div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between items-center min-h-[85px] text-center w-52">
                  <div>تحویل‌گیرنده (راننده / خریدار)</div>
                  <div className="h-10 flex items-end justify-center">
                    <div className="text-slate-300">................................................</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TABLE FOR RETURN DOC */}
          {type === 'return' && (
            <div className="space-y-4">
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px]">
                <span className="font-bold">علت مرجوعی کالا: </span>
                <span>{data.reason}</span>
              </div>

              <table className="w-full text-center border-collapse border border-slate-400 text-[11px]">
                <thead>
                  <tr className="bg-slate-200 font-bold border-b border-slate-400">
                    <th className="p-2 border-l border-slate-400 text-center w-10">ردیف</th>
                    <th className="p-2 border-l border-slate-400 text-center">شرح کالای مرجوعی</th>
                    <th className="p-2 border-l border-slate-400 text-center">فاکتور مبدا</th>
                    <th className="p-2 border-l border-slate-400 text-center">متراژ مرجوعی</th>
                    <th className="p-2 text-center font-bold">مبلغ بستانکاری (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {data.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 border-l border-slate-300 text-center font-bold">{toPersianDigits(idx + 1)}</td>
                      <td className="p-2 border-l border-slate-300 text-center font-bold">{item.product_name}</td>
                      <td className="p-2 border-l border-slate-300 text-center font-mono">{item.invoice_number}</td>
                      <td className="p-2 border-l border-slate-300 text-center font-bold">
                        {formatNumber(item.quantity_meters)} متر
                      </td>
                      <td className="p-2 text-center font-black text-emerald-600">
                        {formatCurrency(item.total_price, false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg flex justify-between font-bold text-xs text-emerald-900">
                <span>مجموع بستانکاری ناشی از برگشت (کسر از بدهی مشتری):</span>
                <span className="font-black text-sm">{formatCurrency(data.total_amount, false)} ریال</span>
              </div>
            </div>
          )}

          {/* RECEIPT / PAYMENT */}
          {type === 'payment' && (
            <div className="space-y-4 max-w-xl mx-auto border border-slate-400 rounded-xl p-6 bg-slate-50">
              <div className="text-center font-bold text-slate-800 border-b border-slate-300 pb-2 text-sm">
                رسید رسمی دریافت وجه از مشتری
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">نام مشتری / پرداخت‌کننده:</span>
                  <span className="font-bold text-slate-900">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">تاریخ دریافت:</span>
                  <span className="font-bold">{formatJalaliDate(data.payment_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">روش دریافت:</span>
                  <span className="font-bold text-slate-800">{data.payment_method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">شماره پیگیری / فیش / چک:</span>
                  <span className="font-bold font-mono">{data.reference_number || data.cheque_number || '-'}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 items-center">
                  <span className="text-slate-700 font-bold">مبلغ دریافتی:</span>
                  <span className="font-black text-base text-emerald-700">
                    {formatCurrency(data.amount, false)} <span className="text-emerald-900 font-bold text-xs mr-0.5">ریال</span>
                  </span>
                </div>
                {data.description && (
                  <div className="border-t border-slate-200 pt-2 text-[11px] text-slate-600">
                    <span className="font-bold">بابت: </span>
                    <span>{data.description}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STATEMENT / LEDGER */}
          {type === 'ledger' && (
            <div className="space-y-3">
              <table className="w-full text-center border-collapse border border-slate-400 text-[10px]">
                <thead>
                  <tr className="bg-slate-200 font-bold border-b border-slate-400">
                    <th className="p-1.5 border-l border-slate-400 text-center w-8">ردیف</th>
                    <th className="p-1.5 border-l border-slate-400 text-center w-20">تاریخ</th>
                    <th className="p-1.5 border-l border-slate-400 text-center">شرح تراکنش</th>
                    <th className="p-1.5 border-l border-slate-400 text-center w-20">شماره سند</th>
                    <th className="p-1.5 border-l border-slate-400 text-center text-rose-700">بدهکار (ریال)</th>
                    <th className="p-1.5 border-l border-slate-400 text-center text-emerald-700">بستانکار (ریال)</th>
                    <th className="p-1.5 text-center">مانده (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {data.transactions?.map((tx: any, idx: number) => {
                    const txDate = tx.transaction_date || tx.date || tx.created_at;
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold">{toPersianDigits(idx + 1)}</td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-mono font-bold">{formatJalaliDate(txDate)}</td>
                        <td className="p-1.5 border-l border-slate-300 text-right pr-2 font-bold truncate max-w-[220px]">{tx.description}</td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-mono">{tx.reference_number || '-'}</td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold text-rose-700">
                          {tx.debit > 0 ? formatCurrency(tx.debit, false) : '-'}
                        </td>
                        <td className="p-1.5 border-l border-slate-300 text-center font-bold text-emerald-700">
                          {tx.credit > 0 ? formatCurrency(tx.credit, false) : '-'}
                        </td>
                        <td className="p-1.5 text-center font-bold">
                          {formatCurrency(Math.abs(tx.running_balance || 0), false)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Financial Balance Summary Box (Moved below the table per user request) */}
              <div className="border border-slate-400 rounded-lg p-3 bg-slate-50 flex items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-6 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium text-[10px]">مجموع بدهکار:</span>
                    <span className="text-rose-700 font-black text-xs font-mono">
                      {formatCurrency(data.summary?.total_debit || 0, false)} <span className="text-[10px] text-slate-500 font-normal">ریال</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium text-[10px]">مجموع بستانکار:</span>
                    <span className="text-emerald-700 font-black text-xs font-mono">
                      {formatCurrency(data.summary?.total_credit || 0, false)} <span className="text-[10px] text-slate-500 font-normal">ریال</span>
                    </span>
                  </div>
                </div>

                {/* Highly Prominent Running Balance Box */}
                <div className={`px-4 py-2 rounded-lg border-2 shadow-2xs text-center min-w-[220px] ${
                  Number(data.summary?.balance || 0) > 0
                    ? 'bg-rose-50 border-rose-500 text-rose-900'
                    : Number(data.summary?.balance || 0) < 0
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                    : 'bg-slate-100 border-slate-400 text-slate-800'
                }`}>
                  <div className="text-[10px] font-bold text-slate-600 mb-0.5">مانده تراز نهایی حساب</div>
                  <div className="text-sm font-black font-mono tracking-tight">
                    {formatCurrency(Math.abs(data.summary?.balance || 0), false)}{' '}
                    <span className="text-[11px] font-bold">ریال</span>
                    <span className="text-xs mr-1 font-black">
                      ({Number(data.summary?.balance || 0) > 0 ? 'بدهکار' : Number(data.summary?.balance || 0) < 0 ? 'بستانکار' : 'تسویه'})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SIGNATURE BOX (For returns / payments / ledger) */}
          {!['proforma', 'invoice', 'delivery'].includes(type) && (
            <div className="mt-8 pt-5 pb-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-[10.5px] font-bold text-slate-700">
              <div className="flex flex-col justify-between items-center min-h-[85px]">
                <div>امضاء و مهر کارشناس فروش</div>
                {stampEnabled && company.stamp_signature_url ? (
                  <div className="my-1 flex items-center justify-center relative pointer-events-none">
                    <img
                      src={company.stamp_signature_url}
                      alt="مهر شرکت"
                      className="h-14 max-w-[130px] object-contain mix-blend-multiply opacity-95 transition"
                    />
                  </div>
                ) : (
                  <div className="h-8 flex items-end justify-center">
                    <div className="text-slate-300">.......................</div>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-between items-center min-h-[85px]">
                <div>امضاء مدیر مالی و حسابداری</div>
                <div className="h-8 flex items-end justify-center">
                  <div className="text-slate-300">.......................</div>
                </div>
              </div>
              <div className="flex flex-col justify-between items-center min-h-[85px]">
                <div>امضاء و مهر خریدار / تحویل‌گیرنده</div>
                <div className="h-8 flex items-end justify-center">
                  <div className="text-slate-300">.......................</div>
                </div>
              </div>
            </div>
          )}
        </ZoomablePrintContainer>
      </div>
    </div>,
    document.body
  );
};

