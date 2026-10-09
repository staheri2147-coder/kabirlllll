import React from 'react';
import { StorageService } from '../../services/storageService';
import { formatJalaliDate, toPersianDigits } from '../../utils/jalali';
import { Building2 } from 'lucide-react';

export interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  docNumber?: string | number;
  docCode?: string | number;
  docNumberLabel?: string;
  date?: string | Date;
  dateLabel?: string;
  extraInfo?: Array<{ label: string; value: string | React.ReactNode }>;
  className?: string;
}

export const PrintHeader: React.FC<PrintHeaderProps> = ({
  title,
  subtitle,
  docNumber,
  docCode,
  docNumberLabel = 'شماره سند:',
  date = new Date(),
  dateLabel = 'تاریخ:',
  extraInfo,
  className = '',
}) => {
  const company = StorageService.getCompanySettings();
  const companyName = company.business_name || (company as any).company_name || 'شرکت تولیدی لوله پلی‌اتیلن';
  const logoUrl = company.logo_url;
  const effectiveDocNumber = docNumber ?? docCode;
  const activeSubtitle = subtitle !== undefined ? subtitle : (company.brand_subtitle || 'تولید کننده انواع لوله های پلی اتیلن');

  return (
    <div
      className={`grid grid-cols-3 items-center border-b-2 border-slate-800 pb-2.5 mb-3.5 min-h-[56px] ${className}`}
    >
      {/* Right Column: Logo on top, Company Name below, Subtitle in a single line */}
      <div className="flex items-center justify-start">
        <div className="flex flex-col items-center justify-center text-center space-y-0.5 max-w-[240px]">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="h-8 sm:h-9 max-h-9 w-auto max-w-[140px] object-contain block mx-auto"
              onError={(e) => {
                // If the image fails to load, gracefully fallback to text badge
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex items-center justify-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              <Building2 className="w-3.5 h-3.5" />
              <span className="text-[9px] font-bold">لوگوی شرکت</span>
            </div>
          )}
          <div className="font-bold text-slate-800 text-[11px] leading-tight text-center whitespace-nowrap">
            {companyName}
          </div>
          {activeSubtitle && (
            <div className="text-[8.5px] sm:text-[9px] text-slate-600 font-medium leading-tight text-center whitespace-nowrap">
              {activeSubtitle}
            </div>
          )}
        </div>
      </div>

      {/* Center Column: Form or Report Title */}
      <div className="text-center flex flex-col items-center justify-center px-1">
        <h1 className="text-sm sm:text-base font-black tracking-normal text-slate-900 leading-snug">
          {title}
        </h1>
      </div>

      {/* Left Column: Date and Document/Report Number */}
      <div className="text-left space-y-1 text-[11px] flex flex-col items-end justify-center">
        {effectiveDocNumber && (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-slate-500 font-medium whitespace-nowrap">
              {docNumberLabel}
            </span>
            <span className="font-bold font-mono text-slate-900">
              {typeof effectiveDocNumber === 'string' && (effectiveDocNumber.startsWith('ORD') || effectiveDocNumber.startsWith('INV') || effectiveDocNumber.startsWith('DEL') || effectiveDocNumber.startsWith('RET'))
                ? effectiveDocNumber
                : toPersianDigits(effectiveDocNumber)}
            </span>
          </div>
        )}
        {date && (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-slate-500 font-medium whitespace-nowrap">{dateLabel}</span>
            <span className="font-bold text-slate-900 whitespace-nowrap">
              {formatJalaliDate(date)}
            </span>
          </div>
        )}
        {extraInfo &&
          extraInfo.map((item, idx) => (
            <div key={idx} className="flex items-center justify-end gap-1.5">
              <span className="text-slate-500 font-medium whitespace-nowrap">{item.label}:</span>
              <span className="font-bold text-slate-900">{item.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
};
