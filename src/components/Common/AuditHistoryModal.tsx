import React, { useState, useEffect } from 'react';
import { AuditLog } from '../../types';
import { StorageService } from '../../services/storageService';
import { formatJalaliDateTime, toPersianDigits } from '../../utils/jalali';
import { exportToExcel } from '../../utils/exportExcel';
import { formatAuditNarrative, getAuditFieldDiffs, ENTITY_LABELS } from '../../utils/formatAuditLog';
import {
  X,
  History,
  User,
  Clock,
  Download,
  Search,
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Edit3,
  PlusCircle,
  Printer,
  FileText,
} from 'lucide-react';

interface AuditHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType?: string; // 'CUSTOMER' | 'ORDER' | 'INVOICE' | 'PAYMENT' | 'DELIVERY' | 'RETURN' | 'ADJUSTMENT' | 'WAREHOUSE' | 'PRODUCTION' | 'EXPENSE' | 'EMPLOYEE'
  entityId?: string;
  documentNumber?: string;
  title?: string;
  entityTitle?: string;
  subtitle?: string;
}

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  documentNumber,
  title,
  entityTitle,
  subtitle,
}) => {
  const displayTitle = title || entityTitle || 'تاریخچه تغییرات و رویدادها (Audit Logs)';
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'create' | 'update' | 'confirm' | 'cancel' | 'delete' | 'print'>('all');

  const canViewAudit =
    StorageService.isAdmin() ||
    StorageService.hasPermission('settings.audit') ||
    !entityType ||
    (entityType.toUpperCase() === 'INVOICE' && StorageService.hasPermission('invoices.view')) ||
    (entityType.toUpperCase() === 'ORDER' && StorageService.hasPermission('orders.view')) ||
    (entityType.toUpperCase() === 'CUSTOMER' && StorageService.hasPermission('customers.view')) ||
    (entityType.toUpperCase() === 'PAYMENT' && StorageService.hasPermission('payments.view')) ||
    (entityType.toUpperCase() === 'DELIVERY' && StorageService.hasPermission('deliveries.view')) ||
    (entityType.toUpperCase() === 'RETURN' && StorageService.hasPermission('returns.view')) ||
    (entityType.toUpperCase() === 'WAREHOUSE' && StorageService.hasPermission('warehouse.view')) ||
    (entityType.toUpperCase() === 'MATERIAL_MOVEMENT' && StorageService.hasPermission('warehouse.view')) ||
    (entityType.toUpperCase() === 'PRODUCTION' && StorageService.hasPermission('production.view')) ||
    (entityType.toUpperCase() === 'EXPENSE' && StorageService.hasPermission('expenses.view')) ||
    (entityType.toUpperCase() === 'EMPLOYEE' && StorageService.hasPermission('employees.view')) ||
    (entityType.toUpperCase() === 'CHEQUE' && StorageService.hasPermission('cheques.view')) ||
    (entityType.toUpperCase() === 'ADJUSTMENT' && StorageService.hasPermission('adjustments.view'));

  const loadLogs = () => {
    const matchedLogs = StorageService.getEntityAuditLogs(entityType, entityId, documentNumber);
    setLogs(matchedLogs);
  };

  useEffect(() => {
    if (isOpen) {
      loadLogs();
      setSearchQuery('');
      setActionFilter('all');
    }
  }, [isOpen, entityType, entityId, documentNumber]);

  useEffect(() => {
    const handleUpdate = () => {
      if (isOpen) {
        loadLogs();
      }
    };
    window.addEventListener('audit-logs-updated', handleUpdate);
    return () => window.removeEventListener('audit-logs-updated', handleUpdate);
  }, [isOpen, entityType, entityId, documentNumber]);

  if (!isOpen) return null;

  // Security barrier: Audit logs only accessible to authorized users
  if (!canViewAudit) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white mb-2">
            دسترسی محدود به مدیر سیستم
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            مشاهده لاگ‌ها و تاریخچه رویدادهای سیستم منحصراً در اختیار مدیریت سامانه قرار دارد.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            متوجه شدم و بستن
          </button>
        </div>
      </div>
    );
  }

  const filteredLogs = logs.filter((l) => {
    // Action filter
    if (actionFilter !== 'all') {
      if (actionFilter === 'create' && l.action_type !== 'create' && !l.action.includes('ثبت') && !l.action.includes('ایجاد')) return false;
      if (actionFilter === 'update' && l.action_type !== 'update' && !l.action.includes('ویرایش') && !l.action.includes('تغییر')) return false;
      if (actionFilter === 'confirm' && l.action_type !== 'confirm' && !l.action.includes('تایید')) return false;
      if (actionFilter === 'cancel' && l.action_type !== 'cancel' && !l.action.includes('لغو') && !l.action.includes('ابطال')) return false;
      if (actionFilter === 'delete' && l.action_type !== 'delete' && !l.action.includes('حذف')) return false;
      if (actionFilter === 'print' && l.action_type !== 'print' && !l.action.includes('چاپ') && !l.action.includes('خروجی')) return false;
    }

    // Search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      l.action.toLowerCase().includes(q) ||
      (l.user_name && l.user_name.toLowerCase().includes(q)) ||
      (l.user_role && l.user_role.toLowerCase().includes(q)) ||
      (l.document_number && l.document_number.toLowerCase().includes(q)) ||
      (l.entity_id && l.entity_id.toLowerCase().includes(q)) ||
      JSON.stringify(l.new_values || {}).toLowerCase().includes(q) ||
      JSON.stringify(l.old_values || {}).toLowerCase().includes(q)
    );
  });

  const handleExportExcel = () => {
    const data = filteredLogs.map((l, idx) => ({
      ردیف: idx + 1,
      شرح_کامل_رویداد: formatAuditNarrative(l),
      تاریخ_و_ساعت: formatJalaliDateTime(l.created_at),
      کاربر_اقدام_کننده: l.user_name || 'کاربر سیستم',
      سمت_کاربر: l.user_role || '-',
      نوع_عملیات: l.action,
      بخش_سیستم: ENTITY_LABELS[l.entity_type?.toUpperCase()] || l.entity_type,
      شماره_سند: l.document_number || l.entity_id || '-',
    }));

    exportToExcel({
      fileName: `لاگ_تغییرات_${entityType || 'سیستم'}_${documentNumber || entityId || 'کلی'}`,
      sheetName: 'تاریخچه_رویدادها',
      data,
    });
  };

  const getActionBadge = (log: AuditLog) => {
    const action = log.action.toLowerCase();
    const type = log.action_type;

    if (type === 'create' || action.includes('ثبت') || action.includes('ایجاد') || action.includes('تعریف')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <PlusCircle className="w-3 h-3" />
          ثبت و ایجاد
        </span>
      );
    }
    if (type === 'confirm' || action.includes('تایید')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <CheckCircle2 className="w-3 h-3" />
          تایید نهایی
        </span>
      );
    }
    if (type === 'cancel' || action.includes('لغو') || action.includes('ابطال')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <XCircle className="w-3 h-3" />
          ابطال / لغو
        </span>
      );
    }
    if (type === 'delete' || action.includes('حذف')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3" />
          حذف
        </span>
      );
    }
    if (type === 'print' || action.includes('چاپ') || action.includes('خروجی')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Printer className="w-3 h-3" />
          چاپ و گزارش
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
        <Edit3 className="w-3 h-3" />
        ویرایش و تغییر
      </span>
    );
  };

  if (!isOpen || !canViewAudit) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-slate-800 truncate">
                  {displayTitle}
                </h2>
                {(() => {
                  const displayDoc =
                    documentNumber ||
                    (entityId &&
                    (entityId.startsWith('ORD-') ||
                      entityId.startsWith('INV-') ||
                      entityId.startsWith('DEL-') ||
                      entityId.startsWith('PAY-') ||
                      entityId.startsWith('RET-') ||
                      entityId.startsWith('EMP-'))
                      ? entityId
                      : null);
                  if (!displayDoc) return null;
                  return (
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200">
                      {displayDoc}
                    </span>
                  );
                })()}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  ویژه مدیریت
                </span>
              </div>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={filteredLogs.length === 0}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="خروجی اکسل تاریخچه"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروجی اکسل</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="جستجو در متن رویداد، نام کاربر، سمت یا فیلدهای تغییر یافته..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
            />
          </div>

          {/* Action Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
            <button
              onClick={() => setActionFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                actionFilter === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه ({toPersianDigits(logs.length)})
            </button>
            <button
              onClick={() => setActionFilter('create')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                actionFilter === 'create'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              ثبت اولیه
            </button>
            <button
              onClick={() => setActionFilter('update')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                actionFilter === 'update'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              ویرایش‌ها
            </button>
            <button
              onClick={() => setActionFilter('confirm')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                actionFilter === 'confirm'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              تاییدها
            </button>
            <button
              onClick={() => setActionFilter('cancel')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                actionFilter === 'cancel'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              ابطال
            </button>
          </div>
        </div>

        {/* Timeline Log List */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          {filteredLogs.length === 0 ? (
            <div className="py-14 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">رویدادی منطبق با فیلتر یافت نشد.</p>
              <p className="text-[11px] text-slate-400">تمام تغییرات این سند پس از انجام به صورت خودکار در این قسمت ثبت می‌گردد.</p>
            </div>
          ) : (
            <div className="relative border-r-2 border-blue-200 mr-3 space-y-4 pr-4">
              {filteredLogs.map((log) => {
                const diffs = getAuditFieldDiffs(log);
                return (
                  <div key={log.id} className="relative group">
                    {/* Timeline Dot */}
                    <div className="absolute -right-[23px] top-2 w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-600 group-hover:scale-125 transition-transform shadow-xs" />

                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition-colors">
                      {/* Top Header of Log */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2.5 border-b border-slate-100 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getActionBadge(log)}
                          <span className="font-black text-slate-800 text-xs sm:text-sm">
                            {log.action}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-slate-500 text-[11px]">
                          <span className="flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            <User className="w-3.5 h-3.5 text-blue-600" />
                            <span>{log.user_name || 'کاربر سیستم'}</span>
                            {log.user_role && (
                              <span className="text-slate-400 font-normal">({log.user_role})</span>
                            )}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatJalaliDateTime(log.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Natural Persian Narrative Description */}
                      <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-950 text-xs leading-relaxed font-bold mb-3 flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        <span>{formatAuditNarrative(log)}</span>
                      </div>

                      {/* Detailed Visual Diff Table for Field Changes */}
                      {diffs.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                            <span>اقلام و فیلدهای تغییر یافته:</span>
                            <span className="text-slate-400 font-normal">({toPersianDigits(diffs.length)} مورد)</span>
                          </div>

                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60 divide-y divide-slate-100 text-xs">
                            {diffs.map((d, dIdx) => (
                              <div
                                key={`${log.id}-diff-${dIdx}`}
                                className="p-2 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-white transition-colors"
                              >
                                <span className="font-bold text-slate-700 min-w-[130px]">
                                  {d.label}:
                                </span>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono text-[11px] line-through">
                                    {d.formattedOld}
                                  </span>
                                  <ArrowLeft className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[11px] font-bold">
                                    {d.formattedNew}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            تعداد وقایع ثبت‌شده: <span className="font-bold text-slate-800">{toPersianDigits(filteredLogs.length)}</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer shadow-xs"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
