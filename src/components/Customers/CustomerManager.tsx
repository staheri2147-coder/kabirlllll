import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { CustomerAccountService } from '../../services/accountService';
import { DeliveryReturnService } from '../../services/deliveryReturnService';
import {
  Customer,
  CustomerAccountSummary,
  Order,
  Invoice,
  Payment,
  Adjustment,
  DeliveryNote,
  ReturnDoc,
} from '../../types';
import { formatCurrency, formatJalaliDate, getTodayISO, toPersianDigits, formatNumber } from '../../utils/jalali';
import { exportToExcel } from '../../utils/exportExcel';
import {
  CustomerPaymentModal,
  CustomerAdjustmentModal,
  CustomerReturnModal,
} from './CustomerActionModals';
import { CreateDeliveryModal } from '../Deliveries/CreateDeliveryModal';
import { DeliveryFilterReport } from '../Deliveries/DeliveryFilterReport';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import { createPortal } from 'react-dom';
import { PrintHeader } from '../Print/PrintHeader';
import { PrintModalControlBar } from '../Print/PrintModalControlBar';
import { ZoomablePrintContainer } from '../Print/ZoomablePrintContainer';
import { exportElementAsPng } from '../../utils/exportImage';
import { SortableHeader } from '../Common/SortableHeader';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  FileText,
  CreditCard,
  Scale,
  Truck,
  RotateCcw,
  Receipt,
  Download,
  Printer,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Building,
  History,
  ArrowRight,
} from 'lucide-react';

interface CustomerManagerProps {
  initialCustomerId?: string;
  onNavigate?: (tab: string, extraData?: any, subTab?: 'company' | 'users' | 'backup' | 'audit') => void;
  onOpenOrderForCustomer?: (customerId: string) => void;
  onOpenPaymentForCustomer?: (customerId: string) => void;
  onOpenAdjustmentForCustomer?: (customerId: string) => void;
  onOpenDeliveryForCustomer?: (customerId: string) => void;
  onPrintStatement?: (customer: Customer, ledger: any[]) => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({
  initialCustomerId,
  onNavigate,
  onOpenOrderForCustomer,
  onOpenPaymentForCustomer,
  onOpenAdjustmentForCustomer,
  onOpenDeliveryForCustomer,
  onPrintStatement,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summaries, setSummaries] = useState<Record<string, CustomerAccountSummary>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'debit' | 'credit' | 'settled' | 'inactive'>('all');

  // Selected Customer Detail View
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(initialCustomerId || null);
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'orders' | 'invoices' | 'payments' | 'adjustments' | 'deliveries' | 'returns'>('ledger');

  // Modals inside Customer Profile (keeping user on page)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalMode, setPaymentModalMode] = useState<'receipt' | 'payout'>('receipt');
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<Adjustment | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [editingReturn, setEditingReturn] = useState<ReturnDoc | null>(null);
  const [returnTargetInvoiceId, setReturnTargetInvoiceId] = useState<string | undefined>(undefined);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Customer Add/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    national_id: '',
    phone: '',
    address: '',
    description: '',
    is_active: true,
  });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
    const handleDbSynced = () => {
      if (!showModal && !showPaymentModal && !showAdjustmentModal && !showReturnModal && !showDeliveryModal) {
        loadData();
      }
    };
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    return () => {
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
    };
  }, [showModal, showPaymentModal, showAdjustmentModal, showReturnModal, showDeliveryModal]);

  useEffect(() => {
    if (initialCustomerId) {
      setSelectedCustomerId(initialCustomerId);
    }
  }, [initialCustomerId]);

  const loadData = () => {
    const custs = StorageService.getCustomers().sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    setCustomers(custs);
    const sumMap: Record<string, CustomerAccountSummary> = {};
    custs.forEach((c) => {
      sumMap[c.id] = StorageService.getCustomerAccountSummary(c.id);
    });
    setSummaries(sumMap);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    if (!StorageService.hasPermission('customers.create')) {
      alert('شما مجوز ثبت مشتری جدید را ندارید.');
      return;
    }
    setEditingCustomer(null);
    setFormData({
      name: '',
      national_id: '',
      phone: '',
      address: '',
      description: '',
      is_active: true,
    });
    setIsSubmitting(false);
    setErrorMessage('');
    setShowModal(true);
  };
  const handleOpenNew = handleOpenAdd;

  const handleOpenEdit = (customer: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!StorageService.hasPermission('customers.edit')) {
      alert('شما مجوز ویرایش اطلاعات مشتری را ندارید.');
      return;
    }
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      national_id: customer.national_id || '',
      phone: customer.phone || '',
      address: customer.address || '',
      description: customer.description || '',
      is_active: customer.is_active,
    });
    setIsSubmitting(false);
    setErrorMessage('');
    setShowModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (editingCustomer && !StorageService.hasPermission('customers.edit')) {
      setErrorMessage('شما مجوز ویرایش مشخصات مشتری را ندارید.');
      return;
    }
    if (!editingCustomer && !StorageService.hasPermission('customers.create')) {
      setErrorMessage('شما مجوز ثبت مشتری جدید را ندارید.');
      return;
    }
    if (!formData.name.trim()) {
      setErrorMessage('نام مشتری یا شرکت الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const all = StorageService.getCustomers();

    let savedCustomer: Customer;
    if (editingCustomer) {
      const idx = all.findIndex((c) => c.id === editingCustomer.id);
      if (idx !== -1) {
        const oldCust = { ...all[idx] };
        savedCustomer = {
          ...all[idx],
          name: formData.name.trim(),
          national_id: formData.national_id.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          address: formData.address.trim() || undefined,
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        };
        all[idx] = savedCustomer;
        StorageService.saveCustomers(all, true);
        StorageService.logAudit('ویرایش مشخصات مشتری', 'CUSTOMER', editingCustomer.id, oldCust, all[idx]);
      } else {
        savedCustomer = editingCustomer;
      }
    } else {
      const newCode = StorageService.generateCustomerCode();
      savedCustomer = {
        id: `cus-${Date.now()}`,
        code: newCode,
        name: formData.name.trim(),
        national_id: formData.national_id.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        description: formData.description.trim() || undefined,
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      all.unshift(savedCustomer);
      StorageService.saveCustomers(all, true);
      StorageService.logAudit('تعریف مشتری جدید', 'CUSTOMER', savedCustomer.id, null, savedCustomer);
    }

    // Direct fast server sync to guarantee persistence before closing form
    try {
      await StorageService.saveSingleItem('customers', savedCustomer);
    } catch (e) {}

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
    }
    StorageService.pushToHost().catch(() => {});
    setIsSubmitting(false);
    setShowModal(false);
    loadData();
  };

  // Filtered List
  const filteredCustomers = customers.filter((c) => {
    const sum = summaries[c.id];
    const matchSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.national_id && c.national_id.includes(searchQuery));

    if (!matchSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'inactive') return !c.is_active;
    if (statusFilter === 'debit') return sum && sum.status === 'debit';
    if (statusFilter === 'credit') return sum && sum.status === 'credit';
    if (statusFilter === 'settled') return sum && sum.status === 'settled';

    return true;
  });

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedSummary = selectedCustomerId ? summaries[selectedCustomerId] : null;

  // Sorting state - defaults to newest customers first
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'created_at' || key === 'code' || key === 'balance' || key === 'total_debit' || key === 'total_credit' ? 'desc' : 'asc');
    }
  };

  const sortedCustomers = React.useMemo(() => {
    return [...filteredCustomers].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';
      const sumA = summaries[a.id];
      const sumB = summaries[b.id];

      if (sortKey === 'code') {
        valA = parseInt(String(a.code || '').replace(/\D/g, ''), 10) || 0;
        valB = parseInt(String(b.code || '').replace(/\D/g, ''), 10) || 0;
      } else if (sortKey === 'name') {
        valA = (a.name || '').trim();
        valB = (b.name || '').trim();
        return sortOrder === 'asc' ? valA.localeCompare(valB, 'fa') : valB.localeCompare(valA, 'fa');
      } else if (sortKey === 'total_debit') {
        valA = sumA?.total_debit || 0;
        valB = sumB?.total_debit || 0;
      } else if (sortKey === 'total_credit') {
        valA = sumA?.total_credit || 0;
        valB = sumB?.total_credit || 0;
      } else if (sortKey === 'balance') {
        valA = sumA?.balance || 0;
        valB = sumB?.balance || 0;
      } else if (sortKey === 'status') {
        valA = sumA?.status || '';
        valB = sumB?.status || '';
      } else if (sortKey === 'created_at') {
        valA = new Date(a.created_at || 0).getTime() || 0;
        valB = new Date(b.created_at || 0).getTime() || 0;
        if (valA === valB) {
          const numA = parseInt(String(a.code || a.id || '').replace(/\D/g, ''), 10) || 0;
          const numB = parseInt(String(b.code || b.id || '').replace(/\D/g, ''), 10) || 0;
          return sortOrder === 'asc' ? numA - numB : numB - numA;
        }
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredCustomers, summaries, sortKey, sortOrder]);

  const handleExportCustomersExcel = () => {
    const data = sortedCustomers.map((c, idx) => {
      const sum = summaries[c.id];
      return {
        ردیف: idx + 1,
        کد_مشتری: c.code,
        نام_مشتری: c.name,
        تلفن: c.phone || '—',
        شناسه_ملی: c.national_id || '—',
        آدرس: c.address || '—',
        موجودی_حساب: sum ? sum.balance : 0,
        وضعیت: sum && sum.status === 'debit' ? 'بدهکار' : sum && sum.status === 'credit' ? 'بستانکار' : 'تسویه',
      };
    });
    exportToExcel({
      fileName: 'لیست_مشتریان_فیلتر_شده',
      sheetName: 'مشتریان',
      data,
    });
  };

  const customerOrders = selectedCustomerId
    ? StorageService.getOrders()
        .filter((o) => o && o.customer_id === selectedCustomerId)
        .sort((a, b) => new Date(b?.order_date || b?.created_at || 0).getTime() - new Date(a?.order_date || a?.created_at || 0).getTime())
    : [];

  const customerInvoices = selectedCustomerId
    ? StorageService.getInvoices()
        .filter((i) => i && i.customer_id === selectedCustomerId)
        .sort((a, b) => new Date(b?.invoice_date || b?.created_at || 0).getTime() - new Date(a?.invoice_date || a?.created_at || 0).getTime())
    : [];

  const customerPayments = selectedCustomerId
    ? StorageService.getPayments()
        .filter((p) => p && p.customer_id === selectedCustomerId)
        .sort((a, b) => new Date(b?.payment_date || b?.created_at || 0).getTime() - new Date(a?.payment_date || a?.created_at || 0).getTime())
    : [];

  const customerAdjustments = selectedCustomerId
    ? StorageService.getAdjustments()
        .filter((a) => a && a.customer_id === selectedCustomerId)
        .sort((a, b) => new Date(b?.adjustment_date || b?.created_at || 0).getTime() - new Date(a?.adjustment_date || a?.created_at || 0).getTime())
    : [];

  const customerDeliveries = selectedCustomerId
    ? StorageService.getDeliveries()
        .filter((d) => d && d.customer_id === selectedCustomerId)
        .sort((a, b) => new Date(b?.delivery_date || b?.created_at || 0).getTime() - new Date(a?.delivery_date || a?.created_at || 0).getTime())
    : [];

  const customerReturns = selectedCustomerId
    ? StorageService.getReturns()
        .filter((r) => r && r.customer_id === selectedCustomerId)
        .sort((a, b) => new Date(b?.return_date || b?.created_at || 0).getTime() - new Date(a?.return_date || a?.created_at || 0).getTime())
    : [];

  const rawLedger = selectedCustomerId ? CustomerAccountService.getCustomerLedger(selectedCustomerId) : [];
  const selectedLedger = selectedCustomerId ? [...rawLedger].reverse() : [];

  const handleExportLedgerExcel = () => {
    if (!selectedCustomer) return;
    const data = selectedLedger.map((row, idx) => ({
      ردیف: idx + 1,
      تاریخ: formatJalaliDate(row.transaction_date),
      شرح_عملیات: row.description,
      بدهکار_ریال: row.debit,
      بستانکار_ریال: row.credit,
      مانده_حساب_ریال: row.running_balance,
      وضعیت_مانده: row.balance_status === 'debit' ? 'بدهکار' : row.balance_status === 'credit' ? 'بستانکار' : 'تسویه',
    }));

    exportToExcel({
      fileName: `صورتحساب_مشتری_${selectedCustomer.code}_${selectedCustomer.name}`,
      sheetName: 'گردش حساب',
      data,
    });
  };

  if (!StorageService.hasPermission('customers.view')) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 text-center max-w-lg mx-auto mt-12 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
          <Building className="w-8 h-8" />
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
          عدم دسترسی به بخش مشتریان
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          شما مجوز دسترسی لازم برای مشاهده حساب‌ها و مشتریان را ندارید.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">
            مدیریت مشتریان
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تعریف مشخصات خریداران، استعلام تراز مالی، صورتحساب و تاریخچه کلیه اسناد
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedCustomerId && (
            <button
              onClick={() => setSelectedCustomerId(null)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
              <span>بازگشت به لیست</span>
            </button>
          )}

          {StorageService.hasPermission('customers.create') && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>تعریف مشتری جدید</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Either Master List or Detailed Customer Dossier */}
      {!selectedCustomerId ? (
        <div className="space-y-4">
          {/* Filter and Search Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              <input
                type="text"
                placeholder="جستجو بر اساس نام مشتری، کد، شماره تماس یا شناسه ملی..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50/70 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                همه ({customers.length.toLocaleString('fa-IR')})
              </button>
              <button
                onClick={() => setStatusFilter('debit')}
                className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
                  statusFilter === 'debit'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                بدهکاران
              </button>
              <button
                onClick={() => setStatusFilter('credit')}
                className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
                  statusFilter === 'credit'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                بستانکاران
              </button>
              <button
                onClick={() => setStatusFilter('settled')}
                className={`px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${
                  statusFilter === 'settled'
                    ? 'bg-slate-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                تسویه‌شده
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={handleExportCustomersExcel}
                  className="px-3.5 py-2 rounded-xl font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition cursor-pointer flex items-center gap-1.5"
                  title="خروجی اکسل لیست مشتریان فیلترشده"
                >
                  <Download className="w-4 h-4" />
                  <span>اکسل</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-3.5 py-2 rounded-xl font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1.5"
                  title="چاپ و پیش‌نمایش گزارش"
                >
                  <Printer className="w-4 h-4" />
                  <span>چاپ / PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Customer Container: Mobile Cards (<md) & Desktop Table (>=md) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Mobile Cards View */}
            <div className="md:hidden p-3 sm:p-4 bg-slate-100/75 dark:bg-slate-950/40 space-y-3">
              {sortedCustomers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  مشتری مطابق با فیلترهای جستجو یافت نشد.
                </div>
              ) : (
                sortedCustomers.map((c) => {
                  const sum = summaries[c.id];
                  return (
                    <div
                      key={`mob-cust-${c.id}`}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition cursor-pointer overflow-hidden active:scale-[0.99]"
                    >
                      {/* Name + Status + Code Header */}
                      <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{c.name}</span>
                            {c.code && (
                              <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {toPersianDigits(c.code)}
                              </span>
                            )}
                          </div>
                          {c.phone && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{toPersianDigits(c.phone)}</span>
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          {sum?.status === 'debit' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              بدهکار
                            </span>
                          )}
                          {sum?.status === 'credit' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              بستانکار
                            </span>
                          )}
                          {sum?.status === 'settled' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              تسویه
                            </span>
                          )}
                        </div>
                      </div>

                      {c.address && (
                        <div className="px-3.5 py-2 text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </div>
                      )}

                      {/* Financial Footer */}
                      <div className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        {/* Actions on the RIGHT in RTL */}
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {StorageService.hasPermission('customers.edit') && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenEdit(c, e)}
                              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition"
                              title="ویرایش اطلاعات"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-bold text-xs hover:bg-blue-100 transition flex items-center gap-1"
                          >
                            <span>پرونده</span>
                            <ArrowRight className="w-3 h-3 rotate-180" />
                          </button>
                        </div>

                        {/* Balance Amount on the LEFT in RTL */}
                        <div className="text-left">
                          <span className="text-[10px] text-slate-400 block">مانده حساب:</span>
                          <span
                            className={`text-xs sm:text-sm font-black ${
                              sum?.status === 'debit'
                                ? 'text-rose-600 dark:text-rose-400'
                                : sum?.status === 'credit'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {formatCurrency(Math.abs(sum?.balance || 0), false)} <span className="text-[10px] font-normal text-slate-500">ریال</span>
                          </span>
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
                  <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-100/80">
                    <SortableHeader
                      label="کد مشتری"
                      sortKey="code"
                      currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                      onSort={handleSort}
                      align="center"
                      className="w-24"
                    />
                    <SortableHeader
                      label="نام شخص / شرکت"
                      sortKey="name"
                      currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                      onSort={handleSort}
                      align="center"
                    />
                    <th className="py-3.5 px-4 text-center">شماره تماس / نشانی</th>
                    <SortableHeader
                      label="کل بدهکار (ریال)"
                      sortKey="total_debit"
                      currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                      onSort={handleSort}
                      align="center"
                    />
                    <SortableHeader
                      label="کل بستانکار (ریال)"
                      sortKey="total_credit"
                      currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                      onSort={handleSort}
                      align="center"
                    />
                    <SortableHeader
                      label="مانده تراز (ریال)"
                      sortKey="balance"
                      currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                      onSort={handleSort}
                      align="center"
                    />
                    <SortableHeader
                      label="وضعیت"
                      sortKey="status"
                      currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                      onSort={handleSort}
                      align="center"
                      className="w-28"
                    />
                    <th className="py-3.5 px-4 text-center w-24">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        مشتری مطابق با فیلترهای جستجو یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    sortedCustomers.map((c) => {
                      const sum = summaries[c.id];
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCustomerId(c.id)}
                          className="hover:bg-blue-50/40 transition cursor-pointer group text-center"
                        >
                          <td className="py-3.5 px-4 font-bold text-slate-700 text-center">
                            {c.code ? toPersianDigits(c.code) : '—'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                              {c.name}
                            </div>
                            {c.national_id && (
                              <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                                ش.ملی: {toPersianDigits(c.national_id)}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-600">
                            <div className="text-xs font-semibold text-slate-700">{c.phone ? toPersianDigits(c.phone) : '—'}</div>
                            <div className="text-xs text-slate-500 truncate max-w-sm mx-auto">
                              {c.address || '—'}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-bold text-center">
                            {formatCurrency(sum?.total_debit || 0, false)}
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-bold text-center">
                            {formatCurrency(sum?.total_credit || 0, false)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-center">
                            <span
                              className={
                                sum?.status === 'debit'
                                    ? 'text-rose-600 font-black'
                                    : sum?.status === 'credit'
                                    ? 'text-emerald-600 font-black'
                                    : 'text-slate-500'
                              }
                            >
                              {formatCurrency(Math.abs(sum?.balance || 0), false)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {sum?.status === 'debit' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                بدهکار
                              </span>
                            )}
                            {sum?.status === 'credit' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                بستانکار
                              </span>
                            )}
                            {sum?.status === 'settled' && (
                              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                تسویه
                              </span>
                            )}
                            {!c.is_active && (
                              <span className="mr-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                غیرفعال
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {StorageService.hasPermission('customers.edit') && (
                                <button
                                  onClick={(e) => handleOpenEdit(c, e)}
                                  title="ویرایش اطلاعات مشتری"
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
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
        </div>
      ) : (
        /* Detailed Customer Dossier View */
        <div className="space-y-6">
          {/* Customer Profile & Financial Summary Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Profile Details */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center font-black text-xl shrink-0">
                  {(selectedCustomer?.name || 'م').charAt(0)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                      {selectedCustomer?.code ? toPersianDigits(selectedCustomer.code) : '—'}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{selectedCustomer?.name}</h2>
                    {!selectedCustomer?.is_active && (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        غیرفعال
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                    {selectedCustomer?.phone && (
                      <span className="flex items-center gap-1 font-semibold">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {toPersianDigits(selectedCustomer.phone)}
                      </span>
                    )}
                    {selectedCustomer?.national_id && (
                      <span className="flex items-center gap-1 font-semibold">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        ش.ملی: {toPersianDigits(selectedCustomer.national_id)}
                      </span>
                    )}
                    {selectedCustomer?.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {selectedCustomer.address}
                      </span>
                    )}
                  </div>
                  {selectedCustomer?.description && (
                    <p className="text-xs text-slate-500 pt-1 leading-relaxed">
                      توضیحات: {selectedCustomer.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Financial Balance Summary Box */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                <div className="text-center px-3 border-l border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500">کل بدهکار (Debit)</div>
                  <div className="text-xs font-black text-slate-800 mt-1">
                    {formatCurrency(selectedSummary?.total_debit || 0)}
                  </div>
                </div>

                <div className="text-center px-3 border-l border-slate-200">
                  <div className="text-[11px] font-medium text-slate-500">کل بستانکار (Credit)</div>
                  <div className="text-xs font-black text-slate-800 mt-1">
                    {formatCurrency(selectedSummary?.total_credit || 0)}
                  </div>
                </div>

                <div className="text-center px-3">
                  <div className="text-[11px] font-medium text-slate-500">مانده تراز نهایی</div>
                  <div
                    className={`text-sm font-black mt-1 ${
                      selectedSummary?.status === 'debit'
                        ? 'text-rose-600'
                        : selectedSummary?.status === 'credit'
                        ? 'text-emerald-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {formatCurrency(Math.abs(selectedSummary?.balance || 0), true)}
                    <span className="text-[10px] font-bold mr-1">
                      ({selectedSummary?.status === 'debit' ? 'بدهکار' : selectedSummary?.status === 'credit' ? 'بستانکار' : 'تسویه'})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons for This Customer */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {StorageService.hasPermission('orders.create') && (
                  <button
                    onClick={() => onOpenOrderForCustomer && onOpenOrderForCustomer(selectedCustomer!.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>ثبت سفارش</span>
                  </button>
                )}

                {StorageService.hasPermission('customers.payments') && (
                  <button
                    onClick={() => {
                      setPaymentModalMode('receipt');
                      setShowPaymentModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>ثبت دریافتی وجه</span>
                  </button>
                )}

                {StorageService.hasPermission('customers.payments') && (
                  <button
                    onClick={() => {
                      setPaymentModalMode('payout');
                      setShowPaymentModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>واریز وجه به مشتری (عودت)</span>
                  </button>
                )}

                {StorageService.hasPermission('customers.adjustments') && (
                  <button
                    onClick={() => setShowAdjustmentModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>ثبت تعدیل مالی</span>
                  </button>
                )}

                {StorageService.hasPermission('deliveries.create') && (
                  <button
                    onClick={() => setShowDeliveryModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-50 text-cyan-700 hover:bg-cyan-100 text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>حواله بارگیری</span>
                  </button>
                )}

                {StorageService.hasPermission('deliveries.returns') && (
                  <button
                    onClick={() => {
                      setEditingReturn(null);
                      setReturnTargetInvoiceId(undefined);
                      setShowReturnModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ثبت برگشت از فروش</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('customers.view')) && (
                  <button
                    onClick={() => setShowHistoryModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
                    title="مشاهده لاگ و تاریخچه رویدادهای این مشتری"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>تاریخچه و لاگ</span>
                  </button>
                )}
                {StorageService.hasPermission('customers.print') && (
                  <button
                    onClick={() => selectedCustomer && onPrintStatement && onPrintStatement(selectedCustomer, rawLedger)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>چاپ صورتحساب (A4)</span>
                  </button>
                )}
                <button
                  onClick={handleExportLedgerExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>خروجی اکسل</span>
                </button>
              </div>
            </div>
          </div>

          {/* Dossier Tabs Navigation */}
          <div className="flex items-center gap-1 border-b border-slate-200 text-xs font-bold overflow-x-auto pb-px">
            <button
              onClick={() => setActiveSubTab('ledger')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'ledger'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>صورتحساب و گردش تفصیلی ({selectedLedger.length.toLocaleString('fa-IR')})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('invoices')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'invoices'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>فاکتورها ({customerInvoices.length.toLocaleString('fa-IR')})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('orders')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'orders'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>سفارش‌ها ({customerOrders.length.toLocaleString('fa-IR')})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('payments')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'payments'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>تراکنش‌های مالی ({customerPayments.length.toLocaleString('fa-IR')})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('adjustments')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'adjustments'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Scale className="w-4 h-4" />
              <span>تعدیلات ({customerAdjustments.length.toLocaleString('fa-IR')})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('deliveries')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'deliveries'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>حواله‌های تحویل ({customerDeliveries.length.toLocaleString('fa-IR')})</span>
            </button>
            <button
              onClick={() => setActiveSubTab('returns')}
              className={`px-4 py-2.5 border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSubTab === 'returns'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>مرجوعی‌ها ({customerReturns.length.toLocaleString('fa-IR')})</span>
            </button>
          </div>

          {/* Tab 1: Detailed Ledger Statement (Newer dates on top, reference column removed) */}
          {activeSubTab === 'ledger' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="py-3 px-3">ردیف</th>
                      <th className="py-3 px-3">تاریخ سند</th>
                      <th className="py-3 px-3">نوع عملیات</th>
                      <th className="py-3 px-3">شرح کامل تراکنش</th>
                      <th className="py-3 px-3 text-rose-700">بدهکار (ریال)</th>
                      <th className="py-3 px-3 text-emerald-700">بستانکار (ریال)</th>
                      <th className="py-3 px-3">مانده لحظه‌ای (ریال)</th>
                      <th className="py-3 px-3">وضعیت مانده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          هیچ تراکنش مالی برای این مشتری ثبت نشده است.
                        </td>
                      </tr>
                    ) : (
                      selectedLedger.map((tx, idx) => (
                        <tr key={tx.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-3 text-slate-400 font-bold">{toPersianDigits(idx + 1)}</td>
                          <td className="py-3 px-3 text-slate-700 font-bold">
                            {formatJalaliDate(tx.transaction_date)}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {tx.type === 'invoice' && 'فاکتور فروش'}
                              {tx.type === 'invoice_cancel' && 'ابطال فاکتور'}
                              {tx.type === 'payment' && (tx.debit > 0 ? 'واریز به مشتری' : 'دریافت وجه')}
                              {tx.type === 'adjustment' && 'تعدیل مالی'}
                              {tx.type === 'return' && 'برگشت کالا'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-900">
                            {tx.description}
                          </td>
                          <td className="py-3 px-3 font-bold text-rose-600">
                            {tx.debit > 0 ? formatCurrency(tx.debit, false) : '-'}
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-600">
                            {tx.credit > 0 ? formatCurrency(tx.credit, false) : '-'}
                          </td>
                          <td className="py-3 px-3 font-black text-slate-900">
                            {formatCurrency(Math.abs(tx.running_balance), false)}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.balance_status === 'debit'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : tx.balance_status === 'credit'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {tx.balance_status === 'debit' ? 'بدهکار' : tx.balance_status === 'credit' ? 'بستانکار' : 'تسویه'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Invoices */}
          {activeSubTab === 'invoices' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="py-3 px-4">شماره فاکتور</th>
                      <th className="py-3 px-4">تاریخ</th>
                      <th className="py-3 px-4">اقلام لوله و اتصالات</th>
                      <th className="py-3 px-4">مجموع متراژ</th>
                      <th className="py-3 px-4">مبلغ نهایی (ریال)</th>
                      <th className="py-3 px-4">وضعیت</th>
                      <th className="py-3 px-4 text-center">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerInvoices.map((inv) => {
                      const totalMeters = (inv.items || []).reduce((s, it) => s + (it?.quantity_meters || 0), 0);
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-800">{inv.invoice_number}</td>
                          <td className="py-3 px-4 text-slate-600 font-bold">{formatJalaliDate(inv.invoice_date)}</td>
                          <td className="py-3 px-4 text-slate-800">
                            {(inv.items || []).map((i) => `${i?.product_name || 'کالا'} (${formatNumber(i?.quantity_meters || 0)} متر)`).join('، ')}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-700">{formatNumber(totalMeters)} متر</td>
                          <td className="py-3 px-4 font-black text-slate-900">{formatCurrency(inv.final_total, false)}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.status === 'active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {inv.status === 'active' ? 'تاییدشده / فعال' : 'لغوشده'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {inv.status === 'active' && (
                              <button
                                onClick={() => {
                                  setReturnTargetInvoiceId(inv.id);
                                  setShowReturnModal(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>برگشت از فروش</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Orders */}
          {activeSubTab === 'orders' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="py-3 px-4">شماره سفارش</th>
                      <th className="py-3 px-4">تاریخ</th>
                      <th className="py-3 px-4">مجموع متراژ</th>
                      <th className="py-3 px-4">تخفیف (ریال)</th>
                      <th className="py-3 px-4">مالیات (ریال)</th>
                      <th className="py-3 px-4">مبلغ نهایی (ریال)</th>
                      <th className="py-3 px-4">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerOrders.map((ord) => {
                      const totalMeters = (ord.items || []).reduce((s, it) => s + (it?.quantity_meters || 0), 0);
                      return (
                        <tr key={ord.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-800">{ord.order_number}</td>
                          <td className="py-3 px-4 text-slate-600 font-bold">{formatJalaliDate(ord.order_date)}</td>
                          <td className="py-3 px-4 font-bold text-slate-700">{formatNumber(totalMeters)} متر</td>
                          <td className="py-3 px-4 text-slate-600 font-bold">{formatCurrency(ord.discount, false)}</td>
                          <td className="py-3 px-4 text-slate-600 font-bold">{formatCurrency(ord.tax_amount, false)}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(ord.final_total, false)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                              {ord.status === 'confirmed' ? 'تاییدشده' : ord.status === 'draft' ? 'پیش‌نویس' : 'لغوشده'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Payments & Payouts */}
          {activeSubTab === 'payments' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="py-3 px-4">تاریخ</th>
                      <th className="py-3 px-4">نوع تراکنش</th>
                      <th className="py-3 px-4">روش تراکنش</th>
                      <th className="py-3 px-4">مبلغ (ریال)</th>
                      <th className="py-3 px-4">شماره رهگیری / چک</th>
                      <th className="py-3 px-4">توضیحات</th>
                      <th className="py-3 px-4">ثبت‌کننده</th>
                      {StorageService.hasPermission('customers.payments') && <th className="py-3 px-4 text-center">عملیات</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerPayments.map((p) => {
                      const isPayout = p.id.startsWith('payout');
                      return (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 text-slate-600 font-bold">{formatJalaliDate(p.payment_date)}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isPayout ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isPayout ? 'واریز به مشتری (عودت)' : 'دریافت از مشتری'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800">{p.payment_method}</td>
                          <td className={`py-3 px-4 font-black ${isPayout ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {formatCurrency(p.amount, false)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-600">{p.reference_number ? toPersianDigits(p.reference_number) : '-'}</td>
                          <td className="py-3 px-4 text-slate-600">{p.description || '-'}</td>
                          <td className="py-3 px-4 text-slate-500 text-[11px]">{p.created_by}</td>
                          {StorageService.hasPermission('customers.payments') && (
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setEditingPayment(p);
                                    setPaymentModalMode(isPayout ? 'payout' : 'receipt');
                                    setShowPaymentModal(true);
                                  }}
                                  title="ویرایش تراکنش"
                                  className="p-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm('آیا از حذف این تراکنش مالی اطمینان دارید؟ مانده حساب مشتری به حالت قبل بازخواهد گشت.')) {
                                      const res = CustomerAccountService.deletePayment(p.id);
                                      if (res.success) {
                                        loadData();
                                      } else {
                                        alert(res.message);
                                      }
                                    }
                                  }}
                                  title="حذف تراکنش"
                                  className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Adjustments */}
          {activeSubTab === 'adjustments' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                      <th className="py-3 px-4">تاریخ تعدیل</th>
                      <th className="py-3 px-4">نوع تعدیل</th>
                      <th className="py-3 px-4">مبلغ (ریال)</th>
                      <th className="py-3 px-4">شرح و علت تعدیل</th>
                      <th className="py-3 px-4">ثبت‌کننده</th>
                      {(StorageService.hasPermission('customers.payments') || StorageService.hasPermission('customers.adjustments')) && (
                        <th className="py-3 px-4 text-center">عملیات</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerAdjustments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600 font-bold">{formatJalaliDate(a.adjustment_date)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              a.type === 'debit'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {a.type === 'debit' ? 'بدهکار (افزایش بدهی)' : 'بستانکار (کاهش بدهی)'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-slate-900">{formatCurrency(a.amount, false)}</td>
                        <td className="py-3 px-4 text-slate-700">{a.description}</td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">{a.created_by}</td>
                        {(StorageService.hasPermission('customers.payments') || StorageService.hasPermission('customers.adjustments')) && (
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingAdjustment(a);
                                  setShowAdjustmentModal(true);
                                }}
                                title="ویرایش سند تعدیل"
                                className="p-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm('آیا از حذف این سند تعدیل حساب اطمینان دارید؟')) {
                                    const res = CustomerAccountService.deleteAdjustment(a.id);
                                    if (res.success) {
                                      loadData();
                                    } else {
                                      alert(res.message);
                                    }
                                  }
                                }}
                                title="حذف سند تعدیل"
                                className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 6: Deliveries */}
          {activeSubTab === 'deliveries' && (
            <div className="space-y-4">
              <DeliveryFilterReport
                deliveries={customerDeliveries}
                onFilteredChange={() => {}}
              />

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                        <th className="py-3 px-4">شماره حواله</th>
                        <th className="py-3 px-4">تاریخ بارگیری</th>
                        <th className="py-3 px-4">راننده و خودرو</th>
                        <th className="py-3 px-4">اقلام تحویلی</th>
                        <th className="py-3 px-4">مجموع متراژ</th>
                        <th className="py-3 px-4">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerDeliveries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            هیچ حواله و رسید تحویل باری برای این مشتری ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        customerDeliveries.map((del) => (
                          <tr key={del.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-bold text-slate-800">{del.delivery_number}</td>
                            <td className="py-3 px-4 text-slate-600 font-bold">{formatJalaliDate(del.delivery_date)}</td>
                            <td className="py-3 px-4 text-slate-700">
                              {del.driver_name || '-'} ({del.vehicle_plate || del.vehicle_type || '-'})
                            </td>
                            <td className="py-3 px-4 text-slate-800">
                              {(del.items || []).map((i) => `${i?.product_name || 'کالا'} (${formatNumber(i?.quantity_meters || 0)} متر از ${i?.invoice_number || '-'})`).join('، ')}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">{formatNumber(del.total_meters)} متر</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                del.status === 'cancelled'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {del.status === 'cancelled' ? 'لغو شده' : 'تحویل‌شده'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 7: Returns */}
          {activeSubTab === 'returns' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {customerReturns.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  هیچ سند برگشت از فروشی برای این مشتری ثبت نشده است.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                        <th className="py-3 px-4">شماره برگشت</th>
                        <th className="py-3 px-4">تاریخ</th>
                        <th className="py-3 px-4">علت برگشت</th>
                        <th className="py-3 px-4">اقلام مرجوعی</th>
                        <th className="py-3 px-4">مبلغ بستانکاری (ریال)</th>
                        <th className="py-3 px-4 text-center">عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customerReturns.map((ret) => (
                        <tr key={ret.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-800">{ret.return_number}</td>
                          <td className="py-3 px-4 text-slate-600 font-bold">{formatJalaliDate(ret.return_date)}</td>
                          <td className="py-3 px-4 font-semibold text-rose-700">{ret.reason}</td>
                          <td className="py-3 px-4 text-slate-800">
                            {(ret.items || []).map((i) => `${i?.product_name || 'کالا'} (${formatNumber(i?.quantity_meters || 0)} متر از ${i?.invoice_number || '-'})`).join('، ')}
                          </td>
                          <td className="py-3 px-4 font-black text-emerald-600">{formatCurrency(ret.total_amount, false)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setEditingReturn(ret);
                                  setShowReturnModal(true);
                                }}
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                title="ویرایش سند برگشت"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>ویرایش</span>
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `آیا از ابطال و حذف سند برگشت ${ret.return_number} به مبلغ ${formatCurrency(ret.total_amount)} اطمینان دارید؟ اثر مالی این سند از حساب مشتری کسر خواهد شد.`
                                    )
                                  ) {
                                    DeliveryReturnService.deleteReturn(ret.id);
                                    loadData();
                                  }
                                }}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                                title="ابطال و حذف سند برگشت"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Customer Action Modals (Keeps user on the same customer profile page) */}
      {selectedCustomer && (
        <>
          <CustomerPaymentModal
            customer={selectedCustomer}
            isOpen={showPaymentModal}
            defaultMode={paymentModalMode}
            editingPayment={editingPayment}
            onClose={() => {
              setShowPaymentModal(false);
              setEditingPayment(null);
            }}
            onSuccess={() => {
              loadData();
              setEditingPayment(null);
            }}
          />

          <CustomerAdjustmentModal
            customer={selectedCustomer}
            isOpen={showAdjustmentModal}
            editingAdjustment={editingAdjustment}
            onClose={() => {
              setShowAdjustmentModal(false);
              setEditingAdjustment(null);
            }}
            onSuccess={() => {
              loadData();
              setEditingAdjustment(null);
            }}
          />

          <CustomerReturnModal
            customer={selectedCustomer}
            isOpen={showReturnModal}
            initialInvoiceId={returnTargetInvoiceId}
            editingReturn={editingReturn}
            onClose={() => {
              setShowReturnModal(false);
              setEditingReturn(null);
            }}
            onSuccess={() => {
              loadData();
            }}
          />

          {showDeliveryModal && (
            <CreateDeliveryModal
              customer={selectedCustomer}
              isOpen={showDeliveryModal}
              onClose={() => setShowDeliveryModal(false)}
              onSuccess={() => {
                setShowDeliveryModal(false);
                loadData();
              }}
            />
          )}
        </>
      )}

      {/* Customer Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingCustomer ? 'ویرایش مشخصات مشتری' : 'تعریف مشتری جدید'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
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

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  نام شخص یا شرکت <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: شرکت آبرسانی کویر / آقای احمدی"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    شناسه ملی / شماره ثبت
                  </label>
                  <input
                    type="text"
                    placeholder="۱۰ رقمی یا ۱۱ رقمی"
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    شماره تماس / همراه
                  </label>
                  <input
                    type="text"
                    placeholder="۰۹۱۲..."
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  آدرس و محل تخلیه بار
                </label>
                <textarea
                  rows={2}
                  placeholder="استان، شهر، خیابان، پروژه..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  توضیحات و سوابق اعتباری
                </label>
                <textarea
                  rows={2}
                  placeholder="شرایط تسویه، سقف اعتبار، ملاحظات..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="custActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="custActive" className="text-slate-700 font-bold cursor-pointer">
                  مشتری فعال است و امکان ثبت سفارش دارد
                </label>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ذخیره و همگام‌سازی...</span>
                    </>
                  ) : (
                    <span>{editingCustomer ? 'ذخیره تغییرات' : 'ایجاد مشتری'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Audit History Modal */}
      {selectedCustomer && (
        <AuditHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          entityType="CUSTOMER"
          entityId={selectedCustomer.id}
          title="تاریخچه و لاگ رویدادهای مشتری"
          subtitle={`مشتری: ${selectedCustomer.name} (کد: ${selectedCustomer.code})`}
        />
      )}

      {/* Printable Report Modal */}
      {showPrintModal &&
        createPortal(
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-y-auto print-modal-container print:p-0 print:static print:bg-white print:overflow-visible">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-4 max-h-[94vh] flex flex-col print-modal-card print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-full print:w-full print:max-h-none print:overflow-visible">
              <PrintModalControlBar
                title="پیش‌نمایش چاپ و گزارش لیست مشتریان و تراز مالی"
                badge={`${toPersianDigits(sortedCustomers.length)} مشتری`}
                isExportingImage={isExportingImage}
                onExportImage={async () => {
                  setIsExportingImage(true);
                  const success = await exportElementAsPng(
                    'printable-customer-report',
                    `گزارش_لیست_مشتریان_${new Date().toISOString().slice(0, 10)}`
                  );
                  setIsExportingImage(false);
                  if (!success) {
                    alert('خطا در ایجاد خروجی تصویر گزارش مشتریان.');
                  }
                }}
                onPrint={() => window.print()}
                onClose={() => setShowPrintModal(false)}
                printButtonText="ارسال به چاپگر (A4)"
              />

              <ZoomablePrintContainer elementId="printable-customer-report">
                <div
                  id="printable-customer-report"
                  className="w-[800px] min-w-[800px] md:w-full md:min-w-0 mx-auto border border-slate-300 rounded-lg p-4 sm:p-6 bg-white text-slate-900 text-xs font-sans space-y-4 print:w-full print:min-w-0"
                >
                  <PrintHeader
                    title="گزارش تجمیعی لیست مشتریان و وضعیت حساب‌ها"
                    docNumber={toPersianDigits(sortedCustomers.length)}
                    docNumberLabel="تعداد مشتریان:"
                  />

                  <table className="w-full text-center border-collapse border border-slate-400 text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-400 font-bold text-slate-800">
                        <th className="p-1.5 border-l border-slate-400 w-8">ردیف</th>
                        <th className="p-1.5 border-l border-slate-400 w-20">کد مشتری</th>
                        <th className="p-1.5 border-l border-slate-400">نام شخص / شرکت</th>
                        <th className="p-1.5 border-l border-slate-400 w-28">تلفن تماس</th>
                        <th className="p-1.5 border-l border-slate-400 w-28">کل بدهکار (ریال)</th>
                        <th className="p-1.5 border-l border-slate-400 w-28">کل بستانکار (ریال)</th>
                        <th className="p-1.5 border-l border-slate-400 w-28">مانده تراز (ریال)</th>
                        <th className="p-1.5 w-20">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {sortedCustomers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-400">
                            مشتری مطابق با فیلترهای جستجو یافت نشد.
                          </td>
                        </tr>
                      ) : (
                        sortedCustomers.map((c, idx) => {
                          const sum = summaries[c.id];
                          return (
                            <tr key={c.id} className="hover:bg-slate-50">
                              <td className="p-1.5 border-l border-slate-300 font-bold">{toPersianDigits(idx + 1)}</td>
                              <td className="p-1.5 border-l border-slate-300 font-mono font-bold">{c.code ? toPersianDigits(c.code) : '—'}</td>
                              <td className="p-1.5 border-l border-slate-300 text-right pr-2 font-bold">{c.name}</td>
                              <td className="p-1.5 border-l border-slate-300 font-mono">{c.phone ? toPersianDigits(c.phone) : '—'}</td>
                              <td className="p-1.5 border-l border-slate-300 font-mono font-bold">{formatCurrency(sum?.total_debit || 0, false)}</td>
                              <td className="p-1.5 border-l border-slate-300 font-mono font-bold">{formatCurrency(sum?.total_credit || 0, false)}</td>
                              <td className={`p-1.5 border-l border-slate-300 font-mono font-black ${sum?.status === 'debit' ? 'text-rose-700' : sum?.status === 'credit' ? 'text-emerald-700' : 'text-slate-800'}`}>
                                {formatCurrency(Math.abs(sum?.balance || 0), false)}
                              </td>
                              <td className="p-1.5 font-bold">
                                {sum?.status === 'debit' ? 'بدهکار' : sum?.status === 'credit' ? 'بستانکار' : 'تسویه'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs font-bold text-slate-700">
                    <div>
                      <span>مسئول امور مالی</span>
                      <div className="text-slate-300 mt-6">.......................</div>
                    </div>
                    <div>
                      <span>مدیر فروش</span>
                      <div className="text-slate-300 mt-6">.......................</div>
                    </div>
                    <div>
                      <span>مدیریت عامل</span>
                      <div className="text-slate-300 mt-6">.......................</div>
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
