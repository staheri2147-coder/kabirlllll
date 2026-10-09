import React from 'react';
import { rialToTomanWords } from '../../utils/numberToWords';

interface PriceInputProps {
  label?: string;
  value: number | string;
  onChange: (val: number) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  min?: number;
  max?: number;
  helperText?: string;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  label,
  value,
  onChange,
  placeholder = 'مبلغ به ریال',
  required = false,
  disabled = false,
  className = '',
  id,
  min = 0,
  max,
  helperText,
}) => {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) || 0 : Number(value) || 0;
  const tomanWords = numValue > 0 ? rialToTomanWords(numValue) : '';
  const tomanAmount = Math.floor(numValue / 10).toLocaleString('fa-IR');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    if (!isNaN(num)) {
      if (max !== undefined && num > max) return;
      onChange(num);
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[11px] font-normal text-slate-400">واحد: ریال</span>
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          id={id}
          value={numValue === 0 ? '' : numValue.toLocaleString('en-US')}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="w-full text-left pl-14 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 font-mono"
          dir="ltr"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
          ریال
        </span>
      </div>

      {numValue > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50/80 border border-amber-200/60 rounded text-[11px] text-amber-900 leading-tight">
          <span className="font-semibold text-amber-700 whitespace-nowrap">معادل تومان:</span>
          <span className="font-medium text-amber-950">{tomanAmount} تومان</span>
          <span className="text-slate-500 font-normal">({tomanWords})</span>
        </div>
      )}

      {helperText && !tomanWords && (
        <p className="text-[11px] text-slate-500">{helperText}</p>
      )}
    </div>
  );
};
