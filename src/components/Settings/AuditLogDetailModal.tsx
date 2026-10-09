import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { formatJalaliDateTime, toPersianDigits } from '../../utils/jalali';
import {
  formatAuditNarrative,
  getAuditFieldDiffs,
  ENTITY_LABELS,
} from '../../utils/formatAuditLog';
import {
  X,
  History,
  User,
  Clock,
  FileText,
  Copy,
  Check,
  Tag,
  Hash,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

export const AuditLogDetailModal: React.FC<AuditLogDetailModalProps> = ({
  log,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!log) return null;

  const narrative = formatAuditNarrative(log);
  const diffs = getAuditFieldDiffs(log);
  const entityLabel =
    (ENTITY_LABELS as any)[log.entity_type?.toUpperCase()] || log.entity_type;

  // Determine action badge styling
  const actionLower = (log.action || '').toLowerCase();
  let actionColor =
    'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  if (
    actionLower.includes('ثبت') ||
    actionLower.includes('ایجاد') ||
    actionLower.includes('صدور')
  ) {
    actionColor =
      'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
  } else if (
    actionLower.includes('ویرایش') ||
    actionLower.includes('تغییر') ||
    actionLower.includes('بروز')
  ) {
    actionColor =
      'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  } else if (actionLower.includes('تایید')) {
    actionColor =
      'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
  } else if (
    actionLower.includes('لغو') ||
    actionLower.includes('ابطال') ||
    actionLower.includes('حذف')
  ) {
    actionColor =
      'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
  } else if (actionLower.includes('چاپ')) {
    actionColor =
      'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
  }

  const handleCopyNarrative = () => {
    const textToCopy = `لاگ رویداد سیستم:\nبخش: ${entityLabel}\nعملیات: ${log.action}\nسند: ${log.document_number || log.entity_id || '-'}\nکاربر: ${log.user_name || 'کاربر سیستم'} (${log.user_role || '-'})\nتاریخ: ${formatJalaliDateTime(log.created_at)}\nشرح:\n${narrative}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-xs border border-blue-100 dark:border-blue-900">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                  جزئیات کامل لاگ رویداد سیستم
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold border ${actionColor}`}
                >
                  {log.action}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                شناسه: {log.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
            title="بستن پنجره"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Card 1: User Details */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span>کاربر اقدام‌کننده</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-xs">
                {log.user_name || 'کاربر سیستم'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>نقش: {log.user_role || 'کاربر سامانه'}</span>
                {log.user_id && (
                  <span className="font-mono text-[10px]">({log.user_id})</span>
                )}
              </div>
            </div>

            {/* Card 2: Timestamp */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>تاریخ و زمان دقیق</span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                {formatJalaliDateTime(log.created_at)}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {new Date(log.created_at).toISOString()}
              </div>
            </div>

            {/* Card 3: Entity / Section */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <Tag className="w-3.5 h-3.5 text-blue-500" />
                <span>بخش مربوطه در سیستم</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-[11px] border border-blue-200 dark:border-blue-900">
                  {entityLabel}
                </span>
                <span className="text-[10.5px] font-mono text-slate-400">
                  ({log.entity_type})
                </span>
              </div>
            </div>

            {/* Card 4: Document Number / ID */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                <Hash className="w-3.5 h-3.5 text-blue-500" />
                <span>شماره سند / شناسه مرجع</span>
              </div>
              <div className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                {log.document_number || log.entity_id || 'ندارد / -'}
              </div>
            </div>
          </div>

          {/* Full Narrative Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>شرح کامل رویداد و متن گزارش:</span>
              </label>
              <button
                type="button"
                onClick={handleCopyNarrative}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>کپی شرح</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-medium leading-loose break-words whitespace-pre-wrap select-text">
              {narrative}
            </div>
          </div>

          {/* Changed Fields / Diff Section */}
          {diffs.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <label className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>
                  مقایسه فیلدهای تغییریافته ({toPersianDigits(diffs.length)} فیلد):
                </span>
              </label>

              <div className="grid grid-cols-1 gap-2">
                {diffs.map((diff, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xs space-y-1.5"
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {diff.label}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-rose-700 dark:text-rose-300">
                        <span className="text-[10px] font-sans font-bold text-rose-500 block mb-0.5">
                          مقدار پیشین (قبل از تغییر):
                        </span>
                        <span className="line-through block break-words">
                          {diff.formattedOld}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 font-bold">
                        <span className="text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                          مقدار جدید (بعد از تغییر):
                        </span>
                        <span className="block break-words">
                          {diff.formattedNew}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw Details / JSON Toggle for Complete Traceability */}
          {log.details && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
              >
                {showRawJson ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>مشاهده داده‌های خام فنی لاگ (JSON)</span>
              </button>

              {showRawJson && (
                <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800 direction-ltr text-left">
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyNarrative}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer shadow-2xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">کپی شد</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>کپی مشخصات لاگ</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer shadow-xs"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
