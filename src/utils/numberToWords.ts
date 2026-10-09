/**
 * Helper to convert Rial amount to Toman amount in words (حروف فارسی به تومان)
 */

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const TEENS = [
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده',
];
const TENS = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const HUNDREDS = [
  '',
  'یکصد',
  'دویست',
  'سیصد',
  'چهارصد',
  'پانصد',
  'ششصد',
  'هفتصد',
  'هشتصد',
  'نهصد',
];

const SCALES = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون', 'کوادریلیون'];

function convertThreeDigits(num: number): string {
  if (num === 0) return '';
  const result: string[] = [];

  const h = Math.floor(num / 100);
  const remainder = num % 100;

  if (h > 0) {
    result.push(HUNDREDS[h]);
  }

  if (remainder > 0) {
    if (remainder < 10) {
      result.push(ONES[remainder]);
    } else if (remainder >= 10 && remainder < 20) {
      result.push(TEENS[remainder - 10]);
    } else {
      const t = Math.floor(remainder / 10);
      const o = remainder % 10;
      if (t > 0) result.push(TENS[t]);
      if (o > 0) result.push(ONES[o]);
    }
  }

  return result.join(' و ');
}

export function numberToPersianWords(num: number): string {
  if (num === 0 || isNaN(num)) return 'صفر';
  if (num < 0) return 'منفی ' + numberToPersianWords(Math.abs(num));

  const integerPart = Math.floor(num);
  const groups: number[] = [];
  let temp = integerPart;

  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const val = groups[i];
    if (val > 0) {
      const words = convertThreeDigits(val);
      const scale = SCALES[i];
      if (scale) {
        parts.push(`${words} ${scale}`);
      } else {
        parts.push(words);
      }
    }
  }

  return parts.join(' و ');
}

/**
 * Converts a Rial numeric amount into Persian words in Toman.
 * e.g., 50000000 Rial -> "پنج میلیون تومان"
 * e.g., 12500000 Rial -> "یک میلیون و دویست و پنجاه هزار تومان"
 */
export function rialToTomanWords(rialAmount: number | string | undefined | null): string {
  if (rialAmount === undefined || rialAmount === null || rialAmount === '') return '';
  const num = typeof rialAmount === 'string' ? parseFloat(rialAmount.replace(/,/g, '')) : Number(rialAmount);
  if (isNaN(num)) return '';
  if (num === 0) return 'صفر تومان';

  const toman = num / 10;
  const isNegative = toman < 0;
  const absToman = Math.abs(toman);
  const intPart = Math.floor(absToman);
  const decPart = Math.round((absToman - intPart) * 10) / 10;

  let words = numberToPersianWords(intPart);
  if (decPart > 0) {
    words += ` و ${decPart} دهم`;
  }

  return `${isNegative ? 'منفی ' : ''}${words} تومان`;
}

/**
 * Formats a number with comma separation and converts rials to readable helper text
 */
export function formatTomanHelper(rialAmount: number | string | undefined | null): string {
  const words = rialToTomanWords(rialAmount);
  if (!words) return '';
  const num = typeof rialAmount === 'string' ? parseFloat(rialAmount.replace(/,/g, '')) : Number(rialAmount);
  if (isNaN(num)) return '';
  const toman = num / 10;
  const formattedToman = Math.floor(toman).toLocaleString('fa-IR');
  return `معادل ${formattedToman} تومان (${words})`;
}
