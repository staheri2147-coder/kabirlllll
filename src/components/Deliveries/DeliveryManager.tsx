import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import {
  DeliveryReturnService,
  PendingInvoiceItemForDelivery,
} from '../../services/deliveryReturnService';
import { DeliveryNote, Customer, Invoice } from '../../types';
import { formatJalaliDate, toPersianDigits } from '../../utils/jalali';
import { exportToExcel } from '../../utils/exportExcel';
import { formatCompactItemSummary } from '../../utils/formatItemSummary';
import { ensureArray } from '../../utils/itemUtils';
import { CreateDeliveryModal } from './CreateDeliveryModal';
import { DeliveryDetailModal } from './DeliveryDetailModal';
import { EditDeliveryModal } from './EditDeliveryModal';
import { DeliveryFilterReport } from './DeliveryFilterReport';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import { SortableHeader } from '../Common/SortableHeader';
import {
  Search,
  Truck,
  Printer,
  Download,
  Eye,
  PackageCheck,
  Clock,
  Edit2,
  Ban,
  History,
} from 'lucide-react';

interface DeliveryManagerProps {
  initialCustomerId?: string;
  initialSearchQuery?: string;
  onPrintDeliveryNote?: (delivery: DeliveryNote) => void;
}

interface PendingCustomerInfo {
  customer: Customer;
  pendingInvoicesCount: number;
  pendingItemsCount: number;
  totalRemainingMeters: number;
  invoiceNumbers: string[];
  pendingInvoices: Invoice[];
  pendingItems: PendingInvoiceItemForDelivery[];
}

export const DeliveryManager: React.FC<DeliveryManagerProps> = ({
  initialCustomerId,
  initialSearchQuery,
  onPrintDeliveryNote,
}) => {
  const [activeTab, setActiveTab] = useState<'undelivered' | 'delivered'>('undelivered');
  const [deliveries, setDeliveries] = useState<DeliveryNote[]>([]);
  const [filteredFromReport, setFilteredFromReport] = useState<DeliveryNote[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pendingCustomers, setPendingCustomers] = useState<PendingCustomerInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected customer for creating delivery
  const [selectedCustomerForDelivery, setSelectedCustomerForDelivery] = useState<Customer | null>(null);

  // Selected delivery for detail view
  const [selectedDeliveryForDetail, setSelectedDeliveryForDetail] = useState<DeliveryNote | null>(null);

  // Selected delivery for editing
  const [editingDelivery, setEditingDelivery] = useState<DeliveryNote | null>(null);

  // Selected delivery for audit history
  const [historyDelivery, setHistoryDelivery] = useState<DeliveryNote | null>(null);

  useEffect(() => {
    loadData();
    const handleDbSynced = () => {
      if (!editingDelivery && !selectedDeliveryForDetail) {
        loadData();
      }
    };
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    return () => {
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
    };
  }, [editingDelivery, selectedDeliveryForDetail]);

  useEffect(() => {
    if (initialCustomerId) {
      const allCustomers = StorageService.getCustomers().filter((c) => c.is_active);
      const cust = allCustomers.find((c) => c.id === initialCustomerId);
      if (cust) {
        setSelectedCustomerForDelivery(cust);
      }
    }
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
      setActiveTab('delivered');
    }
  }, [initialCustomerId, initialSearchQuery]);

  const loadData = () => {
    const allDeliveries = StorageService.getDeliveries();
    const allCustomers = StorageService.getCustomers().filter((c) => c.is_active);
    const allInvoices = StorageService.getInvoices();
    setDeliveries(allDeliveries);
    setCustomers(allCustomers);
    setInvoices(allInvoices);

    // Compute pending customers with undelivered items
    const list: PendingCustomerInfo[] = [];
    allCustomers.forEach((cust) => {
      const pendingItems = DeliveryReturnService.getCustomerPendingDeliveries(cust.id);
      if (pendingItems && pendingItems.length > 0) {
        const invoiceNumbers = Array.from(new Set(pendingItems.map((p) => p.invoice_number)));
        const invoiceIds = Array.from(new Set(pendingItems.map((p) => p.invoice_id)));
        const pendingInvs = allInvoices.filter((inv) => invoiceIds.includes(inv.id));
        const totalRemainingMeters = pendingItems.reduce(
          (s, it) => s + (Number(it.available_for_delivery) || 0),
          0
        );

        if (totalRemainingMeters > 0) {
          list.push({
            customer: cust,
            pendingInvoicesCount: invoiceNumbers.length,
            pendingItemsCount: pendingItems.length,
            totalRemainingMeters,
            invoiceNumbers,
            pendingInvoices: pendingInvs,
            pendingItems,
          });
        }
      }
    });

    setPendingCustomers(list);
  };

  // Export Excel for Delivered tab
  const handleExportDeliveredExcel = () => {
    const data = filteredDeliveries.map((del, idx) => {
      const invNumbers = Array.from(new Set(del.items?.map((i) => i.invoice_number || ''))).join('، ');
      return {
        ردیف: idx + 1,
        شماره_حواله: del.delivery_number,
        وضعیت: del.status === 'cancelled' ? 'لغو شده' : 'معتبر',
        نام_مشتری: del.customer_name,
        تاریخ_تحویل: formatJalaliDate(del.delivery_date),
        شماره_فاکتورهای_مربوطه: invNumbers,
        راننده: del.driver_name || '—',
        خودرو_پلاک: `${del.vehicle_type || ''} ${del.vehicle_plate || ''}`.trim() || '—',
        مجموع_متراژ: del.total_meters,
      };
    });

    exportToExcel({
      fileName: 'لیست_رسیدهای_تحویل_کالا',
      sheetName: 'رسیدهای تحویل',
      data,
    });
  };

  const handleCancelDeliveryDirect = (del: DeliveryNote) => {
    const reason = window.prompt(`دلیل لغو رسید تحویل ${del.delivery_number} را وارد فرمایید:`, 'عدم ارسال بار / انصراف راننده');
    if (reason && reason.trim()) {
      DeliveryReturnService.cancelDeliveryNote(del.id, reason.trim());
      loadData();
    }
  };

  // Filtered pending customers
  const filteredPendingCustomers = pendingCustomers.filter((pc) => {
    const query = searchQuery.toLowerCase();
    return (
      pc.customer.name.toLowerCase().includes(query) ||
      (pc.customer.phone && pc.customer.phone.includes(query)) ||
      (pc.customer.code && pc.customer.code.toLowerCase().includes(query)) ||
      pc.invoiceNumbers.some((inv) => inv.toLowerCase().includes(query))
    );
  });

  // Filtered delivered receipts
  const baseDeliveries = filteredFromReport.length > 0 || deliveries.length === 0 ? filteredFromReport : deliveries;
  const filteredDeliveries = baseDeliveries.filter((d) => {
    const query = searchQuery.toLowerCase();
    const invNumbers = ensureArray(d?.items).map((i) => i.invoice_number?.toLowerCase() || '');
    return (
      d.delivery_number.toLowerCase().includes(query) ||
      d.customer_name.toLowerCase().includes(query) ||
      (d.driver_name && d.driver_name.toLowerCase().includes(query)) ||
      (d.vehicle_plate && d.vehicle_plate.toLowerCase().includes(query)) ||
      invNumbers.some((inv) => inv.includes(query))
    );
  });

  // Sorting state - defaults to newest deliveries first (delivery_date desc, id desc)
  const [delSortKey, setDelSortKey] = useState<string>('delivery_date');
  const [delSortOrder, setDelSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleDelSort = (key: string) => {
    if (delSortKey === key) {
      setDelSortOrder(delSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setDelSortKey(key);
      setDelSortOrder(key === 'delivery_date' ? 'desc' : 'asc');
    }
  };

  const sortedDeliveries = React.useMemo(() => {
    return [...filteredDeliveries].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (delSortKey === 'delivery_number') {
        valA = parseInt(String(a.delivery_number || '').replace(/\D/g, ''), 10) || 0;
        valB = parseInt(String(b.delivery_number || '').replace(/\D/g, ''), 10) || 0;
      } else if (delSortKey === 'customer_name') {
        valA = (a.customer_name || '').trim();
        valB = (b.customer_name || '').trim();
        return delSortOrder === 'asc' ? valA.localeCompare(valB, 'fa') : valB.localeCompare(valA, 'fa');
      } else if (delSortKey === 'delivery_date') {
        const rawDateA = a.delivery_date || a.created_at || '';
        const rawDateB = b.delivery_date || b.created_at || '';
        valA = new Date(rawDateA).getTime() || 0;
        valB = new Date(rawDateB).getTime() || 0;
        if (valA === valB) {
          const numA = parseInt(String(a.delivery_number || a.id || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.delivery_number || b.id || '').replace(/\D/g, ''), 10) || 0;
          return delSortOrder === 'asc' ? numA - numB : numB - numA;
        }
      }

      if (valA < valB) return delSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return delSortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredDeliveries, delSortKey, delSortOrder]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Banner & Navigation Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>رسیدهای تحویل کالا</span>
          </h1>
        </div>

        {/* Tab Toggle Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100/90 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => {
                setActiveTab('undelivered');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'undelivered'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>تحویل‌نشده</span>
              {pendingCustomers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300 text-[11px] font-mono font-bold">
                  {toPersianDigits(pendingCustomers.length)}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('delivered');
                setSearchQuery('');
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'delivered'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>تحویل‌شده</span>
              {deliveries.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-mono font-bold">
                  {toPersianDigits(deliveries.length)}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'delivered' && (
            <button
              onClick={handleExportDeliveredExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>خروجی اکسل</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'undelivered'
                ? 'جستجوی نام مشتری، شماره تماس یا شماره فاکتور...'
                : 'جستجوی شماره رسید، مشتری، شماره فاکتور، نام راننده یا پلاک...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 transition"
          />
        </div>
      </div>

      {/* TAB 1: Undelivered (مشتریانی که اقلام تحویل‌نشده دارند) */}
      {activeTab === 'undelivered' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          {/* Mobile View: Cards */}
          <div className="md:hidden p-3 sm:p-4 bg-slate-100/75 dark:bg-slate-950/40 space-y-3">
            {filteredPendingCustomers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                هیچ مشتری با فاکتور تحویل‌نشده یافت نشد.
              </div>
            ) : (
              filteredPendingCustomers.map((pc) => (
                <div
                  key={`mob-pending-${pc.customer.id}`}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition overflow-hidden"
                >
                  <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {pc.customer.name}
                      </div>
                      {pc.customer.phone && (
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {toPersianDigits(pc.customer.phone)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3.5 space-y-2.5">
                    {/* Invoices */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-400">فاکتورها:</span>
                      {pc.invoiceNumbers.map((invNum) => (
                        <span
                          key={`mob-inv-${invNum}`}
                          className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 text-[11px] font-mono font-bold"
                        >
                          {invNum}
                        </span>
                      ))}
                    </div>

                    {/* Pending items: stacked vertically */}
                    {pc.pendingItems.length > 0 && (
                      <div className="flex flex-col gap-1 w-full pt-1">
                        {pc.pendingItems.map((item, iIdx) => (
                          <div
                            key={`mob-pitem-${iIdx}`}
                            className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700"
                          >
                            {formatCompactItemSummary(item.available_for_delivery, item)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action button footer */}
                  {StorageService.hasPermission('deliveries.create') && (
                    <div className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerForDelivery(pc.customer)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>صدور رسید تحویل</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-center text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <th className="py-3.5 px-4 text-center w-20">ردیف</th>
                  <th className="py-3.5 px-4 text-center">نام مشتری / خریدار</th>
                  <th className="py-3.5 px-4 text-center w-36">شماره تماس</th>
                  <th className="py-3.5 px-4 text-center">شماره فاکتورها</th>
                  <th className="py-3.5 px-4 text-center">متراژ باقی‌مانده</th>
                  <th className="py-3.5 px-4 text-center w-40">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPendingCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      هیچ مشتری با فاکتور تحویل‌نشده یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredPendingCustomers.map((pc, idx) => (
                    <tr
                      key={pc.customer.id}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500 dark:text-slate-400 text-center">
                        {toPersianDigits(idx + 1)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{pc.customer.name}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 text-center font-mono">
                        {pc.customer.phone ? toPersianDigits(pc.customer.phone) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {pc.invoiceNumbers.map((invNum) => (
                            <span
                              key={invNum}
                              className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                            >
                              {invNum}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          {pc.pendingItems.map((item, iIdx) => (
                            <div
                              key={`${item.invoice_id}-${item.product_id}-${iIdx}`}
                              className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 whitespace-nowrap shadow-2xs"
                            >
                              {formatCompactItemSummary(item.available_for_delivery, item)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {StorageService.hasPermission('deliveries.create') ? (
                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForDelivery(pc.customer)}
                            className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>صدور رسید تحویل</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Delivered (لیست کلیه رسیدهای تحویل صادرشده) */}
      {activeTab === 'delivered' && (
        <>
          <DeliveryFilterReport
            deliveries={deliveries}
            onFilteredChange={setFilteredFromReport}
          />

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
            {/* Mobile View: Delivery Cards */}
            <div className="md:hidden p-3 sm:p-4 bg-slate-100/75 dark:bg-slate-950/40 space-y-3">
              {sortedDeliveries.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  هیچ رسید تحویلی یافت نشد.
                </div>
              ) : (
                sortedDeliveries.map((del) => {
                  const delItems = ensureArray(del?.items);
                  const uniqueInvoices = Array.from(
                    new Set(delItems.map((i) => i.invoice_number || '').filter(Boolean))
                  );
                  const isCancelled = del.status === 'cancelled';

                  return (
                    <div
                      key={`mob-del-${del.id}`}
                      onClick={() => setSelectedDeliveryForDetail(del)}
                      className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition cursor-pointer overflow-hidden ${
                        isCancelled ? 'opacity-75 border-rose-200 dark:border-rose-900/50' : ''
                      }`}
                    >
                      {/* Header: Delivery # + Date + Status */}
                      <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-xs ${isCancelled ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                            {del.delivery_number}
                          </span>
                          {isCancelled && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                              لغوشده
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                          {formatJalaliDate(del.delivery_date)}
                        </span>
                      </div>

                      <div className="p-3.5 space-y-2.5">
                        {/* Customer */}
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {del.customer_name}
                        </div>

                        {/* Invoices & Driver */}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {uniqueInvoices.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">فاکتورها:</span>
                              {uniqueInvoices.map((inv) => (
                                <span
                                  key={`mob-dinv-${inv}`}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-bold"
                                >
                                  {inv}
                                </span>
                              ))}
                            </div>
                          )}

                          {del.driver_name && (
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">راننده:</span>
                              <span>{del.driver_name}</span>
                              {del.vehicle_plate && (
                                <span className="font-mono text-[10px]">({toPersianDigits(del.vehicle_plate)})</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Items: stacked vertically */}
                        {delItems.length > 0 ? (
                          <div className="flex flex-col gap-1 w-full pt-1">
                            {delItems.map((it, idx) => (
                              <div
                                key={`mob-del-it-${idx}`}
                                className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700"
                              >
                                {formatCompactItemSummary(it.quantity_meters, it)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                            {Number(del.total_meters || 0).toLocaleString('fa-IR')} متر
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div
                        className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedDeliveryForDetail(del)}
                          className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مشاهده جزئیات</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('deliveries.view')) && (
                            <button
                              type="button"
                              onClick={() => setHistoryDelivery(del)}
                              title="تاریخچه و لاگ تغییرات رسید"
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isCancelled && StorageService.hasPermission('deliveries.edit') && (
                            <button
                              onClick={() => setEditingDelivery(del)}
                              title="ویرایش اطلاعات رسید"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {!isCancelled && StorageService.hasPermission('deliveries.delete') && (
                            <button
                              onClick={() => handleCancelDeliveryDirect(del)}
                              title="لغو رسید تحویل"
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {onPrintDeliveryNote && !isCancelled && StorageService.hasPermission('deliveries.print') && (
                            <button
                              onClick={() => onPrintDeliveryNote(del)}
                              title="چاپ رسید"
                              className="p-1.5 rounded-lg text-slate-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 transition"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-center text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <SortableHeader
                    label="شماره حواله"
                    sortKey="delivery_number"
                    currentSort={delSortKey ? { key: delSortKey, direction: delSortOrder } : null}
                    onSort={handleDelSort}
                    className="w-28 text-center"
                    align="center"
                  />
                  <SortableHeader
                    label="مشتری"
                    sortKey="customer_name"
                    currentSort={delSortKey ? { key: delSortKey, direction: delSortOrder } : null}
                    onSort={handleDelSort}
                    className="text-center"
                    align="center"
                  />
                  <SortableHeader
                    label="تاریخ تحویل"
                    sortKey="delivery_date"
                    currentSort={delSortKey ? { key: delSortKey, direction: delSortOrder } : null}
                    onSort={handleDelSort}
                    className="w-28 text-center"
                    align="center"
                  />
                  <th className="py-3.5 px-4 text-center">شماره فاکتورها</th>
                  <th className="py-3.5 px-4 text-center">راننده و خودرو</th>
                  <th className="py-3.5 px-4 text-center">متراژ تحویلی به تفکیک کالا</th>
                  <th className="py-3.5 px-4 text-center w-36">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      هیچ رسید تحویلی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  sortedDeliveries.map((del) => {
                    const delItems = ensureArray(del?.items);
                    const uniqueInvoices = Array.from(
                      new Set(delItems.map((i) => i.invoice_number || '').filter(Boolean))
                    );
                    const isCancelled = del.status === 'cancelled';

                    return (
                      <tr
                        key={del.id}
                        onClick={() => setSelectedDeliveryForDetail(del)}
                        className={`transition-colors cursor-pointer ${
                          isCancelled
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 text-slate-400 hover:bg-rose-50/70'
                            : 'hover:bg-blue-50/40 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={isCancelled ? 'line-through text-slate-500' : ''}>
                              {del.delivery_number}
                            </span>
                            {isCancelled && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                لغوشده
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{del.customer_name}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-center font-bold text-xs">
                          {formatJalaliDate(del.delivery_date)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            {uniqueInvoices.map((inv) => (
                              <span
                                key={inv}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold"
                              >
                                {inv}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{del.driver_name || '—'}</div>
                          {del.vehicle_plate && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              {del.vehicle_type ? `${del.vehicle_type} - ` : ''}
                              {toPersianDigits(del.vehicle_plate)}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {delItems.length > 0 ? (
                              delItems.map((it, idx) => (
                                <div
                                  key={it.id || idx}
                                  className={`text-xs font-bold px-2.5 py-0.5 rounded-md border whitespace-nowrap shadow-2xs ${
                                    isCancelled
                                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 line-through'
                                      : 'text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {formatCompactItemSummary(it.quantity_meters, it)}
                                </div>
                              ))
                            ) : (
                              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                                {Number(del.total_meters || 0).toLocaleString('fa-IR')} متر
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* View Detail */}
                            <button
                              onClick={() => setSelectedDeliveryForDetail(del)}
                              title="مشاهده جزئیات رسید"
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* View Audit History */}
                            {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('deliveries.view')) && (
                              <button
                                type="button"
                                onClick={() => setHistoryDelivery(del)}
                                title="تاریخچه و لاگ رویدادها"
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Edit Delivery Note */}
                            {!isCancelled && StorageService.hasPermission('deliveries.edit') && (
                              <button
                                onClick={() => setEditingDelivery(del)}
                                title="ویرایش اطلاعات رسید"
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Cancel Delivery Note */}
                            {!isCancelled && StorageService.hasPermission('deliveries.delete') && (
                              <button
                                onClick={() => handleCancelDeliveryDirect(del)}
                                title="لغو (ابطال) رسید تحویل"
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Print Delivery Note */}
                            {onPrintDeliveryNote && !isCancelled && StorageService.hasPermission('deliveries.print') && (
                              <button
                                onClick={() => onPrintDeliveryNote(del)}
                                title="چاپ رسید تحویل کالا"
                                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-700 dark:hover:text-blue-300 transition cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
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
        </>
      )}

      {/* CREATE DELIVERY MODAL */}
      {selectedCustomerForDelivery && (
        <CreateDeliveryModal
          customer={selectedCustomerForDelivery}
          isOpen={true}
          onClose={() => setSelectedCustomerForDelivery(null)}
          onSuccess={() => {
            setSelectedCustomerForDelivery(null);
            loadData();
          }}
        />
      )}

      {/* EDIT DELIVERY MODAL */}
      {editingDelivery && (
        <EditDeliveryModal
          delivery={editingDelivery}
          isOpen={true}
          onClose={() => setEditingDelivery(null)}
          onSaved={() => {
            setEditingDelivery(null);
            loadData();
          }}
        />
      )}

      {/* DETAIL MODAL */}
      {selectedDeliveryForDetail && (
        <DeliveryDetailModal
          delivery={selectedDeliveryForDetail}
          isOpen={true}
          onClose={() => setSelectedDeliveryForDetail(null)}
          onPrint={onPrintDeliveryNote}
          onEdit={(del) => setEditingDelivery(del)}
          onCancelled={() => loadData()}
          onViewHistory={(del) => setHistoryDelivery(del)}
        />
      )}

      {/* AUDIT HISTORY MODAL */}
      {historyDelivery && (
        <AuditHistoryModal
          isOpen={!!historyDelivery}
          onClose={() => setHistoryDelivery(null)}
          entityType="DELIVERY"
          entityId={historyDelivery.id}
          documentNumber={historyDelivery.delivery_number}
          title="تاریخچه و رویدادهای رسید تحویل"
          subtitle={`رسید تحویل شماره ${historyDelivery.delivery_number} - مشتری: ${historyDelivery.customer_name}`}
        />
      )}
    </div>
  );
};
