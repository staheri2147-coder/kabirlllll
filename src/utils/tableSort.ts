import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

export function sortData<T>(
  data: T[],
  sortConfig: SortConfig<T> | null,
  customExtractors?: Record<string, (item: T) => any>
): T[] {
  if (!sortConfig || !sortConfig.key) return data;

  return [...data].sort((a: any, b: any) => {
    let valA: any;
    let valB: any;

    if (customExtractors && customExtractors[sortConfig.key as string]) {
      valA = customExtractors[sortConfig.key as string](a);
      valB = customExtractors[sortConfig.key as string](b);
    } else {
      valA = a[sortConfig.key];
      valB = b[sortConfig.key];
    }

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    // Numeric comparison
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    }

    // Number strings (e.g. codes or amounts)
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB) && typeof valA === 'string' && typeof valB === 'string' && valA.trim() !== '' && valB.trim() !== '') {
      return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
    }

    // String comparison (Persian / English)
    const strA = String(valA).trim();
    const strB = String(valB).trim();
    const cmp = strA.localeCompare(strB, 'fa', { numeric: true, sensitivity: 'base' });
    return sortConfig.direction === 'asc' ? cmp : -cmp;
  });
}

export function useTableSort<T>(
  initialKey: keyof T | string,
  initialDirection: SortDirection = 'desc'
) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>({
    key: initialKey,
    direction: initialDirection,
  });

  const handleSort = (key: keyof T | string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        key,
        direction: 'desc', // Default to desc (latest/highest first) when switching column
      };
    });
  };

  return { sortConfig, handleSort, setSortConfig };
}
