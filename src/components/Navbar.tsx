import React, { useState, useEffect } from 'react';
import { StorageService, SyncStatus } from '../services/storageService';
import { SystemSettings, User } from '../types';
import { getTodayJalali, toPersianDigits } from '../utils/jalali';
import { Calendar, Clock, RefreshCw, CheckCircle2, AlertTriangle, CloudOff, Mic } from 'lucide-react';

interface NavbarProps {
  currentUser?: User;
  onLogout?: () => void;
  onNavigate?: (tab: string) => void;
  onOpenBackup?: () => void;
  onQuickAction?: (action: string) => void;
  onToggleMobileMenu?: () => void;
  onOpenVoiceAssistant?: () => void;
  onOpenDatabaseSetup?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenVoiceAssistant, onOpenDatabaseSetup }) => {
  const [settings, setSettings] = useState<SystemSettings>(StorageService.getSettings());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(StorageService.getSyncStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    setSettings(StorageService.getSettings());

    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    const unsubscribeSync = StorageService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    const handleStorageChange = () => {
      setSettings(StorageService.getSettings());
    };
    window.addEventListener('polyethylene-db-synced', handleStorageChange);
    window.addEventListener('polyethylene-settings-changed', handleStorageChange);

    return () => {
      clearInterval(interval);
      unsubscribeSync();
      window.removeEventListener('polyethylene-db-synced', handleStorageChange);
      window.removeEventListener('polyethylene-settings-changed', handleStorageChange);
    };
  }, []);

  const handleForceSync = async () => {
    if ((hasUnsynced || syncStatus.state === 'error' || syncStatus.state === 'offline') && onOpenDatabaseSetup) {
      onOpenDatabaseSetup();
      return;
    }
    setIsManualSyncing(true);
    try {
      await StorageService.forceFullSync();
    } catch (e) {
      console.error(e);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const todayJalali = getTodayJalali();
  const hasUnsynced = StorageService.hasUnsyncedChanges() || syncStatus.state === 'error' || syncStatus.state === 'offline';

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 sticky top-0 z-30 shadow-xs no-print select-none transition-colors">
      <div className="w-full max-w-[1800px] mx-auto px-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 relative">
          {/* Right in RTL: Company Logo & Title */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt="لوگوی شرکت"
                className="h-7 sm:h-10 max-h-12 w-auto max-w-[90px] sm:max-w-[150px] object-contain shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-black text-xs sm:text-xl tracking-tighter shrink-0">
                PE
              </div>
            )}

            <div className="md:hidden font-bold text-xs text-slate-800 dark:text-white truncate max-w-[110px] sm:max-w-[180px]">
              {settings.business_name || 'البرز پایپ'}
            </div>
          </div>

          {/* Center: Company Name & Software Title (Desktop) */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-2 text-center pointer-events-none sm:pointer-events-auto">
            <h1 className="font-black text-slate-900 dark:text-white text-sm sm:text-base md:text-lg leading-tight truncate max-w-[280px] sm:max-w-md md:max-w-xl">
              {settings.business_name || 'کارخانه تولید لوله پلی‌اتیلن البرز پایپ'}
            </h1>
          </div>

          {/* Left in RTL: Persian Voice Assistant, Live Sync Status, Clock & Persian Date */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Persian Voice Assistant Button (Icon Only) */}
            <button
              type="button"
              onClick={onOpenVoiceAssistant}
              title="دستیار و فرمان صوتی هوشمند (پرینت حساب، باز کردن حساب، دانلود و...)"
              className="p-1.5 sm:p-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-all cursor-pointer shrink-0 active:scale-95 shadow-xs"
            >
              <Mic className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
            </button>

            {/* Real-time Server Sync Status Badge */}
            <button
              type="button"
              onClick={handleForceSync}
              title={syncStatus.message || (hasUnsynced ? 'تغییرات محلی هنوز روی سرور ذخیره نشده است - جهت اتصال دیتابیس کلیک کنید' : 'دیتابیس متصل و همگام است')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                syncStatus.state === 'syncing' || isManualSyncing
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/80 animate-pulse'
                  : hasUnsynced
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60 shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
              }`}
            >
              {syncStatus.state === 'syncing' || isManualSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400" />
                  <span className="hidden sm:inline">در حال ذخیره در سرور...</span>
                </>
              ) : hasUnsynced ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span className="hidden sm:inline">ثبت نشده در سرور</span>
                  <span className="sm:hidden">ثبت‌نشده</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline">دیتابیس همگام</span>
                </>
              )}
            </button>

            {/* Live Clock & Persian Date (Clock hidden on Mobile, Date visible on All) */}
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 text-[10px] sm:text-xs font-bold border border-slate-200/90 dark:border-slate-700/90 shrink-0">
              {/* Clock (Desktop & Tablet only) */}
              <div className="hidden md:flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-mono tracking-wider">{toPersianDigits(currentTime)}</span>
              </div>
              <div className="hidden md:block h-3.5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
              {/* Persian Date (Mobile & Desktop) */}
              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-mono">{toPersianDigits(todayJalali)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Warning Ribbon if unsynced changes exist and network is lagging */}
      {hasUnsynced && syncStatus.state !== 'syncing' && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-t border-rose-200 dark:border-rose-900/60 px-3 sm:px-6 py-2 text-xs text-rose-800 dark:text-rose-200 flex flex-wrap items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 animate-bounce" />
            <span className="font-semibold">
              هشدار عدم ثبت در سرور دیتابیس: آخرین اطلاعات ثبت‌شده هنوز در پایگاه‌داده MySQL سرور ذخیره نشده‌اند (در حافظه این مرورگر نگهداری می‌شوند).
            </span>
          </div>
          <button
            type="button"
            onClick={handleForceSync}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-xs"
          >
            تلاش مجدد برای ذخیره در دیتابیس سرور
          </button>
        </div>
      )}
    </header>
  );
};
