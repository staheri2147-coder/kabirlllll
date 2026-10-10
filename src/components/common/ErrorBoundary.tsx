import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, LogOut, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
  title?: string;
  onReset?: () => void;
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    if (this.props.onReset) {
      this.setState({ hasError: false, error: null });
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleHardReset = () => {
    try {
      localStorage.removeItem('pe_auth_session_v1');
      localStorage.removeItem('pe_active_user_id_v1');
    } catch (e) {}
    window.location.reload();
  };

  handleClearCacheAndResync = () => {
    try {
      const keysToKeep = new Set(['pe_host_api_url_v1', 'pe_mysql_credentials_v1']);
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('pe_') && !keysToKeep.has(k)) {
          toRemove.push(k);
        }
      }
      toRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.inline) {
        return (
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center my-4 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {this.props.title || 'اختلال در نمایش این بخش'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                یک خطای موقت در پردازش داده‌های این صفحه رخ داده است.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-rose-500 dir-ltr text-left overflow-auto max-h-20">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تلاش مجدد</span>
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100 font-['Vazirmatn',sans-serif] select-none text-center">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-black text-white">
                سامانه نیازمند بازنشانی صفحه است
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                یک اختلال موقت در بارگذاری داده‌ها رخ داده است. با کلیک بر روی دکمه زیر صفحه را مجدداً بارگذاری نمایید.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] font-mono text-rose-400 text-left overflow-auto max-h-24 dir-ltr">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>بارگذاری مجدد صفحه</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleHardReset}
                  className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>ورود مجدد</span>
                </button>
              </div>

              <button
                type="button"
                onClick={this.handleClearCacheAndResync}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-800/40 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>پاک‌سازی کش محلی و بارگذاری مجدد از دیتابیس</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
