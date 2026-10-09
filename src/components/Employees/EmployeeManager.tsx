import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { Employee, EmployeeTransaction, EmployeeLeave } from '../../types';
import { formatCurrency, formatJalaliDate, getTodayISO, toPersianDigits } from '../../utils/jalali';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { RialInput } from '../Common/RialInput';
import { EmployeeDetailView } from './EmployeeDetailView';
import { LeaveModal } from './LeaveModal';
import { LeavePrintModal } from './LeavePrintModal';
import {
  UserCheck,
  Plus,
  Search,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Edit2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  X,
  Printer,
  ChevronLeft,
  History,
  Phone,
} from 'lucide-react';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';

export const EmployeeManager: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Detail View State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Employee Profile Modal State (Create / Edit)
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Transaction Modal State (Accrual / Payment)
  const [showTxModal, setShowTxModal] = useState(false);
  const [selectedEmpForTx, setSelectedEmpForTx] = useState<Employee | null>(null);
  const [txType, setTxType] = useState<'accrual' | 'payment'>('accrual');

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedEmpForLeave, setSelectedEmpForLeave] = useState<Employee | null>(null);
  const [printingLeave, setPrintingLeave] = useState<{ leave: EmployeeLeave; emp: Employee } | null>(
    null
  );

  // History Modal State
  const [historyEmployee, setHistoryEmployee] = useState<Employee | null>(null);

  // Employee Form State
  const [empForm, setEmpForm] = useState({
    code: '',
    name: '',
    national_id: '',
    phone1: '',
    phone2: '',
    address: '',
    position: '',
    salary_base: 0,
    status: 'active' as 'active' | 'inactive',
  });
  const [empFormError, setEmpFormError] = useState('');
  const [isSubmittingEmp, setIsSubmittingEmp] = useState(false);

  // Transaction Form State (Empty by default per requirements)
  const [txForm, setTxForm] = useState({
    date: getTodayISO(),
    amount: 0,
    payment_method: 'bank_transfer' as 'cash' | 'card' | 'bank_transfer' | 'cheque',
    reference_number: '',
    description: '',
  });
  const [txFormError, setTxFormError] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  useEffect(() => {
    loadData();
    const handleDbSynced = () => {
      if (!showEmployeeModal && !showTxModal && !showLeaveModal) {
        loadData();
      }
    };
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    return () => {
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
    };
  }, [showEmployeeModal, showTxModal, showLeaveModal]);

  const loadData = () => {
    setEmployees(StorageService.getEmployees());
  };

  // Open Employee Create/Edit Modal
  const handleOpenEmpModal = (emp?: Employee) => {
    setIsSubmittingEmp(false);
    if (emp) {
      if (!StorageService.hasPermission('employees.edit')) {
        alert('شما مجوز ویرایش اطلاعات پرسنل را ندارید.');
        return;
      }
      setEditingEmployee(emp);
      setEmpForm({
        code: emp.code,
        name: emp.name,
        national_id: emp.national_id || '',
        phone1: emp.phone1 || '',
        phone2: emp.phone2 || '',
        address: emp.address || '',
        position: emp.position || '',
        salary_base: emp.salary_base || 0,
        status: emp.status || 'active',
      });
    } else {
      if (!StorageService.hasPermission('employees.create')) {
        alert('شما مجوز ثبت پرسنل جدید را ندارید.');
        return;
      }
      setEditingEmployee(null);
      setEmpForm({
        code: StorageService.generateEmployeeCode(),
        name: '',
        national_id: '',
        phone1: '',
        phone2: '',
        address: '',
        position: '',
        salary_base: 0,
        status: 'active',
      });
    }
    setEmpFormError('');
    setShowEmployeeModal(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingEmp) return;

    if (editingEmployee && !StorageService.hasPermission('employees.edit')) {
      setEmpFormError('شما مجوز ویرایش اطلاعات پرسنل را ندارید.');
      return;
    }
    if (!editingEmployee && !StorageService.hasPermission('employees.create')) {
      setEmpFormError('شما مجوز ثبت پرسنل جدید را ندارید.');
      return;
    }

    const trimmedName = empForm.name.trim();
    const trimmedCode = empForm.code.trim();

    if (!trimmedName) {
      setEmpFormError('نام و نام خانوادگی کارمند الزامی است.');
      return;
    }
    if (!trimmedCode) {
      setEmpFormError('کد پرسنلی نمی‌تواند خالی باشد.');
      return;
    }

    // Enforce unique personnel codes across all employees
    const duplicate = employees.find(
      (e) =>
        e.code.toLowerCase() === trimmedCode.toLowerCase() &&
        e.id !== (editingEmployee ? editingEmployee.id : '')
    );
    if (duplicate) {
      setEmpFormError(
        `کد پرسنلی «${trimmedCode}» قبلاً برای «${duplicate.name}» ثبت شده است. کد پرسنلی باید یکتا باشد.`
      );
      return;
    }

    setIsSubmittingEmp(true);
    setEmpFormError('');

    try {
      const newEmp: Employee = {
        id: editingEmployee ? editingEmployee.id : `emp-${Date.now()}`,
        code: trimmedCode,
        name: trimmedName,
        national_id: empForm.national_id.trim() || undefined,
        phone1: empForm.phone1.trim() || '',
        phone2: empForm.phone2.trim() || undefined,
        address: empForm.address.trim() || undefined,
        position: empForm.position.trim() || undefined,
        salary_base: empForm.salary_base || 0,
        balance: editingEmployee ? editingEmployee.balance : 0,
        status: empForm.status,
        created_at: editingEmployee ? editingEmployee.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      StorageService.saveEmployee(newEmp);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});

      setIsSubmittingEmp(false);
      setShowEmployeeModal(false);
      loadData();
    } catch (err: any) {
      setIsSubmittingEmp(false);
      setEmpFormError(err?.message || 'خطای غیرمنتظره در ثبت کارمند');
    }
  };

  // Open Transaction (Accrual / Payment) Modal - NO default amount or description per requirements
  const handleOpenTxModal = (emp: Employee, type: 'accrual' | 'payment') => {
    if (!StorageService.hasPermission('employees.financial')) {
      alert('شما مجوز ثبت امور مالی و حقوق پرسنل را ندارید.');
      return;
    }
    setIsSubmittingTx(false);
    setSelectedEmpForTx(emp);
    setTxType(type);
    setTxForm({
      date: getTodayISO(),
      amount: 0, // No default value
      payment_method: 'bank_transfer',
      reference_number: '',
      description: '', // No default value
    });
    setTxFormError('');
    setShowTxModal(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTx) return;
    if (!selectedEmpForTx) return;

    if (!StorageService.hasPermission('employees.financial')) {
      setTxFormError('شما مجوز ثبت تراکنش مالی پرسنل را ندارید.');
      return;
    }

    if (txForm.amount <= 0) {
      setTxFormError('لطفاً مبلغ تراکنش را وارد فرمایید.');
      return;
    }

    setIsSubmittingTx(true);
    setTxFormError('');

    try {
      StorageService.addEmployeeTransaction({
        employee_id: selectedEmpForTx.id,
        employee_name: selectedEmpForTx.name,
        date: txForm.date,
        type: txType,
        amount: txForm.amount,
        payment_method: txType === 'payment' ? txForm.payment_method : undefined,
        reference_number: txForm.reference_number.trim() || undefined,
        description: txForm.description.trim() || (txType === 'accrual' ? 'حقوق و کارکرد' : 'پرداخت وجه'),
        created_by: 'مدیر مالی',
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});

      setIsSubmittingTx(false);
      setShowTxModal(false);
      loadData();
    } catch (err: any) {
      setIsSubmittingTx(false);
      setTxFormError(err?.message || 'خطای غیرمنتظره در ثبت تراکنش');
    }
  };

  // Open Leave Modal for an employee
  const handleOpenLeaveModal = (emp: Employee) => {
    if (!StorageService.hasPermission('employees.leaves')) {
      alert('شما مجوز ثبت و مدیریت مرخصی پرسنل را ندارید.');
      return;
    }
    setSelectedEmpForLeave(emp);
    setShowLeaveModal(true);
  };

  // Filtered employees: Inactive employees ALWAYS placed at the bottom
  const filteredEmployees = employees
    .filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (emp.position && emp.position.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (emp.phone1 && emp.phone1.includes(searchQuery)) ||
        (emp.national_id && emp.national_id.includes(searchQuery));

      if (!matchSearch) return false;
      if (statusFilter !== 'all' && emp.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      // Inactive always at the end
      if (a.status === 'active' && b.status === 'inactive') return -1;
      if (a.status === 'inactive' && b.status === 'active') return 1;
      return a.code.localeCompare(b.code, undefined, { numeric: true });
    });

  // If Detail View is active, render EmployeeDetailView
  if (selectedEmployeeId) {
    return (
      <EmployeeDetailView
        employeeId={selectedEmployeeId}
        onBack={() => {
          setSelectedEmployeeId(null);
          loadData();
        }}
        onEditEmployee={(emp) => handleOpenEmpModal(emp)}
        onOpenTxModal={(emp, type) => handleOpenTxModal(emp, type)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-slate-700" />
            <span>مدیریت پرسنل</span>
          </h1>
        </div>

        {StorageService.hasPermission('employees.create') && (
          <button
            onClick={() => handleOpenEmpModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت پرسنل جدید</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجو در نام، سمت، کد پرسنلی، تلفن یا کدملی..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            همه ({toPersianDigits(employees.length)})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            شاغل ({toPersianDigits(employees.filter((e) => e.status === 'active').length)})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              statusFilter === 'inactive'
                ? 'bg-slate-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            غیرفعال
          </button>
        </div>
      </div>

      {/* Main Centered Employees Table & Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="md:hidden p-3 sm:p-4 bg-slate-100/75 dark:bg-slate-950/40 space-y-3">
          {filteredEmployees.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              پرسنلی مطابق با عبارت جستجو یافت نشد.
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isCreditor = emp.balance > 0;
              const isDebtor = emp.balance < 0;

              return (
                <div
                  key={`mob-emp-${emp.id}`}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs hover:shadow-sm transition overflow-hidden"
                >
                  {/* Header: Code + Status + Position */}
                  <div className="px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          emp.status === 'active'
                            ? 'bg-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950'
                            : 'bg-rose-500 ring-2 ring-rose-100 dark:ring-rose-950'
                        }`}
                        title={emp.status === 'active' ? 'شاغل / فعال' : 'غیرفعال / قطع همکاری'}
                      />
                      <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        کد: {emp.code}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>{emp.position || 'پرسنل کارخانه'}</span>
                    </div>
                  </div>

                  {/* Body: Name & Contact info */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className="font-bold text-sm text-slate-900 dark:text-white hover:text-blue-600 transition text-right"
                      >
                        {emp.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
                      >
                        مشاهده پرونده
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-1">
                      <div className="flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{emp.phone1 ? toPersianDigits(emp.phone1) : '—'}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono">
                        <span className="text-slate-400 text-[10px]">کدملی:</span>
                        <span>{emp.national_id ? toPersianDigits(emp.national_id) : '—'}</span>
                      </div>
                    </div>

                    {/* Balance Status */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">وضعیت حساب:</span>
                      {isCreditor && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <ArrowUpRight className="w-3 h-3" />
                          طلبکار: {formatCurrency(emp.balance)}
                        </span>
                      )}
                      {isDebtor && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <ArrowDownLeft className="w-3 h-3" />
                          بدهکار: {formatCurrency(Math.abs(emp.balance))}
                        </span>
                      )}
                      {emp.balance === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          تسویه
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      {StorageService.hasPermission('employees.financial') && (
                        <>
                          <button
                            onClick={() => handleOpenTxModal(emp, 'accrual')}
                            title="ثبت حقوق و کارکرد ماهانه"
                            className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>ثبت حقوق</span>
                          </button>
                          <button
                            onClick={() => handleOpenTxModal(emp, 'payment')}
                            title="پرداخت وجه / مساعده"
                            className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-900 flex items-center gap-1"
                          >
                            <DollarSign className="w-3 h-3" />
                            <span>پرداخت</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {StorageService.hasPermission('employees.leaves') && (
                        <button
                          onClick={() => handleOpenLeaveModal(emp)}
                          title="ثبت مرخصی"
                          className="px-2 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 text-[10px] font-bold border border-sky-200 dark:border-sky-800 flex items-center gap-1"
                        >
                          <Calendar className="w-3 h-3" />
                          <span>مرخصی</span>
                        </button>
                      )}

                      {StorageService.hasPermission('employees.edit') && (
                        <button
                          onClick={() => handleOpenEmpModal(emp)}
                          title="ویرایش"
                          className="p-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('employees.view')) && (
                        <button
                          type="button"
                          onClick={() => setHistoryEmployee(emp)}
                          title="تاریخچه"
                          className="p-1 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 text-center">کد پرسنلی</th>
                <th className="p-3 text-center">نام و سمت</th>
                <th className="p-3 text-center">شماره تماس</th>
                <th className="p-3 text-center">کد ملی</th>
                <th className="p-3 text-center">وضعیت مانده حساب</th>
                <th className="p-3 text-center">ثبت مالی</th>
                <th className="p-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    پرسنلی مطابق با عبارت جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isCreditor = emp.balance > 0;
                  const isDebtor = emp.balance < 0;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                      {/* 1. Employee Code: with green/red active/inactive indicator dot */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 font-mono font-bold text-slate-800">
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                              emp.status === 'active'
                                ? 'bg-emerald-500 ring-2 ring-emerald-100 shadow-2xs'
                                : 'bg-rose-500 ring-2 ring-rose-100 shadow-2xs'
                            }`}
                            title={emp.status === 'active' ? 'شاغل / فعال' : 'غیرفعال / قطع همکاری'}
                          />
                          <span>{emp.code}</span>
                        </div>
                      </td>

                      {/* 2. Name & Position: Clickable Name to open Detail View */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployeeId(emp.id)}
                          className="font-bold text-slate-900 hover:text-blue-600 hover:underline transition cursor-pointer text-xs inline-block"
                          title="مشاهده پرونده، سوابق مرخصی و گردش حساب"
                        >
                          {emp.name}
                        </button>
                        <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1 mt-0.5">
                          <Briefcase className="w-3 h-3 text-slate-400" />
                          <span>{emp.position || 'پرسنل کارخانه'}</span>
                        </div>
                      </td>

                      {/* 3. Phone: Separate Column */}
                      <td className="p-3 text-center font-mono text-slate-700">
                        {emp.phone1 ? toPersianDigits(emp.phone1) : '-'}
                      </td>

                      {/* 4. National ID: Separate Column */}
                      <td className="p-3 text-center font-mono text-slate-700">
                        {emp.national_id ? toPersianDigits(emp.national_id) : '-'}
                      </td>

                      {/* 5. Account Balance Status */}
                      <td className="p-3 text-center">
                        {isCreditor && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowUpRight className="w-3 h-3" />
                            طلبکار: {formatCurrency(emp.balance)}
                          </span>
                        )}
                        {isDebtor && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <ArrowDownLeft className="w-3 h-3" />
                            بدهکار: {formatCurrency(Math.abs(emp.balance))}
                          </span>
                        )}
                        {emp.balance === 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600">
                            تسویه
                          </span>
                        )}
                      </td>

                      {/* 6. Financial Registration: Salary / Payment */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {StorageService.hasPermission('employees.financial') ? (
                            <>
                              <button
                                onClick={() => handleOpenTxModal(emp, 'accrual')}
                                title="ثبت حقوق و کارکرد ماهانه (طلب کارمند)"
                                className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border border-emerald-200"
                              >
                                <Plus className="w-3 h-3" />
                                <span>ثبت حقوق</span>
                              </button>
                              <button
                                onClick={() => handleOpenTxModal(emp, 'payment')}
                                title="پرداخت وجه / مساعده / تسویه"
                                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border border-blue-200"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>پرداخت وجه</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      {/* 7. Operations: Edit, Leave Registration & Audit History */}
                      <td className="p-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('employees.view')) && (
                            <button
                              type="button"
                              onClick={() => setHistoryEmployee(emp)}
                              title="تاریخچه و لاگ رویدادهای کارمند"
                              className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border border-blue-200"
                            >
                              <History className="w-3 h-3" />
                              <span>تاریخچه</span>
                            </button>
                          )}

                          {StorageService.hasPermission('employees.edit') && (
                            <button
                              onClick={() => handleOpenEmpModal(emp)}
                              title="ویرایش پرونده کارمند"
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border border-amber-200"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>ویرایش</span>
                            </button>
                          )}

                          {StorageService.hasPermission('employees.leaves') && (
                            <button
                              onClick={() => handleOpenLeaveModal(emp)}
                              title="ثبت مرخصی روزانه یا ساعتی"
                              className="px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 text-[11px] font-bold transition cursor-pointer flex items-center gap-1 border border-sky-200"
                            >
                              <Calendar className="w-3 h-3" />
                              <span>ثبت مرخصی</span>
                            </button>
                          )}

                          {!StorageService.isAdmin() && !StorageService.hasPermission('settings.audit') && !StorageService.hasPermission('employees.edit') && !StorageService.hasPermission('employees.leaves') && (
                            <span className="text-slate-400 text-[11px]">مشاهده فقط</span>
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

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {editingEmployee ? 'ویرایش پرونده کارمند' : 'ثبت کارمند جدید'}
                  </h3>
                  <p className="text-[11px] text-slate-500">مشخصات فردی، شغلی و ارتباطی پرسنل</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmployeeModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {empFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{empFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">
                    نام و نام خانوادگی <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: مهندس بهزاد رحیمی"
                    value={empForm.name}
                    onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-slate-900 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">کد پرسنلی</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={empForm.code}
                    onChange={(e) => setEmpForm({ ...empForm, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">سمت / شغل سازمانی</label>
                  <input
                    type="text"
                    placeholder="مثال: سرپرست خط تولید اکسترودر"
                    value={empForm.position}
                    onChange={(e) => setEmpForm({ ...empForm, position: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره همراه</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="۰۹۱۲..."
                    value={empForm.phone1}
                    onChange={(e) => setEmpForm({ ...empForm, phone1: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">کد ملی</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="۱۰ رقمی"
                    value={empForm.national_id}
                    onChange={(e) => setEmpForm({ ...empForm, national_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره تماس دوم / ثابت</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="شماره منزل یا اضطراری..."
                    value={empForm.phone2}
                    onChange={(e) => setEmpForm({ ...empForm, phone2: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">وضعیت اشتغال</label>
                  <select
                    value={empForm.status}
                    onChange={(e) =>
                      setEmpForm({ ...empForm, status: e.target.value as 'active' | 'inactive' })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 font-medium"
                  >
                    <option value="active">شاغل و فعال</option>
                    <option value="inactive">غیرفعال / قطع همکاری</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-bold mb-1">آدرس و محل سکونت</label>
                  <input
                    type="text"
                    placeholder="آدرس محل سکونت..."
                    value={empForm.address}
                    onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingEmp}
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEmp}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingEmp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ذخیره پرسنل...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingEmployee ? 'ذخیره تغییرات' : 'ثبت کارمند'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACCRUAL / PAYMENT TRANSACTION MODAL */}
      {showTxModal && selectedEmpForTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    txType === 'accrual' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {txType === 'accrual' ? <ArrowUpRight className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    {txType === 'accrual' ? 'ثبت حقوق و طلب ماهانه' : 'پرداخت وجه و مساعده'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    کارمند: <span className="font-bold text-slate-800">{selectedEmpForTx.name}</span> ({selectedEmpForTx.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTxModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {txFormError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{txFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTransaction} className="space-y-3.5 text-xs">
              <JalaliDatePicker
                label="تاریخ سند"
                value={txForm.date}
                onChange={(d) => setTxForm({ ...txForm, date: d })}
                required
              />

              <RialInput
                label={txType === 'accrual' ? 'مبلغ حقوق / کارکرد (ریال)' : 'مبلغ پرداختی (ریال)'}
                value={txForm.amount}
                onChange={(val) => setTxForm({ ...txForm, amount: val })}
                required
                placeholder="مبلغ را به ریال وارد فرمایید"
              />

              {txType === 'payment' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">روش پرداخت</label>
                    <select
                      value={txForm.payment_method}
                      onChange={(e) =>
                        setTxForm({
                          ...txForm,
                          payment_method: e.target.value as 'cash' | 'card' | 'bank_transfer' | 'cheque',
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 font-medium"
                    >
                      <option value="bank_transfer">حواله پایا / ساتنا</option>
                      <option value="card">کارت به کارت / پوز</option>
                      <option value="cash">نقدی / صندوق</option>
                      <option value="cheque">چک بانکی</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">شماره پیگیری / فیش</label>
                    <input
                      type="text"
                      dir="ltr"
                      placeholder="کد پیگیری..."
                      value={txForm.reference_number}
                      onChange={(e) => setTxForm({ ...txForm, reference_number: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs text-slate-800"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">بابت / توضیحات سند</label>
                <input
                  type="text"
                  placeholder="توضیحات و بابت سند..."
                  value={txForm.description}
                  onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingTx}
                  onClick={() => setShowTxModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    txType === 'accrual'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmittingTx ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ثبت سند...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ثبت سند مالی</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAVE REGISTRATION MODAL */}
      {showLeaveModal && selectedEmpForLeave && (
        <LeaveModal
          employee={selectedEmpForLeave}
          onClose={() => {
            setShowLeaveModal(false);
            setSelectedEmpForLeave(null);
          }}
          onSaved={(savedLeave, shouldPrint) => {
            setShowLeaveModal(false);
            loadData();
            if (shouldPrint) {
              setPrintingLeave({ leave: savedLeave, emp: selectedEmpForLeave });
            }
            setSelectedEmpForLeave(null);
          }}
        />
      )}

      {/* PRINTABLE LEAVE SLIP MODAL */}
      {printingLeave && (
        <LeavePrintModal
          leave={printingLeave.leave}
          employee={printingLeave.emp}
          onClose={() => setPrintingLeave(null)}
        />
      )}

      {/* AUDIT HISTORY MODAL */}
      {historyEmployee && (
        <AuditHistoryModal
          isOpen={!!historyEmployee}
          onClose={() => setHistoryEmployee(null)}
          entityType="EMPLOYEE"
          entityId={historyEmployee.id}
          entityTitle={historyEmployee.name}
        />
      )}
    </div>
  );
};
