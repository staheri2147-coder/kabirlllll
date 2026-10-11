import React from 'react';
import { StorageService } from '../../services/storageService';
import { Order } from '../../types';
import { formatCurrency, formatJalaliDate, toPersianDigits, formatNumber } from '../../utils/jalali';
import {
  X,
  Printer,
  Edit2,
  Calendar,
  User,
  MapPin,
  FileText,
  History,
  CheckCircle2,
  XCircle,
  ChevronLeft,
} from 'lucide-react';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (order: Order) => void;
  onPrint?: (order: Order) => void;
  onCancel?: (order: Order) => void;
  onCancelOrder?: (order: Order) => void;
  onConfirm?: (order: Order) => void;
  onViewHistory?: (order: Order) => void;
  onNavigateToInvoice?: (invoiceId: string) => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onEdit,
  onPrint,
  onCancel,
  onCancelOrder,
  onConfirm,
  onViewHistory,
  onNavigateToInvoice,
}) => {
  if (!isOpen || !order) return null;

  const discountVal = order.discount_amount || (order as any).discount || 0;
  const taxVal = order.vat_amount || (order as any).tax_amount || 0;
  const handleCancel = onCancel || onCancelOrder;

  const canEdit = onEdit && order.status !== 'cancelled' && StorageService.hasPermission('orders.edit');
  const canPrint = onPrint && StorageService.hasPermission('orders.print');
  const canConfirm = onConfirm && order.status === 'draft' && StorageService.hasPermission('orders.confirm');
  const canCancel = handleCancel && order.status === 'draft' && StorageService.hasPermission('orders.delete');
  const canHistory = (StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('orders.view')) && onViewHistory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 shrink-0">
          {/* Top Row: Title, Number, Status & Close Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    اطلاعات سفارش
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold font-mono">
                    {order.order_number}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  ثبت: {formatJalaliDate(order.order_date)}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition-colors cursor-pointer shrink-0"
              aria-label="بستن"
              title="بستن پنجره"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Buttons Bar: Balanced and proportional on mobile and desktop */}
          <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-700/60 flex items-center justify-start gap-1.5 sm:gap-2 flex-wrap">
            {/* Edit Button */}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(order);
                }}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                title="ویرایش این سفارش"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>ویرایش سفارش</span>
              </button>
            )}

            {/* Print Proforma Button */}
            {canPrint && (
              <button
                type="button"
                onClick={() => onPrint(order)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-600 shadow-2xs"
                title="چاپ یا ذخیره پیش‌فاکتور"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>چاپ پیش‌فاکتور</span>
              </button>
            )}

            {/* Confirm Draft Order */}
            {canConfirm && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onConfirm(order);
                }}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                title="تأیید نهایی سفارش"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تأیید سفارش</span>
              </button>
            )}

            {/* History & Logs */}
            {canHistory && (
              <button
                type="button"
                onClick={() => onViewHistory(order)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-900 shadow-2xs"
                title="مشاهده تاریخچه و لاگ تغییرات سفارش"
              >
                <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>تاریخچه و لاگ</span>
              </button>
            )}

            {/* Cancel Order */}
            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  handleCancel(order);
                }}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-900"
                title="لغو این سفارش"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>لغو سفارش</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 min-h-0">
          {/* Customer & Status Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <div className="flex sm:flex-col items-center justify-between sm:justify-center p-1 sm:p-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0 sm:mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>نام خریدار:</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words break-all text-left sm:text-center max-w-[200px] sm:max-w-none">
                {order.customer_name}
              </div>
            </div>

            <div className="flex sm:flex-col items-center justify-between sm:justify-center p-1 sm:p-0 border-t sm:border-t-0 sm:border-r sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0 sm:mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>تاریخ سفارش:</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {formatJalaliDate(order.order_date)}
              </div>
            </div>

            <div className="flex sm:flex-col items-center justify-between sm:justify-center p-1 sm:p-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700 pt-2 sm:pt-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0 sm:mb-1">وضعیت سفارش:</div>
              <div>
                {order.status === 'draft' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    پیش‌نویس (استعلام)
                  </span>
                )}
                {order.status === 'confirmed' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    تاییدشده
                  </span>
                )}
                {order.status === 'cancelled' && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    لغوشده
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Order Items Section: Clean Table with horizontal scroll */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                اقلام سفارش ({toPersianDigits(order.items?.length || 0)} قلم)
              </h3>
            </div>

            {/* Table View */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-center text-xs min-w-[620px]">
                <thead>
                  <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2.5 px-3 text-center w-12">ردیف</th>
                    <th className="py-2.5 px-3 text-center">شرح کالا</th>
                    <th className="py-2.5 px-3 text-center">سایز (قطر)</th>
                    <th className="py-2.5 px-3 text-center">فشار</th>
                    <th className="py-2.5 px-3 text-center">نوع مواد</th>
                    <th className="py-2.5 px-3 text-center">متراژ</th>
                    <th className="py-2.5 px-3 text-left font-bold">قیمت واحد (ریال)</th>
                    <th className="py-2.5 px-3 text-left font-bold">قیمت کل (ریال)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {order.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-2.5 px-3 font-bold text-slate-500 dark:text-slate-400 text-center font-mono">
                        {toPersianDigits(idx + 1)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 text-center">
                        {item.product_name || 'لوله پلی اتیلن'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 text-center font-bold">
                        {item.size ? toPersianDigits(item.size) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 text-center font-bold">
                        {item.pressure ? toPersianDigits(item.pressure) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 text-center font-bold">
                        {item.type || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-blue-700 dark:text-blue-400 text-center font-mono">
                        {formatNumber(item.quantity_meters)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 text-left font-bold font-mono">
                        {formatCurrency(item.unit_price, false)}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white text-left font-mono">
                        {formatCurrency(item.total_price || (item.quantity_meters * item.unit_price), false)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sm:hidden text-[10px] text-slate-400 text-center py-1 mt-1">
              ← برای مشاهده ستون‌های بیشتر، جدول را به چپ یا راست بکشید →
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 px-2 sm:px-4">
              <span className="font-medium">جمع ناخالص اقلام:</span>
              <span className="font-bold text-slate-800 dark:text-white font-mono">
                {formatCurrency(order.subtotal, false)} ریال
              </span>
            </div>

            {discountVal > 0 && (
              <div className="flex justify-between items-center text-xs text-rose-600 dark:text-rose-400 px-2 sm:px-4">
                <span className="font-medium">تخفیف:</span>
                <span className="font-bold font-mono">
                  -{formatCurrency(discountVal, false)} ریال
                </span>
              </div>
            )}

            {taxVal > 0 && (
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 px-2 sm:px-4">
                <span className="font-medium">مالیات بر ارزش افزوده (۱۰٪):</span>
                <span className="font-bold text-slate-800 dark:text-white font-mono">
                  +{formatCurrency(taxVal, false)} ریال
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-300 px-2 sm:px-4">
              <span>مبلغ نهایی قابل پرداخت:</span>
              <span className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-400 font-mono">
                {formatCurrency(order.final_total, false)} ریال
              </span>
            </div>
          </div>

          {/* Delivery & Description Info - Full Wrapping */}
          {(order.shipping_address || order.description) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
              {order.shipping_address && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>آدرس محل تحویل:</span>
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 leading-relaxed break-words break-all whitespace-pre-wrap pr-5">
                    {order.shipping_address}
                  </div>
                </div>
              )}
              {order.description && (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <div className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>توضیحات و شرایط سفارش:</span>
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 leading-relaxed break-words break-all whitespace-pre-wrap pr-5">
                    {order.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 sm:px-6 sm:py-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-700 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
