import React, { useState } from 'react';
import { StorageService } from '../../services/storageService';
import { Invoice, DeliveryNote } from '../../types';
import { formatCurrency, formatJalaliDate, toPersianDigits, formatNumber } from '../../utils/jalali';
import { ensureArray } from '../../utils/itemUtils';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import {
  X,
  Printer,
  Calendar,
  User,
  MapPin,
  Receipt,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Edit2,
  History,
} from 'lucide-react';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  deliveries: DeliveryNote[];
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (invoice: Invoice) => void;
  onCancelInvoice?: (invoice: Invoice) => void;
  onEdit?: (invoice: Invoice) => void;
}

export function getInvoiceDeliveryInfo(invoice: Invoice, deliveries: DeliveryNote[]) {
  const invItems = ensureArray(invoice?.items);
  const totalMeters = invItems.reduce((s, it) => s + (Number(it.quantity_meters) || 0), 0);
  
  let deliveredMeters = 0;
  deliveries.forEach((del) => {
    if (del.status !== 'cancelled') {
      ensureArray(del?.items).forEach((item) => {
        if (item.invoice_id === invoice.id || (invoice.invoice_number && item.invoice_number === invoice.invoice_number)) {
          deliveredMeters += Number(item.quantity_meters) || 0;
        }
      });
    }
  });

  if (invoice.status === 'delivered' || (totalMeters > 0 && deliveredMeters >= totalMeters)) {
    return {
      status: 'delivered' as const,
      label: 'تحویل شده',
      deliveredMeters: Math.max(deliveredMeters, totalMeters),
      totalMeters,
      percentage: 100,
    };
  }

  if (deliveredMeters > 0) {
    return {
      status: 'partial' as const,
      label: 'در حال تکمیل',
      deliveredMeters,
      totalMeters,
      percentage: totalMeters > 0 ? Math.min(99, Math.round((deliveredMeters / totalMeters) * 100)) : 0,
    };
  }

  return {
    status: 'not_delivered' as const,
    label: 'تحویل نشده',
    deliveredMeters: 0,
    totalMeters,
    percentage: 0,
  };
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  deliveries,
  isOpen,
  onClose,
  onPrint,
  onCancelInvoice,
  onEdit,
}) => {
  const [showLogsModal, setShowLogsModal] = useState(false);

  if (!isOpen || !invoice) return null;

  const deliveryInfo = getInvoiceDeliveryInfo(invoice, deliveries);
  const canEdit = onEdit && invoice.status === 'active' && StorageService.hasPermission('invoices.edit');
  const canPrint = onPrint && StorageService.hasPermission('invoices.print');
  const canCancel = onCancelInvoice && invoice.status === 'active' && deliveryInfo.status === 'not_delivered' && StorageService.hasPermission('invoices.cancel');
  const canHistory = StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('invoices.view');

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print">
        <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[90vh]">
          {/* Header */}
          <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 shrink-0">
            {/* Top Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      اطلاعات فاکتور فروش
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold font-mono">
                      {invoice.invoice_number}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    ثبت: {formatJalaliDate(invoice.invoice_date)}
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
                    onEdit(invoice);
                  }}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  title="ویرایش این فاکتور"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>ویرایش فاکتور</span>
                </button>
              )}

              {/* Print button */}
              {canPrint && (
                <button
                  type="button"
                  onClick={() => onPrint(invoice)}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 active:scale-95 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-600 shadow-2xs"
                  title="چاپ یا ذخیره فاکتور"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span>چاپ فاکتور</span>
                </button>
              )}

              {/* Audit History button */}
              {canHistory && (
                <button
                  type="button"
                  onClick={() => setShowLogsModal(true)}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-blue-200 dark:border-blue-900 shadow-2xs"
                  title="مشاهده تاریخچه و لاگ تغییرات فاکتور"
                >
                  <History className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>تاریخچه و لاگ</span>
                </button>
              )}

              {/* Cancel Invoice */}
              {canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCancelInvoice(invoice);
                  }}
                  className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-900"
                  title="ابطال این فاکتور"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>ابطال فاکتور</span>
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
                  {invoice.customer_name}
                </div>
              </div>

              <div className="flex sm:flex-col items-center justify-between sm:justify-center p-1 sm:p-0 border-t sm:border-t-0 sm:border-r sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-0 sm:mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>تاریخ فاکتور:</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {formatJalaliDate(invoice.invoice_date)}
                </div>
              </div>

              <div className="flex sm:flex-col items-center justify-between sm:justify-center p-1 sm:p-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700 pt-2 sm:pt-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-0 sm:mb-1 flex items-center gap-1 justify-center">
                  <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>وضعیت تحویل:</span>
                </div>
                <div>
                  {invoice.status === 'cancelled' ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      ابطال‌شده
                    </span>
                  ) : deliveryInfo.status === 'delivered' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      تحویل شده
                    </span>
                  ) : deliveryInfo.status === 'partial' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <Clock className="w-3 h-3" />
                      در حال تکمیل ({deliveryInfo.deliveredMeters.toLocaleString('fa-IR')} از {deliveryInfo.totalMeters.toLocaleString('fa-IR')} متر)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      <AlertCircle className="w-3 h-3" />
                      تحویل نشده
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Invoice Items Section: Clean Table with horizontal scroll */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  اقلام فاکتور ({toPersianDigits(ensureArray(invoice.items).length)} قلم)
                </h3>
              </div>

              {/* Table View */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-center text-xs min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 text-center w-12">ردیف</th>
                      <th className="py-2.5 px-3 text-center">شرح کالا</th>
                      <th className="py-2.5 px-3 text-center">سایز (قطر)</th>
                      <th className="py-2.5 px-3 text-center">فشار</th>
                      <th className="py-2.5 px-3 text-center">نوع مواد</th>
                      <th className="py-2.5 px-3 text-center">متراژ فاکتور</th>
                      <th className="py-2.5 px-3 text-center">مانده تحویل</th>
                      <th className="py-2.5 px-3 text-left font-bold">قیمت واحد (ریال)</th>
                      <th className="py-2.5 px-3 text-left font-bold">قیمت کل (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ensureArray(invoice.items).map((item, idx) => {
                      const targetItemId = item.id || `inv-item-${invoice.id}-${idx}`;
                      let itemDelivered = 0;
                      deliveries.forEach((del) => {
                        if (del.status !== 'cancelled') {
                          ensureArray(del.items).forEach((delItem) => {
                            const matchInvoice =
                              delItem.invoice_id === invoice.id ||
                              (invoice.invoice_number && delItem.invoice_number === invoice.invoice_number);
                            if (matchInvoice) {
                              if (delItem.invoice_item_id && delItem.invoice_item_id === targetItemId) {
                                itemDelivered += Number(delItem.quantity_meters) || 0;
                              } else if (!delItem.invoice_item_id) {
                                const sameName = (delItem.product_name || '').trim().toLowerCase() === (item.product_name || '').trim().toLowerCase();
                                const sameSize = !item.size || delItem.size === item.size;
                                const samePressure = !item.pressure || delItem.pressure === item.pressure;
                                const sameType = !item.type || delItem.type === item.type;
                                if (sameName && sameSize && samePressure && sameType) {
                                  itemDelivered += Number(delItem.quantity_meters) || 0;
                                }
                              }
                            }
                          });
                        }
                      });

                      const qty = Number(item.quantity_meters) || 0;
                      const remaining = Math.max(0, qty - itemDelivered);

                      return (
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
                            {item.quantity_meters ? formatNumber(item.quantity_meters) : '۰'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] ${
                                remaining === 0
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                  : remaining < qty
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              {formatNumber(remaining)} متر
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 text-left font-bold font-mono">
                            {formatCurrency(item.unit_price, false)}
                          </td>
                          <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white text-left font-mono">
                            {formatCurrency(item.total_price || (item.quantity_meters * item.unit_price), false)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden text-[10px] text-slate-400 text-center mt-1 flex items-center justify-center gap-1">
                <span>← برای مشاهده قیمت‌ها و وضعیت تحویل جدول را به چپ یا راست بکشید →</span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 px-2 sm:px-4">
                <span className="font-medium">جمع ناخالص اقلام:</span>
                <span className="font-bold text-slate-800 dark:text-white font-mono">
                  {formatCurrency(invoice.subtotal, false)} ریال
                </span>
              </div>

              {invoice.discount > 0 && (
                <div className="flex justify-between items-center text-xs text-rose-600 dark:text-rose-400 px-2 sm:px-4">
                  <span className="font-medium">تخفیف:</span>
                  <span className="font-bold font-mono">
                    -{formatCurrency(invoice.discount, false)} ریال
                  </span>
                </div>
              )}

              {invoice.tax_amount > 0 && (
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300 px-2 sm:px-4">
                  <span className="font-medium">مالیات بر ارزش افزوده ({toPersianDigits(invoice.tax_percent)}٪):</span>
                  <span className="font-bold text-slate-800 dark:text-white font-mono">
                    +{formatCurrency(invoice.tax_amount, false)} ریال
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-300 px-2 sm:px-4">
                <span>مبلغ نهایی قابل پرداخت:</span>
                <span className="text-sm sm:text-base font-black text-blue-700 dark:text-blue-400 font-mono">
                  {formatCurrency(invoice.final_total, false)} ریال
                </span>
              </div>
            </div>

            {/* Customer & Description Info - Full Wrapping */}
            {(invoice.customer_address || invoice.description) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                {invoice.customer_address && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>آدرس محل تحویل / مشتری:</span>
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 leading-relaxed break-words break-all whitespace-pre-wrap pr-5">
                      {invoice.customer_address}
                    </div>
                  </div>
                )}
                {invoice.description && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-slate-700 dark:text-slate-300 font-bold flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>توضیحات فاکتور:</span>
                    </div>
                    <div className="text-slate-800 dark:text-slate-200 leading-relaxed break-words break-all whitespace-pre-wrap pr-5">
                      {invoice.description}
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

      {/* Audit History Modal */}
      <AuditHistoryModal
        isOpen={showLogsModal}
        onClose={() => setShowLogsModal(false)}
        entityType="INVOICE"
        entityId={invoice.id}
        title="تاریخچه تغییرات و رویدادهای فاکتور"
        subtitle={`فاکتور شماره ${invoice.invoice_number} - مشتری: ${invoice.customer_name}`}
      />
    </>
  );
};
