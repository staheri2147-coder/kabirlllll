import React from 'react';
import { Printer, ImageIcon, Loader2, X } from 'lucide-react';

export interface PrintModalControlBarProps {
  title: string;
  badge?: string;
  subtitle?: string;
  isExportingImage: boolean;
  onExportImage: () => void;
  onPrint: () => void;
  onClose: () => void;
  printButtonText?: string;
  imageButtonText?: string;
  className?: string;
  extraControls?: React.ReactNode;
}

export const PrintModalControlBar: React.FC<PrintModalControlBarProps> = ({
  title,
  badge = 'A4 رسمی',
  subtitle,
  isExportingImage,
  onExportImage,
  onPrint,
  onClose,
  printButtonText = 'چاپ سند (Print / PDF)',
  imageButtonText = 'خروجی عکس (PNG)',
  className = '',
  extraControls,
}) => {
  return (
    <div className={`no-print border-b border-slate-200 dark:border-slate-800 pb-3 mb-3 ${className}`}>
      {/* Mobile Layout (Screens < 640px) */}
      <div className="sm:hidden space-y-2.5">
        {/* Top Row: Title, badge and clear close button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate">
              {title}
            </h3>
            {badge && (
              <span className="text-[10px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono shrink-0">
                {badge}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
            aria-label="بستن پنجره"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {subtitle && (
          <p className="text-[11px] text-slate-500 truncate -mt-1">{subtitle}</p>
        )}

        {extraControls && (
          <div className="flex items-center justify-start py-0.5">
            {extraControls}
          </div>
        )}

        {/* Action Buttons: 2 balanced, equal-width touch-friendly buttons */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <button
            type="button"
            onClick={onExportImage}
            disabled={isExportingImage}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            title="دانلود تصویر با فرمت PNG"
          >
            {isExportingImage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span className="truncate">در حال ذخیره...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">خروجی عکس</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs transition cursor-pointer"
            title="چاپ یا ذخیره به صورت PDF"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span className="truncate">چاپ / PDF</span>
          </button>
        </div>
      </div>

      {/* Desktop Layout (Screens >= 640px) */}
      <div className="hidden sm:flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-slate-900 dark:text-white text-sm">
            {title}
          </h3>
          {badge && (
            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">
              {badge}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-400 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
              {subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {extraControls}
          <button
            type="button"
            onClick={onExportImage}
            disabled={isExportingImage}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            title="دانلود تصویر با فرمت PNG"
          >
            {isExportingImage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>در حال ذخیره عکس...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-4 h-4" />
                <span>{imageButtonText}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            title="ارسال به چاپگر یا ذخیره به عنوان فایل PDF"
          >
            <Printer className="w-4 h-4" />
            <span>{printButtonText}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
            aria-label="بستن"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
