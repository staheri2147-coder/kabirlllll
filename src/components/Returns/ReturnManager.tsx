import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { DeliveryReturnService } from '../../services/deliveryReturnService';
import { ReturnDoc, Customer } from '../../types';
import { formatCurrency, formatJalaliDate, getTodayISO, formatNumber } from '../../utils/jalali';
import { exportToExcel } from '../../utils/exportExcel';
import { ensureArray } from '../../utils/itemUtils';
import { CustomerSelectSearch } from '../Common/CustomerSelectSearch';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { SortableHeader } from '../Common/SortableHeader';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import {
  Search,
  Plus,
  RotateCcw,
  Printer,
  Download,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  History,
} from 'lucide-react';

interface ReturnManagerProps {
  initialCustomerId?: string;
  onPrintReturnDoc?: (returnDoc: ReturnDoc) => void;
}

export const ReturnManager: React.FC<ReturnManagerProps> = ({
  initialCustomerId,
  onPrintReturnDoc,
}) => {
  const [returns, setReturns] = useState<ReturnDoc[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State (Create or Edit)
  const [showModal, setShowModal] = useState(false);
  const [editingReturn, setEditingReturn] = useState<ReturnDoc | null>(null);
  const [historyReturn, setHistoryReturn] = useState<ReturnDoc | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [returnDate, setReturnDate] = useState<string>(getTodayISO());
  const [reason, setReason] = useState<string>('مازاد پروژه / تغییر نقشه لوله‌گذاری');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Eligible Delivered Items
  const [eligibleItems, setEligibleItems] = useState<
    {
      invoice_id: string;
      invoice_number: string;
      product_id: string;
      product_name: string;
      product_code: string;
      product_spec: string;
      unit_price: number;
      delivered_meters: number;
      already_returned_meters: number;
      max_returnable_meters: number;
      return_now_meters: number;
      is_selected: boolean;
    }[]
  >([]);

  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
    const handleDbSynced = () => {
      if (!showModal) {
        loadData();
      }
    };
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    return () => {
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
    };
  }, [showModal]);

  const loadData = () => {
    setReturns(StorageService.getReturns());
    setCustomers(StorageService.getCustomers().filter((c) => c.is_active));
  };

  const handleCustomerChange = (customerId: string, excludeReturnId?: string, existingItems?: ReturnDoc['items']) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setEligibleItems([]);
      return;
    }

    const items = DeliveryReturnService.getCustomerDeliveredItemsForReturn(customerId, excludeReturnId);
    setEligibleItems(
      items.map((item) => {
        const existing = existingItems?.find(
          (ex) => ex.invoice_id === item.invoice_id && ex.product_id === item.product_id
        );

        return {
          invoice_id: item.invoice_id,
          invoice_number: item.invoice_number,
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          product_spec: item.product_spec || '',
          unit_price: existing ? existing.unit_price : item.unit_price,
          delivered_meters: item.delivered_quantity,
          already_returned_meters: item.returned_quantity,
          max_returnable_meters: item.available_for_return,
          return_now_meters: existing ? existing.quantity_meters : item.available_for_return,
          is_selected: !!existing, // In edit mode, select the existing ones. In create mode, false
        };
      })
    );
  };

  const handleOpenAdd = () => {
    setEditingReturn(null);
    const firstCust = initialCustomerId || (customers[0]?.id || '');
    setReturnDate(getTodayISO());
    setReason('مازاد لوله در محل پروژه و عودت به کارخانه');
    setDescription('');
    setErrorMessage('');
    setIsSubmitting(false);
    setShowModal(true);
    handleCustomerChange(firstCust);
  };

  const handleOpenEdit = (ret: ReturnDoc) => {
    setEditingReturn(ret);
    setSelectedCustomerId(ret.customer_id);
    setReturnDate(ret.return_date);
    setReason(ret.reason);
    setDescription(ret.description || '');
    setErrorMessage('');
    setIsSubmitting(false);
    setShowModal(true);
    handleCustomerChange(ret.customer_id, ret.id, ret.items);
  };

  const handleDeleteReturn = (ret: ReturnDoc) => {
    if (
      window.confirm(
        `آیا از ابطال و حذف سند برگشت از فروش شماره ${ret.return_number} به مبلغ ${formatCurrency(
          ret.total_amount
        )} ریال اطمینان دارید؟`
      )
    ) {
      const res = DeliveryReturnService.deleteReturn(ret.id);
      if (!res.success) {
        alert(res.message);
      } else {
        loadData();
      }
    }
  };

  const handleToggleItemSelect = (index: number) => {
    setEligibleItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, is_selected: !item.is_selected } : item))
    );
  };

  const handleItemReturnQtyChange = (index: number, val: number) => {
    setEligibleItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const safeVal = Math.min(item.max_returnable_meters, Math.max(0, val));
        return { ...item, return_now_meters: safeVal };
      })
    );
  };

  const handleItemUnitPriceChange = (index: number, val: number) => {
    setEligibleItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unit_price: Math.max(0, val) } : item))
    );
  };

  // Calculate total return amount preview
  const calculatedReturnAmount = eligibleItems
    .filter((i) => i.is_selected && i.return_now_meters > 0)
    .reduce((sum, i) => sum + Math.round(i.return_now_meters * i.unit_price), 0);

  const handleSaveReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!selectedCustomerId) {
      setErrorMessage('انتخاب مشتری الزامی است.');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('ذکر علت برگشت از فروش الزامی است.');
      return;
    }

    const selectedToReturn = eligibleItems.filter((i) => i.is_selected && i.return_now_meters > 0);
    if (selectedToReturn.length === 0) {
      setErrorMessage('حداقل یک قلم کالا با متراژ برگشت بزرگتر از صفر باید انتخاب شود.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (editingReturn) {
        // Edit / Update mode
        const res = DeliveryReturnService.updateReturn(editingReturn.id, {
          return_date: returnDate,
          reason: reason.trim(),
          description: description.trim() || undefined,
          items: selectedToReturn.map((it) => ({
            invoice_id: it.invoice_id,
            product_id: it.product_id,
            quantity_meters: it.return_now_meters,
            unit_price: it.unit_price,
          })),
        });

        if (!res.success) {
          setIsSubmitting(false);
          setErrorMessage(res.message || 'خطا در ویرایش سند برگشت');
          return;
        }
      } else {
        // Create mode
        const res = DeliveryReturnService.createReturn({
          customer_id: selectedCustomerId,
          return_date: returnDate,
          reason: reason.trim(),
          description: description.trim() || undefined,
          items: selectedToReturn.map((it) => ({
            invoice_id: it.invoice_id,
            product_id: it.product_id,
            quantity_meters: it.return_now_meters,
            unit_price: it.unit_price,
          })),
        });

        if (!res.success) {
          setIsSubmitting(false);
          setErrorMessage(res.message || 'خطا در ثبت سند برگشت');
          return;
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});

      setIsSubmitting(false);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'خطای غیرمنتظره در ثبت برگشت از فروش');
    }
  };

  const handleExportExcel = () => {
    const data = filteredReturns.map((r, idx) => ({
      ردیف: idx + 1,
      شماره_برگشت: r.return_number,
      کد_مشتری: r.customer_code,
      نام_مشتری: r.customer_name,
      تاریخ_برگشت: formatJalaliDate(r.return_date),
      علت_برگشت: r.reason,
      مبلغ_بستانکاری_ریال: r.total_amount,
      اقلام_مرجوعی: ensureArray(r.items).map((i) => `${i.product_name} (${i.quantity_meters} متر از ${i.invoice_number})`).join(' | '),
      ثبت_کننده: r.created_by,
    }));

    exportToExcel({
      fileName: 'لیست_اسناد_برگشت_از_فروش',
      sheetName: 'برگشت‌ها',
      data,
    });
  };

  const filteredReturns = returns.filter((r) => {
    const matchSearch =
      r.return_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customer_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchQuery.toLowerCase());

    return matchSearch;
  });

  // Sorting state - defaults to newest returns first (return_date desc)
  const [sortKey, setSortKey] = useState<string>('return_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'return_date' ? 'desc' : 'asc');
    }
  };

  const sortedReturns = React.useMemo(() => {
    return [...filteredReturns].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'return_number') {
        valA = parseInt(String(a.return_number).replace(/\D/g, ''), 10) || 0;
        valB = parseInt(String(b.return_number).replace(/\D/g, ''), 10) || 0;
      } else if (sortKey === 'customer_name') {
        valA = a.customer_name || '';
        valB = b.customer_name || '';
      } else if (sortKey === 'return_date') {
        valA = new Date(a.return_date).getTime() || 0;
        valB = new Date(b.return_date).getTime() || 0;
      } else if (sortKey === 'total_meters') {
        valA = a.total_meters || 0;
        valB = b.total_meters || 0;
      } else if (sortKey === 'total_amount') {
        valA = a.total_amount || 0;
        valB = b.total_amount || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredReturns, sortKey, sortOrder]);

  const totalReturnMeters = returns.reduce((s, r) => s + (r.total_meters || 0), 0);
  const totalReturnAmount = returns.reduce((s, r) => s + (r.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">
            برگشت از فروش و مرجوعی کالا (Sales Returns)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ثبت و ویرایش مرجوعی بر مبنای متراژ واقعی تحویل‌شده، بستانکارسازی خودکار حساب مشتری و کنترل موجودی
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>خروجی اکسل</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت برگشت از فروش جدید</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجو در شماره برگشت، نام مشتری، کد یا علت..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">مجموع متراژ مرجوعی:</span>
            <span className="font-bold font-mono text-slate-900">{formatNumber(totalReturnMeters)} متر</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">مجموع بستانکاری ناشی از برگشت:</span>
            <span className="font-black text-emerald-600">{formatCurrency(totalReturnAmount, true)}</span>
          </div>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <SortableHeader
                  label="شماره سند برگشت"
                  sortKey="return_number"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="مشتری"
                  sortKey="customer_name"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="تاریخ برگشت"
                  sortKey="return_date"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
                <th className="py-3 px-4">علت برگشت</th>
                <th className="py-3 px-4">اقلام مرجوعی</th>
                <SortableHeader
                  label="مجموع متراژ"
                  sortKey="total_meters"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
                <SortableHeader
                  label="مبلغ بستانکاری (ریال)"
                  sortKey="total_amount"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="right"
                />
                <th className="py-3 px-4">ثبت‌کننده</th>
                <th className="py-3 px-4 text-center w-28">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    سند برگشت از فروشی یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-black text-rose-700">{ret.return_number}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{ret.customer_name}</div>
                      <div className="text-[11px] text-slate-600 font-mono">{ret.customer_code}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatJalaliDate(ret.return_date)}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{ret.reason}</td>
                    <td className="py-3 px-4 text-slate-800 max-w-sm">
                      {ensureArray(ret.items).map((i, idx) => (
                        <div key={idx} className="truncate">
                          • {i.product_name} ({formatNumber(i.quantity_meters)} متر از {i.invoice_number})
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {formatNumber(ret.total_meters)} متر
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-600">
                      {formatCurrency(ret.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{ret.created_by}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('returns.view')) && (
                          <button
                            type="button"
                            onClick={() => setHistoryReturn(ret)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                            title="تاریخچه و لاگ تغییرات سند برگشت"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onPrintReturnDoc && onPrintReturnDoc(ret)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                          title="چاپ سند برگشت از فروش"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(ret)}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                          title="ویرایش سند برگشت از فروش"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteReturn(ret)}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="ابطال و حذف سند برگشت"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Return Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingReturn ? `ویرایش سند برگشت از فروش (${editingReturn.return_number})` : 'ثبت سند برگشت از فروش (Sales Return)'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveReturn} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <CustomerSelectSearch
                    label="انتخاب یا جستجوی مشتری"
                    required
                    disabled={!!editingReturn}
                    selectedCustomerId={selectedCustomerId}
                    onSelectCustomer={(c) => {
                      handleCustomerChange(c.id);
                      setErrorMessage('');
                    }}
                    onCustomerCreated={(c) => {
                      loadData();
                      handleCustomerChange(c.id);
                    }}
                  />
                </div>

                <div>
                  <JalaliDatePicker
                    label="تاریخ برگشت (خورشیدی)"
                    required
                    value={returnDate}
                    onChange={(isoDate) => setReturnDate(isoDate)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  علت برگشت از فروش <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: مازاد پروژه، عدم انطباق با سفارش، تغییر سایز..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-medium text-slate-900 focus:outline-none"
                />
              </div>

              {/* Eligible Delivered Items Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900">
                    اقلام تحویل‌شده مجاز جهت مرجوعی (انتخاب مستقل، متراژ و قیمت واحد):
                  </span>
                  <span className="text-[11px] text-rose-600 font-medium">
                    (کنترل دقیق تحویل واقعی)
                  </span>
                </div>

                {eligibleItems.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
                    هیچ کالای تحویل‌شده‌ای با قابلیت مرجوعی برای این مشتری یافت نشد.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">انتخاب</th>
                          <th className="py-2.5 px-3">فاکتور مبدا</th>
                          <th className="py-2.5 px-3">کالا</th>
                          <th className="py-2.5 px-3">کل تحویل</th>
                          <th className="py-2.5 px-3 text-rose-700">سقف مجاز برگشت</th>
                          <th className="py-2.5 px-3 text-blue-700">متراژ برگشت (متر)</th>
                          <th className="py-2.5 px-3">قیمت واحد ریالی</th>
                          <th className="py-2.5 px-3">مبلغ کل ردیف (ریال)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {eligibleItems.map((item, idx) => {
                          const lineTotal = Math.round((item.return_now_meters || 0) * (item.unit_price || 0));

                          return (
                            <tr key={`${item.invoice_id}_${item.product_id}_${idx}`} className={item.is_selected ? 'bg-rose-50/30' : 'opacity-60'}>
                              <td className="py-2.5 px-3">
                                <input
                                  type="checkbox"
                                  checked={item.is_selected}
                                  onChange={() => handleToggleItemSelect(idx)}
                                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{item.invoice_number}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900">{item.product_name}</td>
                              <td className="py-2.5 px-3 font-mono">{formatNumber(item.delivered_meters)} م</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-rose-700">
                                {formatNumber(item.max_returnable_meters)} م
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.max_returnable_meters}
                                  step="any"
                                  disabled={!item.is_selected}
                                  value={item.return_now_meters || ''}
                                  onChange={(e) => handleItemReturnQtyChange(idx, parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono font-bold text-center text-rose-700 focus:outline-none disabled:bg-slate-100"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  disabled={!item.is_selected}
                                  value={item.unit_price || ''}
                                  onChange={(e) => handleItemUnitPriceChange(idx, parseFloat(e.target.value) || 0)}
                                  className="w-28 px-2.5 py-1 rounded-lg bg-white border border-slate-200 font-mono text-center focus:outline-none disabled:bg-slate-100"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {item.is_selected ? formatCurrency(lineTotal) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total Calculation Preview */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-900">
                  مبلغ کل بستانکاری حاصل از این مرجوعی (کسر از بدهی مشتری):
                </span>
                <span className="font-black text-sm text-emerald-700 font-mono">
                  {formatCurrency(calculatedReturnAmount, true)}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  توضیحات و سوابق صورتجلسه بازگشت بار
                </label>
                <textarea
                  rows={2}
                  placeholder="محل تخلیه، تحویل‌گیرنده در کارخانه، تاییدیه کنترل کیفی..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || eligibleItems.length === 0}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ثبت سند برگشت...</span>
                    </>
                  ) : (
                    <span>{editingReturn ? 'ذخیره تغییرات سند برگشت' : 'ثبت برگشت و بستانکارسازی حساب'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Audit History Modal */}
      {historyReturn && (
        <AuditHistoryModal
          isOpen={!!historyReturn}
          onClose={() => setHistoryReturn(null)}
          entityType="RETURN"
          entityId={historyReturn.id}
          documentNumber={historyReturn.return_number}
          title="تاریخچه و رویدادهای سند برگشت از فروش"
          subtitle={`سند برگشت شماره ${historyReturn.return_number} - مشتری: ${historyReturn.customer_name}`}
        />
      )}
    </div>
  );
};

