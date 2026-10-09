import { StorageService } from './storageService';
import { Customer } from '../types';

export type VoiceActionType =
  | 'OPEN_CUSTOMER_DOSSIER'
  | 'PRINT_STATEMENT'
  | 'DOWNLOAD_IMAGE_STATEMENT'
  | 'SEARCH_DELIVERIES'
  | 'OPEN_CUSTOMER_DELIVERIES'
  | 'MULTIPLE_MATCHES'
  | 'NAVIGATE'
  | 'UNKNOWN';

export interface VoiceCommandResult {
  rawText: string;
  action: VoiceActionType;
  subIntent?: 'open' | 'print' | 'download';
  targetTab?: string;
  subTab?: 'company' | 'users' | 'backup' | 'audit';
  customerId?: string;
  customer?: Customer;
  searchQuery?: string;
  candidates?: Customer[];
  feedbackMessage: string;
  success: boolean;
}

export class VoiceService {
  /**
   * Check if browser supports Web Speech API
   */
  static isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return Boolean(
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    );
  }

  /**
   * Normalize Persian text by standardizing characters and removing extra spaces
   */
  static normalizePersianText(text: string): string {
    if (!text) return '';
    return text
      .trim()
      .toLowerCase()
      .replace(/[\u064B-\u065F\u0670]/g, '') // remove arabic diacritics
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/ة/g, 'ه')
      .replace(/ۀ/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/إ|أ|آ/g, 'ا')
      .replace(/\u200c/g, ' ') // zero-width non-joiner to space
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract clean customer query and determine sub-intent
   */
  static extractCustomerQueryAndIntent(rawTranscript: string): {
    cleanQuery: string;
    subIntent: 'open' | 'print' | 'download';
    isExplicitCustomerAction: boolean;
  } {
    const norm = this.normalizePersianText(rawTranscript);
    let subIntent: 'open' | 'print' | 'download' = 'open';
    let isExplicitCustomerAction = false;

    // Detect Print Intent
    if (
      norm.includes('پرینت') ||
      norm.includes('چاپ') ||
      norm.includes('پیش نمایش') ||
      norm.includes('پیشنمایش')
    ) {
      subIntent = 'print';
      isExplicitCustomerAction = true;
    }
    // Detect Download / Image Intent
    else if (
      norm.includes('دانلود') ||
      norm.includes('عکس') ||
      norm.includes('خروجی') ||
      norm.includes('تصویر')
    ) {
      subIntent = 'download';
      isExplicitCustomerAction = true;
    }
    // Detect Dossier / Statement Open Intent
    else if (
      norm.includes('صورتحساب') ||
      norm.includes('صورت حساب') ||
      norm.includes('گردش حساب') ||
      norm.includes('مانده حساب') ||
      norm.includes('حساب ') ||
      norm.startsWith('حساب') ||
      norm.includes('پرونده') ||
      norm.includes('فاکتورهای')
    ) {
      subIntent = 'open';
      isExplicitCustomerAction = true;
    }

    // Strip keywords to isolate customer name
    let cleanQuery = norm
      .replace(/^(پرینت حساب|چاپ حساب|پیش نمایش حساب|پیشنمایش حساب|پرینت|چاپ|پیش نمایش|پیشنمایش)\s+/g, '')
      .replace(/^(دانلود حساب|عکس حساب|تصویر حساب|خروجی حساب|دانلود عکس|خروجی عکس|دانلود|عکس|خروجی|تصویر)\s+/g, '')
      .replace(/^(صورتحساب|صورت حساب|گردش حساب|مانده حساب|پرونده|حساب|فاکتورهای|فاکتور|اطلاعات)\s+/g, '')
      .replace(/\s+(رو|را|رو بیار|را بیار|بیار|باز کن|نشون بده|رو باز کن|را باز کن|نشونم بده|رو پرینت کن|رو چاپ کن|چاپ کن|پرینت کن|دانلود کن|رو دانلود کن)$/g, '')
      .replace(/^(اقای|آقای|آقایِ|اقایِ|خانم|مهندس|دکتر|حاج|حاجی|شرکت|فروشگاه|بازرگانی|صنایع|کارخانه|نمایندگی|دفتر|سرکار)\s+/g, '')
      .replace(/\s+(اقای|آقای|آقایِ|اقایِ|خانم|مهندس|دکتر|حاج|حاجی|شرکت|فروشگاه|بازرگانی|صنایع|کارخانه|نمایندگی|دفتر|سرکار)\s+/g, ' ')
      .trim();

    return {
      cleanQuery,
      subIntent,
      isExplicitCustomerAction,
    };
  }

  /**
   * Find all customers matching the query with ranking
   */
  static findMatchingCustomers(cleanQuery: string): Array<{ customer: Customer; score: number }> {
    if (!cleanQuery || cleanQuery.length < 2) return [];

    const customers = StorageService.getCustomers();
    if (!customers || customers.length === 0) return [];

    const normalizedQuery = this.normalizePersianText(cleanQuery);
    const results: Array<{ customer: Customer; score: number }> = [];

    for (const customer of customers) {
      const normName = this.normalizePersianText(customer.name || '');
      const normCode = this.normalizePersianText(customer.code || '');
      const normDesc = this.normalizePersianText(customer.description || '');
      const normPhone = (customer.phone || '').replace(/[^0-9]/g, '');

      let score = 0;

      // 1. Exact Name match
      if (normName === normalizedQuery) {
        score = 100;
      }
      // 2. Exact Code match
      else if (normCode && normCode === normalizedQuery) {
        score = 98;
      }
      // 3. Name starts with query
      else if (normName.startsWith(normalizedQuery)) {
        score = 90;
      }
      // 4. Name contains query
      else if (normName.includes(normalizedQuery)) {
        score = 80;
      }
      // 5. Query contains name
      else if (normalizedQuery.includes(normName)) {
        score = 75;
      }
      // 6. Phone match
      else if (normPhone && normalizedQuery.length >= 4 && normPhone.includes(normalizedQuery)) {
        score = 70;
      }
      // 7. Description contains query
      else if (normDesc.includes(normalizedQuery)) {
        score = 65;
      }
      // 8. Word-by-word token matching
      else {
        const queryWords = normalizedQuery.split(' ').filter((w) => w.length >= 2);
        const nameWords = `${normName} ${normDesc}`.split(' ').filter((w) => w.length >= 2);

        let matchedWords = 0;
        for (const qWord of queryWords) {
          if (nameWords.some((nw) => nw.includes(qWord) || qWord.includes(nw))) {
            matchedWords++;
          }
        }

        if (queryWords.length > 0 && matchedWords > 0) {
          score = (matchedWords / queryWords.length) * 60;
        }
      }

      if (score >= 40) {
        results.push({ customer, score });
      }
    }

    // Sort highest score first
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Parse voice command and return deterministic result
   */
  static parseVoiceCommand(rawTranscript: string): VoiceCommandResult {
    const raw = rawTranscript.trim();
    const norm = this.normalizePersianText(raw);

    if (!norm) {
      return {
        rawText: raw,
        action: 'UNKNOWN',
        feedbackMessage: 'صدایی تشخیص داده نشد. لطفاً مجدداً صحبت فرمایید.',
        success: false,
      };
    }

    // 0. Check Delivery / Delivery Note Intents
    if (
      norm.includes('رسید تحویل') ||
      norm.includes('حواله تحویل') ||
      norm.includes('تحویل بار') ||
      norm.includes('سرچ تحویل') ||
      norm.includes('جستجوی تحویل')
    ) {
      const isSearch = norm.includes('سرچ') || norm.includes('جستجو');
      let cleanDeliveryQuery = norm
        .replace(/^(سرچ رسید تحویل|جستجوی رسید تحویل|سرچ تحویل|جستجوی تحویل|سرچ رسید|جستجوی رسید|سرچ|جستجو)\s+/g, '')
        .replace(/^(رسید تحویل|حواله تحویل|تحویل بار)\s+/g, '')
        .replace(/\s+(رو|را|بیار|نشون بده|سرچ کن|جستجو کن)$/g, '')
        .replace(/^(اقای|آقای|آقایِ|اقایِ|خانم|مهندس|دکتر|حاج|حاجی|شرکت|فروشگاه|بازرگانی|صنایع|کارخانه|نمایندگی|دفتر|سرکار)\s+/g, '')
        .replace(/\s+(اقای|آقای|آقایِ|اقایِ|خانم|مهندس|دکتر|حاج|حاجی|شرکت|فروشگاه|بازرگانی|صنایع|کارخانه|نمایندگی|دفتر|سرکار)\s+/g, ' ')
        .trim();

      if (isSearch) {
        return {
          rawText: raw,
          action: 'SEARCH_DELIVERIES',
          targetTab: 'deliveries',
          searchQuery: cleanDeliveryQuery,
          feedbackMessage: `در حال جستجوی رسیدهای تحویل «${cleanDeliveryQuery}»...`,
          success: true,
        };
      } else if (cleanDeliveryQuery.length >= 2) {
        const matches = this.findMatchingCustomers(cleanDeliveryQuery);
        if (matches.length === 1) {
          const targetCust = matches[0].customer;
          return {
            rawText: raw,
            action: 'OPEN_CUSTOMER_DELIVERIES',
            targetTab: 'deliveries',
            customerId: targetCust.id,
            customer: targetCust,
            feedbackMessage: `در حال باز کردن بخش تحویل و بارگیری «${targetCust.name}»...`,
            success: true,
          };
        } else if (matches.length > 1) {
          return {
            rawText: raw,
            action: 'MULTIPLE_MATCHES',
            subIntent: 'open',
            candidates: matches.map((m) => m.customer),
            feedbackMessage: `${matches.length} مورد با عبارت «${cleanDeliveryQuery}» مطابقت دارد. لطفاً مشتری مورد نظر را انتخاب فرمایید:`,
            success: true,
          };
        }
      }
    }

    // 1. Check Customer Intent & Matching
    const { cleanQuery, subIntent, isExplicitCustomerAction } =
      this.extractCustomerQueryAndIntent(rawTranscript);

    // If query has substance, search customers
    if (cleanQuery && (isExplicitCustomerAction || cleanQuery.length >= 2)) {
      const matches = this.findMatchingCustomers(cleanQuery);

      if (matches.length === 1) {
        const targetCust = matches[0].customer;
        if (subIntent === 'print') {
          return {
            rawText: raw,
            action: 'PRINT_STATEMENT',
            subIntent: 'print',
            customerId: targetCust.id,
            customer: targetCust,
            feedbackMessage: `در حال آماده‌سازی پیش‌نمایش چاپ حساب «${targetCust.name}»...`,
            success: true,
          };
        } else if (subIntent === 'download') {
          return {
            rawText: raw,
            action: 'DOWNLOAD_IMAGE_STATEMENT',
            subIntent: 'download',
            customerId: targetCust.id,
            customer: targetCust,
            feedbackMessage: `در حال دریافت خروجی عکس حساب «${targetCust.name}»...`,
            success: true,
          };
        } else {
          return {
            rawText: raw,
            action: 'OPEN_CUSTOMER_DOSSIER',
            subIntent: 'open',
            targetTab: 'customers',
            customerId: targetCust.id,
            customer: targetCust,
            feedbackMessage: `در حال باز کردن پرونده و حساب «${targetCust.name}»...`,
            success: true,
          };
        }
      } else if (matches.length > 1) {
        // Multiple matches found! Present candidates to user for selection
        return {
          rawText: raw,
          action: 'MULTIPLE_MATCHES',
          subIntent,
          candidates: matches.map((m) => m.customer),
          feedbackMessage: `${matches.length} مورد با عبارت «${cleanQuery}» مطابقت دارد. لطفاً شخص مورد نظر را انتخاب فرمایید:`,
          success: true,
        };
      }
    }

    // 2. Navigation Intent Check
    // Orders / New Order
    if (
      norm.includes('سفارش جدید') ||
      norm.includes('ثبت سفارش') ||
      norm.includes('پیش فاکتور جدید') ||
      norm.includes('پیشفاکتور جدید')
    ) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'new_order',
        feedbackMessage: 'انتقال به فرم ثبت سفارش و پیش‌فاکتور جدید...',
        success: true,
      };
    }
    if (
      norm.includes('سفارش') ||
      norm.includes('سفارشات') ||
      norm.includes('پیش فاکتور') ||
      norm.includes('پیشفاکتور')
    ) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'orders',
        feedbackMessage: 'انتقال به بخش سفارشات...',
        success: true,
      };
    }

    // Invoices
    if (norm.includes('فاکتور') || norm.includes('فاکتورها') || norm.includes('فروش رسمی')) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'invoices',
        feedbackMessage: 'انتقال به بخش فاکتورها...',
        success: true,
      };
    }

    // Customers List
    if (
      norm.includes('مشتری') ||
      norm.includes('مشتریان') ||
      norm.includes('خریدار') ||
      norm.includes('خریداران') ||
      norm.includes('طرف حساب')
    ) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'customers',
        feedbackMessage: 'انتقال به لیست مشتریان...',
        success: true,
      };
    }

    // Warehouse & Inventory
    if (
      norm.includes('انبار') ||
      norm.includes('موجودی') ||
      norm.includes('انبارداری') ||
      norm.includes('کاردکس') ||
      norm.includes('مواد اولیه')
    ) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'warehouse',
        feedbackMessage: 'انتقال به بخش انبار...',
        success: true,
      };
    }

    // Deliveries & Logistics
    if (
      norm.includes('بارگیری') ||
      norm.includes('تحویل') ||
      norm.includes('لجستیک') ||
      norm.includes('راننده') ||
      norm.includes('حواله خروج')
    ) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'deliveries',
        feedbackMessage: 'انتقال به بخش بارگیری و تحویل...',
        success: true,
      };
    }

    // Production Line
    if (
      norm.includes('تولید') ||
      norm.includes('اکستروژن') ||
      norm.includes('خط تولید') ||
      norm.includes('ضایعات') ||
      norm.includes('شیفت')
    ) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'production',
        feedbackMessage: 'انتقال به خطوط تولید...',
        success: true,
      };
    }

    // Cheques
    if (
      norm.includes('چک') ||
      norm.includes('چکها') ||
      norm.includes('چک ها') ||
      norm.includes('راس گیری') ||
      norm.includes('خزانه داری') ||
      norm.includes('اسناد دریافتی')
    ) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'cheques',
        feedbackMessage: 'انتقال به بخش چک‌ها و خزانه‌داری...',
        success: true,
      };
    }

    // Payments
    if (norm.includes('دریافت') || norm.includes('پرداخت') || norm.includes('واریز')) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'payments',
        feedbackMessage: 'انتقال به بخش دریافت‌ها و پرداخت‌ها...',
        success: true,
      };
    }

    // Expenses
    if (norm.includes('هزینه') || norm.includes('هزینه‌ها') || norm.includes('تنخواه')) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'expenses',
        feedbackMessage: 'انتقال به بخش هزینه‌ها...',
        success: true,
      };
    }

    // Personnel
    if (
      norm.includes('پرسنل') ||
      norm.includes('حقوق') ||
      norm.includes('کارمندان') ||
      norm.includes('کارگران') ||
      norm.includes('دستمزد')
    ) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'personnel',
        feedbackMessage: 'انتقال به بخش پرسنل و دستمزد...',
        success: true,
      };
    }

    // Reports
    if (norm.includes('گزارش') || norm.includes('گزارشات') || norm.includes('سود') || norm.includes('تراز')) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'reports',
        feedbackMessage: 'انتقال به بخش گزارشات...',
        success: true,
      };
    }

    // Products
    if (norm.includes('محصول') || norm.includes('محصولات') || norm.includes('قیمت') || norm.includes('لوله')) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'products',
        feedbackMessage: 'انتقال به بخش محصولات و لیست قیمت...',
        success: true,
      };
    }

    // Dashboard
    if (norm.includes('داشبورد') || norm.includes('صفحه اصلی') || norm.includes('خانه')) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'dashboard',
        feedbackMessage: 'انتقال به داشبورد...',
        success: true,
      };
    }

    // Backup & Settings
    if (norm.includes('بکاپ') || norm.includes('پشتیبان')) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'settings',
        subTab: 'backup',
        feedbackMessage: 'انتقال به بخش پشتیبان‌گیری...',
        success: true,
      };
    }
    if (norm.includes('کاربران') || norm.includes('دسترسی')) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'settings',
        subTab: 'users',
        feedbackMessage: 'انتقال به مدیریت کاربران...',
        success: true,
      };
    }
    if (norm.includes('تنظیمات')) {
      return {
        rawText: raw,
        action: 'NAVIGATE',
        targetTab: 'settings',
        feedbackMessage: 'انتقال به تنظیمات...',
        success: true,
      };
    }

    return {
      rawText: raw,
      action: 'UNKNOWN',
      feedbackMessage: `موردی با عنوان «${raw}» پیدا نشد. می‌توانید نام مشتری یا بخش مورد نظر را بفرمایید.`,
      success: false,
    };
  }
}
