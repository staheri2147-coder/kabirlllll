import React, { useState, useEffect, useRef } from 'react';
import { Invoice, Customer, Product } from '../../types';
import { StorageService } from '../../services/storageService';
import { OrderInvoiceService } from '../../services/orderInvoiceService';
import {
  formatCurrency,
  formatJalaliDate,
  getTodayISO,
  numberToWordsPersian,
  formatRialNumber,
  toPersianDigits,
} from '../../utils/jalali';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { RialInput } from '../Common/RialInput';
import { ensureArray } from '../../utils/itemUtils';
import {
  X,
  Receipt,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  FileText,
  Phone,
  MapPin,
  Search,
  ArrowRight,
  UserPlus,
  Info,
  RotateCcw,
} from 'lucide-react';

interface InvoiceEditModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditableInvoiceItem {
  id: string;
  product_id?: string;
  product_name: string;
  size: string;
  pressure: string;
  type: '' | 'PE100' | 'PE80';
  quantity_meters: number;
  unit_price: number;
  total_price: number;
  description?: string;
}

export const InvoiceEditModal: React.FC<InvoiceEditModalProps> = ({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Invoice Metadata
  const [invoiceDate, setInvoiceDate] = useState<string>(getTodayISO());
  const [description, setDescription] = useState<string>('');

  // Customer Information
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerNationalId, setCustomerNationalId] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');

  // Customer Search Dropdown State
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Items State
  const [items, setItems] = useState<EditableInvoiceItem[]>([]);

  // Additional Options (Discounts, Taxes & Signature Stamp)
  const [discountEnabled, setDiscountEnabled] = useState<boolean>(false);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxEnabled, setTaxEnabled] = useState<boolean>(false);
  const [taxPercent, setTaxPercent] = useState<number>(10);
  const [stampSignatureEnabled, setStampSignatureEnabled] = useState<boolean>(false);
  const [companySettings, setCompanySettings] = useState(StorageService.getCompanySettings());

  // Status & Feedback
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && invoice) {
      const custList = StorageService.getCustomers().filter((c) => c.is_active);
      setCustomers(custList);

      setInvoiceDate(invoice.invoice_date || getTodayISO());
      setDescription(invoice.description || '');
      setDiscountEnabled(invoice.discount_enabled || invoice.discount > 0);
      setDiscountAmount(invoice.discount || 0);
      setTaxEnabled(invoice.tax_enabled || invoice.tax_amount > 0);
      setTaxPercent(invoice.tax_percent || 10);
      setStampSignatureEnabled(Boolean(invoice.stamp_signature_enabled));
      setErrorMessage('');

      // Find and populate customer info
      setSelectedCustomerId(invoice.customer_id);
      const cus = custList.find((c) => c.id === invoice.customer_id);
      if (cus) {
        setCustomerName(cus.name);
        setCustomerNationalId(cus.national_id || cus.economic_code || '');
        setCustomerPhone(cus.phone || '');
        setCustomerAddress(cus.address || '');
      } else {
        setCustomerName(invoice.customer_name || '');
        setCustomerNationalId(invoice.customer_national_id || '');
        setCustomerPhone(invoice.customer_phone || '');
        setCustomerAddress(invoice.customer_address || '');
      }

      // Populate items with size, pressure, type preserved
      const invoiceItems = ensureArray(invoice.items);
      if (invoiceItems.length > 0) {
        setItems(
          invoiceItems.map((item, idx) => ({
            id: item.id || `inv-item-${Date.now()}-${idx}`,
            product_id: item.product_id,
            product_name: item.product_name || 'لوله پلی اتیلن',
            size: item.size || '',
            pressure: item.pressure || '',
            type: (item.type as '' | 'PE100' | 'PE80') || '',
            quantity_meters: Number(item.quantity_meters) || 1,
            unit_price: Number(item.unit_price) || 0,
            total_price: Number(item.total_price) || (Number(item.quantity_meters) || 1) * (Number(item.unit_price) || 0),
            description: item.description || '',
          }))
        );
      } else {
        setItems([
          {
            id: `item-${Date.now()}-1`,
            product_name: 'لوله پلی اتیلن',
            size: '',
            pressure: '',
            type: '',
            quantity_meters: 0,
            unit_price: 0,
            total_price: 0,
            description: '',
          },
        ]);
      }
    }
  }, [isOpen, invoice]);

  // Handle Outside Click for Customer Search Dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  if (!isOpen || !invoice) return null;

  // Filter customers for dropdown
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.national_id && c.national_id.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const selectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerNationalId(c.national_id || c.economic_code || '');
    setCustomerPhone(c.phone || '');
    setCustomerAddress(c.address || '');
    setCustomerSearch('');
    setIsSearchDropdownOpen(false);
    setErrorMessage('');
  };

  const handleClearCustomerSelection = () => {
    setSelectedCustomerId(null);
    setCustomerName('');
    setCustomerNationalId('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerSearch('');
  };

  // Item Management
  const handleAddItem = () => {
    const newItem: EditableInvoiceItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      product_name: 'لوله پلی اتیلن',
      size: '',
      pressure: '',
      type: '',
      quantity_meters: 0,
      unit_price: 0,
      total_price: 0,
      description: '',
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMessage('فاکتور باید حداقل شامل یک ردیف کالا باشد.');
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleUpdateItem = (index: number, field: keyof EditableInvoiceItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    if (field === 'quantity_meters' || field === 'unit_price') {
      const q = field === 'quantity_meters' ? Number(value) || 0 : current.quantity_meters;
      const p = field === 'unit_price' ? Number(value) || 0 : current.unit_price;
      current.total_price = Math.round(q * p);
    }

    updated[index] = current;
    setItems(updated);
  };

  // Financial Calculations
  const subtotal = items.reduce((sum, it) => sum + (it.total_price || 0), 0);
  const calculatedDiscount = discountEnabled ? Math.min(subtotal, Math.max(0, discountAmount || 0)) : 0;
  const taxableBase = Math.max(0, subtotal - calculatedDiscount);
  const calculatedTax = taxEnabled ? Math.round((taxableBase * (taxPercent || 0)) / 100) : 0;
  const finalTotal = taxableBase + calculatedTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    if (!StorageService.hasPermission('invoices.edit')) {
      setErrorMessage('شما مجوز ویرایش فاکتور را ندارید.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('لطفاً نام یا عنوان مشتری را وارد کنید.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('حداقل یک قلم کالا در فاکتور الزامی است.');
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.product_name.trim()) {
        setErrorMessage(`نام کالا در ردیف ${i + 1} نمی‌تواند خالی باشد.`);
        return;
      }
      if (!it.quantity_meters || it.quantity_meters <= 0) {
        setErrorMessage(`متراژ کالا در ردیف ${i + 1} باید بزرگتر از صفر باشد.`);
        return;
      }
      if (it.unit_price < 0) {
        setErrorMessage(`قیمت واحد در ردیف ${i + 1} نمی‌تواند منفی باشد.`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Sync Customer Details if updated
      let finalCustomerId = selectedCustomerId;
      const allCustomers = StorageService.getCustomers();
      if (selectedCustomerId) {
        const existingIdx = allCustomers.findIndex((c) => c.id === selectedCustomerId);
        if (existingIdx !== -1) {
          const c = allCustomers[existingIdx];
          const hasChanges =
            c.name !== customerName.trim() ||
            (c.national_id || '') !== customerNationalId.trim() ||
            (c.phone || '') !== customerPhone.trim() ||
            (c.address || '') !== customerAddress.trim();

          if (hasChanges) {
            allCustomers[existingIdx] = {
              ...c,
              name: customerName.trim(),
              national_id: customerNationalId.trim(),
              economic_code: customerNationalId.trim(),
              phone: customerPhone.trim(),
              address: customerAddress.trim(),
              updated_at: new Date().toISOString(),
            };
            StorageService.saveCustomers(allCustomers);
          }
        }
      }

      // 2. Prepare items for update
      const preparedItems = items.map((it) => {
        const spec = [it.size, it.pressure, it.type].filter(Boolean).join(' - ');
        return {
          product_id: it.product_id || '',
          product_name: it.product_name.trim(),
          product_code: '',
          product_spec: spec,
          size: it.size.trim(),
          pressure: it.pressure.trim(),
          type: it.type,
          quantity_meters: Number(it.quantity_meters),
          unit_price: Number(it.unit_price),
          description: it.description || '',
        };
      });

      // 3. Update Invoice via service
      const res = OrderInvoiceService.updateInvoice(invoice.id, {
        customer_id: finalCustomerId || invoice.customer_id,
        invoice_date: invoiceDate,
        items: preparedItems,
        discount_enabled: discountEnabled,
        discount: calculatedDiscount,
        tax_enabled: taxEnabled,
        tax_percent: taxPercent,
        description: description.trim(),
        stamp_signature_enabled: stampSignatureEnabled,
      });

      if (!res.success) {
        setErrorMessage(res.message);
        setIsSubmitting(false);
      } else {
        await StorageService.pushToHost();
        setIsSubmitting(false);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در ویرایش فاکتور');
      setIsSubmitting(false);
    }
  };

  if (!StorageService.hasPermission('invoices.edit')) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print animate-fade-in">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-xl border border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-2">عدم دسترسی به ویرایش فاکتور</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-5">
            شما مجوز دسترسی لازم برای ویرایش فاکتورهای فروش را ندارید.
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 transition cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in no-print">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Modal Header Banner */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>ویرایش فاکتور فروش</span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                  {invoice.invoice_number}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                مشتری: <span className="font-semibold text-slate-700">{customerName || invoice.customer_name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/40">
          {/* Top Info Bar: Order Reference & Jalali Date Picker */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">شماره فاکتور:</span>
              <span className="text-xs font-mono font-bold text-blue-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                {invoice.invoice_number}
              </span>
              {invoice.order_number && (
                <span className="text-[11px] text-slate-500 font-medium mr-2">
                  (مربوط به سفارش: <span className="font-mono font-bold text-slate-700">{invoice.order_number}</span>)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">تاریخ صدور فاکتور:</span>
              <div className="w-36">
                <JalaliDatePicker
                  value={invoiceDate}
                  onChange={(iso) => setInvoiceDate(iso)}
                  placeholder="۱۴۰۵/۰۶/۰۵"
                  className="w-full text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Customer Information Section (Mirrors OrderForm) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  ۱
                </div>
                <h3 className="text-sm font-bold text-slate-800">اطلاعات مشتری و خریدار</h3>
              </div>

              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={handleClearCustomerSelection}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>تغییر مشتری</span>
                </button>
              )}
            </div>

            {/* Customer Search Bar */}
            <div className="relative" ref={searchContainerRef}>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearch}
                  onFocus={() => setIsSearchDropdownOpen(true)}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setIsSearchDropdownOpen(true);
                  }}
                  placeholder="جستجو و انتخاب مشتری دیگر از لیست مشتریان..."
                  className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/50 hover:bg-white transition-colors"
                />
              </div>

              {/* Search Dropdown Results */}
              {isSearchDropdownOpen && (
                <div className="absolute z-20 w-full mt-1.5 bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectCustomer(c)}
                        className="w-full px-4 py-2.5 text-right hover:bg-blue-50 flex items-center justify-between text-xs transition-colors cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <span>{c.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono font-normal">({c.code})</span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                            {c.phone && <span>تلفن: {c.phone}</span>}
                            {c.national_id && <span>شناسه: {c.national_id}</span>}
                          </div>
                        </div>
                        <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                          انتخاب
                          <ArrowRight className="w-3 h-3 rotate-180" />
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-500">
                      <p>مشتری با این مشخصات یافت نشد.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4 Form Fields: Name, National ID, Phone, Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  نام و نام خانوادگی / نام شرکت <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="مثال: شرکت آبرسانی کویر"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold text-slate-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  شماره یا شناسه ملی / کد اقتصادی
                </label>
                <input
                  type="text"
                  value={customerNationalId}
                  onChange={(e) => setCustomerNationalId(e.target.value)}
                  placeholder="۱۰ یا ۱۱ رقمی..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  شماره تلفن / همراه
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  آدرس محل تحویل یا کارگاه
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="شهر، پروژه، آدرس انبار..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* 2. Invoice Items Section (Identical Layout to OrderForm) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  ۲
                </div>
                <h3 className="text-sm font-bold text-slate-800">اقلام و شرح کالاهای فاکتور (سایز، فشار و نوع)</h3>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>افزودن ردیف کالا</span>
              </button>
            </div>

            {/* Responsive Items Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-3 px-2 text-center w-10">ردیف</th>
                    <th className="py-3 px-3 text-center min-w-[150px]">نام کالا</th>
                    <th className="py-3 px-2 text-center min-w-[120px]">سایز (قطر)</th>
                    <th className="py-3 px-2 text-center min-w-[110px]">فشار کاری</th>
                    <th className="py-3 px-2 text-center min-w-[90px]">نوع</th>
                    <th className="py-3 px-2 text-center min-w-[90px]">متراژ (متر)</th>
                    <th className="py-3 px-3 text-center min-w-[130px]">قیمت واحد (ریال)</th>
                    <th className="py-3 px-3 text-center min-w-[130px]">قیمت کل (ریال)</th>
                    <th className="py-3 px-2 text-center w-12">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Row Number */}
                      <td className="py-2.5 px-2 text-center font-bold text-slate-500 font-mono">
                        {(index + 1).toLocaleString('fa-IR')}
                      </td>

                      {/* Product Name */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={item.product_name}
                          onChange={(e) => handleUpdateItem(index, 'product_name', e.target.value)}
                          placeholder="لوله پلی اتیلن..."
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-semibold text-slate-800 text-center"
                        />
                      </td>

                      {/* Size */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={item.size}
                          onChange={(e) => handleUpdateItem(index, 'size', e.target.value)}
                          placeholder="سایز (مثال: 63)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 text-center font-mono"
                        />
                      </td>

                      {/* Pressure */}
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={item.pressure}
                          onChange={(e) => handleUpdateItem(index, 'pressure', e.target.value)}
                          placeholder="فشار (مثال: 10 بار)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800 text-center"
                        />
                      </td>

                      {/* Type (Empty / PE100 / PE80) */}
                      <td className="py-2.5 px-2">
                        <select
                          value={item.type}
                          onChange={(e) => handleUpdateItem(index, 'type', e.target.value as '' | 'PE100' | 'PE80')}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-semibold bg-white text-slate-800 text-center cursor-pointer"
                        >
                          <option value="">—</option>
                          <option value="PE100">PE100</option>
                          <option value="PE80">PE80</option>
                        </select>
                      </td>

                      {/* Quantity (Meters) */}
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity_meters || ''}
                          onChange={(e) => handleUpdateItem(index, 'quantity_meters', parseFloat(e.target.value) || 0)}
                          placeholder="متراژ"
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-center font-bold font-mono text-slate-900"
                        />
                      </td>

                      {/* Unit Price (Rial) */}
                      <td className="py-2.5 px-2">
                        <RialInput
                          value={item.unit_price}
                          onChange={(val) => handleUpdateItem(index, 'unit_price', val)}
                          placeholder="قیمت واحد"
                          showWords={false}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-center font-bold font-mono text-slate-900"
                        />
                      </td>

                      {/* Total Price */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">
                        {formatRialNumber(item.total_price || 0)}
                      </td>

                      {/* Delete Button */}
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          title="حذف ردیف"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row helper button */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-blue-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن ردیف جدید</span>
              </button>
            </div>
          </div>

          {/* 3. Extra Options & Financial Summary Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left/Middle: Extra Options (Discounts, Tax, Descriptions) */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  ۳
                </div>
                <h3 className="text-sm font-bold text-slate-800">موارد اضافی و شرایط فاکتور</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Discount Option */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    discountEnabled ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={discountEnabled}
                        onChange={(e) => setDiscountEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">اعمال تخفیف</span>
                    </label>
                    {discountEnabled && (
                      <span className="text-[10px] text-blue-600 font-semibold">ریال</span>
                    )}
                  </div>

                  {discountEnabled ? (
                    <div className="mt-2 space-y-1">
                      <RialInput
                        value={discountAmount}
                        onChange={(val) => setDiscountAmount(val)}
                        placeholder="مبلغ تخفیف به ریال..."
                        showWords={true}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs font-bold font-mono text-slate-800 bg-white"
                      />
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">تخفیف روی فاکتور اعمال نمی‌گردد.</p>
                  )}
                </div>

                {/* Tax Option */}
                <div
                  className={`p-3.5 rounded-xl border transition-all ${
                    taxEnabled ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={taxEnabled}
                        onChange={(e) => setTaxEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        افزودن مالیات ارزش افزوده ({taxPercent}٪)
                      </span>
                    </label>
                  </div>

                  {taxEnabled ? (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-600">درصد مالیات:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={taxPercent}
                        onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                        className="w-16 px-2 py-1 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-center font-bold font-mono bg-white"
                      />
                      <span className="text-xs font-bold text-slate-500">درصد</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">مالیات بر ارزش افزوده محاسبه نمی‌شود.</p>
                  )}
                </div>

                {/* Stamp & Signature Option */}
                <div
                  className={`p-3.5 rounded-xl border transition-all sm:col-span-2 ${
                    stampSignatureEnabled ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={stampSignatureEnabled}
                        onChange={(e) => setStampSignatureEnabled(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500 border-slate-300 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        افزودن مهر و امضای رسمی شرکت به فاکتور
                      </span>
                    </label>
                    {companySettings.stamp_signature_url ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        مهر و امضا بارگذاری شده
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                        مهر در تنظیمات شرکت بارگذاری نشده است
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                    با انتخاب این گزینه، مهر و امضای رسمی بارگذاری‌شده در تنظیمات عمومی شرکت به‌صورت خودکار در نسخه چاپی فاکتور درج خواهد شد.
                  </p>
                </div>
              </div>

              {/* Description / Terms */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  توضیحات و شرایط فاکتور
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="شرایط تحویل، نحوه بارگیری، مشخصات استاندارد ISIRI 14427 یا توافقات پرداخت..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Right: Financial Totals Summary Card & Action Buttons */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    ۴
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">خلاصه مالی و جمع نهایی فاکتور</h3>
                </div>

                <div className="space-y-3 mt-4 text-xs">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-slate-600">
                    <span>جمع کل اقلام:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>

                  {/* Discount */}
                  {discountEnabled && (
                    <div className="flex justify-between items-center text-rose-600 font-medium">
                      <span>مبلغ تخفیف:</span>
                      <span className="font-mono font-bold">
                        - {formatCurrency(calculatedDiscount)}
                      </span>
                    </div>
                  )}

                  {/* Tax */}
                  {taxEnabled && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>مالیات ارزش افزوده ({taxPercent}٪):</span>
                      <span className="font-mono font-bold text-slate-800">
                        + {formatCurrency(calculatedTax)}
                      </span>
                    </div>
                  )}

                  {/* Final Payable Total */}
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-900">مبلغ نهایی فاکتور:</span>
                    <div className="text-left">
                      <div className="text-base font-black text-blue-700 font-mono">
                        {formatCurrency(finalTotal)}
                      </div>
                    </div>
                  </div>

                  {/* Words Representation */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 text-[11px] text-slate-700">
                    <span className="font-bold text-slate-800">به حروف: </span>
                    <span>{numberToWordsPersian(finalTotal)} ریال</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'در حال ذخیره...' : 'ذخیره تغییرات فاکتور'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
