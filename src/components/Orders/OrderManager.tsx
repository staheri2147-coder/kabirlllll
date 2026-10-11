import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { OrderInvoiceService } from '../../services/orderInvoiceService';
import { Order, Customer, OrderStatus } from '../../types';
import { formatCurrency, formatJalaliDate, toPersianDigits } from '../../utils/jalali';
import { formatCompactItemSummary } from '../../utils/formatItemSummary';
import { ensureArray } from '../../utils/itemUtils';
import { OrderForm } from './OrderForm';
import { OrderDetailModal } from './OrderDetailModal';
import { AdvancedFilterReport, ReportItem } from '../Common/AdvancedFilterReport';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import { SortableHeader } from '../Common/SortableHeader';
import {
  Plus,
  Edit2,
  FileText,
  CheckCircle2,
  XCircle,
  Printer,
  Receipt,
  History,
} from 'lucide-react';

interface OrderManagerProps {
  initialCustomerId?: string;
  autoOpenNew?: boolean;
  onCloseNewOrder?: () => void;
  onPrintProforma?: (order: Order) => void;
  onPrintOrder?: (order: Order) => void;
  onNavigateToInvoice?: (invoiceId: string) => void;
  onNavigateToInvoices?: () => void;
}

export const OrderManager: React.FC<OrderManagerProps> = ({
  initialCustomerId,
  autoOpenNew,
  onCloseNewOrder,
  onPrintProforma,
  onPrintOrder,
  onNavigateToInvoice,
  onNavigateToInvoices,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredReportItems, setFilteredReportItems] = useState<ReportItem[]>([]);

  // View Mode: 'list' | 'form'
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // Detail Modal
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  // Audit History Modal
  const [historyOrder, setHistoryOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadData();
    if (autoOpenNew) {
      setIsFormOpen(true);
      setEditingOrderId(null);
    }
  }, [autoOpenNew]);

  useEffect(() => {
    const handleDbSynced = () => {
      if (!isFormOpen) {
        loadData();
      }
    };
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    return () => {
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
    };
  }, [isFormOpen]);

  const loadData = () => {
    setOrders(StorageService.getOrders());
    setCustomers(StorageService.getCustomers().filter((c) => c.is_active));
  };

  const handleOpenNewOrder = () => {
    if (!StorageService.hasPermission('orders.create')) {
      alert('شما دسترسی لازم برای ثبت سفارش جدید را ندارید.');
      return;
    }
    setEditingOrderId(null);
    setIsFormOpen(true);
  };

  const handleOpenEditOrder = (order: Order) => {
    if (!StorageService.hasPermission('orders.edit')) {
      alert('شما دسترسی لازم برای ویرایش سفارش را ندارید.');
      return;
    }
    if (order.status === 'cancelled') {
      alert('سفارش لغوشده قابل ویرایش نیست.');
      return;
    }
    setEditingOrderId(order.id);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingOrderId(null);
    if (onCloseNewOrder) {
      onCloseNewOrder();
    }
  };

  const handleFormSuccess = (savedOrder: Order, generatedInvoice?: any) => {
    setIsFormOpen(false);
    setEditingOrderId(null);
    if (savedOrder) {
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === savedOrder.id);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = savedOrder;
          return next;
        }
        return [savedOrder, ...prev];
      });
    }
    loadData();
    if (generatedInvoice && onNavigateToInvoices) {
      onNavigateToInvoices();
    }
  };

  const handleConfirmOrder = async (order: Order) => {
    if (!StorageService.hasPermission('orders.confirm')) {
      alert('شما دسترسی لازم برای تایید سفارش و صدور فاکتور را ندارید.');
      return;
    }
    const confirmPrompt = window.confirm(
      `آیا از تایید سفارش شماره ${order.order_number} به مبلغ ${formatCurrency(
        order.final_total
      )} اطمینان دارید؟\nبا تایید، فاکتور فروش صادر و بدهی به حساب مشتری افزوده می‌شود.`
    );
    if (!confirmPrompt) return;

    const res = OrderInvoiceService.confirmOrder(order.id);
    await StorageService.pushToHost();
    alert(res.message);
    loadData();
  };

  const handleCancelOrder = async (order: Order) => {
    if (!StorageService.hasPermission('orders.delete')) {
      alert('شما دسترسی لازم برای لغو سفارش را ندارید.');
      return;
    }
    const confirmPrompt = window.confirm(
      `آیا از لغو سفارش شماره ${order.order_number} اطمینان دارید؟`
    );
    if (!confirmPrompt) return;

    const res = OrderInvoiceService.cancelOrder(order.id);
    await StorageService.pushToHost();
    alert(res.message);
    loadData();
  };

  // Convert orders to ReportItem format for AdvancedFilterReport
  const allReportItems: ReportItem[] = React.useMemo(() => {
    return (orders || []).filter(Boolean).map((o) => {
      const orderItems = ensureArray(o?.items);
      const itemsSummary =
        orderItems.filter(Boolean).map((it) => formatCompactItemSummary(it.quantity_meters, it)).join(' | ') ||
        'بدون قلم کالا';
      const totalMeters = orderItems.filter(Boolean).reduce((s, it) => s + (Number(it?.quantity_meters) || 0), 0);
      const statusLabel =
        o.status === 'confirmed'
          ? 'تاییدشده'
          : o.status === 'draft'
          ? 'پیش‌نویس'
          : 'لغوشده';

      return {
        id: o.id,
        number: o.order_number || '-',
        date: o.order_date || o.created_at || '',
        customerName: o.customer_name || 'مشتری نامشخص',
        customerCode: o.customer_code || '',
        status: o.status,
        statusLabel,
        itemsSummary,
        itemsCount: orderItems.length,
        totalMeters,
        finalTotal: Number(o.final_total) || 0,
        details:
          orderItems.filter(Boolean).map((it) => ({
            productName: it.product_name || 'کالا',
            size: it.size || '',
            pressure: it.pressure || '',
            type: it.type || '',
            meters: Number(it.quantity_meters) || 0,
            unitPrice: Number(it.unit_price) || 0,
            totalPrice: Number(it.total_price) || 0,
          })) || [],
      };
    });
  }, [orders]);

  // Extract unique options for filter dropdowns
  const availableSizes = React.useMemo(() => {
    const set = new Set<string>();
    (orders || []).filter(Boolean).forEach((o) => ensureArray(o?.items).filter(Boolean).forEach((i) => i?.size && set.add(i.size)));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [orders]);

  const availablePressures = React.useMemo(() => {
    const set = new Set<string>();
    (orders || []).filter(Boolean).forEach((o) => ensureArray(o?.items).filter(Boolean).forEach((i) => i?.pressure && set.add(i.pressure)));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [orders]);

  const availableTypes = React.useMemo(() => {
    const set = new Set<string>();
    (orders || []).filter(Boolean).forEach((o) => ensureArray(o?.items).filter(Boolean).forEach((i) => i?.type && set.add(i.type)));
    return Array.from(set);
  }, [orders]);

  // Filtered orders matching the report items with filtered details and calculated amounts
  const displayedOrders = React.useMemo(() => {
    return filteredReportItems
      .map((r) => {
        const o = orders.find((ord) => ord.id === r.id);
        return {
          order: o,
          reportItem: r,
        };
      })
      .filter((x): x is { order: Order; reportItem: ReportItem } => Boolean(x.order));
  }, [filteredReportItems, orders]);

  // Sorting state - defaults to newest orders first (order_date desc)
  const [sortKey, setSortKey] = useState<string>('order_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'order_date' ? 'desc' : 'asc');
    }
  };

  const sortedDisplayedOrders = React.useMemo(() => {
    return [...displayedOrders].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'order_number') {
        valA = parseInt(String(a.order.order_number).replace(/\D/g, ''), 10) || 0;
        valB = parseInt(String(b.order.order_number).replace(/\D/g, ''), 10) || 0;
      } else if (sortKey === 'customer_name') {
        valA = a.order.customer_name || '';
        valB = b.order.customer_name || '';
      } else if (sortKey === 'order_date') {
        valA = new Date(a.order.order_date).getTime() || 0;
        valB = new Date(b.order.order_date).getTime() || 0;
      } else if (sortKey === 'final_total') {
        valA = a.reportItem.finalTotal || 0;
        valB = b.reportItem.finalTotal || 0;
      } else if (sortKey === 'status') {
        valA = a.order.status || '';
        valB = b.order.status || '';
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [displayedOrders, sortKey, sortOrder]);

  // If in Form mode, render the OrderForm
  if (isFormOpen) {
    return (
      <OrderForm
        initialOrderId={editingOrderId}
        initialCustomerId={initialCustomerId}
        onSuccess={handleFormSuccess}
        onCancel={handleCloseForm}
        onPrintProforma={onPrintOrder || onPrintProforma}
      />
    );
  }

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            تایید شده
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
            <XCircle className="w-3.5 h-3.5" />
            لغو شده
          </span>
        );
      case 'draft':
      default:
        return (
          <span className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
            <FileText className="w-3.5 h-3.5" />
            پیش‌نویس
          </span>
        );
    }
  };

  if (!StorageService.hasPermission('orders.view')) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto mt-12 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          عدم دسترسی به بخش سفارشات
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          شما مجوز دسترسی لازم برای مشاهده لیست سفارش‌ها و پیش‌فاکتورها را ندارید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>مدیریت سفارشات و پیش‌فاکتورها</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            ثبت، صدور پیش‌فاکتور، فیلتر پیشرفته و تبدیل سفارشات به فاکتور نهایی
          </p>
        </div>

        {StorageService.hasPermission('orders.create') && (
          <button
            onClick={handleOpenNewOrder}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت سفارش جدید</span>
          </button>
        )}
      </div>

      {/* Advanced Filter & Report Section */}
      <AdvancedFilterReport
        title="سفارشات و پیش‌فاکتورها"
        reportType="orders"
        allItems={allReportItems}
        availableSizes={availableSizes}
        availablePressures={availablePressures}
        availableTypes={availableTypes}
        statusOptions={[
          { value: 'all', label: 'همه وضعیت‌ها' },
          { value: 'draft', label: 'پیش‌نویس' },
          { value: 'confirmed', label: 'تاییدشده (فاکتور صادرشده)' },
          { value: 'cancelled', label: 'لغوشده' },
        ]}
        onFilteredItemsChange={setFilteredReportItems}
      />

      {/* Orders Container: Mobile Cards (<md) & Desktop Table (>=md) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="md:hidden p-3 sm:p-4 bg-slate-100/75 dark:bg-slate-950/40 space-y-3">
          {displayedOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              سفارشی با مشخصات فیلترشده یافت نشد.
            </div>
          ) : (
            sortedDisplayedOrders.map(({ order, reportItem }) => (
              <div
                key={`mob-${order.id}`}
                onClick={() => setViewingOrder(order)}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition cursor-pointer overflow-hidden active:scale-[0.99]"
              >
                {/* Header: Order Number + Jalali Date + Status */}
                <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-100 dark:border-blue-900/50">
                      {order.order_number}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {formatJalaliDate(order.order_date)}
                    </span>
                  </div>
                  <div>{getStatusBadge(order.status)}</div>
                </div>

                {/* Customer Info & Details */}
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {order.customer_name}
                    </div>
                  </div>

                  {/* Items list: each item stacked on its own row */}
                  {reportItem.details && reportItem.details.length > 0 && (
                    <div className="flex flex-col gap-1 w-full pt-1">
                      {reportItem.details.map((item, iIdx) => (
                        <div
                          key={`mob-item-${iIdx}`}
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

                {/* Amount & Actions */}
                <div className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {/* Actions on the RIGHT in RTL */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {StorageService.hasPermission('orders.print') && (onPrintOrder || onPrintProforma) && (
                      <button
                        type="button"
                        onClick={() =>
                          onPrintOrder
                            ? onPrintOrder(order)
                            : onPrintProforma && onPrintProforma(order)
                        }
                        className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                        title="چاپ پیش‌فاکتور"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setHistoryOrder(order)}
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                      title="تاریخچه"
                    >
                      <History className="w-4 h-4" />
                    </button>

                    {order.status === 'draft' && (
                      <>
                        {StorageService.hasPermission('orders.confirm') && (
                          <button
                            type="button"
                            onClick={() => handleConfirmOrder(order)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تایید</span>
                          </button>
                        )}
                        {StorageService.hasPermission('orders.delete') && (
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(order)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                            title="لغو"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}

                    {order.status === 'confirmed' && order.invoice_id && onNavigateToInvoice && (
                      <button
                        type="button"
                        onClick={() => onNavigateToInvoice(order.invoice_id!)}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-bold text-xs hover:bg-blue-100 transition flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>فاکتور</span>
                      </button>
                    )}
                  </div>

                  {/* Final Amount on the LEFT in RTL */}
                  <div className="text-left">
                    <span className="text-[10px] text-slate-400 block">مبلغ نهایی:</span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {formatCurrency(reportItem.finalTotal, false)} <span className="text-[10px] font-normal text-slate-500">ریال</span>
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Full Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-center text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-100/80">
                <SortableHeader
                  label="شماره سفارش"
                  sortKey="order_number"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  className="w-24 text-center"
                  align="center"
                />
                <SortableHeader
                  label="مشتری"
                  sortKey="customer_name"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  className="min-w-[130px] text-center"
                  align="center"
                />
                <SortableHeader
                  label="تاریخ ثبت"
                  sortKey="order_date"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  className="w-24 text-center"
                  align="center"
                />
                <th className="py-3.5 px-4 text-center">شرح کالا (متراژ و مشخصات)</th>
                <SortableHeader
                  label="مبلغ نهایی (ریال)"
                  sortKey="final_total"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  className="w-32 sm:w-36 text-center"
                  align="center"
                />
                <SortableHeader
                  label="وضعیت"
                  sortKey="status"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  className="w-36 min-w-[130px] text-center"
                  align="center"
                />
                <th className="py-3.5 px-3 text-center w-36 min-w-[140px]">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDisplayedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    سفارشی با مشخصات فیلترشده یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedDisplayedOrders.map(({ order, reportItem }) => (
                  <tr
                    key={order.id}
                    onClick={() => setViewingOrder(order)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-slate-200 text-center font-mono">
                      {order.order_number}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                        {order.customer_name}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600 text-center font-bold text-xs">
                      {formatJalaliDate(order.order_date)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center justify-center gap-1">
                        {reportItem.details && reportItem.details.length > 0 ? (
                          reportItem.details.map((item, iIdx) => (
                            <div
                              key={`${order.id}-${iIdx}`}
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
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(order.status)}</td>
                    <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. Print Proforma / Order */}
                        {StorageService.hasPermission('orders.print') && (onPrintOrder || onPrintProforma) && (
                          <button
                            type="button"
                            onClick={() =>
                              onPrintOrder
                                ? onPrintOrder(order)
                                : onPrintProforma && onPrintProforma(order)
                            }
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                            title="چاپ پیش‌فاکتور / سفارش"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}

                        {/* 2. Audit History */}
                        {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('orders.view')) && (
                          <button
                            type="button"
                            onClick={() => setHistoryOrder(order)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="تاریخچه و لاگ تغییرات سفارش"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}

                        {/* 3. Confirm / Reject buttons for Draft orders */}
                        {order.status === 'draft' && (
                          <>
                            {StorageService.hasPermission('orders.confirm') && (
                              <button
                                type="button"
                                onClick={() => handleConfirmOrder(order)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 transition cursor-pointer"
                                title="تایید و صدور فاکتور"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}
                            {StorageService.hasPermission('orders.delete') && (
                              <button
                                type="button"
                                onClick={() => handleCancelOrder(order)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                title="لغو سفارش"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}

                        {/* View Invoice button for Confirmed orders */}
                        {order.status === 'confirmed' && order.invoice_id && onNavigateToInvoice && (
                          <button
                            type="button"
                            onClick={() => onNavigateToInvoice(order.invoice_id!)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="مشاهده فاکتور فروش صادرشده"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={viewingOrder}
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        onPrint={
          StorageService.hasPermission('orders.print')
            ? (ord) => (onPrintOrder ? onPrintOrder(ord) : onPrintProforma && onPrintProforma(ord))
            : undefined
        }
        onConfirm={StorageService.hasPermission('orders.confirm') ? handleConfirmOrder : undefined}
        onCancelOrder={StorageService.hasPermission('orders.delete') ? handleCancelOrder : undefined}
        onEdit={
          StorageService.hasPermission('orders.edit')
            ? (ord) => {
                setViewingOrder(null);
                handleOpenEditOrder(ord);
              }
            : undefined
        }
        onNavigateToInvoice={onNavigateToInvoice}
        onViewHistory={(ord) => setHistoryOrder(ord)}
      />

      {/* Order Audit History Modal */}
      {historyOrder && (
        <AuditHistoryModal
          isOpen={!!historyOrder}
          onClose={() => setHistoryOrder(null)}
          entityType="ORDER"
          entityId={historyOrder.id}
          title={`تاریخچه تغییرات سفارش شماره ${historyOrder.order_number}`}
        />
      )}
    </div>
  );
};
