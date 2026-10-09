/**
 * Jalali (Shamsi) Date & Persian Formatting Utilities
 * Standard mathematical Gregorian <-> Jalali conversion without external dependencies
 */

// Format numbers with commas: 1234567 -> ۱,۲۳۴,۵۶۷ ریال
export function formatCurrency(amount: number | string | undefined | null, showUnit = true, unit = 'ریال'): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return showUnit ? `۰ ${unit}` : '۰';
  }
  const num = Math.round(Number(amount));
  const formatted = toPersianDigits(Math.abs(num).toLocaleString('en-US'));
  const sign = num < 0 ? '-' : '';
  return `${sign}${formatted}${showUnit ? ` ${unit}` : ''}`;
}

// Format numbers with standard latin comma for inputs: 1234567 -> "1,234,567"
export function formatRialNumber(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '';
  const clean = toEnglishDigits(String(amount)).replace(/[^\d-]/g, '');
  if (!clean || clean === '-') return clean;
  const num = parseInt(clean, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US');
}

// Parse formatted rial string "1,234,567" to number 1234567
export function parseRialNumber(str: string | undefined | null): number {
  if (!str) return 0;
  const clean = toEnglishDigits(String(str)).replace(/[^\d-]/g, '');
  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
}

export function formatNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === '' || isNaN(Number(num))) return '۰';
  const val = Number(num);
  const isInt = Number.isInteger(val);
  const formatted = isInt
    ? val.toLocaleString('en-US')
    : val.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return toPersianDigits(formatted);
}

export function toPersianDigits(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  const id = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(str).replace(/[0-9]/g, (w) => id[+w]);
}

export function toEnglishDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

// Gregorian to Jalali conversion algorithm
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? (gy + 1) : gy;
  let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
  return [jy, jm, jd];
}

// Jalali to Gregorian conversion algorithm
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = (365 * jy) + ((Math.floor(jy / 33)) * 8) + (Math.floor(((jy % 33) + 3) / 4))
    + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && days >= sal_a[gm]) {
    days -= sal_a[gm];
    gm++;
  }
  const gd = days + 1;
  return [gy, gm, gd];
}

// Format ISO date string or Date to Persian string YYYY/MM/DD
export function formatJalaliDate(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return toPersianDigits(String(dateInput));
    const gy = d.getFullYear();
    const gm = d.getMonth() + 1;
    const gd = d.getDate();
    const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
    const mm = jm < 10 ? `0${jm}` : `${jm}`;
    const dd = jd < 10 ? `0${jd}` : `${jd}`;
    return toPersianDigits(`${jy}/${mm}/${dd}`);
  } catch {
    return toPersianDigits(String(dateInput));
  }
}

// Format ISO date or Date with time to Persian string YYYY/MM/DD ساعت HH:MM
export function formatJalaliDateTime(dateInput: string | Date | undefined | null): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return toPersianDigits(String(dateInput));
    const gy = d.getFullYear();
    const gm = d.getMonth() + 1;
    const gd = d.getDate();
    const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
    const mm = jm < 10 ? `0${jm}` : `${jm}`;
    const dd = jd < 10 ? `0${jd}` : `${jd}`;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${toPersianDigits(`${jy}/${mm}/${dd}`)} ساعت ${toPersianDigits(`${hours}:${minutes}`)}`;
  } catch {
    return toPersianDigits(String(dateInput));
  }
}

// Get current date formatted in Jalali
export function getTodayJalali(): string {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const mm = jm < 10 ? `0${jm}` : `${jm}`;
  const dd = jd < 10 ? `0${jd}` : `${jd}`;
  return `${jy}/${mm}/${dd}`;
}

// Get current date in ISO format YYYY-MM-DD
export function getTodayISO(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

// Convert numbers to Persian words (حروف‌چین مبالغ مالی)
export function numberToWordsPersian(num: number): string {
  if (num === 0) return 'صفر';
  if (num < 0) return `منفی ${numberToWordsPersian(Math.abs(num))}`;

  num = Math.floor(num);

  const yekan = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const dahgan = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const dahha = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده'];
  const sadgan = ['', 'یکصد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const scale = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function threeDigitsToWords(n: number): string {
    const parts: string[] = [];
    const sad = Math.floor(n / 100);
    const dah = Math.floor((n % 100) / 10);
    const yek = n % 10;

    if (sad > 0) parts.push(sadgan[sad]);

    if (dah === 1) {
      parts.push(dahha[yek]);
    } else {
      if (dah > 1) parts.push(dahgan[dah]);
      if (yek > 0) parts.push(yekan[yek]);
    }

    return parts.join(' و ');
  }

  const chunks: string[] = [];
  let chunkIdx = 0;

  while (num > 0) {
    const chunk = num % 1000;
    if (chunk > 0) {
      const words = threeDigitsToWords(chunk);
      const sc = scale[chunkIdx];
      chunks.unshift(sc ? `${words} ${sc}` : words);
    }
    num = Math.floor(num / 1000);
    chunkIdx++;
  }

  return chunks.join(' و ');
}

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const JALALI_WEEK_DAYS = [
  { short: 'ش', full: 'شنبه' },
  { short: 'ی', full: 'یک‌شنبه' },
  { short: 'د', full: 'دوشنبه' },
  { short: 'س', full: 'سه‌شنبه' },
  { short: 'چ', full: 'چهارشنبه' },
  { short: 'پ', full: 'پنج‌شنبه' },
  { short: 'ج', full: 'جمعه' },
];

// Check if Jalali year is leap year (سال کبیسه)
export function isJalaliLeapYear(jy: number): boolean {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
  ];
  let jp = breaks[0];
  let jump = 0;
  for (let j = 1; j < breaks.length; j++) {
    const jm = breaks[j];
    jump = jm - jp;
    if (jy < jm) break;
    jp = jm;
  }
  let n = jy - jp;
  if (jump - n < 6) n = n - jump + Math.floor((jump + 4) / 33) * 33;
  let leap = ((((n + 1) % 33) - 1) % 4);
  if (leap === -1) leap = 4;
  return leap === 0;
}

// Get number of days in a Jalali month
export function getJalaliDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 30;
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

// Convert ISO string 'YYYY-MM-DD' or timestamp to Jalali string 'YYYY/MM/DD'
export function isoToJalaliString(isoDate: string | undefined | null): string {
  if (!isoDate) return '';
  try {
    const parts = isoDate.split('T')[0].split('-');
    if (parts.length === 3) {
      const gy = parseInt(parts[0], 10);
      const gm = parseInt(parts[1], 10);
      const gd = parseInt(parts[2], 10);
      if (!isNaN(gy) && !isNaN(gm) && !isNaN(gd)) {
        const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);
        const mm = jm < 10 ? `0${jm}` : `${jm}`;
        const dd = jd < 10 ? `0${jd}` : `${jd}`;
        return `${jy}/${mm}/${dd}`;
      }
    }
    return formatJalaliDate(isoDate);
  } catch {
    return '';
  }
}

// Convert Jalali string ('YYYY/MM/DD' or 'YYYY-MM-DD' or with Persian digits) to ISO string 'YYYY-MM-DD'
export function jalaliStringToISO(jalaliStr: string): string | null {
  if (!jalaliStr) return null;
  const clean = toEnglishDigits(jalaliStr.trim()).replace(/[-_.]/g, '/');
  const parts = clean.split('/');
  if (parts.length !== 3) return null;

  const jy = parseInt(parts[0], 10);
  const jm = parseInt(parts[1], 10);
  const jd = parseInt(parts[2], 10);

  if (isNaN(jy) || isNaN(jm) || isNaN(jd)) return null;
  if (jy < 1300 || jy > 1500) return null;
  if (jm < 1 || jm > 12) return null;
  const maxDays = getJalaliDaysInMonth(jy, jm);
  if (jd < 1 || jd > maxDays) return null;

  try {
    const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
    const mm = gm < 10 ? `0${gm}` : `${gm}`;
    const dd = gd < 10 ? `0${gd}` : `${gd}`;
    return `${gy}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

// Get the day-of-week index (0 = Saturday, 1 = Sunday, ..., 6 = Friday) for the 1st of a Jalali month
export function getJalaliMonthStartDayOfWeek(year: number, month: number): number {
  const [gy, gm, gd] = jalaliToGregorian(year, month, 1);
  const date = new Date(gy, gm - 1, gd);
  const gDay = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Convert to Saturday-based index (0 = Saturday, 1 = Sunday, ..., 6 = Friday)
  return (gDay + 1) % 7;
}

// Get current Jalali Year, Month, Day numbers
export function getCurrentJalaliDate(): { year: number; month: number; day: number } {
  const now = new Date();
  const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  return { year: jy, month: jm, day: jd };
}

// Get Jalali date info from an ISO date or Date
export function getJalaliDateInfo(dateInput?: string | Date): { year: number; month: number; day: number } {
  if (!dateInput) return getCurrentJalaliDate();
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return getCurrentJalaliDate();
  const [jy, jm, jd] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return { year: jy, month: jm, day: jd };
}

// Calculate days and months passed in the current Jalali year
export function getDaysPassedInCurrentJalaliYear(dateInput?: string | Date): {
  currentYear: number;
  daysPassed: number;
  monthsPassed: number;
} {
  const { year, month, day } = getJalaliDateInfo(dateInput);
  let daysPassed = 0;
  if (month <= 6) {
    daysPassed = (month - 1) * 31 + day;
  } else {
    daysPassed = 6 * 31 + (month - 7) * 30 + day;
  }
  // Safe months calculation (min 0.1 to avoid division by zero)
  const monthsPassed = Math.max(0.1, daysPassed / 30);
  return { currentYear: year, daysPassed, monthsPassed };
}

