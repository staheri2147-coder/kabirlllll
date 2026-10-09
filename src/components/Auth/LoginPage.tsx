import React, { useState, useEffect } from "react";
import { StorageService } from "../../services/storageService";
import { User, SystemSettings } from "../../types";
import { getTodayJalali, toPersianDigits } from "../../utils/jalali";
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Factory,
  FileSpreadsheet,
  Truck,
  Boxes,
  HelpCircle,
  Sun,
  Moon,
  Clock,
  Calendar,
  LogIn,
  Layers,
  PhoneCall,
  X,
  KeyRound,
  ShieldAlert,
  MapPin,
} from "lucide-react";

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [settings, setSettings] = useState<SystemSettings>(StorageService.getSettings());

  // Form State
  const [username, setUsername] = useState<string>(StorageService.getRememberedUsername() || "admin");
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Modal State
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);

  // Time & Theme State
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("app_theme") === "dark" || document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    setSettings(StorageService.getSettings());

    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("app_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("app_theme", "light");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!username.trim()) {
      setErrorMsg("لطفاً نام کاربری را وارد نمایید.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("لطفاً کلمه عبور را وارد نمایید.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const result = StorageService.login(username, password, rememberMe);
      setLoading(false);

      if (result.success && result.user) {
        setSuccessMsg(result.message);
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 500);
      } else {
        setErrorMsg(result.message);
      }
    }, 400);
  };

  const todayJalali = getTodayJalali();

  return (
    <div
      className="min-h-screen relative flex flex-col justify-between font-['Vazirmatn',sans-serif] text-slate-900 dark:text-slate-100 select-none transition-colors duration-200"
      style={
        settings.login_background_url
          ? {
              backgroundImage: `url(${settings.login_background_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : undefined
      }
    >
      {/* Background Dimmer/Overlay for readability when image is present, otherwise standard neutral */}
      {settings.login_background_url ? (
        <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] pointer-events-none" />
      ) : (
        <div className="absolute inset-0 bg-slate-100 dark:bg-slate-950 pointer-events-none" />
      )}

      {/* Top Bar with Live Time, Date & Dark Mode Switcher */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {settings.logo_url ? (
              <img
                src={settings.logo_url}
                alt="لوگوی شرکت"
                className="h-9 max-h-10 w-auto max-w-[130px] object-contain bg-white/90 dark:bg-slate-900/90 rounded-lg p-1"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/20">
                PE
              </div>
            )}
            <div className="hidden sm:block text-right">
              <h1 className={`text-xs font-black leading-tight ${settings.login_background_url ? 'text-white drop-shadow-xs' : 'text-slate-900 dark:text-white'}`}>
                {settings.business_name || "کارخانه تولید لوله پلی‌اتیلن البرز پایپ"}
              </h1>
              <p className={`text-[10.5px] font-semibold ${settings.login_background_url ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                {settings.brand_subtitle || "سامانه جامع مدیریت هوشمند فروش و تولید"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Date & Time */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="font-mono tracking-wider">{toPersianDigits(currentTime)}</span>
            </div>
            <div className="h-3.5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="font-mono">{toPersianDigits(todayJalali)}</span>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDarkMode ? "تغییر به حالت روشن" : "تغییر به حالت تاریک"}
            className="p-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800 cursor-pointer shadow-xs"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>
      </header>

      {/* Main Center Body */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        {/* Glowing Animated Spectrum Border Container */}
        <div className="relative w-full max-w-5xl rounded-[28px] p-[3px] overflow-hidden shadow-2xl shadow-cyan-500/20 dark:shadow-cyan-950/50">
          {/* Continuous Dynamic Flowing Modern Bright Spectrum Gradient (طیف رنگی روشن، مدرن و روان) */}
          <div className="absolute -inset-[150%] spectrum-border-animated opacity-100 pointer-events-none" />
          <div className="absolute -inset-[150%] spectrum-border-glow opacity-65 blur-xs pointer-events-none" />

          {/* Actual Login Card Content */}
          <div className="relative w-full bg-white dark:bg-slate-900 rounded-[25px] border border-slate-200/80 dark:border-slate-800 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 z-10">
            
            {/* Right Section: Interactive Login Form (7 Cols) */}
            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Card Title & Intro */}
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black mb-2.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>پرتال امنیتی احراز هویت سازمانی</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  ورود به سامانه کارخانه
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  جهت دسترسی به سیستم، نام کاربری و کلمه عبور خود را وارد نمایید.
                </p>
              </div>

              {/* Alert Feedback Messages */}
              {errorMsg && (
                <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-start gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form Elements */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    نام کاربری <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type="text"
                      dir="ltr"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="مثال: admin یا sales"
                      className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white transition"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      کلمه عبور <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      فراموشی رمز عبور؟
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      dir="ltr"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-white transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer p-0.5"
                      title={showPassword ? "پنهان کردن رمز" : "نمایش رمز"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>مرا به خاطر بسپار</span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>ورود به سامانه</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Security Note */}
            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>اتصال امن رمزنگاری‌شده ۲۵۶ بیتی SSL</span>
              </span>
              <span className="font-mono font-bold">نسخه ۲.۵</span>
            </div>
          </div>

          {/* Left Section: Industrial Factory Highlights & Hero (5 Cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden border-t lg:border-t-0 lg:border-r border-slate-800">
            {/* Background Decorative Circles */}
            <div className="absolute -left-20 -bottom-20 w-64 h-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
            <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* Badge & Factory Title */}
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold mb-3">
                  <Factory className="w-3.5 h-3.5 text-blue-400" />
                  <span>سامانه یکپارچه ERP لوله پلی‌اتیلن</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white leading-tight">
                  {settings.company_name || settings.business_name}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  تولیدکننده انواع لوله‌های تک‌جداره آبرسانی، گازرسانی و آبیاری تحت فشار PE100 و PE80 با گواهینامه استاندارد ملی ایران
                </p>
              </div>

              {/* Core Features List */}
              <div className="space-y-3 pt-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">صدور اسناد مالی و فاکتور رسمی</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                      پیش‌فاکتور، فاکتورهای رسمی با محاسبه ارزش افزوده، راس‌گیری چک‌ها و گردش حساب مشتریان.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">لجستیک، بارگیری و تحویل کالا</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                      ثبت حواله‌های خروج انبار، نظارت بر متراژ بارگیری شده و مدیریت رانندگان و ناوگان حمل.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">خطوط تولید و آزمون‌های استاندارد</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                      محاسبه دقیق مواد مصرفی، متراژ تولیدی، ثبت آزمون هیدروستاتیک و کنترل ضایعات اکستروژن.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Info & Address from General Settings at Bottom */}
            <div className="relative z-10 pt-5 mt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-blue-400 shrink-0" />
                <span>پشتیبانی: {settings.phone || "۰۲۱-۸۸۸۸۷۷۶۶"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300 text-[11px] max-w-[280px] truncate" title={settings.address}>
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{settings.address || "تهران، شهرک صنعتی"}</span>
              </div>
            </div>
          </div>

        </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs">
        <p className={settings.login_background_url ? "text-slate-300 drop-shadow-xs" : "text-slate-500 dark:text-slate-400"}>
          تمامی حقوق مادی و معنوی این نرم‌افزار متعلق به{" "}
          <strong className={settings.login_background_url ? "text-white font-black" : "text-slate-700 dark:text-slate-300"}>
            {settings.business_name || "شرکت تولیدی لوله پلی‌اتیلن البرز پایپ"}
          </strong>{" "}
          می‌باشد.
        </p>
      </footer>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <KeyRound className="w-5 h-5 text-blue-600" />
                <span>راهنمای بازیابی کلمه عبور</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              جهت حفظ امنیت و محرمانگی اسناد تجاری و مالی کارخانه، امکان بازنشانی خودکار رمز عبور از طریق ایمیل غیرفعال است. لطفاً با{" "}
              <strong className="text-blue-600 dark:text-blue-400">مدیر ارشد سامانه</strong> یا واحد انفورماتیک تماس بگیرید.
            </p>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span className="font-bold">شماره تماس دفتر مرکزی:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{settings.phone || "۰۲۱-۸۸۸۸۷۷۶۶"}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1 border-t border-slate-200 dark:border-slate-700">
                مدیر سیستم می‌تواند از بخش تنظیمات &gt; مدیریت کاربران، کلمه عبور اختصاصی شما را مشاهده یا بازنشانی نماید.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
