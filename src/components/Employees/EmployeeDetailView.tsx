import React, { useState, useEffect } from 'react';
import { Employee, EmployeeTransaction, EmployeeLeave, EmploymentPeriod } from '../../types';
import { StorageService } from '../../services/storageService';
import {
  formatCurrency,
  formatJalaliDate,
  toPersianDigits,
  getDaysPassedInCurrentJalaliYear,
  getTodayISO,
} from '../../utils/jalali';
import { LeaveModal } from './LeaveModal';
import { LeavePrintModal } from './LeavePrintModal';
import { EditTxModal } from './EditTxModal';
import { PeriodModal } from './PeriodModal';
import { EmployeeReportPrintModal } from './EmployeeReportPrintModal';
import { RialInput } from '../Common/RialInput';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import {
  UserCheck,
  ArrowRight,
  Plus,
  DollarSign,
  Calendar,
  Clock,
  Briefcase,
  Phone,
  FileText,
  Printer,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  MapPin,
  CalendarCheck,
  Wallet,
  History,
  X,
  UserX,
  UserPlus,
} from 'lucide-react';

interface EmployeeDetailViewProps {
  employeeId: string;
  onBack: () => void;
  onEditEmployee?: (emp: Employee) => void;
  onOpenTxModal?: (emp: Employee, type: 'accrual' | 'payment') => void;
}

export const EmployeeDetailView: React.FC<EmployeeDetailViewProps> = ({
  employeeId,
  onBack,
  onEditEmployee,
  onOpenTxModal,
}) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [transactions, setTransactions] = useState<EmployeeTransaction[]>([]);
  const [leaves, setLeaves] = useState<EmployeeLeave[]>([]);
  const [periods, setPeriods] = useState<EmploymentPeriod[]>([]);
  const [activeTab, setActiveTab] = useState<'ledger' | 'leaves' | 'periods'>('ledger');

  // Leave modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [editingLeave, setEditingLeave] = useState<EmployeeLeave | null>(null);
  const [printingLeave, setPrintingLeave] = useState<EmployeeLeave | null>(null);

  // Period modals
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<EmploymentPeriod | null>(null);

  // End active period quick modal
  const [showEndPeriodModal, setShowEndPeriodModal] = useState(false);
  const [endPeriodForm, setEndPeriodForm] = useState({
    date: getTodayISO(),
    reason: 'پایان قرارداد' as any,
    notes: '',
  });

  // Edit Tx modal
  const [editingTx, setEditingTx] = useState<EmployeeTransaction | null>(null);

  // Audit History modal
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Internal Create/Edit Transaction Modal (Direct execution so buttons always work)
  const [showDirectTxModal, setShowDirectTxModal] = useState(false);
  const [directTxType, setDirectTxType] = useState<'accrual' | 'payment'>('accrual');
  const [directTxForm, setDirectTxForm] = useState({
    date: getTodayISO(),
    amount: 0,
    payment_method: 'bank_transfer' as 'cash' | 'card' | 'bank_transfer' | 'cheque',
    reference_number: '',
    description: '',
  });
  const [directTxError, setDirectTxError] = useState('');
  const [isSubmittingDirectTx, setIsSubmittingDirectTx] = useState(false);

  // Internal Edit Profile Modal (Direct execution so button always works)
  const [showDirectEditEmpModal, setShowDirectEditEmpModal] = useState(false);
  const [directEmpForm, setDirectEmpForm] = useState({
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
  const [directEmpError, setDirectEmpError] = useState('');
  const [isSubmittingDirectEmp, setIsSubmittingDirectEmp] = useState(false);

  // Comprehensive Report Print Modal (Ledger / Leaves / Periods)
  const [reportPrint, setReportPrint] = useState<'ledger' | 'leaves' | 'periods' | null>(null);

  useEffect(() => {
    loadData();
  }, [employeeId]);

  const loadData = () => {
    const allEmps = StorageService.getEmployees();
    const current = allEmps.find((e) => e.id === employeeId) || null;
    setEmployee(current);

    if (current) {
      setTransactions(StorageService.getEmployeeTransactions(current.id));
      setLeaves(StorageService.getEmployeeLeaves(current.id));
      setPeriods(StorageService.getEmploymentPeriods(current.id));
    }
  };

  if (!employee) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <p className="text-slate-500 mb-4 text-xs">اطلاعات کارمند یافت نشد.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          بازگشت به لیست پرسنل
        </button>
      </div>
    );
  }

  // Active period check
  const activePeriod = periods.find((p) => p.status === 'active' && !p.end_date);

  // Leave Statistics
  const { currentYear, daysPassed, monthsPassed } = getDaysPassedInCurrentJalaliYear();
  let totalDailyLeaveDays = 0;
  let totalHourlyLeaveHours = 0;

  leaves.forEach((l) => {
    if (l.type === 'daily') {
      totalDailyLeaveDays += l.days_count || 1;
    } else if (l.type === 'hourly') {
      totalHourlyLeaveHours += l.hours_count || 0;
    }
  });

  const equivalentDaysFromHours = totalHourlyLeaveHours / 8;
  const totalEquivalentLeaveDays = +(totalDailyLeaveDays + equivalentDaysFromHours).toFixed(1);
  const averageMonthlyLeave = +(totalEquivalentLeaveDays / monthsPassed).toFixed(1);

  // Financial totals
  const totalAccruedSalary = transactions
    .filter((t) => t.type === 'accrual')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPaid = transactions
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  // Permissions
  const canEditEmployee = StorageService.hasPermission('employees.edit');
  const canManageFinancial = StorageService.hasPermission('employees.financial');
  const canManageLeaves = StorageService.hasPermission('employees.leaves');
  const canManagePeriods = StorageService.hasPermission('employees.periods');
  const canPrint = StorageService.hasPermission('employees.print');

  // Handlers
  const handleOpenDirectTx = (type: 'accrual' | 'payment') => {
    if (!canManageFinancial) return;
    setIsSubmittingDirectTx(false);
    setDirectTxType(type);
    setDirectTxForm({
      date: getTodayISO(),
      amount: 0,
      payment_method: 'bank_transfer',
      reference_number: '',
      description: '',
    });
    setDirectTxError('');
    setShowDirectTxModal(true);
  };

  const handleSaveDirectTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingDirectTx) return;
    if (!canManageFinancial) return;

    if (directTxForm.amount <= 0) {
      setDirectTxError('لطفاً مبلغ تراکنش را وارد فرمایید.');
      return;
    }

    setIsSubmittingDirectTx(true);
    setDirectTxError('');

    try {
      StorageService.addEmployeeTransaction({
        employee_id: employee.id,
        employee_name: employee.name,
        date: directTxForm.date,
        type: directTxType,
        amount: directTxForm.amount,
        payment_method: directTxType === 'payment' ? directTxForm.payment_method : undefined,
        reference_number: directTxForm.reference_number.trim() || undefined,
        description:
          directTxForm.description.trim() ||
          (directTxType === 'accrual' ? 'حقوق و کارکرد' : 'پرداخت وجه'),
        created_by: 'مدیر مالی',
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});

      setIsSubmittingDirectTx(false);
      setShowDirectTxModal(false);
      loadData();
    } catch (err: any) {
      setIsSubmittingDirectTx(false);
      setDirectTxError(err?.message || 'خطای غیرمنتظره در ثبت تراکنش');
    }
  };

  const handleOpenDirectEditEmp = () => {
    if (!canEditEmployee) return;
    setIsSubmittingDirectEmp(false);
    setDirectEmpForm({
      code: employee.code,
      name: employee.name,
      national_id: employee.national_id || '',
      phone1: employee.phone1 || '',
      phone2: employee.phone2 || '',
      address: employee.address || '',
      position: employee.position || '',
      salary_base: employee.salary_base || 0,
      status: employee.status || 'active',
    });
    setDirectEmpError('');
    setShowDirectEditEmpModal(true);
  };

  const handleSaveDirectEditEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingDirectEmp) return;
    if (!canEditEmployee) return;

    const trimmedName = directEmpForm.name.trim();
    const trimmedCode = directEmpForm.code.trim();

    if (!trimmedName) {
      setDirectEmpError('نام و نام خانوادگی کارمند الزامی است.');
      return;
    }
    if (!trimmedCode) {
      setDirectEmpError('کد پرسنلی الزامی است.');
      return;
    }

    const allEmps = StorageService.getEmployees();
    const duplicate = allEmps.find(
      (e) => e.code.toLowerCase() === trimmedCode.toLowerCase() && e.id !== employee.id
    );
    if (duplicate) {
      setDirectEmpError(
        `کد پرسنلی «${trimmedCode}» قبلاً برای «${duplicate.name}» ثبت شده است و باید یکتا باشد.`
      );
      return;
    }

    setIsSubmittingDirectEmp(true);
    setDirectEmpError('');

    try {
      const updatedEmp: Employee = {
        ...employee,
        code: trimmedCode,
        name: trimmedName,
        national_id: directEmpForm.national_id.trim() || undefined,
        phone1: directEmpForm.phone1.trim() || '',
        phone2: directEmpForm.phone2.trim() || undefined,
        address: directEmpForm.address.trim() || undefined,
        position: directEmpForm.position.trim() || undefined,
        salary_base: directEmpForm.salary_base || 0,
        status: directEmpForm.status,
        updated_at: new Date().toISOString(),
      };

      StorageService.saveEmployee(updatedEmp);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});

      setIsSubmittingDirectEmp(false);
      setShowDirectEditEmpModal(false);
      loadData();
    } catch (err: any) {
      setIsSubmittingDirectEmp(false);
      setDirectEmpError(err?.message || 'خطای غیرمنتظره در ویرایش کارمند');
    }
  };

  const handleDeleteLeave = (leaveId: string) => {
    if (!canManageLeaves) return;
    if (!window.confirm('آیا از حذف این رکورد مرخصی اطمینان دارید؟')) return;
    StorageService.deleteEmployeeLeave(leaveId);
    loadData();
  };

  const handleDeleteTx = (txId: string) => {
    if (!canManageFinancial) return;
    if (!window.confirm('آیا از حذف این سند مالی اطمینان دارید؟ مانده حساب کارمند اصلاح خواهد شد.'))
      return;
    StorageService.deleteEmployeeTransaction(txId);
    loadData();
  };

  const handleDeletePeriod = (periodId: string) => {
    if (!canManagePeriods) return;
    if (!window.confirm('آیا از حذف این دوره همکاری اطمینان دارید؟')) return;
    StorageService.deleteEmploymentPeriod(periodId);
    loadData();
  };

  const handleEndActivePeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManagePeriods) return;
    if (!endPeriodForm.date) return;
    StorageService.endEmploymentPeriod(
      employee.id,
      endPeriodForm.date,
      endPeriodForm.reason,
      endPeriodForm.notes
    );
    setShowEndPeriodModal(false);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer flex items-center justify-center"
            title="بازگشت به لیست پرسنل"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {employee.name}
              </h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                <span
                  className={`w-2 h-2 rounded-full ${
                    employee.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                <span>{employee.code}</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  employee.status === 'active'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {employee.status === 'active' ? 'شاغل / فعال' : 'غیرفعال / قطع همکاری'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>{employee.position || 'پرسنل کارخانه'}</span>
              {employee.phone1 && (
                <>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{toPersianDigits(employee.phone1)}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Header Action Buttons - Guarded by Permissions */}
        <div className="flex flex-wrap items-center gap-2">
          {canManageFinancial && (
            <>
              <button
                onClick={() => handleOpenDirectTx('accrual')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت حقوق</span>
              </button>

              <button
                onClick={() => handleOpenDirectTx('payment')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>پرداخت وجه</span>
              </button>
            </>
          )}

          {canManageLeaves && (
            <button
              onClick={() => {
                setEditingLeave(null);
                setShowLeaveModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>ثبت مرخصی</span>
            </button>
          )}

          {canEditEmployee && (
            <button
              onClick={handleOpenDirectEditEmp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" />
              <span>ویرایش پرونده</span>
            </button>
          )}

          {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('employees.view')) && (
            <button
              onClick={() => setShowAuditModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/40 hover:bg-blue-100/70 text-blue-700 dark:text-blue-300 text-xs font-bold transition cursor-pointer"
              title="تاریخچه و لاگ رویدادهای پرونده کارمند"
            >
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>تاریخچه و لاگ</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Profile Details Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>مشخصات هویتی و پرسنلی</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 block">کد ملی:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {employee.national_id ? toPersianDigits(employee.national_id) : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">شماره تماس اضطراری:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {employee.phone2 ? toPersianDigits(employee.phone2) : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">پایه حقوق توافقی:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {employee.salary_base ? formatCurrency(employee.salary_base) : '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block">وضعیت دوره فعلی:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {activePeriod ? 'مشغول به کار (قرارداد معتبر)' : 'فاقد قرارداد فعال'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block">آدرس سکونت:</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium truncate block">
                {employee.address || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Balance Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span>وضعیت مالی و مانده حساب</span>
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">وضعیت مانده حساب:</span>
              <div>
                {employee.balance > 0 && (
                  <span className="inline-flex items-center gap-1 font-black text-emerald-700 dark:text-emerald-400 text-xs bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    طلبکار: {formatCurrency(employee.balance)}
                  </span>
                )}
                {employee.balance < 0 && (
                  <span className="inline-flex items-center gap-1 font-black text-rose-700 dark:text-rose-400 text-xs bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    بدهکار (مساعده): {formatCurrency(Math.abs(employee.balance))}
                  </span>
                )}
                {employee.balance === 0 && (
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    تسویه کامل
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">مجموع حقوق و طلب ثبت‌شده:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(totalAccruedSalary)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">مجموع پرداخت‌ها و مساعده:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(totalPaid)}
              </span>
            </div>
          </div>
        </div>

        {/* Leave Statistics Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs space-y-2.5 text-xs">
          <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-900/60 pb-2">
            <span className="font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CalendarCheck className="w-4 h-4 text-amber-600" />
              <span>آمار مرخصی در سال جاری ({toPersianDigits(currentYear)})</span>
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400 font-medium">میزان مرخصی در سال جاری:</span>
              <span className="font-black text-slate-900 dark:text-slate-100 text-xs bg-amber-100/80 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 px-2 py-0.5 rounded-md">
                {toPersianDigits(totalEquivalentLeaveDays)} روز
                {totalHourlyLeaveHours > 0 && (
                  <span className="text-[10px] text-amber-800 dark:text-amber-400 font-normal mr-1">
                    ({toPersianDigits(totalDailyLeaveDays)} روز + {toPersianDigits(totalHourlyLeaveHours)} ساعت)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-amber-200/50 dark:border-amber-900/50">
              <div>
                <span className="text-slate-600 dark:text-slate-400 font-medium block">میانگین مرخصی در سال:</span>
                <span className="text-[10px] text-slate-400">
                  (بر اساس سپری شدن {toPersianDigits(daysPassed)} روز از سال)
                </span>
              </div>
              <span className="font-black text-blue-700 dark:text-blue-300 text-xs bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                {toPersianDigits(averageMonthlyLeave)} روز در ماه
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Tab Headers: EXACT REQUESTED ORDER: 1. Ledger 2. Leaves (سوابق مرخصی) 3. Employment Periods */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 pt-3 bg-slate-50 dark:bg-slate-800/50 gap-3">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {/* Tab 1: Ledger */}
            <button
              onClick={() => setActiveTab('ledger')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'ledger'
                  ? 'border-blue-600 text-blue-700 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>گردش حساب و اسناد مالی ({toPersianDigits(transactions.length)})</span>
            </button>

            {/* Tab 2: Leaves (Title exact: سوابق مرخصی) */}
            <button
              onClick={() => setActiveTab('leaves')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'leaves'
                  ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>سوابق مرخصی ({toPersianDigits(leaves.length)})</span>
            </button>

            {/* Tab 3: Employment Periods & Contracts */}
            <button
              onClick={() => setActiveTab('periods')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                activeTab === 'periods'
                  ? 'border-purple-600 text-purple-700 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>سوابق همکاری و قراردادها (شروع و پایان کار) ({toPersianDigits(periods.length)})</span>
            </button>
          </div>

          {/* Tab Actions / Print Buttons */}
          <div className="flex items-center gap-2 mb-2 self-end sm:self-center">
            {activeTab === 'ledger' && (
              <div className="flex items-center gap-1.5">
                {canPrint && (
                  <button
                    onClick={() => setReportPrint('ledger')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs"
                    title="چاپ صورت‌حساب مالی کارمند"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    <span>چاپ صورت‌حساب مالی</span>
                  </button>
                )}

                {canManageFinancial && (
                  <>
                    <button
                      onClick={() => handleOpenDirectTx('accrual')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>ثبت حقوق</span>
                    </button>
                    <button
                      onClick={() => handleOpenDirectTx('payment')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                    >
                      <DollarSign className="w-3 h-3" />
                      <span>پرداخت وجه</span>
                    </button>
                  </>
                )}
              </div>
            )}

            {activeTab === 'leaves' && (
              <div className="flex items-center gap-1.5">
                {canPrint && (
                  <button
                    onClick={() => setReportPrint('leaves')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs"
                    title="چاپ گزارش سوابق مرخصی"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-600" />
                    <span>چاپ سوابق مرخصی</span>
                  </button>
                )}

                {canManageLeaves && (
                  <button
                    onClick={() => {
                      setEditingLeave(null);
                      setShowLeaveModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ثبت مرخصی جدید</span>
                  </button>
                )}
              </div>
            )}

            {activeTab === 'periods' && (
              <div className="flex items-center gap-1.5">
                {canPrint && (
                  <button
                    onClick={() => setReportPrint('periods')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs"
                    title="چاپ سوابق همکاری و قراردادها"
                  >
                    <Printer className="w-3.5 h-3.5 text-purple-600" />
                    <span>چاپ سوابق همکاری</span>
                  </button>
                )}

                {canManagePeriods && (
                  <>
                    {activePeriod ? (
                      <button
                        onClick={() => {
                          setEndPeriodForm({
                            date: getTodayISO(),
                            reason: 'پایان قرارداد',
                            notes: '',
                          });
                          setShowEndPeriodModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                        title="ثبت تاریخ خاتمه و قطع همکاری دوره فعلی"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>ثبت پایان کار دوره فعلی</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPeriod(null);
                          setShowPeriodModal(true);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                        title="شروع دوره جدید همکاری با این پرسنل"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>شروع دوره همکاری جدید</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setEditingPeriod(null);
                        setShowPeriodModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>ثبت دوره قرارداد</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* TAB 1: FINANCIAL TRANSACTIONS LEDGER */}
        {activeTab === 'ledger' && (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">ردیف</th>
                  <th className="p-3">تاریخ سند</th>
                  <th className="p-3 text-right">شرح و بابت تراکنش</th>
                  <th className="p-3 text-emerald-700 dark:text-emerald-400">طلبکار (حقوق / کارکرد)</th>
                  <th className="p-3 text-rose-700 dark:text-rose-400">بدهکار (واریزی / مساعده)</th>
                  <th className="p-3">روش پرداخت / پیگیری</th>
                  {canManageFinancial && <th className="p-3">عملیات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={canManageFinancial ? 7 : 6} className="p-8 text-center text-slate-400">
                      هیچ تراکنش مالی برای این پرسنل ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t, index) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                      <td className="p-3 font-mono text-slate-400 text-[11px]">
                        {toPersianDigits(index + 1)}
                      </td>
                      <td className="p-3 font-mono text-slate-800 dark:text-slate-200">
                        {formatJalaliDate(t.date)}
                      </td>
                      <td className="p-3 text-right font-medium text-slate-800 dark:text-slate-200 max-w-sm truncate">
                        {t.description || '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {t.type === 'accrual' ? formatCurrency(t.amount) : '-'}
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-700 dark:text-rose-400">
                        {t.type === 'payment' ? formatCurrency(t.amount) : '-'}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        {t.reference_number ? (
                          <span>
                            {t.payment_method === 'bank_transfer'
                              ? 'حواله'
                              : t.payment_method === 'card'
                              ? 'کارت'
                              : t.payment_method === 'cash'
                              ? 'نقدی'
                              : 'چک'}
                            : {toPersianDigits(t.reference_number)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      {canManageFinancial && (
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setEditingTx(t)}
                              title="ویرایش سند مالی"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTx(t.id)}
                              title="حذف سند مالی"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: LEAVES TABLE */}
        {activeTab === 'leaves' && (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">ردیف</th>
                  <th className="p-3">نوع مرخصی</th>
                  <th className="p-3">دسته‌بندی</th>
                  <th className="p-3">تاریخ / بازه زمانی</th>
                  <th className="p-3">مدت مرخصی</th>
                  <th className="p-3 text-right">علت و توضیحات</th>
                  <th className="p-3">جانشین</th>
                  {(canPrint || canManageLeaves) && <th className="p-3">عملیات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={(canPrint || canManageLeaves) ? 8 : 7} className="p-8 text-center text-slate-400">
                      هیچ سابقه مرخصی برای این پرسنل ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  leaves.map((l, index) => {
                    const isDaily = l.type === 'daily';
                    const durationDisplay = isDaily
                      ? `${toPersianDigits(l.days_count || 1)} روز`
                      : l.hours_text || `${toPersianDigits(l.hours_count || 0)} ساعت`;

                    return (
                      <tr key={l.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          {toPersianDigits(index + 1)}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              isDaily
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                            }`}
                          >
                            {isDaily ? <Calendar className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            <span>{isDaily ? 'روزانه' : 'ساعتی'}</span>
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                          {l.category || 'استحقاقی'}
                        </td>
                        <td className="p-3 font-mono text-slate-800 dark:text-slate-200">
                          {isDaily ? (
                            <span>
                              {formatJalaliDate(l.from_date)}
                              {l.from_date !== l.to_date && ` تا ${formatJalaliDate(l.to_date)}`}
                            </span>
                          ) : (
                            <span>
                              {formatJalaliDate(l.date)} ({toPersianDigits(l.from_time || '')} -{' '}
                              {toPersianDigits(l.to_time || '')})
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-black text-slate-900 dark:text-slate-100 font-mono">
                          {durationDisplay}
                        </td>
                        <td className="p-3 text-right max-w-xs truncate text-slate-700 dark:text-slate-300">
                          {l.description || '-'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">
                          {l.replacement_person || '-'}
                        </td>
                        {(canPrint || canManageLeaves) && (
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              {canPrint && (
                                <button
                                  onClick={() => setPrintingLeave(l)}
                                  title="چاپ برگه درخواست مرخصی (A5)"
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition cursor-pointer"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              )}
                              {canManageLeaves && (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingLeave(l);
                                      setShowLeaveModal(true);
                                    }}
                                    title="ویرایش مرخصی"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLeave(l.id)}
                                    title="حذف مرخصی"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: EMPLOYMENT PERIODS (شروع و پایان کار) */}
        {activeTab === 'periods' && (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">ردیف</th>
                  <th className="p-3">نوع قرارداد</th>
                  <th className="p-3">سمت در دوره</th>
                  <th className="p-3">تاریخ شروع به کار</th>
                  <th className="p-3">تاریخ پایان همکاری</th>
                  <th className="p-3">وضعیت دوره</th>
                  <th className="p-3">علت پایان کار</th>
                  <th className="p-3 text-right">توضیحات و توافقات</th>
                  {canManagePeriods && <th className="p-3">عملیات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {periods.length === 0 ? (
                  <tr>
                    <td colSpan={canManagePeriods ? 9 : 8} className="p-8 text-center text-slate-400">
                      هیچ سابقه شروع و پایان کار ثبت نشده است. با دکمه «شروع دوره همکاری جدید» ثبت نمایید.
                    </td>
                  </tr>
                ) : (
                  periods.map((p, index) => {
                    const isActive = p.status === 'active' && !p.end_date;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                        <td className="p-3 font-mono text-slate-400 text-[11px]">
                          {toPersianDigits(index + 1)}
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-200">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {p.contract_type || 'قراردادی'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {p.position || employee.position || '-'}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {formatJalaliDate(p.start_date)}
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                          {p.end_date ? (
                            formatJalaliDate(p.end_date)
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              تاکنون (مشغول به کار)
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                              isActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isActive ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span>{isActive ? 'مشغول به کار' : 'خاتمه یافته'}</span>
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                          {p.reason_for_leaving || '-'}
                        </td>
                        <td className="p-3 text-right max-w-xs truncate text-slate-600 dark:text-slate-400">
                          {p.notes || '-'}
                        </td>
                        {canManagePeriods && (
                          <td className="p-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => {
                                  setEditingPeriod(p);
                                  setShowPeriodModal(true);
                                }}
                                title="ویرایش دوره همکاری"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePeriod(p.id)}
                                title="حذف دوره همکاری"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leave Registration & Edit Modal */}
      {showLeaveModal && (
        <LeaveModal
          employee={employee}
          initialLeave={editingLeave}
          onClose={() => {
            setShowLeaveModal(false);
            setEditingLeave(null);
          }}
          onSaved={(savedLeave, shouldPrint) => {
            setShowLeaveModal(false);
            setEditingLeave(null);
            loadData();
            if (shouldPrint) {
              setPrintingLeave(savedLeave);
            }
          }}
        />
      )}

      {/* Printable Leave Slip Modal (A5) */}
      {printingLeave && (
        <LeavePrintModal
          leave={printingLeave}
          employee={employee}
          onClose={() => setPrintingLeave(null)}
        />
      )}

      {/* Edit Existing Transaction Modal */}
      {editingTx && (
        <EditTxModal
          transaction={editingTx}
          employee={employee}
          onClose={() => setEditingTx(null)}
          onSaved={() => {
            setEditingTx(null);
            loadData();
          }}
        />
      )}

      {/* Employment Period Modal (Add / Edit) */}
      {showPeriodModal && (
        <PeriodModal
          employee={employee}
          initialPeriod={editingPeriod}
          onClose={() => {
            setShowPeriodModal(false);
            setEditingPeriod(null);
          }}
          onSaved={(savedPeriod) => {
            StorageService.saveEmploymentPeriod(savedPeriod);
            setShowPeriodModal(false);
            setEditingPeriod(null);
            loadData();
          }}
        />
      )}

      {/* Quick End Active Period Modal */}
      {showEndPeriodModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <UserX className="w-4 h-4" />
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-sm">
                  ثبت خاتمه و پایان کار پرسنل
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEndPeriodModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEndActivePeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاریخ پایان / خاتمه همکاری:
                </label>
                <JalaliDatePicker
                  value={endPeriodForm.date}
                  onChange={(d) => setEndPeriodForm({ ...endPeriodForm, date: d })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  علت خاتمه کار:
                </label>
                <select
                  value={endPeriodForm.reason}
                  onChange={(e: any) =>
                    setEndPeriodForm({ ...endPeriodForm, reason: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <option value="پایان قرارداد">اتمام مدت قرارداد</option>
                  <option value="استعفا">استعفای پرسنل</option>
                  <option value="توافق طرفین">توافق طرفین / قطع همکاری</option>
                  <option value="تعدیل نیرو">تعدیل نیرو</option>
                  <option value="بازنشستگی">بازنشستگی</option>
                  <option value="سایر">سایر موارد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توضیحات تسویه یا خاتمه کار:
                </label>
                <textarea
                  rows={2}
                  value={endPeriodForm.notes}
                  onChange={(e) => setEndPeriodForm({ ...endPeriodForm, notes: e.target.value })}
                  placeholder="توضیحات پیرامون پایان همکاری، تسویه‌حساب و تحویل کار..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEndPeriodModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تأیید پایان همکاری</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Report Print Modal (Ledger, Leaves, Periods) */}
      {reportPrint && (
        <EmployeeReportPrintModal
          reportType={reportPrint}
          employee={employee}
          transactions={transactions}
          leaves={leaves}
          periods={periods}
          onClose={() => setReportPrint(null)}
        />
      )}

      {/* DIRECT TRANSACTION MODAL (Salary / Payment) */}
      {showDirectTxModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    directTxType === 'accrual'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {directTxType === 'accrual' ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    <DollarSign className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">
                    {directTxType === 'accrual'
                      ? 'ثبت حقوق، دستمزد و کارکرد'
                      : 'پرداخت وجه، مساعده و تسویه'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    کارمند: {employee.name} (کد: {employee.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectTxModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {directTxError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{directTxError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDirectTx} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاریخ سند:
                </label>
                <JalaliDatePicker
                  value={directTxForm.date}
                  onChange={(d) => setDirectTxForm({ ...directTxForm, date: d })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مبلغ به ریال:
                </label>
                <RialInput
                  value={directTxForm.amount}
                  onChange={(v) => setDirectTxForm({ ...directTxForm, amount: v })}
                  placeholder="مبلغ را به ریال وارد کنید"
                />
              </div>

              {directTxType === 'payment' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      روش پرداخت:
                    </label>
                    <select
                      value={directTxForm.payment_method}
                      onChange={(e: any) =>
                        setDirectTxForm({ ...directTxForm, payment_method: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="bank_transfer">حواله پایا / ساتنا</option>
                      <option value="card">کارت به کارت</option>
                      <option value="cash">نقدی</option>
                      <option value="cheque">چک بانکی</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      شماره پیگیری / ارجاع:
                    </label>
                    <input
                      type="text"
                      value={directTxForm.reference_number}
                      onChange={(e) =>
                        setDirectTxForm({ ...directTxForm, reference_number: e.target.value })
                      }
                      placeholder="کد پیگیری بانکی"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  شرح و بابت سند:
                </label>
                <textarea
                  rows={2}
                  value={directTxForm.description}
                  onChange={(e) =>
                    setDirectTxForm({ ...directTxForm, description: e.target.value })
                  }
                  placeholder={
                    directTxType === 'accrual'
                      ? 'مثال: حقوق و مزایای شهریور ۱۴۰۵'
                      : 'مثال: واریز مساعده نیمه اول ماه'
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingDirectTx}
                  onClick={() => setShowDirectTxModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDirectTx}
                  className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed ${
                    directTxType === 'accrual'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmittingDirectTx ? (
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

      {/* DIRECT EDIT EMPLOYEE PROFILE MODAL */}
      {showDirectEditEmpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">
                    ویرایش پرونده پرسنلی
                  </h3>
                  <p className="text-[11px] text-slate-500">مشخصات فردی، شغلی و ارتباطی پرسنل</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectEditEmpModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {directEmpError && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{directEmpError}</span>
              </div>
            )}

            <form onSubmit={handleSaveDirectEditEmp} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    کد پرسنلی (یکتا): *
                  </label>
                  <input
                    type="text"
                    value={directEmpForm.code}
                    onChange={(e) =>
                      setDirectEmpForm({ ...directEmpForm, code: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    نام و نام خانوادگی: *
                  </label>
                  <input
                    type="text"
                    value={directEmpForm.name}
                    onChange={(e) =>
                      setDirectEmpForm({ ...directEmpForm, name: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    کد ملی:
                  </label>
                  <input
                    type="text"
                    value={directEmpForm.national_id}
                    onChange={(e) =>
                      setDirectEmpForm({ ...directEmpForm, national_id: e.target.value })
                    }
                    placeholder="۱۰ رقم کد ملی"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    سمت / عنوان شغلی:
                  </label>
                  <input
                    type="text"
                    value={directEmpForm.position}
                    onChange={(e) =>
                      setDirectEmpForm({ ...directEmpForm, position: e.target.value })
                    }
                    placeholder="مثال: اپراتور ارشد خط تولید"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره تماس اصلی:
                  </label>
                  <input
                    type="text"
                    value={directEmpForm.phone1}
                    onChange={(e) =>
                      setDirectEmpForm({ ...directEmpForm, phone1: e.target.value })
                    }
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    شماره تماس اضطراری:
                  </label>
                  <input
                    type="text"
                    value={directEmpForm.phone2}
                    onChange={(e) =>
                      setDirectEmpForm({ ...directEmpForm, phone2: e.target.value })
                    }
                    placeholder="شماره منزل یا بستگان"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    پایه حقوق توافقی (ریال):
                  </label>
                  <RialInput
                    value={directEmpForm.salary_base}
                    onChange={(v) =>
                      setDirectEmpForm({ ...directEmpForm, salary_base: v })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    وضعیت همکاری:
                  </label>
                  <select
                    value={directEmpForm.status}
                    onChange={(e: any) =>
                      setDirectEmpForm({ ...directEmpForm, status: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="active">شاغل / فعال</option>
                    <option value="inactive">غیرفعال / قطع همکاری</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  آدرس محل سکونت:
                </label>
                <textarea
                  rows={2}
                  value={directEmpForm.address}
                  onChange={(e) =>
                    setDirectEmpForm({ ...directEmpForm, address: e.target.value })
                  }
                  placeholder="آدرس دقیق محل سکونت پرسنل..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmittingDirectEmp}
                  onClick={() => setShowDirectEditEmpModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDirectEmp}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmittingDirectEmp ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ذخیره...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ذخیره تغییرات پرونده</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {showAuditModal && employee && (
        <AuditHistoryModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
          entityType="EMPLOYEE"
          entityId={employee.id}
          entityTitle={employee.name}
        />
      )}
    </div>
  );
};
