import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  X,
  Server,
  RefreshCw,
  HelpCircle,
  Key,
  Globe,
  HardDrive,
  Check,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { StorageService } from '../services/storageService';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [host, setHost] = useState('localhost');
  const [dbname, setDbname] = useState('');
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [port, setPort] = useState('3306');

  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    version?: string;
  } | null>(null);

  const [currentStatus, setCurrentStatus] = useState<{
    online: boolean;
    isDefaultPlaceholder: boolean;
    dbname?: string;
    host?: string;
    user?: string;
    tablesCount?: number;
    totalRecords?: number;
    message?: string;
    error?: string;
  } | null>(null);

  const [showGuide, setShowGuide] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Load current database status when modal opens
  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setSaveSuccessMsg(null);
      setTestResult(null);
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await StorageService.checkHostApi();
      const info = res.info || {};
      const config = info.config || {};
      
      setCurrentStatus({
        online: !!res.online,
        isDefaultPlaceholder: !!info.is_default_placeholder,
        dbname: config.dbname || info.database_name || '',
        host: config.host || info.db_host || 'localhost',
        user: config.user || '',
        tablesCount: info.table_counts ? Object.keys(info.table_counts).length : undefined,
        totalRecords: info.total_records,
        message: res.message,
        error: res.error,
      });

      if (config.dbname && !info.is_default_placeholder) {
        setDbname(config.dbname);
      }
      if (config.user && config.user !== 'alborz_user') {
        setUser(config.user);
      }
      if (config.host) {
        setHost(config.host);
      }
    } catch (e: any) {
      setCurrentStatus({
        online: false,
        isDefaultPlaceholder: true,
        error: e?.message || 'خطا در بررسی وضعیت',
      });
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleTestConnection = async () => {
    if (!dbname.trim() || !user.trim()) {
      setTestResult({
        tested: true,
        success: false,
        message: 'لطفاً نام دیتابیس و نام کاربر را وارد فرمایید.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await StorageService.testDbConnection({
        host: host.trim() || 'localhost',
        dbname: dbname.trim(),
        user: user.trim(),
        pass: pass,
        port: parseInt(port) || 3306,
      });
      setTestResult({
        tested: true,
        success: res.success,
        message: res.message,
        version: res.version,
      });
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: 'خطا در برقراری ارتباط: ' + (err?.message || ''),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!dbname.trim() || !user.trim()) {
      alert('لطفاً نام دیتابیس و نام کاربر را مشخص کنید.');
      return;
    }

    setIsSaving(true);
    setSaveSuccessMsg(null);
    try {
      const res = await StorageService.saveDbConfig({
        host: host.trim() || 'localhost',
        dbname: dbname.trim(),
        user: user.trim(),
        pass: pass,
        port: parseInt(port) || 3306,
      });

      if (res.success) {
        setSaveSuccessMsg(res.message);
        await loadStatus();
        if (onSuccess) onSuccess();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert('خطا در ذخیره تنظیمات: ' + (err?.message || ''));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 text-slate-800 dark:text-slate-100 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-slate-800/80 dark:to-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                پیکربندی و اتصال دیتابیس MySQL هاست
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                پایگاه‌داده مشترک بین تمام گوشی‌ها، تبلت‌ها و کامپیوترها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Status Alert Banner */}
          {isLoadingStatus ? (
            <div className="flex items-center justify-center gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-slate-500">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>در حال بررسی وضعیت اتصال به MySQL هاست...</span>
            </div>
          ) : currentStatus?.online ? (
            <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm">پایگاه‌داده مرکزی MySQL متصل و فعال است</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  نام دیتابیس فعال: <span className="font-mono font-bold">{currentStatus.dbname}</span>
                  {currentStatus.totalRecords !== undefined && (
                    <span className="mr-3">
                      • تعداد کل رکوردهای ثبت‌شده در هاست: {currentStatus.totalRecords.toLocaleString('fa-IR')}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={loadStatus}
                title="بروزرسانی وضعیت"
                className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-sm">پایگاه‌داده مرکزی MySQL هاست هنوز متصل نیست!</div>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  اطلاعات وارد شده یا فایل بکاپ فعلاً در این دستگاه نگهداری می‌شود. جهت ذخیره دائمی و نمایش خودکار اطلاعات روی تمام دستگاه‌ها و کاربران، لطفاً نام دیتابیس و رمزی که در cPanel هاست ساختید را در فرم زیر وارد کرده و دکمه اتصال را بزنید.
                </p>
                {currentStatus?.error && (
                  <div className="mt-2 text-[11px] font-mono bg-amber-100/70 dark:bg-amber-900/40 p-2 rounded-lg text-amber-900 dark:text-amber-200 break-all">
                    {currentStatus.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Success Save Notice */}
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 flex items-center gap-2 font-bold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Connection Settings Form */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                مشخصات اتصال دیتابیس MySQL هاست:
              </h4>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showGuide ? 'بستن راهنمای cPanel' : 'راهنمای ساخت دیتابیس در cPanel'}</span>
              </button>
            </div>

            {/* Step-by-step cPanel Accordion Guide */}
            {showGuide && (
              <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 p-3.5 sm:p-4 rounded-xl space-y-2 text-xs leading-relaxed text-blue-900 dark:text-blue-200 animate-in fade-in">
                <div className="font-bold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4" />
                  آموزش ۳ مرحله‌ای ساخت دیتابیس در cPanel (پارس‌پک و تمام هاست‌ها):
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-700 dark:text-slate-300">
                  <li>
                    وارد cPanel هاست خود شوید و گزینه <b>MySQL Databases</b> را باز کنید.
                  </li>
                  <li>
                    در بخش <b>Create New Database</b> یک نام دلخواه (مثلاً <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">pipe</code>) بنویسید و دکمه Create را بزنید. نام کامل دیتابیس شما با پیشوند هاست تشکیل می‌شود (مثلاً <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">user_pipe</code>).
                  </li>
                  <li>
                    در همان صفحه کمی پایین‌تر در بخش <b>Add New User</b>، یک نام کاربری (مثلاً <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded font-mono">user_db</code>) و رمز عبور قوی وارد کنید و Create User را بزنید.
                  </li>
                  <li>
                    <b>مرحله مهم:</b> در بخش <b>Add User To Database</b>، کاربر و دیتابیسی که ساختید را انتخاب کرده و دکمه Add را بزنید. سپس تیک گزینه <b>ALL PRIVILEGES</b> را فعال کنید و دکمه <b>Make Changes</b> را بزنید.
                  </li>
                  <li>
                    نام دیتابیس، نام کاربر و رمز را در فرم زیر وارد فرمایید و دکمه «ذخیره و اتصال دیتابیس» را کلیک کنید!
                  </li>
                </ol>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Host */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  آدرس هاست دیتابیس (DB_HOST):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">در ۹۹٪ هاست‌های اشتراکی همان localhost است</span>
              </div>

              {/* Port */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  پورت (Port):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="3306"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Database Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  نام پایگاه‌داده (Database Name):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={dbname}
                  onChange={(e) => setDbname(e.target.value)}
                  placeholder="مثال: cpuser_pipe"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Database User */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-indigo-500" />
                  نام کاربر دیتابیس (DB User):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={user}
                  onChange={(e) => setUser(e.target.value)}
                  placeholder="مثال: cpuser_admin"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              {/* Database Password */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  کلمه عبور دیتابیس (DB Password):
                </label>
                <input
                  type="password"
                  dir="ltr"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="کلمه عبوری که در cPanel تعیین فرمودید"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Test Connection Output */}
            {testResult && (
              <div
                className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in ${
                  testResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-bold">{testResult.message}</div>
                  {testResult.version && (
                    <div className="text-[11px] opacity-80 font-mono mt-0.5">
                      نسخه دیتابیس سرور: {testResult.version}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className="px-3.5 py-2 rounded-xl border border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال تست...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>تست ارتباط</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-150 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              بستن
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>در حال ذخیره و ساخت جداول...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>ذخیره و اتصال دیتابیس</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
