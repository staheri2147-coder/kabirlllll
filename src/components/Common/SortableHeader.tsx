import React from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { SortConfig } from '../../utils/tableSort';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig<any> | null;
  onSort: (key: string) => void;
  className?: string;
  align?: 'right' | 'center' | 'left';
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className = '',
  align = 'right',
}) => {
  const isSorted = currentSort?.key === sortKey;
  const direction = currentSort?.direction;

  const alignClass =
    align === 'center' ? 'justify-center' : align === 'left' ? 'justify-start' : 'justify-start';

  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`py-3 px-3 cursor-pointer select-none group transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${className}`}
      title={`مرتب‌سازی بر اساس ${label}`}
    >
      <div className={`flex items-center gap-1.5 ${alignClass}`}>
        <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 transition-colors">
          {label}
        </span>
        <span className="shrink-0 text-slate-400 group-hover:text-blue-600 transition-colors">
          {isSorted ? (
            direction === 'asc' ? (
              <ChevronUp className="w-4 h-4 text-blue-600 font-bold" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-600 font-bold" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
          )}
        </span>
      </div>
    </th>
  );
};
