import React, { useState, useEffect } from 'react';
import { formatRialNumber, parseRialNumber, numberToWordsPersian, toEnglishDigits } from '../../utils/jalali';

interface RialInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  showWords?: boolean;
  min?: number;
  max?: number;
  id?: string;
  name?: string;
  autoFocus?: boolean;
}

export const RialInput: React.FC<RialInputProps> = ({
  value,
  onChange,
  placeholder = 'مبلغ به ریال...',
  className = '',
  disabled = false,
  required = false,
  showWords = true,
  min,
  max,
  id,
  name,
  autoFocus = false,
}) => {
  const [displayValue, setDisplayValue] = useState<string>(
    value ? formatRialNumber(value) : ''
  );
  const [isFocused, setIsFocused] = useState<boolean>(false);

  useEffect(() => {
    // Sync external value changes
    const currentNum = parseRialNumber(displayValue);
    if (value !== currentNum) {
      setDisplayValue(value ? formatRialNumber(value) : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleanDigits = toEnglishDigits(raw).replace(/[^\d]/g, '');

    if (!cleanDigits) {
      setDisplayValue('');
      onChange(0);
      return;
    }

    let num = parseInt(cleanDigits, 10);
    if (isNaN(num)) num = 0;

    if (max !== undefined && num > max) num = max;
    if (min !== undefined && num < min) num = min;

    setDisplayValue(formatRialNumber(num));
    onChange(num);
  };

  const numValue = parseRialNumber(displayValue);

  return (
    <div className="w-full relative">
      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="numeric"
          id={id}
          name={name}
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          value={displayValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`w-full pl-12 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 ${className}`}
        />
        <span className="absolute left-3 text-xs font-bold text-slate-700 select-none pointer-events-none bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
          ریال
        </span>
      </div>

      {showWords && isFocused && numValue > 0 && (
        <div className="absolute z-20 top-full mt-1 right-0 bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-in fade-in zoom-in-95 pointer-events-none flex items-center gap-1.5">
          <span className="text-amber-300 font-bold">معادل به تومان:</span>
          <span className="font-mono text-amber-200 font-bold">
            {Math.floor(numValue / 10).toLocaleString('fa-IR')} تومان
          </span>
          <span className="text-slate-300">
            ({numValue >= 10 ? numberToWordsPersian(Math.floor(numValue / 10)) + ' تومان' : 'کمتر از یک تومان'})
          </span>
        </div>
      )}
    </div>
  );
};
