import React, { useState, useEffect } from "react";
import { AlertTriangle, Database, X, ArrowLeft } from "lucide-react";
import { StorageService } from "../../services/storageService";
import { toPersianDigits } from "../../utils/jalali";

interface GlobalBackupBannerProps {
  onGoToBackup: () => void;
}

export const GlobalBackupBanner: React.FC<GlobalBackupBannerProps> = ({ onGoToBackup }) => {
  const [backupStatus, setBackupStatus] = useState(() => StorageService.checkBackupReminder());

  const refreshStatus = () => {
    setBackupStatus(StorageService.checkBackupReminder());
  };

  useEffect(() => {
    refreshStatus();

    const handleUpdate = () => {
      refreshStatus();
    };

    window.addEventListener("polyethylene-backup-status-changed", handleUpdate);
    window.addEventListener("polyethylene-db-synced", handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      window.removeEventListener("polyethylene-backup-status-changed", handleUpdate);
      window.removeEventListener("polyethylene-db-synced", handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, []);

  const handleDismiss = () => {
    StorageService.dismissBackupReminderToday();
    refreshStatus();
  };

  // If reminder is disabled, not overdue, or dismissed for today, do not render
  if (!backupStatus.isEnabled || !backupStatus.isOverdue || backupStatus.isDismissedToday) {
    return null;
  }

  const daysPassed = backupStatus.daysSinceLastBackup >= 999 
    ? "مدت طولانی" 
    : `${toPersianDigits(backupStatus.daysSinceLastBackup)} روز`;

  return (
    <div
      id="global-backup-alert-banner"
      className="mb-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-orange-500/15 dark:from-amber-950/40 dark:via-rose-950/40 dark:to-orange-950/40 border-2 border-amber-400/70 dark:border-amber-600/60 p-3 sm:p-4 shadow-md transition-all animate-fadeIn"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Warning Icon & Message */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 dark:bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs ring-2 ring-amber-300 dark:ring-amber-500/40 animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-amber-900 dark:text-amber-200">
                هشدار موعد پشتیبان‌گیری دوره‌ای
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                {daysPassed} از آخرین بک‌آپ گذشته
              </span>
            </div>
            <p className="text-[11.5px] sm:text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5 leading-relaxed">
              جهت جلوگیری از اتلاف داده‌ها و حفظ امنیت اطلاعات سیستم، لطفاً فایل پشتیبان (SQL / JSON) را ذخیره نمایید.
            </p>
          </div>
        </div>

        {/* Action Buttons & Dismiss */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-200 dark:border-amber-800/60">
          <button
            type="button"
            onClick={onGoToBackup}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-black text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>تهیه نسخه پشتیبان</span>
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            title="بستن هشدار تا روز بعد"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
