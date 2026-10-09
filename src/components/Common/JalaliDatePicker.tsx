import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  formatJalaliDate,
  getTodayJalali,
  getTodayISO,
  isoToJalaliString,
  jalaliStringToISO,
  gregorianToJalali,
  jalaliToGregorian,
  getJalaliDaysInMonth,
  getJalaliMonthStartDayOfWeek,
  JALALI_MONTH_NAMES,
  JALALI_WEEK_DAYS,
  toPersianDigits,
  toEnglishDigits,
} from '../../utils/jalali';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, Check, RotateCcw } from 'lucide-react';

export interface JalaliDatePickerProps {
  value?: string; // ISO date string (YYYY-MM-DD) or Jalali date (YYYY/MM/DD)
  onChange: (isoDate: string, jalaliDate: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  helperText?: string;
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = '۱۴۰۵/۰۶/۰۵',
  required = false,
  disabled = false,
  className = '',
  id,
  helperText,
}) => {
  // Current text displayed in the manual input
  const [inputText, setInputText] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isValid, setIsValid] = useState<boolean>(true);

  // Calendar navigation state
  const [viewYear, setViewYear] = useState<number>(1405);
  const [viewMonth, setViewMonth] = useState<number>(6); // 1-12
  const [selectedJalali, setSelectedJalali] = useState<{ y: number; m: number; d: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Sync internal state with incoming `value` prop
  useEffect(() => {
    if (!value) {
      const todayISO = getTodayISO();
      const todayJ = isoToJalaliString(todayISO);
      setInputText(todayJ);
      parseAndSetJalali(todayJ);
      return;
    }

    let jalaliStr = '';
    if (value.includes('-')) {
      // It's likely an ISO string
      jalaliStr = isoToJalaliString(value);
    } else {
      // It's already Jalali
      jalaliStr = value;
    }

    setInputText(jalaliStr);
    parseAndSetJalali(jalaliStr);
  }, [value]);

  const parseAndSetJalali = (jStr: string) => {
    const clean = toEnglishDigits(jStr).replace(/[-_.]/g, '/');
    const parts = clean.split('/');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d) && y >= 1300 && y <= 1500 && m >= 1 && m <= 12) {
        setViewYear(y);
        setViewMonth(m);
        setSelectedJalali({ y, m, d });
        setIsValid(true);
        return;
      }
    }

    // Default to today if parsing fails
    const todayJalali = getTodayJalali();
    const [ty, tm, td] = todayJalali.split('/').map((n) => parseInt(n, 10));
    setViewYear(ty);
    setViewMonth(tm);
  };

  // Position calculation for portal
  const updatePosition = () => {
    const trigger = inputRef.current || containerRef.current;
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      const popoverHeight = 350;
      const popoverWidth = 288; // 18rem = 288px
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      let top = rect.bottom + 6;
      if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
        top = Math.max(10, rect.top - popoverHeight - 6);
      }

      // Calculate left position (RTL align to right edge of input trigger)
      let left = rect.right - popoverWidth;
      if (left < 10) {
        left = Math.max(10, rect.left);
      }
      if (left + popoverWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverWidth - 10;
      }

      setCoords({ top, left });
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  // Close calendar popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle manual typing in input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setInputText(rawVal);

    const iso = jalaliStringToISO(rawVal);
    if (iso) {
      setIsValid(true);
      const parts = toEnglishDigits(rawVal).replace(/[-_.]/g, '/').split('/');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      setViewYear(y);
      setViewMonth(m);
      setSelectedJalali({ y, m, d });
      const cleanJalali = `${y}/${m < 10 ? '0' + m : m}/${d < 10 ? '0' + d : d}`;
      onChange(iso, cleanJalali);
    } else {
      setIsValid(false);
    }
  };

  // Handle selecting a day on the calendar
  const handleSelectDay = (day: number) => {
    const mm = viewMonth < 10 ? `0${viewMonth}` : `${viewMonth}`;
    const dd = day < 10 ? `0${day}` : `${day}`;
    const jalaliStr = `${viewYear}/${mm}/${dd}`;
    const iso = jalaliStringToISO(jalaliStr);

    if (iso) {
      setInputText(jalaliStr);
      setSelectedJalali({ y: viewYear, m: viewMonth, d: day });
      setIsValid(true);
      onChange(iso, jalaliStr);
      setIsOpen(false);
    }
  };

  // Quick action: Select today
  const handleSelectToday = () => {
    const todayJalali = getTodayJalali();
    const todayISO = getTodayISO();
    setInputText(todayJalali);
    parseAndSetJalali(todayJalali);
    setIsValid(true);
    onChange(todayISO, todayJalali);
    setIsOpen(false);
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Calculate calendar grid days
  const daysInCurrentMonth = getJalaliDaysInMonth(viewYear, viewMonth);
  const startDayOfWeek = getJalaliMonthStartDayOfWeek(viewYear, viewMonth); // 0 (Sat) to 6 (Fri)

  // Today in Jalali for highlighting
  const todayParts = getTodayJalali().split('/').map((n) => parseInt(n, 10));
  const isCurrentMonthToday = todayParts[0] === viewYear && todayParts[1] === viewMonth;

  // Year options list from 1380 to 1420
  const yearOptions: number[] = [];
  for (let y = 1420; y >= 1380; y--) {
    yearOptions.push(y);
  }

  return (
    <div ref={containerRef} className={`relative flex flex-col ${className}`} id={id}>
      {label && (
        <label className="block text-slate-700 font-bold mb-1 text-xs">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          dir="ltr"
          value={inputText}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3 py-2 pl-10 rounded-xl bg-white border text-xs font-mono font-bold tracking-wider text-slate-800 transition outline-none ${
            !isValid && inputText
              ? 'border-rose-300 ring-2 ring-rose-200 bg-rose-50/30'
              : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          } ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
        />

        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          title="باز کردن تقویم خورشیدی"
          className="absolute left-2 p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 transition cursor-pointer"
        >
          <CalendarIcon className="w-4 h-4" />
        </button>
      </div>

      {!isValid && inputText && (
        <span className="text-[10px] text-rose-500 mt-1 font-sans">
          فرمت تاریخ نامعتبر است (مثال: ۱۴۰۵/۰۶/۰۵)
        </span>
      )}

      {helperText && isValid && (
        <span className="text-[10px] text-slate-400 mt-0.5 font-sans">{helperText}</span>
      )}

      {/* Interactive Jalali Calendar Dropdown rendered in Portal */}
      {isOpen && coords && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            zIndex: 99999,
          }}
          className="w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          {/* Calendar Header with Navigation */}
          <div className="flex items-center justify-between gap-1 mb-3 pb-2.5 border-b border-slate-100">
            <button
              type="button"
              onClick={handleNextMonth}
              title="ماه بعدی"
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Select */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none"
              >
                {JALALI_MONTH_NAMES.map((mName, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {mName}
                  </option>
                ))}
              </select>

              {/* Year Select */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800 cursor-pointer focus:outline-none"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handlePrevMonth}
              title="ماه قبلی"
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Week Days Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {JALALI_WEEK_DAYS.map((w, idx) => (
              <div
                key={idx}
                title={w.full}
                className={`text-[11px] font-bold py-1 ${
                  idx === 6 ? 'text-rose-500' : 'text-slate-400'
                }`}
              >
                {w.short}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for month start offset */}
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                selectedJalali &&
                selectedJalali.y === viewYear &&
                selectedJalali.m === viewMonth &&
                selectedJalali.d === day;

              const isToday = isCurrentMonthToday && todayParts[2] === day;

              // Check if it's Friday (جمعه)
              const dayOfWeek = (startDayOfWeek + i) % 7;
              const isFriday = dayOfWeek === 6;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-mono font-bold flex items-center justify-center transition cursor-pointer relative ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm font-black'
                      : isToday
                      ? 'bg-blue-50 text-blue-700 border border-blue-400 font-black'
                      : isFriday
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {toPersianDigits(day)}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-0.5 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 text-[11px]">
            <button
              type="button"
              onClick={handleSelectToday}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>امروز ({toPersianDigits(getTodayJalali())})</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-0.5 rounded-md text-slate-500 hover:bg-slate-100 font-medium transition cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
