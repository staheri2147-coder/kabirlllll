import React, { useState, useEffect, useRef } from 'react';
import { Customer, CustomerAccountSummary } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatCurrency } from '../../utils/jalali';
import {
  Search,
  UserPlus,
  Check,
  ChevronDown,
  X,
  Phone,
  Building,
  User,
  AlertCircle,
  Sparkles,
  MapPin,
  FileText,
} from 'lucide-react';

export interface CustomerSelectSearchProps {
  selectedCustomerId?: string;
  onSelectCustomer: (customer: Customer) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  id?: string;
  onCustomerCreated?: (newCustomer: Customer) => void;
}

export const CustomerSelectSearch: React.FC<CustomerSelectSearchProps> = ({
  selectedCustomerId,
  onSelectCustomer,
  label = 'انتخاب مشتری',
  required = false,
  disabled = false,
  className = '',
  placeholder = 'جستجوی نام، کد مشتری، شماره تماس یا شناسه ملی...',
  id,
  onCustomerCreated,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summaries, setSummaries] = useState<Record<string, CustomerAccountSummary>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Quick Add Modal State
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: '',
    code: '',
    phone: '',
    national_id: '',
    address: '',
    description: '',
  });
  const [quickFormError, setQuickFormError] = useState('');
  const [quickSuccessMsg, setQuickSuccessMsg] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load customer data and their balance summaries
  const loadCustomers = () => {
    const list = StorageService.getCustomers().filter((c) => c.is_active);
    setCustomers(list);

    const sumMap: Record<string, CustomerAccountSummary> = {};
    list.forEach((c) => {
      try {
        sumMap[c.id] = StorageService.getCustomerAccountSummary(c.id);
      } catch {
        // fallback
      }
    });
    setSummaries(sumMap);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Current selected customer object
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedSummary = selectedCustomerId ? summaries[selectedCustomerId] : null;

  // Filter customers based on search query
  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.national_id && c.national_id.toLowerCase().includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  });

  const handleOpenDropdown = () => {
    if (disabled) return;
    setIsOpen(true);
    setSearchQuery('');
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Open Quick Add Modal
  const handleOpenQuickAdd = (prefilledName = '') => {
    const nextCode = StorageService.generateCustomerCode();
    setQuickForm({
      name: prefilledName || searchQuery.trim(),
      code: nextCode,
      phone: '',
      national_id: '',
      address: '',
      description: '',
    });
    setQuickFormError('');
    setShowQuickAddModal(true);
    setIsOpen(false);
  };

  // Save new customer in-place
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.name.trim()) {
      setQuickFormError('نام یا عنوان مشتری / شرکت الزامی است.');
      return;
    }

    const allExisting = StorageService.getCustomers();
    const code = quickForm.code.trim() || StorageService.generateCustomerCode();

    // Check duplicate code
    if (allExisting.some((c) => c.code.toLowerCase() === code.toLowerCase())) {
      setQuickFormError('این کد مشتری قبلاً در سیستم ثبت شده است. لطفاً کد دیگری وارد کنید.');
      return;
    }

    const newCustomer: Customer = {
      id: `cus-${Date.now()}`,
      code: code,
      name: quickForm.name.trim(),
      phone: quickForm.phone.trim() || undefined,
      national_id: quickForm.national_id.trim() || undefined,
      address: quickForm.address.trim() || undefined,
      description: quickForm.description.trim() || undefined,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedList = [...allExisting, newCustomer];
    StorageService.saveCustomers(updatedList);
    StorageService.logAudit(
      `ثبت سریع مشتری جدید «${newCustomer.name}» (کد: ${newCustomer.code})`,
      'CUSTOMER',
      newCustomer.id,
      null,
      newCustomer
    );

    // Refresh internal state
    loadCustomers();

    // Select the new customer immediately!
    onSelectCustomer(newCustomer);
    if (onCustomerCreated) {
      onCustomerCreated(newCustomer);
    }

    setShowQuickAddModal(false);
    setQuickSuccessMsg(`مشتری «${newCustomer.name}» با موفقیت افزوده و انتخاب شد.`);
    setTimeout(() => setQuickSuccessMsg(''), 4000);
  };

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`} id={id}>
      {/* Label and Quick Add shortcut button */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-slate-700 font-bold text-xs">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => handleOpenQuickAdd()}
          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition cursor-pointer hover:underline"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ ثبت مشتری جدید</span>
        </button>
      </div>

      {/* Success Notification */}
      {quickSuccessMsg && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center justify-between animate-in fade-in">
          <span>{quickSuccessMsg}</span>
          <button type="button" onClick={() => setQuickSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Selector Display Box */}
      <div
        onClick={handleOpenDropdown}
        className={`w-full min-h-[42px] px-3 py-2 rounded-xl bg-white border cursor-pointer transition flex items-center justify-between gap-2 ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500/20'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-75' : ''}`}
      >
        {selectedCustomer ? (
          <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold shrink-0 text-xs">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                  <span>{selectedCustomer.name}</span>
                  <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {selectedCustomer.code}
                  </span>
                </div>
                {selectedCustomer.phone && (
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {selectedCustomer.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Financial status pill */}
            {selectedSummary && (
              <div className="shrink-0 text-left">
                {selectedSummary.balance_status === 'debit' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    بدهکار: {formatCurrency(selectedSummary.current_balance, false)} ت
                  </span>
                )}
                {selectedSummary.balance_status === 'credit' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    بستانکار: {formatCurrency(Math.abs(selectedSummary.current_balance), false)} ت
                  </span>
                )}
                {selectedSummary.balance_status === 'settled' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    حساب تسویه
                  </span>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-xs">{placeholder}</span>
        )}

        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
      </div>

      {/* Live Search & Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 left-0 mt-1.5 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Header */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو بر اساس نام، کد، تلفن، کدملی..."
                className="w-full pl-3 pr-8 py-1.5 text-xs bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleOpenQuickAdd()}
              title="ثبت سریع مشتری جدید"
              className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>مشتری جدید</span>
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Search className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600 font-bold mb-1">
                  مشتری با مشخصات «{searchQuery}» پیدا نشد.
                </p>
                <p className="text-[11px] text-slate-400 mb-3">
                  می‌توانید هم‌اکنون این مشتری را بدون خروج از صفحه ثبت کنید:
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenQuickAdd(searchQuery)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>ثبت «{searchQuery || 'مشتری جدید'}»</span>
                </button>
              </div>
            ) : (
              filteredCustomers.map((cust) => {
                const summ = summaries[cust.id];
                const isSelected = cust.id === selectedCustomerId;

                return (
                  <div
                    key={cust.id}
                    onClick={() => handleSelect(cust)}
                    className={`p-2.5 flex items-center justify-between gap-2 hover:bg-blue-50/60 cursor-pointer transition text-xs ${
                      isSelected ? 'bg-blue-50/90 font-bold' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span className="truncate">{cust.name}</span>
                          <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                            {cust.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5 font-sans">
                          {cust.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {cust.phone}
                            </span>
                          )}
                          {cust.national_id && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              شناسه: {cust.national_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Balance Info */}
                    {summ && (
                      <div className="shrink-0 text-left">
                        {summ.balance_status === 'debit' && (
                          <div className="text-right">
                            <span className="text-[10px] text-rose-600 font-bold block">
                              بدهکار: {formatCurrency(summ.current_balance, false)}
                            </span>
                            {summ.pending_delivery_meters > 0 && (
                              <span className="text-[9px] text-amber-600 block">
                                ⏳ {summ.pending_delivery_meters}م تعهد بار
                              </span>
                            )}
                          </div>
                        )}
                        {summ.balance_status === 'credit' && (
                          <div className="text-right">
                            <span className="text-[10px] text-emerald-600 font-bold block">
                              بستانکار: {formatCurrency(Math.abs(summ.current_balance), false)}
                            </span>
                          </div>
                        )}
                        {summ.balance_status === 'settled' && (
                          <span className="text-[10px] text-slate-400 block font-medium">
                            حساب تسویه
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Dropdown Footer */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>تعداد کل مشتریان فعال: {customers.length.toLocaleString('fa-IR')}</span>
            <button
              type="button"
              onClick={() => handleOpenQuickAdd()}
              className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>ثبت مشتری جدید</span>
            </button>
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">ثبت سریع مشتری جدید</h3>
                  <p className="text-[11px] text-slate-500">
                    مشخصات را وارد کنید؛ مشتری فوراً ثبت و در این فرم انتخاب می‌شود.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {quickFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{quickFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveQuickCustomer} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    نام و نام خانوادگی / عنوان شرکت <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: شرکت آبرسانی کویر یا مهندس احمدی"
                    value={quickForm.name}
                    onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">کد مشتری</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={quickForm.code}
                    onChange={(e) => setQuickForm({ ...quickForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره تماس / همراه</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="۰۹۱۲..."
                    value={quickForm.phone}
                    onChange={(e) => setQuickForm({ ...quickForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">کد ملی / شناسه اقتصادی</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="۱۰ رقمی یا ۱۱ رقمی"
                    value={quickForm.national_id}
                    onChange={(e) => setQuickForm({ ...quickForm, national_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">توضیحات و سوابق</label>
                  <input
                    type="text"
                    placeholder="پروژه، زمینه فعالیت یا معرف..."
                    value={quickForm.description}
                    onChange={(e) => setQuickForm({ ...quickForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">آدرس و شهر تحویل</label>
                  <input
                    type="text"
                    placeholder="استان، شهر، آدرس انبار یا محل تخلیه..."
                    value={quickForm.address}
                    onChange={(e) => setQuickForm({ ...quickForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowQuickAddModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>ثبت و انتخاب مشتری</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
