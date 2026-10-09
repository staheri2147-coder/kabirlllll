import React, { useState } from 'react';
import { DeliveryNote } from '../../types';
import { formatJalaliDate, toPersianDigits, formatNumber } from '../../utils/jalali';
import { formatCompactItemSummary } from '../../utils/formatItemSummary';
import { DeliveryReturnService } from '../../services/deliveryReturnService';
import { StorageService } from '../../services/storageService';
import {
  X,
  Printer,
  Truck,
  Calendar,
  User,
  Layers,
  Edit2,
  Ban,
  AlertTriangle,
  History,
  MapPin,
  FileText,
} from 'lucide-react';

interface DeliveryDetailModalProps {
  delivery: DeliveryNote | null;
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (delivery: DeliveryNote) => void;
  onEdit?: (delivery: DeliveryNote) => void;
  onCancelled?: () => void;
  onViewHistory?: (delivery: DeliveryNote) => void;
}

export const DeliveryDetailModal: React.FC<DeliveryDetailModalProps> = ({
  delivery,
  isOpen,
  onClose,
  onPrint,
  onEdit,
  onCancelled,
  onViewHistory,
}) => {
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  if (!isOpen || !delivery) return null;

  const isCancelled = delivery.status === 'cancelled';

  // Group items by invoice for cleaner view
  const invoicesMap: { [key: string]: typeof delivery.items } = {};
  delivery.items?.forEach((item) => {
    const invKey = item.invoice_number || item.invoice_id || 'سایر';
    if (!invoicesMap[invKey]) {
      invoicesMap[invKey] = [];
    }
    invoicesMap[invKey].push(item);
  });

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      alert('لطفاً دلیل لغو رسید را وارد فرمایید.');
      return;
    }
    DeliveryReturnService.cancelDeliveryNote(delivery.id, cancelReason.trim());
    await StorageService.pushToHost();
    setShowCancelPrompt(false);
    if (onCancelled) onCancelled();
    onClose();
  };

  const canEdit = !isCancelled && onEdit && StorageService.hasPermission('deliveries.edit');
  const canPrint = onPrint && !isCancelled && StorageService.hasPermission('deliveries.print');
  const canCancel = !isCancelled && StorageService.hasPermission('deliveries.delete');
  const canHistory = (StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('deliveries.view')) && onViewHistory;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 shrink-0">
          {/* Top Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    رسید تحویل کالا
                  </h2>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold font-mono">
                    {delivery.delivery_number}
                  </span>
                  {isCancelled && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      ابطال‌شده
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  صدور: {formatJalaliDate(delivery.delivery_date)}
                </p>
              </div>
            </div>

            {/* Close button */}
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
            {/* Edit button */}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(delivery);
                }}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                title="ویرایش این رسید تحویل"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>ویرایش رسید</span>
              </button>
            )}

            {/* Print button */}
            {canPrint && (
              <button
                type="button"
                onClick={() => onPrint(delivery)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-600 shadow-2xs"
                title="چاپ یا ذخیره رسید تحویل"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                <span>چاپ رسید</span>
              </button>
            )}

            {/* Audit History button */}
            {canHistory && (
              <button
                type="button"
                onClick={() => onViewHistory(delivery)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-900 shadow-2xs"
                title="مشاهده تاریخچه و رویدادهای ثبت‌شده این رسید"
              >
                <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>تاریخچه و لاگ</span>
              </button>
            )}

            {/* Cancel Delivery Note */}
            {canCancel && (
              <button
                type="button"
                onClick={() => setShowCancelPrompt(true)}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-900"
                title="لغو این رسید تحویل"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>لغو رسید تحویل</span>
              </button>
            )}
          </div>
        </div>

        {/* Cancellation Notice */}
        {isCancelled && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="break-words">
              این رسید تحویل باطل گردیده است (دلیل: {delivery.cancel_reason || 'عدم توافق / تغییر بار'}). اقلام به لیست تحویل‌نشده بازگشته‌اند.
            </span>
          </div>
        )}

        {/* Cancel Confirmation Prompt */}
        {showCancelPrompt && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 space-y-3">
            <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>آیا از لغو این رسید تحویل اطمینان دارید؟</span>
            </div>
            <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
              با لغو رسید، متراژ مربوطه مجدداً به عنوان «تحویل‌نشده» در سامانه لحاظ می‌گردد.
            </p>
            <input
              type="text"
              placeholder="دلیل لغو رسید تحویل را بنویسید..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCancelPrompt(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer"
              >
                تأیید لغو رسید
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 min-h-0">
          {/* Top Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <div className="flex sm:flex-col items-center justify-between sm:justify-center p-1 sm:p-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0 sm:mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>مشتری / گیرنده:</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white break-words break-all text-left sm:text-center max-w-[200px] sm:max-w-none">
                {delivery.customer_name}
              </div>
            </div>

            <div className="flex sm:flex-col items-center justify-between sm:justify-center p-1 sm:p-0 border-t sm:border-t-0 sm:border-r sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0 sm:mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>تاریخ تحویل:</span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {formatJalaliDate(delivery.delivery_date)}
              </div>
            </div>

            <div className="flex sm:flex-col items-center justify-between sm:justify-center p-1 sm:p-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700 pt-2 sm:pt-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0 sm:mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>متراژ کل تحویلی:</span>
              </div>
              <div className="text-xs sm:text-sm font-bold font-mono text-blue-700 dark:text-blue-400">
                {delivery.total_meters ? `${formatNumber(delivery.total_meters)} متر` : '—'}
              </div>
            </div>
          </div>

          {/* Driver & Transport Info with Full Wrapping */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>مشخصات راننده و ناوگان حمل</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[11px]">نام راننده:</span>
                <span className="font-bold text-slate-900 dark:text-white break-words">{delivery.driver_name || '—'}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[11px]">شماره تماس:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{delivery.driver_phone || '—'}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[11px]">نوع خودرو:</span>
                <span className="font-medium text-slate-900 dark:text-white">{delivery.vehicle_type || '—'}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5 text-[11px]">پلاک انتظامی:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{delivery.vehicle_plate || '—'}</span>
              </div>
            </div>

            {delivery.destination_address && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-bold ml-1">آدرس تخلیه بار:</span>
                <span className="text-slate-800 dark:text-slate-200 leading-relaxed break-words break-all whitespace-pre-wrap">
                  {delivery.destination_address}
                </span>
              </div>
            )}

            {delivery.description && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-bold ml-1">توضیحات:</span>
                <span className="text-slate-800 dark:text-slate-200 leading-relaxed break-words break-all whitespace-pre-wrap">
                  {delivery.description}
                </span>
              </div>
            )}
          </div>

          {/* Items by Invoice: Clean Tables */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                اقلام تحویل‌شده به تفکیک فاکتور
              </h3>
            </div>

            {Object.keys(invoicesMap).map((invNumber) => (
              <div key={invNumber} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100/90 dark:bg-slate-800 px-4 py-2 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span>فاکتور مرجع: {invNumber}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                    {toPersianDigits(invoicesMap[invNumber].length)} قلم کالا
                  </span>
                </div>

                {/* Table View */}
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-center text-xs min-w-[500px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                          <th className="py-2.5 px-3">ردیف</th>
                          <th className="py-2.5 px-3">شرح کالا</th>
                          <th className="py-2.5 px-3">سایز</th>
                          <th className="py-2.5 px-3">فشار</th>
                          <th className="py-2.5 px-3">نوع مواد</th>
                          <th className="py-2.5 px-3 font-bold text-center">متراژ تحویلی</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {invoicesMap[invNumber].map((it, idx) => (
                          <tr key={it.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400">{toPersianDigits(idx + 1)}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                              {it.product_name || 'لوله پلی اتیلن'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">{it.size || '—'}</td>
                            <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{it.pressure || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">{it.type || '—'}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-400">
                              {formatNumber(it.quantity_meters)} متر
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="sm:hidden text-[10px] text-slate-400 text-center py-1 flex items-center justify-center gap-1">
                    <span>← برای مشاهده مشخصات جدول را به چپ یا راست بکشید →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
