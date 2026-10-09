import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { OrderInvoiceService } from '../../services/orderInvoiceService';
import { Invoice, DeliveryNote } from '../../types';
import { formatCurrency, formatJalaliDate, toPersianDigits } from '../../utils/jalali';
import { formatCompactItemSummary } from '../../utils/formatItemSummary';
import { ensureArray } from '../../utils/itemUtils';
import { InvoiceDetailModal, getInvoiceDeliveryInfo } from './InvoiceDetailModal';
import { InvoiceEditModal } from './InvoiceEditModal';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import { AdvancedFilterReport, ReportItem } from '../Common/AdvancedFilterReport';
import { SortableHeader } from '../Common/SortableHeader';
import {
  Receipt,
  Printer,
  XCircle,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  History,
} from 'lucide-react';

interface InvoiceManagerProps {
  onPrintInvoice?: (invoice: Invoice) => void;
  onNavigateToCustomer?: (customerId: string) => void;
}

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({
  onPrintInvoice,
  onNavigateToCustomer,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [filteredReportItems, setFilteredReportItems] = useState<ReportItem[]>([]);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    loadData();
    const handleDbSynced = () => {
      if (!editingInvoice) {
        loadData();
      }
    };
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    return () => {
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
    };
  }, [editingInvoice]);

  const loadData = () => {
    setInvoices(StorageService.getInvoices());
    setDeliveries(StorageService.getDeliveries());
  };

  const handleCancelInvoice = async (inv: Invoice) => {
    if (!StorageService.hasPermission('invoices.cancel')) {
      alert('شما دسترسی لازم برای ابطال فاکتور را ندارید.');
      return;
    }
    const confirmPrompt = window.confirm(
      `آیا از ابطال فاکتور فروش شماره ${inv.invoice_number} اطمینان دارید؟\nاین عملیات مبلغ بدهی را از حساب مشتری کسر خواهد کرد.`
    );
    if (!confirmPrompt) return;

    const res = OrderInvoiceService.cancelInvoice(inv.id);
    if (!res.success) {
      alert(`خطا: ${res.message}`);
    } else {
      await StorageService.pushToHost();
      alert(res.message);
      loadData();
    }
  };

  // Convert invoices to ReportItem format for AdvancedFilterReport
  const allReportItems: ReportItem[] = React.useMemo(() => {
    return invoices.map((inv) => {
      const delInfo = getInvoiceDeliveryInfo(inv, deliveries);
      const invItems = ensureArray(inv?.items);
      const itemsSummary =
        invItems.map((it) => formatCompactItemSummary(it.quantity_meters, it)).join(' | ') ||
        'بدون قلم کالا';
      const totalMeters = invItems.reduce((s, it) => s + (Number(it.quantity_meters) || 0), 0);

      return {
        id: inv.id,
        number: inv.invoice_number,
        date: inv.invoice_date,
        customerName: inv.customer_name,
        customerCode: inv.customer_code,
        status: inv.status,
        statusLabel: inv.status === 'cancelled' ? 'ابطال شده' : delInfo.label,
        itemsSummary,
        itemsCount: invItems.length,
        totalMeters,
        finalTotal: inv.final_total,
        details:
          invItems.map((it, idx) => {
            const targetItemId = it.id || `inv-item-${inv.id}-${idx}`;
            let itemDeliveredMeters = 0;

            deliveries.forEach((del) => {
              if (del.status !== 'cancelled') {
                ensureArray(del?.items).forEach((delItem) => {
                  const matchInvoice =
                    delItem.invoice_id === inv.id ||
                    (inv.invoice_number && delItem.invoice_number === inv.invoice_number);
                  if (matchInvoice) {
                    if (delItem.invoice_item_id && delItem.invoice_item_id === targetItemId) {
                      itemDeliveredMeters += Number(delItem.quantity_meters) || 0;
                    } else if (!delItem.invoice_item_id) {
                      // Compare attributes
                      const sameName = (delItem.product_name || '').trim().toLowerCase() === (it.product_name || '').trim().toLowerCase();
                      const sameSize = !it.size || delItem.size === it.size;
                      const samePressure = !it.pressure || delItem.pressure === it.pressure;
                      const sameType = !it.type || delItem.type === it.type;
                      if (sameName && sameSize && samePressure && sameType) {
                        itemDeliveredMeters += Number(delItem.quantity_meters) || 0;
                      }
                    }
                  }
                });
              }
            });

            const qty = Number(it.quantity_meters) || 0;
            const remaining = Math.max(0, qty - itemDeliveredMeters);

            return {
              productName: it.product_name,
              size: it.size,
              pressure: it.pressure,
              type: it.type,
              meters: qty,
              deliveredMeters: itemDeliveredMeters,
              remainingMeters: remaining,
              unitPrice: Number(it.unit_price) || 0,
              totalPrice: Number(it.total_price) || 0,
            };
          }) || [],
      };
    });
  }, [invoices, deliveries]);

  // Extract unique options for filter dropdowns
  const availableSizes = React.useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => ensureArray(inv?.items).forEach((i) => i?.size && set.add(i.size)));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [invoices]);

  const availablePressures = React.useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => ensureArray(inv?.items).forEach((i) => i?.pressure && set.add(i.pressure)));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [invoices]);

  const availableTypes = React.useMemo(() => {
    const set = new Set<string>();
    invoices.forEach((inv) => ensureArray(inv?.items).forEach((i) => i?.type && set.add(i.type)));
    return Array.from(set);
  }, [invoices]);

  // Filtered invoices matching the report items with filtered item details and calculated amounts
  const displayedInvoices = React.useMemo(() => {
    return filteredReportItems
      .map((r) => {
        const inv = invoices.find((i) => i.id === r.id);
        return {
          invoice: inv,
          reportItem: r,
        };
      })
      .filter((x): x is { invoice: Invoice; reportItem: ReportItem } => Boolean(x.invoice));
  }, [filteredReportItems, invoices]);

  // Sorting state - defaults to newest invoices first (invoice_date desc)
  const [sortKey, setSortKey] = useState<string>('invoice_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'invoice_date' ? 'desc' : 'asc');
    }
  };

  const sortedDisplayedInvoices = React.useMemo(() => {
    return [...displayedInvoices].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'invoice_number') {
        valA = parseInt(String(a.invoice.invoice_number).replace(/\D/g, ''), 10) || 0;
        valB = parseInt(String(b.invoice.invoice_number).replace(/\D/g, ''), 10) || 0;
      } else if (sortKey === 'customer_name') {
        valA = a.invoice.customer_name || '';
        valB = b.invoice.customer_name || '';
      } else if (sortKey === 'invoice_date') {
        valA = new Date(a.invoice.invoice_date).getTime() || 0;
        valB = new Date(b.invoice.invoice_date).getTime() || 0;
      } else if (sortKey === 'final_total') {
        valA = a.reportItem.finalTotal || 0;
        valB = b.reportItem.finalTotal || 0;
      } else if (sortKey === 'status') {
        valA = a.invoice.status || '';
        valB = b.invoice.status || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [displayedInvoices, sortKey, sortOrder]);

  if (!StorageService.hasPermission('invoices.view')) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto mt-12 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
          <Receipt className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          عدم دسترسی به بخش فاکتورهای فروش
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          شما مجوز دسترسی لازم برای مشاهده لیست فاکتورهای فروش را ندارید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <span>فاکتورهای فروش</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            مدیریت، فیلتر پیشرفته، گزارش‌گیری و صدور اسناد فاکتور فروش
          </p>
        </div>
      </div>

      {/* Advanced Filter & Report Section */}
      <AdvancedFilterReport
        title="فاکتورهای فروش"
        reportType="invoices"
        allItems={allReportItems}
        availableSizes={availableSizes}
        availablePressures={availablePressures}
        availableTypes={availableTypes}
        statusOptions={[
          { value: 'all', label: 'همه وضعیت‌ها' },
          { value: 'active', label: 'فاکتورهای معتبر / فعال' },
          { value: 'cancelled', label: 'ابطال‌شده' },
        ]}
        onFilteredItemsChange={setFilteredReportItems}
      />

      {/* Invoices Container: Mobile Cards (<md) & Desktop Table (>=md) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="md:hidden p-3 sm:p-4 bg-slate-100/75 dark:bg-slate-950/40 space-y-3">
          {sortedDisplayedInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              فاکتوری با فیلترهای مشخص‌شده یافت نشد.
            </div>
          ) : (
            sortedDisplayedInvoices.map(({ invoice: inv, reportItem }) => {
              const deliveryInfo = getInvoiceDeliveryInfo(inv, deliveries);
              return (
                <div
                  key={`mob-inv-${inv.id}`}
                  onClick={() => setSelectedInvoiceForModal(inv)}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition cursor-pointer overflow-hidden active:scale-[0.99]"
                >
                  {/* Header: Invoice Number + Date + Statuses */}
                  <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/50">
                        {inv.invoice_number}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {formatJalaliDate(inv.invoice_date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {deliveryInfo.status === 'delivered' && (
                        <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          تحویل کامل
                        </span>
                      )}
                      {deliveryInfo.status === 'partial' && (
                        <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          تحویل ناقص
                        </span>
                      )}
                      {deliveryInfo.status === 'not_delivered' && (
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                          تحویل نشده
                        </span>
                      )}
                      {inv.status === 'cancelled' && (
                        <span className="text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                          ابطال‌شده
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Info & Details */}
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {inv.customer_name}
                      </div>
                    </div>

                    {/* Items list: each item stacked on its own row */}
                    {reportItem.details && reportItem.details.length > 0 && (
                      <div className="flex flex-col gap-1 w-full pt-1">
                        {reportItem.details.map((item, iIdx) => (
                          <div
                            key={`mob-inv-item-${iIdx}`}
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-between"
                          >
                            <span>{formatCompactItemSummary(item.meters, {
                              size: item.size,
                              pressure: item.pressure,
                              type: item.type,
                              product_name: item.productName,
                            })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Amount & Actions */}
                  <div className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    {/* Actions on the RIGHT in RTL */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {StorageService.hasPermission('invoices.print') && onPrintInvoice && (
                        <button
                          type="button"
                          onClick={() => onPrintInvoice(inv)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                          title="چاپ فاکتور"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )}

                      {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('invoices.view')) && (
                        <button
                          type="button"
                          onClick={() => setHistoryInvoice(inv)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                          title="تاریخچه و سوابق"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}

                      {StorageService.hasPermission('invoices.edit') && inv.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => setEditingInvoice(inv)}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                          title="ویرایش"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceForModal(inv)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-bold text-xs hover:bg-blue-100 transition flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>جزئیات</span>
                      </button>
                    </div>

                    {/* Amount on the LEFT in RTL */}
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">مبلغ کل فاکتور:</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">
                        {formatCurrency(reportItem.finalTotal, false)} <span className="text-[10px] font-normal text-slate-500">ریال</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-center text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-100/80">
                <SortableHeader
                  label="شماره فاکتور"
                  sortKey="invoice_number"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-28 text-center"
                  align="center"
                />
                <SortableHeader
                  label="مشتری"
                  sortKey="customer_name"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="text-center"
                  align="center"
                />
                <SortableHeader
                  label="تاریخ صدور"
                  sortKey="invoice_date"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-28 text-center"
                  align="center"
                />
                <th className="py-3.5 px-4 text-center">شرح کالا (متراژ و مشخصات)</th>
                <SortableHeader
                  label="مبلغ نهایی (ریال)"
                  sortKey="final_total"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-36 text-center"
                  align="center"
                />
                <th className="py-3.5 px-4 text-center w-36">وضعیت تحویل</th>
                <SortableHeader
                  label="وضعیت"
                  sortKey="status"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  className="w-24 text-center"
                  align="center"
                />
                <th className="py-3.5 px-4 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDisplayedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    فاکتوری با فیلترهای مشخص‌شده یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedDisplayedInvoices.map(({ invoice: inv, reportItem }) => {
                  const deliveryInfo = getInvoiceDeliveryInfo(inv, deliveries);

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setSelectedInvoiceForModal(inv)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200 text-center font-mono">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                          {inv.customer_name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-center font-bold text-xs">
                        {formatJalaliDate(inv.invoice_date)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {reportItem.details && reportItem.details.length > 0 ? (
                            reportItem.details.map((item, iIdx) => (
                              <div
                                key={`${inv.id}-${iIdx}`}
                                className="text-xs font-bold text-slate-700 bg-slate-100/90 px-2.5 py-0.5 rounded-md border border-slate-200/80 whitespace-nowrap shadow-2xs"
                              >
                                {formatCompactItemSummary(item.meters, {
                                  size: item.size,
                                  pressure: item.pressure,
                                  type: item.type,
                                  product_name: item.productName,
                                })}
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900 text-center">
                        {formatCurrency(reportItem.finalTotal, false)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {deliveryInfo.status === 'delivered' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            تحویل شده
                          </span>
                        )}
                        {deliveryInfo.status === 'partial' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            در حال تکمیل
                          </span>
                        )}
                        {deliveryInfo.status === 'not_delivered' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <AlertCircle className="w-3 h-3" />
                            تحویل نشده
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {inv.status === 'active' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            معتبر
                          </span>
                        )}
                        {inv.status === 'cancelled' && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            ابطال‌شده
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForModal(inv)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            title="مشاهده جزئیات فاکتور"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Audit History */}
                          {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('invoices.view')) && (
                            <button
                              type="button"
                              onClick={() => setHistoryInvoice(inv)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                              title="مشاهده لاگ و تاریخچه تغییرات"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit button */}
                          {StorageService.hasPermission('invoices.edit') && inv.status === 'active' && (
                            <button
                              type="button"
                              onClick={() => setEditingInvoice(inv)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                              title="ویرایش فاکتور"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}

                          {StorageService.hasPermission('invoices.print') && onPrintInvoice && (
                            <button
                              type="button"
                              onClick={() => onPrintInvoice(inv)}
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                              title="چاپ فاکتور رسمی"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                          )}

                          {StorageService.hasPermission('invoices.cancel') && inv.status === 'active' && deliveryInfo.status === 'not_delivered' && (
                            <button
                              type="button"
                              onClick={() => handleCancelInvoice(inv)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title="ابطال فاکتور"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoiceForModal}
        deliveries={deliveries}
        isOpen={!!selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        onPrint={StorageService.hasPermission('invoices.print') ? onPrintInvoice : undefined}
        onCancelInvoice={StorageService.hasPermission('invoices.cancel') ? handleCancelInvoice : undefined}
        onEdit={
          StorageService.hasPermission('invoices.edit')
            ? (inv) => {
                setSelectedInvoiceForModal(null);
                setEditingInvoice(inv);
              }
            : undefined
        }
      />

      {/* Invoice Edit Modal */}
      <InvoiceEditModal
        invoice={editingInvoice}
        isOpen={!!editingInvoice}
        onClose={() => setEditingInvoice(null)}
        onSuccess={() => {
          setEditingInvoice(null);
          loadData();
        }}
      />

      {/* Audit History Modal */}
      {historyInvoice && (
        <AuditHistoryModal
          isOpen={!!historyInvoice}
          onClose={() => setHistoryInvoice(null)}
          entityType="INVOICE"
          entityId={historyInvoice.id}
          title="تاریخچه تغییرات و رویدادهای فاکتور"
          subtitle={`فاکتور شماره ${historyInvoice.invoice_number} - مشتری: ${historyInvoice.customer_name}`}
        />
      )}
    </div>
  );
};
