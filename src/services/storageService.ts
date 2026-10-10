import {
  Customer,
  Product,
  Order,
  Invoice,
  CustomerTransaction,
  Payment,
  Cheque,
  Adjustment,
  Driver,
  Vehicle,
  DeliveryNote,
  ReturnDoc,
  Material,
  Warehouse,
  MaterialMovement,
  Employee,
  EmployeeTransaction,
  EmployeeLeave,
  EmploymentPeriod,
  Expense,
  ProductionLog,
  User,
  Role,
  Permission,
  AuditLog,
  SystemSettings,
  CustomerAccountSummary,
} from '../types';
import { getTodayJalali, gregorianToJalali, toEnglishDigits } from '../utils/jalali';
import { ensureArray, normalizeEntityWithItems } from '../utils/itemUtils';

const STORAGE_KEYS = {
  CUSTOMERS: 'pe_customers_v1',
  PRODUCTS: 'pe_products_v1',
  ORDERS: 'pe_orders_v1',
  INVOICES: 'pe_invoices_v1',
  TRANSACTIONS: 'pe_transactions_v1',
  PAYMENTS: 'pe_payments_v1',
  CHEQUES: 'pe_cheques_v1',
  ADJUSTMENTS: 'pe_adjustments_v1',
  DRIVERS: 'pe_drivers_v1',
  VEHICLES: 'pe_vehicles_v1',
  DELIVERIES: 'pe_deliveries_v1',
  RETURNS: 'pe_returns_v1',
  MATERIALS: 'pe_materials_v1',
  WAREHOUSES: 'pe_warehouses_v1',
  MOVEMENTS: 'pe_movements_v1',
  EMPLOYEES: 'pe_employees_v1',
  EMPLOYEE_TXS: 'pe_employee_txs_v1',
  EMPLOYEE_LEAVES: 'pe_employee_leaves_v1',
  EMPLOYMENT_PERIODS: 'pe_employment_periods_v1',
  EXPENSES: 'pe_expenses_v1',
  PRODUCTION_LOGS: 'pe_production_logs_v1',
  USERS: 'pe_users_v1',
  ROLES: 'pe_roles_v1',
  PERMISSIONS: 'pe_permissions_v1',
  AUDIT_LOGS: 'pe_audit_logs_v1',
  SETTINGS: 'pe_settings_v1',
  ACTIVE_USER_ID: 'pe_active_user_id_v1',
  AUTH_SESSION: 'pe_auth_session_v1',
  REMEMBERED_USERNAME: 'pe_remembered_username_v1',
};

// Initial Default Settings
const defaultSettings: SystemSettings = {
  id: 'set-1',
  business_name: 'شرکت کبیر لوله دره شهر',
  company_name: 'شرکت کبیر لوله دره شهر',
  brand_subtitle: 'تولید کننده انواع لوله های پلی اتیلن',
  logo_url: 'uploads/logo.jpg',
  stamp_signature_url: 'uploads/stamp_signature.png',
  login_cover_url: '',
  login_background_url: '',
  phone: '09181410327',
  fax: '',
  email: '',
  economic_code: '10300026420',
  national_id: '10300026420',
  registration_number: '403',
  postal_code: '6964139003',
  address: 'ایلام - شهرستان دره شهر - روستای جهاد آباد',
  default_tax_percent: 10,
  default_tax_rate: 10,
  
  // Default notes for documents
  default_order_notes_enabled: true,
  default_order_notes_text: '۱. مدت اعتبار این پیش‌فاکتور از تاریخ صدور به مدت ۳ روز کاری می‌باشد.\n۲. واریز ۵۰٪ مبلغ سفارش جهت تایید قطعی و آغاز بارگیری یا تولید الزامی است.\n۳. هزینه حمل و بارگیری بر عهده خریدار محترم می‌باشد مگر اینکه توافق دیگری صورت گرفته باشد.',
  default_invoice_notes_enabled: true,
  default_invoice_notes_text: '۱. کالا به شرط تایید تست هیدروستاتیک و انطباق کامل با استاندارد ملی ایران تحویل گردید.\n۲. هرگونه مغایرت فنی یا متراژ حداکثر ظرف ۴۸ ساعت پس از تحویل بار قابل رسیدگی است.\n۳. واریز وجه صرفاً به حساب‌های رسمی و حقوقی شرکت معتبر و مورد تایید می‌باشد.',
  default_delivery_notes_enabled: true,
  default_delivery_notes_text: '۱. بارگیری و شمارش متراژ لوله‌ها با حضور و نظارت نماینده/راننده خریدار انجام گرفت.\n۲. کلیه مسئولیت‌های مهار و نگهداری کالا در حین حمل بر عهده شرکت ترابری و راننده می‌باشد.',

  // Backup and Reminder settings
  backup_reminder_enabled: true,
  backup_reminder_interval_days: 7, // هفتگی
  last_backup_date: new Date().toISOString(),

  order_prefix: 'ORD',
  invoice_prefix: 'INV',
  customer_prefix: 'CUS',
  product_prefix: 'PRD',
  delivery_prefix: 'DEL',
  return_prefix: 'RET',
  material_prefix: 'MAT',
  currency_unit: 'ریال',
  print_invoice_header: 'فاکتور رسمی فروش کالا و خدمات',
  print_invoice_footer_terms: '۱. کالا به شرط تایید تست هیدروستاتیک و انطباق با استاندارد ملی تحویل گردید.\n۲. هرگونه مغایرت متراژ حداکثر ظرف ۴۸ ساعت پس از تحویل قابل رسیدگی است.\n۳. پرداخت صرفاً به حساب رسمی شرکت معتبر است.',
  default_invoice_notes: 'تحویل بار درب کارخانه می‌باشد. کلیه لوله‌ها دارای ۱۰ سال ضمانت کتبی و بیمه‌نامه هستند.',
  print_invoice_signatures: {
    seller: 'مهر و امضای فروشنده',
    buyer: 'مهر و امضای خریدار / تحویل‌گیرنده',
    delivery: 'امضای مسئول حمل و بارگیری',
    accountant: 'امضای امور مالی و حسابداری',
  },
  timezone: 'Asia/Tehran',
  updated_at: '2026-08-20T08:00:00Z',
};

// Robust JSON parser from SQL dumps that avoids corrupting escaped newlines and control characters
export function safeParseJsonFromSql(rawVal: any): any {
  if (!rawVal) return null;
  if (typeof rawVal === 'object') return rawVal;
  if (typeof rawVal !== 'string') return null;

  let str = rawVal.trim();
  if (!str) return null;

  // If string starts with quote and ends with quote, strip outer quotes
  if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
    str = str.slice(1, -1).trim();
  }

  // 1. Direct parse attempt
  try {
    const res = JSON.parse(str);
    if (res && typeof res === 'object') return res;
  } catch {}

  // 2. Unescape SQL quotes (\' -> ' and \" -> " and \/ -> /) but preserve \n, \r, \t as escaped strings for JSON
  let unescaped = str
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\//g, '/');

  try {
    const res = JSON.parse(unescaped);
    if (res && typeof res === 'object') return res;
  } catch {}

  // 3. Fix unescaped control characters (literal newlines, carriage returns, tabs) inside JSON
  let sanitized = unescaped.replace(/[\u0000-\u001f]/g, (char) => {
    switch (char) {
      case '\n': return '\\n';
      case '\r': return '\\r';
      case '\t': return '\\t';
      case '\b': return '\\b';
      case '\f': return '\\f';
      default: return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
    }
  });

  try {
    const res = JSON.parse(sanitized);
    if (res && typeof res === 'object') return res;
  } catch {}

  // 4. Double-escaped slashes \\\\
  try {
    const res = JSON.parse(sanitized.replace(/\\\\/g, '\\'));
    if (res && typeof res === 'object') return res;
  } catch {}

  // 5. Fallback: Regex key-value extractor for JSON object
  if (str.includes('{') && str.includes('}')) {
    const kvObj: Record<string, any> = {};
    const kvRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|(-?\d+(?:\.\d+)?)|(true|false|null)|(\{[^}]*\})|(\[[^\]]*\]))/g;
    let match;
    while ((match = kvRegex.exec(str)) !== null) {
      const k = match[1];
      let v: any = match[2] !== undefined ? match[2] : (match[3] !== undefined ? Number(match[3]) : (match[4] !== undefined ? (match[4] === 'true' ? true : (match[4] === 'false' ? false : null)) : (match[5] || match[6])));
      if (typeof v === 'string') {
        v = v.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, '\n').replace(/\\r/g, '\r').replace(/\\t/g, '\t').replace(/\\\//g, '/');
      }
      kvObj[k] = v;
    }
    if (Object.keys(kvObj).length > 0) return kvObj;
  }

  return null;
}

// Robust Normalization of System Settings from any backup format (JSON / SQL / array / alternative keys)
export function normalizeSettingsObject(raw: any, fallback?: SystemSettings): SystemSettings {
  const base = fallback || defaultSettings;
  if (!raw) {
    return { ...base };
  }

  let obj: any = {};

  // 1. If raw is a string, try JSON parse
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw.trim());
      if (parsed && typeof parsed === 'object') {
        return normalizeSettingsObject(parsed, fallback);
      }
    } catch {
      return { ...base };
    }
  }

  // 2. If raw is an array (e.g. SQL rows [ { key, value }, ... ] or array of row objects)
  if (Array.isArray(raw)) {
    if (raw.length === 0) return { ...base };

    // Check if array elements are key-value pairs
    let isKvArray = false;
    const kvAccumulator: Record<string, any> = {};

    for (const item of raw) {
      if (!item) continue;
      if (typeof item === 'object' && !Array.isArray(item)) {
        const k = item.key || item.setting_key || item.name || item.setting_name || item.k || item.code;
        const v = item.value !== undefined ? item.value : (item.setting_value !== undefined ? item.setting_value : (item.val !== undefined ? item.val : (item.v !== undefined ? item.v : (item.data !== undefined ? item.data : undefined))));
        if (k && v !== undefined) {
          isKvArray = true;
          kvAccumulator[String(k).toLowerCase()] = v;
        } else if (item.data_json) {
          try {
            const dec = typeof item.data_json === 'string' ? JSON.parse(item.data_json) : item.data_json;
            if (dec && typeof dec === 'object') {
              Object.assign(obj, dec);
            }
          } catch {}
        } else {
          Object.assign(obj, item);
        }
      } else if (Array.isArray(item) && item.length >= 2) {
        // [key, val] tuple
        isKvArray = true;
        kvAccumulator[String(item[0]).toLowerCase()] = item[1];
      }
    }

    if (isKvArray && Object.keys(kvAccumulator).length > 0) {
      Object.assign(obj, kvAccumulator);
    }
  } else if (typeof raw === 'object') {
    obj = { ...raw };
    if (obj.data_json) {
      try {
        const dec = typeof obj.data_json === 'string' ? JSON.parse(obj.data_json) : obj.data_json;
        if (dec && typeof dec === 'object') {
          obj = { ...dec, ...obj };
        }
      } catch {}
    }
    if (obj.settings && typeof obj.settings === 'object') {
      obj = { ...obj.settings, ...obj };
    }
    if (obj.system_settings && typeof obj.system_settings === 'object') {
      obj = { ...obj.system_settings, ...obj };
    }
    if (obj.company_settings && typeof obj.company_settings === 'object') {
      obj = { ...obj.company_settings, ...obj };
    }
  }

  // Helper to find case-insensitive & alias property
  const getProp = (keys: string[]): any => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
      const lower = k.toLowerCase();
      if (obj[lower] !== undefined && obj[lower] !== null && obj[lower] !== '') return obj[lower];
      const noUnder = k.replace(/_/g, '').toLowerCase();
      for (const origKey of Object.keys(obj)) {
        if (origKey.replace(/_/g, '').toLowerCase() === noUnder) {
          if (obj[origKey] !== undefined && obj[origKey] !== null && obj[origKey] !== '') return obj[origKey];
        }
      }
    }
    return undefined;
  };

  const rawCompanyName = getProp(['company_name', 'companyName', 'business_name', 'businessName', 'company', 'brand_name', 'brandName', 'title', 'name', 'firm_name']);
  const rawBusinessName = getProp(['business_name', 'businessName', 'company_name', 'companyName', 'company', 'brand_name', 'title', 'name']);
  
  let resolvedName = '';
  if (obj.business_name && obj.company_name) {
    if (obj.business_name !== base.business_name) {
      resolvedName = String(obj.business_name).trim();
    } else if (obj.company_name !== base.company_name) {
      resolvedName = String(obj.company_name).trim();
    } else {
      resolvedName = String(obj.business_name).trim();
    }
  } else if (obj.business_name) {
    resolvedName = String(obj.business_name).trim();
  } else if (obj.company_name) {
    resolvedName = String(obj.company_name).trim();
  } else {
    resolvedName = String(rawBusinessName || rawCompanyName || base.business_name || base.company_name || '').trim();
  }
  const business_name = resolvedName || base.business_name;
  const company_name = resolvedName || base.company_name || business_name;

  const rawSubtitle = getProp(['brand_subtitle', 'brandSubtitle', 'subtitle', 'slogan', 'brand_name', 'brand_tagline', 'description']);
  const brand_subtitle = rawSubtitle !== undefined ? String(rawSubtitle) : base.brand_subtitle;

  const rawLogo = getProp(['logo_url', 'logoUrl', 'logo', 'logo_image', 'logoImage', 'company_logo']);
  let logo_url = rawLogo !== undefined ? String(rawLogo) : base.logo_url;
  if (logo_url && logo_url.startsWith('data:image/') && logo_url.length > 30000) {
    logo_url = 'uploads/logo.jpg';
  }

  const rawStamp = getProp(['stamp_signature_url', 'stampSignatureUrl', 'stamp_url', 'stampUrl', 'signature_url', 'signatureUrl', 'stamp_image']);
  let stamp_signature_url = rawStamp !== undefined ? String(rawStamp) : base.stamp_signature_url;
  if (stamp_signature_url && stamp_signature_url.startsWith('data:image/') && stamp_signature_url.length > 30000) {
    stamp_signature_url = 'uploads/stamp_signature.png';
  }

  const rawLoginCover = getProp(['login_cover_url', 'loginCoverUrl', 'cover_url', 'coverUrl', 'login_cover']);
  const login_cover_url = rawLoginCover !== undefined ? String(rawLoginCover) : base.login_cover_url;

  const rawLoginBg = getProp(['login_background_url', 'loginBackgroundUrl', 'background_url', 'backgroundUrl', 'bg_url', 'bgUrl']);
  const login_background_url = rawLoginBg !== undefined ? String(rawLoginBg) : base.login_background_url;

  const rawPhone = getProp(['phone', 'tel', 'telephone', 'phone_number', 'phoneNumber', 'mobile', 'contact_phone']);
  const phone = rawPhone ? String(rawPhone).trim() : base.phone;

  const rawFax = getProp(['fax', 'fax_number', 'faxNumber', 'telefax']);
  const fax = rawFax !== undefined ? String(rawFax) : base.fax;

  const rawEmail = getProp(['email', 'mail', 'email_address', 'company_email']);
  const email = rawEmail !== undefined ? String(rawEmail) : base.email;

  const rawEcoCode = getProp(['economic_code', 'economicCode', 'eco_code', 'ecoCode', 'economic_id', 'economic_no']);
  const economic_code = rawEcoCode !== undefined ? String(rawEcoCode) : base.economic_code;

  const rawNationalId = getProp(['national_id', 'nationalId', 'national_code', 'nationalCode', 'melli_code', 'national_number']);
  const national_id = rawNationalId !== undefined ? String(rawNationalId) : base.national_id;

  const rawRegNum = getProp(['registration_number', 'registrationNumber', 'reg_number', 'regNumber', 'reg_no', 'regNo', 'sabt_number']);
  const registration_number = rawRegNum !== undefined ? String(rawRegNum) : base.registration_number;

  const rawPostalCode = getProp(['postal_code', 'postalCode', 'zip_code', 'zipCode', 'post_code', 'zipcode']);
  const postal_code = rawPostalCode !== undefined ? String(rawPostalCode) : base.postal_code;

  const rawAddress = getProp(['address', 'company_address', 'companyAddress', 'factory_address', 'office_address', 'full_address']);
  const address = rawAddress ? String(rawAddress).trim() : base.address;

  const rawTax = getProp(['default_tax_percent', 'defaultTaxPercent', 'default_tax_rate', 'defaultTaxRate', 'tax_percent', 'taxPercent', 'tax_rate', 'vat_percent', 'tax']);
  const default_tax_percent = rawTax !== undefined && !isNaN(Number(rawTax)) ? Number(rawTax) : base.default_tax_percent;

  const rawOrderNotesEnabled = getProp(['default_order_notes_enabled', 'defaultOrderNotesEnabled', 'order_notes_enabled']);
  const default_order_notes_enabled = rawOrderNotesEnabled !== undefined ? Boolean(rawOrderNotesEnabled) : base.default_order_notes_enabled;

  const rawOrderNotesText = getProp(['default_order_notes_text', 'defaultOrderNotesText', 'order_notes', 'proforma_notes', 'order_notes_text']);
  const default_order_notes_text = rawOrderNotesText !== undefined ? String(rawOrderNotesText) : base.default_order_notes_text;

  const rawInvoiceNotesEnabled = getProp(['default_invoice_notes_enabled', 'defaultInvoiceNotesEnabled', 'invoice_notes_enabled']);
  const default_invoice_notes_enabled = rawInvoiceNotesEnabled !== undefined ? Boolean(rawInvoiceNotesEnabled) : base.default_invoice_notes_enabled;

  const rawInvoiceNotesText = getProp(['default_invoice_notes_text', 'defaultInvoiceNotesText', 'invoice_notes', 'default_invoice_notes', 'invoice_notes_text']);
  const default_invoice_notes_text = rawInvoiceNotesText !== undefined ? String(rawInvoiceNotesText) : base.default_invoice_notes_text;

  const rawDeliveryNotesEnabled = getProp(['default_delivery_notes_enabled', 'defaultDeliveryNotesEnabled', 'delivery_notes_enabled']);
  const default_delivery_notes_enabled = rawDeliveryNotesEnabled !== undefined ? Boolean(rawDeliveryNotesEnabled) : base.default_delivery_notes_enabled;

  const rawDeliveryNotesText = getProp(['default_delivery_notes_text', 'defaultDeliveryNotesText', 'delivery_notes', 'delivery_notes_text']);
  const default_delivery_notes_text = rawDeliveryNotesText !== undefined ? String(rawDeliveryNotesText) : base.default_delivery_notes_text;

  const order_prefix = getProp(['order_prefix', 'orderPrefix']) || base.order_prefix;
  const invoice_prefix = getProp(['invoice_prefix', 'invoicePrefix']) || base.invoice_prefix;
  const customer_prefix = getProp(['customer_prefix', 'customerPrefix']) || base.customer_prefix;
  const product_prefix = getProp(['product_prefix', 'productPrefix']) || base.product_prefix;
  const delivery_prefix = getProp(['delivery_prefix', 'deliveryPrefix']) || base.delivery_prefix;
  const return_prefix = getProp(['return_prefix', 'returnPrefix']) || base.return_prefix;
  const material_prefix = getProp(['material_prefix', 'materialPrefix']) || base.material_prefix;
  const currency_unit = getProp(['currency_unit', 'currencyUnit']) || base.currency_unit;

  const rawBackupReminder = getProp(['backup_reminder_enabled', 'backupReminderEnabled']);
  const backup_reminder_enabled = rawBackupReminder !== undefined ? Boolean(rawBackupReminder) : base.backup_reminder_enabled;

  const rawBackupInterval = getProp(['backup_reminder_interval_days', 'backupReminderIntervalDays']);
  const backup_reminder_interval_days = rawBackupInterval !== undefined && !isNaN(Number(rawBackupInterval)) ? Number(rawBackupInterval) : base.backup_reminder_interval_days;

  const last_backup_date = getProp(['last_backup_date', 'lastBackupDate']) || base.last_backup_date;

  return {
    ...base,
    ...obj,
    id: obj.id || base.id || 'set-1',
    company_name,
    business_name,
    brand_subtitle,
    logo_url,
    stamp_signature_url,
    login_cover_url,
    login_background_url,
    phone,
    fax,
    email,
    economic_code,
    national_id,
    registration_number,
    postal_code,
    address,
    default_tax_percent,
    default_tax_rate: default_tax_percent,
    default_order_notes_enabled,
    default_order_notes_text,
    default_invoice_notes_enabled,
    default_invoice_notes_text,
    default_delivery_notes_enabled,
    default_delivery_notes_text,
    backup_reminder_enabled,
    backup_reminder_interval_days,
    last_backup_date,
    order_prefix,
    invoice_prefix,
    customer_prefix,
    product_prefix,
    delivery_prefix,
    return_prefix,
    material_prefix,
    currency_unit,
    updated_at: obj.updated_at || new Date().toISOString(),
  };
}

// Initial Permissions
const defaultPermissions: Permission[] = [
  // سفارش‌ها و پیش‌فاکتور
  { id: 'p_ord_view', name: 'مشاهده لیست سفارش‌ها', key: 'orders.view', category: 'سفارش‌ها و پیش‌فاکتور', description: 'ورود به صفحه و مشاهده لیست سفارشات' },
  { id: 'p_ord_create', name: 'ثبت سفارش جدید', key: 'orders.create', category: 'سفارش‌ها و پیش‌فاکتور', description: 'امکان ثبت پیش‌نویس و سفارش جدید' },
  { id: 'p_ord_edit', name: 'ویرایش سفارش', key: 'orders.edit', category: 'سفارش‌ها و پیش‌فاکتور', description: 'امکان ویرایش اقلام و مبالغ سفارش' },
  { id: 'p_ord_delete', name: 'لغو و حذف سفارش', key: 'orders.delete', category: 'سفارش‌ها و پیش‌فاکتور', description: 'امکان لغو یا حذف سفارش' },
  { id: 'p_ord_confirm', name: 'تایید سفارش (صدور فاکتور)', key: 'orders.confirm', category: 'سفارش‌ها و پیش‌فاکتور', description: 'امکان تایید نهایی سفارش و تبدیل به فاکتور فروش' },
  { id: 'p_ord_print', name: 'چاپ و خروجی پیش‌فاکتور', key: 'orders.print', category: 'سفارش‌ها و پیش‌فاکتور', description: 'امکان چاپ و خروجی اکسل پیش‌فاکتور' },

  // فاکتورهای فروش
  { id: 'p_inv_view', name: 'مشاهده فاکتورها', key: 'invoices.view', category: 'فاکتورهای فروش', description: 'مشاهده لیست فاکتورهای رسمی فروش' },
  { id: 'p_inv_edit', name: 'ویرایش فاکتور', key: 'invoices.edit', category: 'فاکتورهای فروش', description: 'امکان تغییر اقلام، قیمت و تخفیف فاکتور' },
  { id: 'p_inv_cancel', name: 'ابطال و لغو فاکتور', key: 'invoices.cancel', category: 'فاکتورهای فروش', description: 'امکان لغو و ابطال فاکتور' },
  { id: 'p_inv_print', name: 'چاپ و خروجی فاکتور', key: 'invoices.print', category: 'فاکتورهای فروش', description: 'امکان چاپ برگه فاکتور و خروجی اکسل' },

  // رسیدهای تحویل و بارگیری
  { id: 'p_del_view', name: 'مشاهده رسیدهای تحویل', key: 'deliveries.view', category: 'تحویل و بارگیری', description: 'مشاهده لیست حواله‌ها و رسیدهای تحویل' },
  { id: 'p_del_create', name: 'صدور رسید تحویل', key: 'deliveries.create', category: 'تحویل و بارگیری', description: 'ثبت حواله خروج و رسید تحویل بار' },
  { id: 'p_del_edit', name: 'ویرایش رسید تحویل', key: 'deliveries.edit', category: 'تحویل و بارگیری', description: 'امکان ویرایش اطلاعات راننده و بار' },
  { id: 'p_del_delete', name: 'لغو و حذف رسید تحویل', key: 'deliveries.delete', category: 'تحویل و بارگیری', description: 'امکان ابطال رسید تحویل' },
  { id: 'p_del_returns', name: 'ثبت و مدیریت مرجوعی', key: 'deliveries.returns', category: 'تحویل و بارگیری', description: 'ثبت صورتجلسه برگشت از فروش' },
  { id: 'p_del_print', name: 'چاپ رسید بارگیری', key: 'deliveries.print', category: 'تحویل و بارگیری', description: 'امکان چاپ برگه رسید تحویل' },

  // مشتریان و حسابداری
  { id: 'p_cus_view', name: 'مشاهده مشتریان', key: 'customers.view', category: 'مشتریان و حسابداری', description: 'مشاهده لیست و پرونده مشتریان' },
  { id: 'p_cus_create', name: 'ثبت مشتری جدید', key: 'customers.create', category: 'مشتریان و حسابداری', description: 'امکان تعریف مشتری جدید' },
  { id: 'p_cus_edit', name: 'ویرایش مشتری', key: 'customers.edit', category: 'مشتریان و حسابداری', description: 'امکان ویرایش اطلاعات تماس و هویتی مشتری' },
  { id: 'p_cus_delete', name: 'غیرفعال‌سازی مشتری', key: 'customers.delete', category: 'مشتریان و حسابداری', description: 'امکان غیرفعال یا حذف مشتری' },
  { id: 'p_cus_financial', name: 'گردش حساب و معین', key: 'customers.financial', category: 'مشتریان و حسابداری', description: 'مشاهده دفتر معین و تراز مالی مشتری' },
  { id: 'p_cus_payments', name: 'ثبت دریافت و پرداخت', key: 'customers.payments', category: 'مشتریان و حسابداری', description: 'ثبت واریزی‌ها، فیش و وجوه نقدی' },
  { id: 'p_cus_cheques', name: 'مدیریت وضعیت چک‌ها', key: 'customers.cheques', category: 'مشتریان و حسابداری', description: 'پاس کردن، برگشت و عودت چک‌ها' },
  { id: 'p_cus_adjustments', name: 'ثبت تعدیلات بدهکار/بستانکار', key: 'customers.adjustments', category: 'مشتریان و حسابداری', description: 'ثبت اسناد تعدیل حساب مشتری' },
  { id: 'p_cus_print', name: 'چاپ صورتحساب مشتری', key: 'customers.print', category: 'مشتریان و حسابداری', description: 'امکان چاپ صورتحساب و خروجی اکسل' },

  // انبار مواد اولیه
  { id: 'p_war_view', name: 'مشاهده انبار مواد', key: 'warehouse.view', category: 'انبار مواد اولیه', description: 'مشاهده موجودی و کاردکس مواد اولیه' },
  { id: 'p_war_create', name: 'ثبت ورود و خروج مواد', key: 'warehouse.create', category: 'انبار مواد اولیه', description: 'ثبت رسید ورود گرانول و حواله مصرف' },
  { id: 'p_war_edit', name: 'ویرایش اسناد انبار', key: 'warehouse.edit', category: 'انبار مواد اولیه', description: 'امکان اصلاح رسیدها و خروجی‌های انبار' },
  { id: 'p_war_delete', name: 'حذف تراکنش انبار', key: 'warehouse.delete', category: 'انبار مواد اولیه', description: 'امکان حذف اسناد ثبت‌شده انبار' },
  { id: 'p_war_print', name: 'چاپ گزارشات انبار', key: 'warehouse.print', category: 'انبار مواد اولیه', description: 'چاپ کاردکس و خروجی اکسل انبار' },

  // مدیریت خط تولید
  { id: 'p_prd_view', name: 'مشاهده گزارشات تولید', key: 'production.view', category: 'مدیریت خط تولید', description: 'مشاهده آمار و لاگ شیفت‌های تولید' },
  { id: 'p_prd_create', name: 'ثبت شیفت تولید', key: 'production.create', category: 'مدیریت خط تولید', description: 'ثبت متراژ، وزن و پارامترهای دستگاه اکسترودر' },
  { id: 'p_prd_edit', name: 'ویرایش گزارش تولید', key: 'production.edit', category: 'مدیریت خط تولید', description: 'اصلاح پارامترها و مقادیر شیفت' },
  { id: 'p_prd_delete', name: 'حذف گزارش تولید', key: 'production.delete', category: 'مدیریت خط تولید', description: 'امکان حذف گزارش شیفت تولید' },
  { id: 'p_prd_print', name: 'چاپ شیفت‌نامه تولید', key: 'production.print', category: 'مدیریت خط تولید', description: 'چاپ و خروجی اکسل خط تولید' },

  // مدیریت پرسنل و حقوق
  { id: 'p_emp_view', name: 'مشاهده لیست پرسنل', key: 'employees.view', category: 'پرسنل و حقوق', description: 'مشاهده پرونده و اسامی کارمندان و کارگران' },
  { id: 'p_emp_create', name: 'ثبت پرسنل جدید', key: 'employees.create', category: 'پرسنل و حقوق', description: 'تعریف کارمند یا اپراتور جدید' },
  { id: 'p_emp_edit', name: 'ویرایش مشخصات پرسنل', key: 'employees.edit', category: 'پرسنل و حقوق', description: 'امکان تغییر پایه حقوق و اطلاعات پرسنلی' },
  { id: 'p_emp_delete', name: 'غیرفعال‌سازی پرسنل', key: 'employees.delete', category: 'پرسنل و حقوق', description: 'پایان همکاری یا غیرفعال کردن پرسنل' },
  { id: 'p_emp_financial', name: 'ثبت حقوق، مساعده و پاداش', key: 'employees.financial', category: 'پرسنل و حقوق', description: 'ثبت واریز حقوق ماهانه و مساعده' },
  { id: 'p_emp_leaves', name: 'مدیریت مرخصی‌ها', key: 'employees.leaves', category: 'پرسنل و حقوق', description: 'ثبت و تایید مرخصی روزانه و ساعتی' },
  { id: 'p_emp_periods', name: 'مدیریت دوره‌های کاری', key: 'employees.periods', category: 'پرسنل و حقوق', description: 'ثبت قرارداد و دوره‌های شروع/خاتمه کار' },
  { id: 'p_emp_print', name: 'چاپ برگه مرخصی و فیش', key: 'employees.print', category: 'پرسنل و حقوق', description: 'امکان چاپ اسناد پرسنلی' },

  // هزینه‌های جاری
  { id: 'p_exp_view', name: 'مشاهده هزینه‌ها', key: 'expenses.view', category: 'هزینه‌های جاری', description: 'مشاهده دسته‌بندی و لیست هزینه‌های شرکت' },
  { id: 'p_exp_create', name: 'ثبت هزینه جدید', key: 'expenses.create', category: 'هزینه‌های جاری', description: 'ثبت سند پرداخت هزینه جاری یا کارخانه' },
  { id: 'p_exp_edit', name: 'ویرایش هزینه', key: 'expenses.edit', category: 'هزینه‌های جاری', description: 'اصلاح مبالغ و اسناد هزینه' },
  { id: 'p_exp_delete', name: 'حذف هزینه', key: 'expenses.delete', category: 'هزینه‌های جاری', description: 'امکان حذف هزینه ثبت‌شده' },
  { id: 'p_exp_print', name: 'چاپ و گزارش اکسل هزینه‌ها', key: 'expenses.print', category: 'هزینه‌های جاری', description: 'چاپ فیلتر و خروجی اکسل هزینه‌ها' },

  // مرکز گزارش‌ها و داشبورد
  { id: 'p_rep_view', name: 'مشاهده مرکز گزارش‌ها و داشبورد', key: 'reports.view', category: 'گزارشات و داشبورد', description: 'مشاهده داشبورد آماری و گزارشات تحلیلی' },
  { id: 'p_rep_export', name: 'خروجی اکسل و چاپ گزارشات جامع', key: 'reports.export', category: 'گزارشات و داشبورد', description: 'دریافت خروجی اکسل و چاپ گزارش‌های جامع' },

  // تنظیمات و مدیریت سامانه
  { id: 'p_set_gen', name: 'تنظیمات عمومی شرکت', key: 'settings.general', category: 'تنظیمات و مدیریت سامانه', description: 'ویرایش مشخصات شرکت، لوگو و متون پیش‌فرض' },
  { id: 'p_set_usr', name: 'مدیریت کاربران و دسترسی‌ها', key: 'settings.users', category: 'تنظیمات و مدیریت سامانه', description: 'افزودن، حذف، ویرایش کاربران و تعیین دسترسی‌ها' },
  { id: 'p_set_bak', name: 'پشتیبان‌گیری و بازیابی اطلاعات', key: 'settings.backup', category: 'تنظیمات و مدیریت سامانه', description: 'دانلود فایل بکاپ، بازیابی و تنظیم آلارم پشتیبان‌گیری' },
  { id: 'p_set_aud', name: 'مشاهده لاگ و ردپای عملیات', key: 'settings.audit', category: 'تنظیمات و مدیریت سامانه', description: 'مشاهده تاریخچه تمام تغییرات انجام‌شده در سامانه' },
];

// Initial Roles
const defaultRoles: Role[] = [
  {
    id: 'role-admin',
    name: 'مدیر ارشد سیستم',
    description: 'دسترسی نامحدود و کامل به تمام بخش‌ها، تنظیمات، کاربران و پشتیبان‌گیری',
    is_active: true,
    permissions: defaultPermissions.map((p) => p.key),
    created_at: '2026-08-20T08:00:00Z',
    updated_at: '2026-08-20T08:00:00Z',
  },
  {
    id: 'role-accountant',
    name: 'حسابدار ارشد',
    description: 'مدیریت حساب مشتریان، پرداخت‌ها، چک‌ها، تعدیلات، فاکتورها، پرسنل، هزینه‌ها و گزارشات مالی',
    is_active: true,
    permissions: [
      'customers.view', 'customers.create', 'customers.edit', 'customers.financial', 'customers.payments', 'customers.cheques', 'customers.adjustments', 'customers.print',
      'orders.view', 'orders.print',
      'invoices.view', 'invoices.edit', 'invoices.print',
      'deliveries.view', 'deliveries.print',
      'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.delete', 'expenses.print',
      'employees.view', 'employees.financial', 'employees.leaves', 'employees.periods', 'employees.print',
      'reports.view', 'reports.export',
    ],
    created_at: '2026-08-20T08:00:00Z',
    updated_at: '2026-08-20T08:00:00Z',
  },
  {
    id: 'role-sales',
    name: 'کارشناس فروش',
    description: 'ثبت و ویرایش مشتریان، پیش‌نویس سفارشات، تایید سفارش و صدور پیش‌فاکتور',
    is_active: true,
    permissions: [
      'customers.view', 'customers.create', 'customers.edit', 'customers.print',
      'orders.view', 'orders.create', 'orders.edit', 'orders.confirm', 'orders.print',
      'invoices.view', 'invoices.print',
      'deliveries.view', 'deliveries.print',
      'reports.view',
    ],
    created_at: '2026-08-20T08:00:00Z',
    updated_at: '2026-08-20T08:00:00Z',
  },
  {
    id: 'role-logistics',
    name: 'مسئول بارگیری و انبار',
    description: 'مدیریت بارگیری، صدور حواله تحویل، رانندگان، خودروها، مرجوعی و انبار مواد اولیه',
    is_active: true,
    permissions: [
      'customers.view',
      'orders.view',
      'invoices.view',
      'deliveries.view', 'deliveries.create', 'deliveries.edit', 'deliveries.returns', 'deliveries.print',
      'warehouse.view', 'warehouse.create', 'warehouse.edit', 'warehouse.print',
      'reports.view',
    ],
    created_at: '2026-08-20T08:00:00Z',
    updated_at: '2026-08-20T08:00:00Z',
  },
  {
    id: 'role-production',
    name: 'سرپرست خط تولید و کارخانه',
    description: 'ثبت گزارش کارکرد شیفت‌های تولید، متراژ تولیدی و نظارت بر مصرف مواد اولیه',
    is_active: true,
    permissions: [
      'production.view', 'production.create', 'production.edit', 'production.print',
      'warehouse.view', 'warehouse.create', 'warehouse.print',
      'reports.view',
    ],
    created_at: '2026-08-20T08:00:00Z',
    updated_at: '2026-08-20T08:00:00Z',
  },
];

// Initial Users
const defaultUsers: User[] = [
  {
    id: 'usr-1',
    user_code: 'USR-1001',
    name: 'مدیر ارشد سیستم',
    username: 'admin',
    password: '123',
    role_id: 'role-admin',
    role_name: 'مدیر ارشد سیستم',
    is_admin: true,
    is_active: true,
    permissions: defaultPermissions.map((p) => p.key),
    created_at: '2026-08-20T08:00:00Z',
    updated_at: '2026-08-20T08:00:00Z',
  },
];

// Zero-State Initial Business Entities (No fake or mock data is ever auto-injected)
const defaultProducts: Product[] = [];
const defaultCustomers: Customer[] = [];
const defaultDrivers: Driver[] = [];
const defaultVehicles: Vehicle[] = [];
const defaultWarehouses: Warehouse[] = [];
const defaultMaterials: Material[] = [];
const defaultMovements: MaterialMovement[] = [];
const defaultOrders: Order[] = [];
const defaultInvoices: Invoice[] = [];
const defaultTransactions: CustomerTransaction[] = [];
const defaultPayments: Payment[] = [];
const defaultCheques: Cheque[] = [];
const defaultAdjustments: Adjustment[] = [];
const defaultDeliveries: DeliveryNote[] = [];
const defaultReturns: ReturnDoc[] = [];
const defaultEmployees: Employee[] = [];
const defaultEmployeeTxs: EmployeeTransaction[] = [];
const defaultEmployeeLeaves: EmployeeLeave[] = [];
const defaultEmploymentPeriods: EmploymentPeriod[] = [];
const defaultExpenses: Expense[] = [];
const defaultProductionLogs: ProductionLog[] = [];
const defaultAuditLogs: AuditLog[] = [];

// Sync state & Real-time automatic synchronization with Host MySQL
export interface SyncStatus {
  state: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt: string | null;
  message?: string;
  engine?: string;
}

let isRestoringFromRemote = false;
let syncDebounceTimer: any = null;
let activePushPromise: Promise<{ success: boolean; message: string }> | null = null;
let pushQueued = false;
let lastWriteTimestamp = 0;
let lastKnownServerRevision = 0;
let lastKnownServerRows = 0;
let realtimePollingTimer: any = null;
let currentSyncState: SyncStatus = {
  state: 'idle',
  lastSyncedAt: null,
};
const syncStatusListeners: Array<(status: SyncStatus) => void> = [];

function notifySyncListeners(status: SyncStatus) {
  currentSyncState = status;
  syncStatusListeners.forEach((fn) => {
    try {
      fn(status);
    } catch (e) {
      console.error('Error notifying sync listener:', e);
    }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('polyethylene-sync-status', { detail: status }));
  }
}

const BUSINESS_DATA_KEYS = new Set([
  STORAGE_KEYS.CUSTOMERS,
  STORAGE_KEYS.PRODUCTS,
  STORAGE_KEYS.ORDERS,
  STORAGE_KEYS.INVOICES,
  STORAGE_KEYS.TRANSACTIONS,
  STORAGE_KEYS.PAYMENTS,
  STORAGE_KEYS.CHEQUES,
  STORAGE_KEYS.ADJUSTMENTS,
  STORAGE_KEYS.DRIVERS,
  STORAGE_KEYS.VEHICLES,
  STORAGE_KEYS.DELIVERIES,
  STORAGE_KEYS.RETURNS,
  STORAGE_KEYS.MATERIALS,
  STORAGE_KEYS.WAREHOUSES,
  STORAGE_KEYS.MOVEMENTS,
  STORAGE_KEYS.EMPLOYEES,
  STORAGE_KEYS.EMPLOYEE_TXS,
  STORAGE_KEYS.EMPLOYEE_LEAVES,
  STORAGE_KEYS.EMPLOYMENT_PERIODS,
  STORAGE_KEYS.EXPENSES,
  STORAGE_KEYS.PRODUCTION_LOGS,
  STORAGE_KEYS.USERS,
  STORAGE_KEYS.ROLES,
  STORAGE_KEYS.PERMISSIONS,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.AUDIT_LOGS,
]);

const UNSYNCED_FLAG_KEY = 'alborz_unsynced_local_changes';
const LAST_SYNCED_TIME_KEY = 'alborz_last_synced_time';

function markLocalChangePending() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(UNSYNCED_FLAG_KEY, 'true');
    } catch (e) {}
  }
}

function clearLocalChangePending() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(UNSYNCED_FLAG_KEY, 'false');
      localStorage.setItem(LAST_SYNCED_TIME_KEY, String(Date.now()));
    } catch (e) {}
  }
}

function hasLocalChangePending(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(UNSYNCED_FLAG_KEY) === 'true';
}

// Ensure pending changes are preserved or flushed on page unload/refresh
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (hasLocalChangePending()) {
      try {
        const fullJson = StorageService.exportFullBackup();
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api.php?action=save', fullJson);
        }
      } catch (e) {}
    }
  });
}

function scheduleAutoSyncToHost(delayMs = 1500) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return;
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }

  if (delayMs === 0) {
    StorageService.pushToHost().catch(() => {});
    return;
  }

  syncDebounceTimer = setTimeout(async () => {
    try {
      await StorageService.pushToHost();
    } catch (err: any) {
      // pushToHost handles errors
    }
  }, delayMs);
}

// Helper to safely read from localStorage
function readStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(item);
  } catch (err) {
    console.error(`Error reading ${key} from storage:`, err);
    return fallback;
  }
}

let cachedSettings: SystemSettings | null = null;

// Helper to safely write to localStorage and auto-sync
function writeStorage<T>(key: string, value: T, immediate = false): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (!isRestoringFromRemote && BUSINESS_DATA_KEYS.has(key)) {
      lastWriteTimestamp = Date.now();
      markLocalChangePending();
      scheduleAutoSyncToHost(immediate ? 0 : 1500);
    }
  } catch (err) {
    console.error(`Error writing ${key} to storage:`, err);
  }
}

// Helper to ensure all lists default to newest items first
function sortByNewestEntities<T>(items: T[], dateKey?: string): T[] {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a: any, b: any) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const dateA = (dateKey && a[dateKey]) || a.created_at || a.expense_date || a.payment_date || a.due_date || a.delivery_date || a.invoice_date || a.order_date || a.return_date || a.production_date || a.start_date || a.date;
    const dateB = (dateKey && b[dateKey]) || b.created_at || b.expense_date || b.payment_date || b.due_date || b.delivery_date || b.invoice_date || b.order_date || b.return_date || b.production_date || b.start_date || b.date;
    const tA = dateA ? new Date(dateA).getTime() : 0;
    const tB = dateB ? new Date(dateB).getTime() : 0;
    if (tB !== tA) return tB - tA;

    const numA = parseInt(String(a.order_number || a.invoice_number || a.delivery_number || a.return_number || a.code || a.payment_number || a.cheque_number || a.id || '').replace(/\D/g, ''), 10) || 0;
    const numB = parseInt(String(b.order_number || b.invoice_number || b.delivery_number || b.return_number || b.code || b.payment_number || b.cheque_number || b.id || '').replace(/\D/g, ''), 10) || 0;
    return numB - numA;
  });
}

export class StorageService {
  // Init and ensure storage is populated without false dirty state
  static initialize(): void {
    isRestoringFromRemote = true;
    try {
      if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
        writeStorage(STORAGE_KEYS.CUSTOMERS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
        writeStorage(STORAGE_KEYS.PRODUCTS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
        writeStorage(STORAGE_KEYS.ORDERS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
        writeStorage(STORAGE_KEYS.INVOICES, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)) {
        writeStorage(STORAGE_KEYS.TRANSACTIONS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.PAYMENTS)) {
        writeStorage(STORAGE_KEYS.PAYMENTS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.CHEQUES)) {
        writeStorage(STORAGE_KEYS.CHEQUES, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS)) {
        writeStorage(STORAGE_KEYS.ADJUSTMENTS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.DRIVERS)) {
        writeStorage(STORAGE_KEYS.DRIVERS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.VEHICLES)) {
        writeStorage(STORAGE_KEYS.VEHICLES, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.DELIVERIES)) {
        writeStorage(STORAGE_KEYS.DELIVERIES, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.RETURNS)) {
        writeStorage(STORAGE_KEYS.RETURNS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.MATERIALS)) {
        writeStorage(STORAGE_KEYS.MATERIALS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.WAREHOUSES)) {
        writeStorage(STORAGE_KEYS.WAREHOUSES, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.MOVEMENTS)) {
        writeStorage(STORAGE_KEYS.MOVEMENTS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
        writeStorage(STORAGE_KEYS.EMPLOYEES, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEE_TXS)) {
        writeStorage(STORAGE_KEYS.EMPLOYEE_TXS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
        writeStorage(STORAGE_KEYS.EXPENSES, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.PRODUCTION_LOGS)) {
        writeStorage(STORAGE_KEYS.PRODUCTION_LOGS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        writeStorage(STORAGE_KEYS.USERS, defaultUsers);
      } else {
        // Prune legacy dummy demo users usr-2, usr-3, usr-4 if still present
        try {
          const currentUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
          if (Array.isArray(currentUsers)) {
            const pruned = currentUsers.filter((u) => u.id !== 'usr-2' && u.id !== 'usr-3' && u.id !== 'usr-4');
            if (pruned.length !== currentUsers.length) {
              writeStorage(STORAGE_KEYS.USERS, pruned.length > 0 ? pruned : defaultUsers);
            }
          }
        } catch {}
      }
      if (!localStorage.getItem(STORAGE_KEYS.ROLES)) {
        writeStorage(STORAGE_KEYS.ROLES, defaultRoles);
      }
      if (!localStorage.getItem(STORAGE_KEYS.PERMISSIONS)) {
        writeStorage(STORAGE_KEYS.PERMISSIONS, defaultPermissions);
      }
      if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
        writeStorage(STORAGE_KEYS.AUDIT_LOGS, []);
      }
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        writeStorage(STORAGE_KEYS.SETTINGS, defaultSettings);
      } else {
        // Upgrade legacy default company name to Kabir Looleh Darreh Shahr
        try {
          const currentSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
          if (
            currentSettings &&
            (currentSettings.business_name === 'شرکت تولیدی لوله پلی‌اتیلن البرز پایپ' ||
              !currentSettings.business_name ||
              currentSettings.business_name === '')
          ) {
            const upgraded = {
              ...currentSettings,
              business_name: 'شرکت کبیر لوله دره شهر',
              company_name: 'شرکت کبیر لوله دره شهر',
              national_id: '10300026420',
              economic_code: '10300026420',
              registration_number: '403',
              phone: '09181410327',
              address: 'ایلام - شهرستان دره شهر - روستای جهاد آباد',
              postal_code: '6964139003',
            };
            writeStorage(STORAGE_KEYS.SETTINGS, upgraded);
          }
        } catch {}
      }
      if (!localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID)) {
        writeStorage(STORAGE_KEYS.ACTIVE_USER_ID, 'usr-1');
      }
    } finally {
      isRestoringFromRemote = false;
    }

    if (typeof window !== 'undefined' && !(window as any).__alborz_sync_listeners_attached) {
      (window as any).__alborz_sync_listeners_attached = true;
      window.addEventListener('online', () => {
        // Always pull latest from MySQL server first to merge state from other devices
        StorageService.pullFromHost().then(() => {
          if (hasLocalChangePending()) {
            StorageService.pushToHost();
          }
        }).catch(() => {});
      });
      window.addEventListener('focus', () => {
        // When user switches back to app, pull updates from other devices first
        StorageService.pullFromHost().then(() => {
          if (hasLocalChangePending()) {
            StorageService.pushToHost();
          }
        }).catch(() => {});
      });
      setInterval(() => {
        if (hasLocalChangePending()) {
          StorageService.pushToHost();
        }
      }, 10000);
    }
  }

  static hasUnsyncedChanges(): boolean {
    return hasLocalChangePending();
  }

  // Explicit sync confirmation with Host MySQL (checks if host is online and forces flush)
  static async saveAndSync(): Promise<{ success: boolean; isOffline: boolean; message: string }> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      return { success: true, isOffline: false, message: 'ثبت در حافظه با موفقیت انجام شد.' };
    }

    const hostCheck = await this.checkHostApi();
    if (!hostCheck.available) {
      return { success: true, isOffline: false, message: 'اطلاعات در حافظه محلی ذخیره گردید.' };
    }

    const pushRes = await this.pushToHost(true);
    if (pushRes.success) {
      return { success: true, isOffline: false, message: 'اطلاعات با موفقیت در پایگاه داده سرور ثبت و تایید گردید.' };
    } else {
      return {
        success: false,
        isOffline: true,
        message: 'اطلاعات در دستگاه شما ذخیره شد اما به دلیل قطعی ارتباط یا اینترنت، هنوز روی سرور مرکزی ذخیره نشده است.',
      };
    }
  }

  // Current Active User
  static getActiveUser(): User {
    const users = this.getUsers();
    const activeId = readStorage<string>(STORAGE_KEYS.ACTIVE_USER_ID, 'usr-1');
    return users.find((u) => u.id === activeId) || users[0] || defaultUsers[0];
  }

  static notifyUserChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-permissions-changed'));
    }
  }

  static setActiveUser(userId: string): void {
    writeStorage(STORAGE_KEYS.ACTIVE_USER_ID, userId);
    this.notifyUserChanged();
  }

  // Authentication & Session Management
  static isAuthenticated(): boolean {
    const session = readStorage<{ userId: string; loggedInAt: string } | null>(STORAGE_KEYS.AUTH_SESSION, null);
    if (!session || !session.userId) return false;
    const users = this.getUsers();
    const user = users.find((u) => u.id === session.userId);
    return Boolean(user && user.is_active);
  }

  static login(
    username: string,
    password?: string,
    rememberMe = true
  ): { success: boolean; user?: User; message: string } {
    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    const users = this.getUsers();
    const user = users.find((u) => u.username.toLowerCase() === cleanUsername);

    if (!user) {
      this.logAudit(`تلاش ناموفق برای ورود به سامانه (نام کاربری نامعتبر: ${username})`, 'AUTH', 'LOGIN_FAILED');
      return {
        success: false,
        message: 'نام کاربری یا کلمه عبور وارد شده نامعتبر است.',
      };
    }

    if (user.is_active === false) {
      this.logAudit(`تلاش برای ورود با حساب غیرفعال (${user.name})`, 'AUTH', 'ACCOUNT_DISABLED');
      return {
        success: false,
        message: 'حساب کاربری شما در سیستم غیرفعال شده است. لطفاً با مدیر سیستم تماس بگیرید.',
      };
    }

    // Password validation: Strictly check against the user's assigned password in database
    const expectedPassword = String(user.password ?? '').trim();
    if (cleanPassword !== expectedPassword) {
      this.logAudit(`تلاش ناموفق برای ورود (رمز عبور اشتباه) برای کاربر ${user.name}`, 'AUTH', 'WRONG_PASSWORD');
      return {
        success: false,
        message: 'کلمه عبور وارد شده نادرست است. لطفاً مجدداً بررسی فرمایید.',
      };
    }

    // Success: save active user and session
    this.setActiveUser(user.id);
    const session = {
      userId: user.id,
      username: user.username,
      name: user.name,
      loggedInAt: new Date().toISOString(),
      rememberMe,
    };
    writeStorage(STORAGE_KEYS.AUTH_SESSION, session);

    if (rememberMe) {
      writeStorage(STORAGE_KEYS.REMEMBERED_USERNAME, user.username);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REMEMBERED_USERNAME);
    }

    this.logAudit(`ورود موفقیت‌آمیز به سامانه (${user.name} - ${user.role_name})`, 'AUTH', user.id);
    return {
      success: true,
      user,
      message: `خوش آمدید ${user.name} گرامی. ورود موفقیت‌آمیز بود.`,
    };
  }

  static logout(): { success: boolean; message: string } {
    const current = this.getActiveUser();
    this.logAudit(`خروج کاربر از سامانه (${current?.name || 'کاربر'})`, 'AUTH', current?.id || 'LOGOUT');
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
    return { success: true, message: 'با موفقیت از سیستم خارج شدید.' };
  }

  static getRememberedUsername(): string {
    return readStorage<string>(STORAGE_KEYS.REMEMBERED_USERNAME, '');
  }

  static isAdmin(user?: User): boolean {
    const currentUser = user || this.getActiveUser();
    if (!currentUser || currentUser.is_active === false) return false;
    if (currentUser.id === 'usr-1' || currentUser.username === 'admin') return true;
    if (currentUser.is_admin === true) return true;
    const allPermKeys = defaultPermissions.map((p) => p.key);
    if (Array.isArray(currentUser.permissions) && allPermKeys.length > 0 && allPermKeys.every((k) => currentUser.permissions!.includes(k))) {
      return true;
    }
    if (Array.isArray(currentUser.permissions) && (currentUser.permissions.includes('*') || currentUser.permissions.includes('all'))) {
      return true;
    }
    return false;
  }

  // Audit Logging
  static logAudit(
    action: string,
    entityType: string,
    entityId: string,
    oldValues?: any,
    newValues?: any,
    extra?: {
      documentNumber?: string;
      entityTitle?: string;
      actionType?: 'create' | 'update' | 'delete' | 'status_change' | 'confirm' | 'cancel' | 'print' | 'auth' | 'other';
      changesSummary?: string;
    }
  ): void {
    const currentUser = this.getActiveUser();
    const logs = this.getAuditLogs();

    // Auto deduce entity title if not provided
    const entityTitle =
      extra?.entityTitle ||
      newValues?.employee_name ||
      oldValues?.employee_name ||
      newValues?.full_name ||
      oldValues?.full_name ||
      newValues?.customer_name ||
      oldValues?.customer_name ||
      newValues?.name ||
      oldValues?.name ||
      newValues?.title ||
      oldValues?.title ||
      newValues?.material_name ||
      oldValues?.material_name;

    // Auto deduce document number if not provided
    const docNum =
      extra?.documentNumber ||
      newValues?.order_number ||
      oldValues?.order_number ||
      newValues?.invoice_number ||
      oldValues?.invoice_number ||
      newValues?.delivery_number ||
      oldValues?.delivery_number ||
      newValues?.payment_number ||
      oldValues?.payment_number ||
      newValues?.return_number ||
      oldValues?.return_number ||
      newValues?.code ||
      oldValues?.code ||
      (typeof entityId === 'string' &&
      (entityId.startsWith('ORD-') ||
        entityId.startsWith('INV-') ||
        entityId.startsWith('DEL-') ||
        entityId.startsWith('PAY-') ||
        entityId.startsWith('RET-') ||
        entityId.startsWith('EMP-'))
        ? entityId
        : undefined) ||
      entityTitle;

    // Auto deduce action_type if not provided
    let actionType: 'create' | 'update' | 'delete' | 'status_change' | 'confirm' | 'cancel' | 'print' | 'auth' | 'other' =
      extra?.actionType || 'other';
    if (!extra?.actionType) {
      if (entityType === 'AUTH') actionType = 'auth';
      else if (action.includes('تایید')) actionType = 'confirm';
      else if (action.includes('لغو') || action.includes('ابطال')) actionType = 'cancel';
      else if (action.includes('حذف')) actionType = 'delete';
      else if (action.includes('وضعیت')) actionType = 'status_change';
      else if (action.includes('ثبت') || action.includes('ایجاد') || action.includes('صدور') || action.includes('تعریف'))
        actionType = 'create';
      else if (action.includes('ویرایش') || action.includes('تغییر') || action.includes('بروزرسانی'))
        actionType = 'update';
      else if (action.includes('چاپ') || action.includes('خروجی')) actionType = 'print';
    }

    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user_id: currentUser?.id,
      user_code: currentUser?.user_code,
      user_name: currentUser?.name || 'کاربر سیستم',
      user_role: currentUser?.role_name || (currentUser?.is_admin ? 'مدیر ارشد' : 'کاربر'),
      action,
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      document_number: docNum,
      entity_title: entityTitle,
      old_values: oldValues,
      new_values: newValues,
      changes_summary: extra?.changesSummary,
      ip_address: '127.0.0.1',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser',
      created_at: new Date().toISOString(),
    };

    logs.unshift(newLog);
    writeStorage(STORAGE_KEYS.AUDIT_LOGS, logs.slice(0, 1500)); // retain last 1500 logs

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('audit-logs-updated', { detail: newLog }));
    }
  }

  static getAuditLogs(): AuditLog[] {
    const list = readStorage<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, defaultAuditLogs);
    return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // Get filtered logs for a specific entity with loose matching on id or doc number
  static getEntityAuditLogs(entityType?: string, entityId?: string, documentNumber?: string): AuditLog[] {
    const all = this.getAuditLogs();
    const cleanType = (entityType || '').toUpperCase().trim();
    const cleanId = (entityId || '').trim();
    const cleanDoc = (documentNumber || '').trim();

    return all.filter((l) => {
      // If neither id nor doc number specified, match by entityType
      if (!cleanId && !cleanDoc) {
        if (!cleanType) return true;
        const logType = (l.entity_type || '').toUpperCase().trim();
        return logType === cleanType;
      }

      // Check direct entity_id or document_number
      if (cleanId && l.entity_id === cleanId) return true;
      if (cleanDoc && l.document_number === cleanDoc) return true;
      if (cleanDoc && l.entity_id === cleanDoc) return true;
      if (cleanId && l.document_number === cleanId) return true;

      // Deep search in old_values & new_values payload
      const checkPayload = (payload: any): boolean => {
        if (!payload || typeof payload !== 'object') return false;
        if (cleanId && (
          payload.id === cleanId ||
          payload.customer_id === cleanId ||
          payload.order_id === cleanId ||
          payload.invoice_id === cleanId ||
          payload.employee_id === cleanId ||
          payload.delivery_id === cleanId ||
          payload.material_id === cleanId ||
          payload.cheque_id === cleanId ||
          payload.payment_id === cleanId ||
          payload.return_id === cleanId ||
          payload.adjustment_id === cleanId ||
          payload.expense_id === cleanId ||
          payload.reference_id === cleanId
        )) {
          return true;
        }
        if (cleanDoc && (
          payload.code === cleanDoc ||
          payload.user_code === cleanDoc ||
          payload.order_number === cleanDoc ||
          payload.invoice_number === cleanDoc ||
          payload.delivery_number === cleanDoc ||
          payload.return_number === cleanDoc ||
          payload.payment_number === cleanDoc ||
          payload.cheque_number === cleanDoc ||
          payload.reference_number === cleanDoc ||
          payload.invoice === cleanDoc
        )) {
          return true;
        }

        // If payload has items array (e.g. delivery items or return items)
        if (Array.isArray(payload.items)) {
          for (const itm of payload.items) {
            if (cleanId && (itm.invoice_id === cleanId || itm.order_id === cleanId || itm.product_id === cleanId)) return true;
            if (cleanDoc && (itm.invoice_number === cleanDoc || itm.order_number === cleanDoc)) return true;
          }
        }

        return false;
      };

      if (checkPayload(l.new_values) || checkPayload(l.old_values)) {
        return true;
      }

      // Check if document number or ID is mentioned in action title
      if (cleanDoc && l.action && l.action.includes(cleanDoc)) {
        return true;
      }

      return false;
    });
  }

  // Settings
  static getSettings(): SystemSettings {
    const raw = readStorage<SystemSettings>(STORAGE_KEYS.SETTINGS, defaultSettings);
    return normalizeSettingsObject(raw);
  }

  static updateSettings(settings: SystemSettings, immediate = true): void {
    const old = this.getSettings();
    const merged = normalizeSettingsObject(settings, old);
    merged.updated_at = new Date().toISOString();
    if (merged.business_name) merged.company_name = merged.business_name;
    if (merged.company_name) merged.business_name = merged.company_name;

    writeStorage(STORAGE_KEYS.SETTINGS, merged, immediate);
    this.logAudit('ویرایش تنظیمات سامانه', 'SETTINGS', merged.id || 'set-1', old, merged);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polyethylene-settings-changed', { detail: merged }));
      window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
    }

    // Instantly save to system_settings in host MySQL
    this.saveSettingsToHost(merged).catch(() => {});
  }

  // Upload image file directly to host uploads/ directory (saved on host filesystem, returns static URL)
  static async uploadImage(file: File, type: 'logo' | 'stamp' | 'cover' | 'bg'): Promise<{ success: boolean; url: string; message?: string }> {
    try {
      // 1. Read file and optimize dimension if excessively large
      const base64Data: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const rawResult = evt.target?.result as string;
          // SVG doesn't need canvas resizing
          if (file.type.includes('svg')) {
            resolve(rawResult);
            return;
          }
          const img = new Image();
          img.onload = () => {
            const maxDim = type === 'bg' ? 1920 : 800;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              // Stamp should retain PNG transparency
              const mime = (type === 'stamp' || file.type.includes('png')) ? 'image/png' : 'image/jpeg';
              const quality = mime === 'image/jpeg' ? 0.88 : undefined;
              resolve(canvas.toDataURL(mime, quality));
            } else {
              resolve(rawResult);
            }
          };
          img.onerror = () => resolve(rawResult);
          img.src = rawResult;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // 2. Send base64 payload to host api.php to write into uploads/ folder
      const url = this.getApiUrl(`api.php?action=upload_image&_t=${Date.now()}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          base64: base64Data,
          filename: file.name,
        }),
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch (jsonErr) {
        return { success: false, url: '', message: `پاسخ سرور نامعتبر بود: ${rawText.substring(0, 80)}` };
      }

      if (res.ok && data && data.success && data.url) {
        return { success: true, url: data.url, message: data.message || 'فایل با موفقیت روی هاست ذخیره شد.' };
      }

      return {
        success: false,
        url: '',
        message: data?.message || `خطا در ذخیره‌سازی روی هاست (کد وضعیت: ${res.status})`,
      };
    } catch (err: any) {
      return {
        success: false,
        url: '',
        message: `خطای شبکه در هنگام آپلود: ${err?.message || 'عدم دسترسی به هاست'}`,
      };
    }
  }

  // Targeted instant save for system_settings to MySQL without touching other tables
  static async saveSettingsToHost(customSettings?: SystemSettings): Promise<{ success: boolean; message: string }> {
    const current = customSettings || this.getSettings();
    const old = this.getSettings();
    const merged = normalizeSettingsObject(current, old);
    merged.updated_at = new Date().toISOString();
    if (merged.business_name) merged.company_name = merged.business_name;
    if (merged.company_name) merged.business_name = merged.company_name;

    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polyethylene-settings-changed', { detail: merged }));
      window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
    }

    notifySyncListeners({
      ...currentSyncState,
      state: 'syncing',
      message: 'در حال ذخیره‌سازی تنظیمات در جدول system_settings دیتابیس...',
    });

    try {
      const url = this.getApiUrl(`api.php?action=save_settings&_t=${Date.now()}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(merged),
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch (jsonErr) {
        throw new Error(`پاسخ سرور نامعتبر بود: ${rawText.substring(0, 100)}`);
      }

      if (!res.ok) {
        throw new Error(data?.message || `پاسخ سرور ناموفق بود (کد: ${res.status})`);
      }

      if (data && data.success) {
        clearLocalChangePending();
        const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        notifySyncListeners({
          state: 'synced',
          lastSyncedAt: timeStr,
          message: data.message || 'تنظیمات در جدول system_settings دیتابیس MySQL ثبت شد.',
        });
        return { success: true, message: data.message || 'تنظیمات با موفقیت ذخیره شد.' };
      } else {
        throw new Error(data?.message || 'خطا در ثبت تنظیمات');
      }
    } catch (err: any) {
      console.warn('saveSettingsToHost error/fallback:', err);
      this.pushToHost(false).catch(() => {});
      const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      notifySyncListeners({
        state: 'synced',
        lastSyncedAt: timeStr,
        message: 'تنظیمات در حافظه مرورگر ثبت شد و در اولین اتصال با هاست همگام خواهد شد.',
      });
      return { success: true, message: 'تنظیمات در حافظه محلی ذخیره شد.' };
    }
  }

  // Customers
  static getCustomers(): Customer[] {
    return readStorage<Customer[]>(STORAGE_KEYS.CUSTOMERS, defaultCustomers);
  }

  static saveCustomers(customers: Customer[], immediate = false): void {
    writeStorage(STORAGE_KEYS.CUSTOMERS, customers, immediate);
  }

  static generateCustomerCode(): string {
    const settings = this.getSettings();
    const prefix = settings.customer_prefix || 'CUS';
    const customers = this.getCustomers();
    const numbers = customers
      .map((c) => {
        const match = c.code.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `${prefix}-${nextNum}`;
  }

  // Products
  static getProducts(): Product[] {
    return readStorage<Product[]>(STORAGE_KEYS.PRODUCTS, defaultProducts);
  }

  static saveProducts(products: Product[]): void {
    writeStorage(STORAGE_KEYS.PRODUCTS, products);
  }

  static generateProductCode(): string {
    const settings = this.getSettings();
    const prefix = settings.product_prefix || 'PRD';
    const products = this.getProducts();
    const numbers = products
      .map((p) => {
        const match = p.code.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `${prefix}-${nextNum}`;
  }

  // Orders
  static getOrders(): Order[] {
    const raw = readStorage<Order[]>(STORAGE_KEYS.ORDERS, defaultOrders);
    const safeList = Array.isArray(raw) ? raw.map((o) => normalizeEntityWithItems(o)) : [];
    return sortByNewestEntities(safeList, 'order_date');
  }

  static saveOrders(orders: Order[], immediate = false): void {
    const safeList = Array.isArray(orders) ? orders.map((o) => normalizeEntityWithItems(o)) : [];
    writeStorage(STORAGE_KEYS.ORDERS, safeList, immediate);
  }

  static generateOrderNumber(): string {
    const settings = this.getSettings();
    const prefix = settings.order_prefix || 'ORD';
    const orders = this.getOrders();
    const numbers = orders
      .map((o) => {
        const match = o.order_number.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `${prefix}-${nextNum}`;
  }

  // Invoices
  static getInvoices(): Invoice[] {
    const raw = readStorage<Invoice[]>(STORAGE_KEYS.INVOICES, defaultInvoices);
    const safeList = Array.isArray(raw) ? raw.map((i) => normalizeEntityWithItems(i)) : [];
    return sortByNewestEntities(safeList, 'invoice_date');
  }

  static saveInvoices(invoices: Invoice[], immediate = false): void {
    const safeList = Array.isArray(invoices) ? invoices.map((i) => normalizeEntityWithItems(i)) : [];
    writeStorage(STORAGE_KEYS.INVOICES, safeList, immediate);
  }

  static generateInvoiceNumber(): string {
    const settings = this.getSettings();
    const prefix = settings.invoice_prefix || 'INV';
    const invoices = this.getInvoices();
    const numbers = invoices
      .map((i) => {
        const match = i.invoice_number.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `${prefix}-${nextNum}`;
  }

  // Transactions
  static getTransactions(): CustomerTransaction[] {
    return sortByNewestEntities(readStorage<CustomerTransaction[]>(STORAGE_KEYS.TRANSACTIONS, defaultTransactions), 'created_at');
  }

  static saveTransactions(transactions: CustomerTransaction[], immediate = false): void {
    writeStorage(STORAGE_KEYS.TRANSACTIONS, transactions, immediate);
  }

  // Payments
  static getPayments(): Payment[] {
    return sortByNewestEntities(readStorage<Payment[]>(STORAGE_KEYS.PAYMENTS, defaultPayments), 'payment_date');
  }

  static savePayments(payments: Payment[], immediate = false): void {
    writeStorage(STORAGE_KEYS.PAYMENTS, payments, immediate);
  }

  // Cheques
  static getCheques(): Cheque[] {
    return sortByNewestEntities(readStorage<Cheque[]>(STORAGE_KEYS.CHEQUES, defaultCheques), 'due_date');
  }

  static saveCheques(cheques: Cheque[]): void {
    writeStorage(STORAGE_KEYS.CHEQUES, cheques);
  }

  // Adjustments
  static getAdjustments(): Adjustment[] {
    return sortByNewestEntities(readStorage<Adjustment[]>(STORAGE_KEYS.ADJUSTMENTS, defaultAdjustments), 'created_at');
  }

  static saveAdjustments(adjustments: Adjustment[]): void {
    writeStorage(STORAGE_KEYS.ADJUSTMENTS, adjustments);
  }

  // Drivers & Vehicles
  static getDrivers(): Driver[] {
    return readStorage<Driver[]>(STORAGE_KEYS.DRIVERS, defaultDrivers);
  }

  static saveDrivers(drivers: Driver[]): void {
    writeStorage(STORAGE_KEYS.DRIVERS, drivers);
  }

  static getVehicles(): Vehicle[] {
    return readStorage<Vehicle[]>(STORAGE_KEYS.VEHICLES, defaultVehicles);
  }

  static saveVehicles(vehicles: Vehicle[]): void {
    writeStorage(STORAGE_KEYS.VEHICLES, vehicles);
  }

  // Deliveries
  static getDeliveries(): DeliveryNote[] {
    const raw = readStorage<DeliveryNote[]>(STORAGE_KEYS.DELIVERIES, defaultDeliveries);
    const safeList = Array.isArray(raw) ? raw.map((d) => normalizeEntityWithItems(d)) : [];
    return sortByNewestEntities(safeList, 'delivery_date');
  }

  static saveDeliveries(deliveries: DeliveryNote[]): void {
    const safeList = Array.isArray(deliveries) ? deliveries.map((d) => normalizeEntityWithItems(d)) : [];
    writeStorage(STORAGE_KEYS.DELIVERIES, safeList);
  }

  static generateDeliveryNumber(): string {
    const settings = this.getSettings();
    const prefix = settings.delivery_prefix || 'DEL';
    const deliveries = this.getDeliveries();
    const numbers = deliveries
      .map((d) => {
        const match = d.delivery_number.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `${prefix}-${nextNum}`;
  }

  // Returns
  static getReturns(): ReturnDoc[] {
    const raw = readStorage<ReturnDoc[]>(STORAGE_KEYS.RETURNS, defaultReturns);
    const safeList = Array.isArray(raw) ? raw.map((r) => normalizeEntityWithItems(r)) : [];
    return sortByNewestEntities(safeList, 'return_date');
  }

  static saveReturns(returns: ReturnDoc[]): void {
    const safeList = Array.isArray(returns) ? returns.map((r) => normalizeEntityWithItems(r)) : [];
    writeStorage(STORAGE_KEYS.RETURNS, safeList);
  }

  static generateReturnNumber(): string {
    const settings = this.getSettings();
    const prefix = settings.return_prefix || 'RET';
    const returns = this.getReturns();
    const numbers = returns
      .map((r) => {
        const match = r.return_number.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `${prefix}-${nextNum}`;
  }

  // Raw Materials & Warehouse
  static getMaterials(): Material[] {
    return readStorage<Material[]>(STORAGE_KEYS.MATERIALS, defaultMaterials);
  }

  static saveMaterials(materials: Material[]): void {
    writeStorage(STORAGE_KEYS.MATERIALS, materials);
  }

  static getWarehouses(): Warehouse[] {
    return readStorage<Warehouse[]>(STORAGE_KEYS.WAREHOUSES, defaultWarehouses);
  }

  static getMovements(): MaterialMovement[] {
    return sortByNewestEntities(readStorage<MaterialMovement[]>(STORAGE_KEYS.MOVEMENTS, defaultMovements), 'created_at');
  }

  static saveMovements(movements: MaterialMovement[]): void {
    writeStorage(STORAGE_KEYS.MOVEMENTS, movements);
  }

  static saveMovement(movement: MaterialMovement): void {
    const list = this.getMovements();
    const idx = list.findIndex((m) => m.id === movement.id);
    const old = idx >= 0 ? list[idx] : null;
    if (idx >= 0) {
      list[idx] = { ...movement, updated_at: new Date().toISOString() };
    } else {
      list.unshift({ ...movement, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    this.saveMovements(list);
    this.logAudit(
      idx >= 0 ? 'ویرایش گردش مواد اولیه' : 'ثبت گردش مواد اولیه',
      'MATERIAL_MOVEMENT',
      movement.id,
      old,
      movement
    );
  }

  static deleteMovement(id: string): void {
    const list = this.getMovements();
    const target = list.find((m) => m.id === id);
    const filtered = list.filter((m) => m.id !== id);
    this.saveMovements(filtered);
    this.logAudit('حذف گردش مواد اولیه', 'MATERIAL_MOVEMENT', id, target, null);
  }

  // Employees & Staff Payroll
  static getEmployees(): Employee[] {
    return readStorage<Employee[]>(STORAGE_KEYS.EMPLOYEES, defaultEmployees);
  }

  static saveEmployees(employees: Employee[]): void {
    writeStorage(STORAGE_KEYS.EMPLOYEES, employees);
  }

  static saveEmployee(emp: Employee): void {
    const list = this.getEmployees();
    const idx = list.findIndex((e) => e.id === emp.id);
    const old = idx >= 0 ? list[idx] : null;
    if (idx >= 0) {
      list[idx] = { ...emp, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...emp, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    this.saveEmployees(list);
    this.logAudit(
      idx >= 0 ? 'ویرایش پرونده کارمند' : 'ثبت کارمند جدید',
      'EMPLOYEE',
      emp.id,
      old,
      emp,
      {
        entityTitle: emp.name,
        documentNumber: emp.code || emp.name,
      }
    );
  }

  static deleteEmployee(id: string): void {
    const list = this.getEmployees();
    const target = list.find((e) => e.id === id);
    const filtered = list.filter((e) => e.id !== id);
    this.saveEmployees(filtered);
    this.logAudit('حذف کارمند', 'EMPLOYEE', id, target, null, {
      entityTitle: target?.name,
      documentNumber: target?.code || target?.name,
    });
  }

  static generateEmployeeCode(): string {
    const employees = this.getEmployees();
    const numbers = employees
      .map((e) => {
        const match = e.code.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `EMP-${nextNum}`;
  }

  // Employee Transactions
  static getEmployeeTransactions(employeeId?: string): EmployeeTransaction[] {
    const txs = readStorage<EmployeeTransaction[]>(STORAGE_KEYS.EMPLOYEE_TXS, defaultEmployeeTxs);
    if (employeeId) {
      return txs.filter((t) => t.employee_id === employeeId);
    }
    return txs;
  }

  static saveEmployeeTransactions(txs: EmployeeTransaction[]): void {
    writeStorage(STORAGE_KEYS.EMPLOYEE_TXS, txs);
  }

  static addEmployeeTransaction(tx: Omit<EmployeeTransaction, 'id' | 'created_at'>): EmployeeTransaction {
    const txs = this.getEmployeeTransactions();
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === tx.employee_id);
    const empName = tx.employee_name || emp?.name || 'کارمند';

    const newTx: EmployeeTransaction = {
      ...tx,
      employee_name: empName,
      id: `emptx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    txs.unshift(newTx);
    this.saveEmployeeTransactions(txs);

    // Update Employee balance:
    // accrual (حقوق/طلب) -> adds to balance (+)
    // payment (واریز/پرداخت به کارمند) -> subtracts from balance (-)
    if (emp) {
      const delta = tx.type === 'accrual' ? tx.amount : -tx.amount;
      emp.balance = (emp.balance || 0) + delta;
      emp.updated_at = new Date().toISOString();
      this.saveEmployees(employees);
    }

    this.logAudit(
      tx.type === 'accrual' ? 'ثبت طلب / حقوق کارمند' : 'ثبت پرداخت وجه به کارمند',
      'EMPLOYEE_TX',
      newTx.id,
      null,
      newTx,
      {
        entityTitle: empName,
        documentNumber: empName,
      }
    );
    return newTx;
  }

  static deleteEmployeeTransaction(id: string): void {
    const txs = this.getEmployeeTransactions();
    const target = txs.find((t) => t.id === id);
    if (!target) return;

    // Reverse balance effect
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === target.employee_id);
    const empName = target.employee_name || emp?.name || 'کارمند';
    if (emp) {
      const delta = target.type === 'accrual' ? -target.amount : target.amount;
      emp.balance = (emp.balance || 0) + delta;
      this.saveEmployees(employees);
    }

    const filtered = txs.filter((t) => t.id !== id);
    this.saveEmployeeTransactions(filtered);
    this.logAudit('حذف تراکنش مالی کارمند', 'EMPLOYEE_TX', id, target, null, {
      entityTitle: empName,
      documentNumber: empName,
    });
  }

  static updateEmployeeTransaction(updatedTx: EmployeeTransaction): void {
    const txs = this.getEmployeeTransactions();
    const idx = txs.findIndex((t) => t.id === updatedTx.id);
    if (idx < 0) return;
    const oldTx = txs[idx];

    // Revert old effect and apply new effect on employee balance
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === updatedTx.employee_id);
    const empName = updatedTx.employee_name || emp?.name || 'کارمند';
    if (emp) {
      const oldDelta = oldTx.type === 'accrual' ? oldTx.amount : -oldTx.amount;
      const newDelta = updatedTx.type === 'accrual' ? updatedTx.amount : -updatedTx.amount;
      emp.balance = (emp.balance || 0) - oldDelta + newDelta;
      emp.updated_at = new Date().toISOString();
      this.saveEmployees(employees);
    }

    const savedTx: EmployeeTransaction = {
      ...updatedTx,
      employee_name: empName,
      updated_at: new Date().toISOString(),
    };
    txs[idx] = savedTx;
    this.saveEmployeeTransactions(txs);
    this.logAudit('ویرایش تراکنش مالی کارمند', 'EMPLOYEE_TX', updatedTx.id, oldTx, savedTx, {
      entityTitle: empName,
      documentNumber: empName,
    });
  }

  // Employee Leaves (مرخصی‌های پرسنل)
  static getEmployeeLeaves(employeeId?: string): EmployeeLeave[] {
    const leaves = readStorage<EmployeeLeave[]>(STORAGE_KEYS.EMPLOYEE_LEAVES, defaultEmployeeLeaves);
    if (employeeId) {
      return leaves.filter((l) => l.employee_id === employeeId);
    }
    return leaves;
  }

  static saveEmployeeLeaves(leaves: EmployeeLeave[]): void {
    writeStorage(STORAGE_KEYS.EMPLOYEE_LEAVES, leaves);
  }

  static saveEmployeeLeave(leave: EmployeeLeave): EmployeeLeave {
    const leaves = this.getEmployeeLeaves();
    const idx = leaves.findIndex((l) => l.id === leave.id);
    const old = idx >= 0 ? leaves[idx] : null;

    let employeeName = leave.employee_name;
    if (!employeeName && leave.employee_id) {
      const emp = this.getEmployees().find((e) => e.id === leave.employee_id);
      if (emp) employeeName = emp.name;
    }
    const finalEmpName = employeeName || leave.employee_name || 'کارمند';

    const saved: EmployeeLeave = {
      ...leave,
      employee_name: finalEmpName,
      id: leave.id || `leave-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: leave.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (idx >= 0) {
      leaves[idx] = saved;
    } else {
      leaves.unshift(saved);
    }
    this.saveEmployeeLeaves(leaves);
    this.logAudit(
      idx >= 0 ? 'ویرایش مرخصی کارمند' : 'ثبت مرخصی کارمند',
      'EMPLOYEE_LEAVE',
      saved.id,
      old,
      saved,
      {
        entityTitle: finalEmpName,
        documentNumber: finalEmpName,
      }
    );
    return saved;
  }

  static deleteEmployeeLeave(id: string): void {
    const leaves = this.getEmployeeLeaves();
    const target = leaves.find((l) => l.id === id);
    const filtered = leaves.filter((l) => l.id !== id);
    this.saveEmployeeLeaves(filtered);

    let empName = target?.employee_name;
    if (!empName && target?.employee_id) {
      const emp = this.getEmployees().find((e) => e.id === target.employee_id);
      if (emp) empName = emp.name;
    }

    this.logAudit('حذف مرخصی کارمند', 'EMPLOYEE_LEAVE', id, target, null, {
      entityTitle: empName || undefined,
      documentNumber: empName || undefined,
    });
  }

  // Employment Periods & Contracts (سوابق همکاری، شروع و پایان کار)
  static getEmploymentPeriods(employeeId?: string): EmploymentPeriod[] {
    const list = readStorage<EmploymentPeriod[]>(STORAGE_KEYS.EMPLOYMENT_PERIODS, defaultEmploymentPeriods);
    if (employeeId) {
      return list.filter((p) => p.employee_id === employeeId);
    }
    return list;
  }

  static saveEmploymentPeriods(periods: EmploymentPeriod[]): void {
    writeStorage(STORAGE_KEYS.EMPLOYMENT_PERIODS, periods);
  }

  static saveEmploymentPeriod(period: EmploymentPeriod): EmploymentPeriod {
    const list = this.getEmploymentPeriods();
    const idx = list.findIndex((p) => p.id === period.id);
    const old = idx >= 0 ? list[idx] : null;
    const saved: EmploymentPeriod = {
      ...period,
      id: period.id || `period-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: period.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (idx >= 0) {
      list[idx] = saved;
    } else {
      list.unshift(saved);
    }
    this.saveEmploymentPeriods(list);

    // Sync employee status if this period dictates active/inactive
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === saved.employee_id);
    if (emp) {
      // Check if employee has any active period
      const empPeriods = list.filter((p) => p.employee_id === emp.id);
      const hasActivePeriod = empPeriods.some((p) => p.status === 'active' && !p.end_date);
      const newStatus = hasActivePeriod ? 'active' : 'inactive';
      if (emp.status !== newStatus) {
        emp.status = newStatus;
        emp.updated_at = new Date().toISOString();
        this.saveEmployees(employees);
      }
    }

    this.logAudit(
      idx >= 0 ? 'ویرایش دوره همکاری کارمند' : 'ثبت دوره همکاری / شروع کار جدید',
      'EMPLOYMENT_PERIOD',
      saved.id,
      old,
      saved
    );
    return saved;
  }

  static deleteEmploymentPeriod(id: string): void {
    const list = this.getEmploymentPeriods();
    const target = list.find((p) => p.id === id);
    const filtered = list.filter((p) => p.id !== id);
    this.saveEmploymentPeriods(filtered);
    this.logAudit('حذف دوره همکاری کارمند', 'EMPLOYMENT_PERIOD', id, target, null);
  }

  // End an employee's active period and set status to inactive
  static endEmploymentPeriod(employeeId: string, endDate: string, reason?: any, notes?: string): void {
    const list = this.getEmploymentPeriods();
    let updated = false;
    list.forEach((p) => {
      if (p.employee_id === employeeId && p.status === 'active') {
        p.status = 'completed';
        p.end_date = endDate;
        if (reason) p.reason_for_leaving = reason;
        if (notes) p.notes = notes;
        p.updated_at = new Date().toISOString();
        updated = true;
      }
    });

    if (updated) {
      this.saveEmploymentPeriods(list);
    }

    // Set employee status to inactive
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === employeeId);
    if (emp && emp.status !== 'inactive') {
      emp.status = 'inactive';
      emp.updated_at = new Date().toISOString();
      this.saveEmployees(employees);
    }
  }

  // Start a new employment period and set status to active
  static startNewEmploymentPeriod(
    employeeId: string,
    startDate: string,
    contractType?: any,
    position?: string,
    notes?: string
  ): EmploymentPeriod {
    const employees = this.getEmployees();
    const emp = employees.find((e) => e.id === employeeId);

    const newPeriod: EmploymentPeriod = {
      id: `period-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      employee_id: employeeId,
      employee_name: emp ? emp.name : undefined,
      start_date: startDate,
      contract_type: contractType || 'قراردادی',
      position: position || (emp ? emp.position : undefined),
      notes: notes || 'شروع دوره جدید همکاری',
      status: 'active',
      created_at: new Date().toISOString(),
    };

    this.saveEmploymentPeriod(newPeriod);

    // Ensure employee status is active
    if (emp && emp.status !== 'active') {
      emp.status = 'active';
      if (position) emp.position = position;
      emp.updated_at = new Date().toISOString();
      this.saveEmployees(employees);
    }

    return newPeriod;
  }

  // Expenses
  static getExpenses(): Expense[] {
    return sortByNewestEntities(readStorage<Expense[]>(STORAGE_KEYS.EXPENSES, defaultExpenses), 'date');
  }

  static saveExpenses(expenses: Expense[]): void {
    writeStorage(STORAGE_KEYS.EXPENSES, expenses);
  }

  static saveExpense(exp: Expense): void {
    const list = this.getExpenses();
    const idx = list.findIndex((e) => e.id === exp.id);
    const old = idx >= 0 ? list[idx] : null;
    if (idx >= 0) {
      list[idx] = { ...exp, updated_at: new Date().toISOString() };
    } else {
      list.unshift({ ...exp, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
    this.saveExpenses(list);
    this.logAudit(idx >= 0 ? 'ویرایش هزینه' : 'ثبت هزینه جدید', 'EXPENSE', exp.id, old, exp);
  }

  static deleteExpense(id: string): void {
    const list = this.getExpenses();
    const filtered = list.filter((e) => e.id !== id);
    this.saveExpenses(filtered);
    this.logAudit('حذف هزینه', 'EXPENSE', id);
  }

  static generateExpenseCode(): string {
    const expenses = this.getExpenses();
    const numbers = expenses
      .map((e) => {
        const match = e.code.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `EXP-${nextNum}`;
  }

  // Production Logs
  static getProductionLogs(): ProductionLog[] {
    const raw = readStorage<ProductionLog[]>(STORAGE_KEYS.PRODUCTION_LOGS, defaultProductionLogs);
    const valid = Array.isArray(raw) ? raw : defaultProductionLogs;
    return sortByNewestEntities(valid, 'production_date');
  }

  static saveProductionLogs(logs: ProductionLog[]): void {
    writeStorage(STORAGE_KEYS.PRODUCTION_LOGS, logs);
  }

  static saveProductionLog(log: ProductionLog): void {
    const list = this.getProductionLogs();
    const idx = list.findIndex((l) => l.id === log.id);
    const old = idx >= 0 ? list[idx] : null;
    if (idx >= 0) {
      list[idx] = log;
    } else {
      list.unshift({ ...log, created_at: new Date().toISOString() });
    }
    this.saveProductionLogs(list);
    this.logAudit(idx >= 0 ? 'ویرایش گزارش تولید' : 'ثبت گزارش شیفت تولید', 'PRODUCTION', log.id, old, log);
  }

  static deleteProductionLog(id: string): void {
    const list = this.getProductionLogs();
    const filtered = list.filter((l) => l.id !== id);
    this.saveProductionLogs(filtered);
    this.logAudit('حذف گزارش شیفت تولید', 'PRODUCTION', id);
  }

  static generateProductionCode(): string {
    const logs = this.getProductionLogs();
    const numbers = logs
      .map((l) => {
        const match = l.code.match(/\d+$/);
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `PRD-LOG-${nextNum}`;
  }

  static generateMovementCode(): string {
    const movements = this.getMovements();
    const numbers = movements
      .map((m) => {
        const match = m.code ? m.code.match(/\d+$/) : null;
        return match ? parseInt(match[0], 10) : 1000;
      })
      .filter((n) => !isNaN(n));
    const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1001;
    return `MOV-${nextNum}`;
  }

  // Confirm Order Workflow: Converts Order to Invoice & generates financial debit transaction
  static confirmOrderAndCreateInvoice(orderId: string): { order: Order; invoice: Invoice } | null {
    const orders = this.getOrders();
    const orderIdx = orders.findIndex((o) => o.id === orderId);
    if (orderIdx === -1) return null;

    const order = orders[orderIdx];
    const oldOrder = { ...order };

    // Update order status
    order.status = 'confirmed';
    order.updated_at = new Date().toISOString();
    this.saveOrders(orders);

    // Check if an invoice already exists for this order
    const invoices = this.getInvoices();
    let invoice = invoices.find((i) => i.order_id === order.id);

    if (invoice) {
      invoice.status = 'active';
      invoice.items = order.items.map((it) => ({
        id: it.id,
        invoice_id: invoice!.id,
        product_id: it.product_id,
        product_name: it.product_name,
        product_code: it.product_code,
        size: it.size,
        pressure: it.pressure,
        type: it.type,
        quantity_meters: it.quantity_meters,
        unit_price: it.unit_price,
        total_price: it.total_price,
        description: it.description,
      }));
      invoice.subtotal = order.subtotal;
      invoice.discount_enabled = order.discount_enabled;
      invoice.discount = order.discount;
      invoice.tax_enabled = order.tax_enabled;
      invoice.tax_percent = order.tax_percent;
      invoice.tax_amount = order.tax_amount;
      invoice.final_total = order.final_total;
      invoice.description = order.description;
      invoice.stamp_signature_enabled = order.stamp_signature_enabled;
      invoice.updated_at = new Date().toISOString();
    } else {
      const invNumber = this.generateInvoiceNumber();
      invoice = {
        id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        order_id: order.id,
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        customer_code: order.customer_code,
        customer_phone: order.customer_phone,
        customer_national_id: order.customer_national_id,
        customer_address: order.customer_address,
        invoice_number: invNumber,
        invoice_date: order.order_date || new Date().toISOString().split('T')[0],
        status: 'active',
        items: order.items.map((it) => ({
          id: `inv-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          invoice_id: '',
          product_id: it.product_id,
          product_name: it.product_name,
          product_code: it.product_code,
          size: it.size,
          pressure: it.pressure,
          type: it.type,
          quantity_meters: it.quantity_meters,
          unit_price: it.unit_price,
          total_price: it.total_price,
          description: it.description,
        })),
        subtotal: order.subtotal,
        discount_enabled: order.discount_enabled,
        discount: order.discount,
        tax_enabled: order.tax_enabled,
        tax_percent: order.tax_percent,
        tax_amount: order.tax_amount,
        final_total: order.final_total,
        notes_enabled: order.notes_enabled,
        description: order.description,
        stamp_signature_enabled: order.stamp_signature_enabled,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      invoice.items.forEach((item) => (item.invoice_id = invoice!.id));
      invoices.unshift(invoice);
    }
    this.saveInvoices(invoices);

    // Sync Customer Financial Ledger (Debit)
    const transactions = this.getTransactions();
    const existingTx = transactions.find((t) => t.reference_id === invoice!.id && t.type === 'invoice');
    if (existingTx) {
      existingTx.debit = invoice.final_total;
      existingTx.transaction_date = invoice.invoice_date;
      existingTx.updated_at = new Date().toISOString();
    } else {
      const newTx: CustomerTransaction = {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customer_id: invoice.customer_id,
        transaction_date: invoice.invoice_date,
        type: 'invoice',
        debit: invoice.final_total,
        credit: 0,
        description: `صدور فاکتور فروش شماره ${invoice.invoice_number} (سفارش ${order.order_number})`,
        reference_type: 'invoice',
        reference_id: invoice.id,
        reference_number: invoice.invoice_number,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      transactions.push(newTx);
    }
    this.saveTransactions(transactions);

    this.logAudit('تایید سفارش و صدور فاکتور فروش', 'ORDER', order.id, oldOrder, {
      status: 'confirmed',
      invoice_number: invoice.invoice_number,
      final_total: invoice.final_total,
    });

    return { order, invoice };
  }

  // Cancel Order
  static cancelOrder(orderId: string, reason?: string): boolean {
    const orders = this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) return false;

    const old = { ...order };
    order.status = 'cancelled';
    order.description = (order.description ? `${order.description} | ` : '') + `علت لغو: ${reason || 'درخواست مشتری/مدیر'}`;
    order.updated_at = new Date().toISOString();
    this.saveOrders(orders);

    // If an active invoice exists, cancel it and void ledger
    const invoices = this.getInvoices();
    const invoice = invoices.find((i) => i.order_id === orderId);
    if (invoice && invoice.status === 'active') {
      invoice.status = 'cancelled';
      invoice.updated_at = new Date().toISOString();
      this.saveInvoices(invoices);

      // Void ledger transaction
      const transactions = this.getTransactions();
      const tx = transactions.find((t) => t.reference_id === invoice.id && t.type === 'invoice');
      if (tx) {
        // Add reversing credit transaction
        transactions.push({
          id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          customer_id: invoice.customer_id,
          transaction_date: new Date().toISOString().split('T')[0],
          type: 'invoice_cancel',
          debit: 0,
          credit: tx.debit,
          description: `ابطال فاکتور شماره ${invoice.invoice_number} به علت لغو سفارش ${order.order_number}`,
          reference_type: 'invoice',
          reference_id: invoice.id,
          reference_number: invoice.invoice_number,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        this.saveTransactions(transactions);
      }
    }

    this.logAudit('لغو سفارش', 'ORDER', order.id, old, order);
    return true;
  }

  // Users & Roles
  static getUsers(): User[] {
    const rawUsers = readStorage<User[]>(STORAGE_KEYS.USERS, defaultUsers);
    // Guarantee only the admin user and explicitly added custom users exist:
    // Filter out legacy dummy/demo users (usr-2, usr-3, usr-4)
    const validUsers = Array.isArray(rawUsers)
      ? rawUsers.filter((u) => u.id !== 'usr-2' && u.id !== 'usr-3' && u.id !== 'usr-4')
      : defaultUsers;
    const users = validUsers.length > 0 ? validUsers : defaultUsers;
    const allPermKeys = defaultPermissions.map((p) => p.key);

    return users.map((u, idx) => {
      let permissions = u.permissions;

      if (!Array.isArray(permissions)) {
        if (u.is_admin) {
          permissions = allPermKeys;
        } else {
          const role = defaultRoles.find((r) => r.id === u.role_id);
          permissions = role ? [...role.permissions] : ['orders.view', 'customers.view'];
        }
      }

      // Senior Admin status is determined strictly by having ALL permissions checked
      const hasAll = Array.isArray(permissions) && allPermKeys.length > 0 && allPermKeys.every((k) => permissions.includes(k));
      const is_admin = Boolean(hasAll);

      // Permanent immutable user code (e.g. USR-1001)
      const numCode = parseInt(u.id.replace(/\D/g, '') || String(idx + 1), 10);
      const user_code = u.user_code || `USR-${1000 + (isNaN(numCode) ? idx + 1 : numCode)}`;

      return {
        ...u,
        user_code,
        is_admin,
        permissions,
      };
    });
  }

  static saveUsers(users: User[]): void {
    writeStorage(STORAGE_KEYS.USERS, users);
    this.notifyUserChanged();
  }

  static saveUser(user: Partial<User> & { name: string; username: string }): User {
    const users = this.getUsers();
    const isNew = !user.id || !users.some((u) => u.id === user.id);
    const now = new Date().toISOString();
    const allPermKeys = defaultPermissions.map((p) => p.key);

    let targetUser: User;
    if (isNew) {
      const nextCodeNum = 1000 + users.length + 1;
      const userPerms = Array.isArray(user.permissions) ? [...user.permissions] : ['customers.view', 'orders.view'];
      const hasAll = allPermKeys.length > 0 && allPermKeys.every((k) => userPerms.includes(k));
      const is_admin = hasAll;

      targetUser = {
        id: user.id || `usr-${Date.now()}`,
        user_code: user.user_code || `USR-${nextCodeNum}`,
        name: user.name.trim(),
        username: user.username.trim().toLowerCase(),
        password: user.password || '123456',
        role_id: user.role_id || (is_admin ? 'role-admin' : 'role-sales'),
        role_name: user.role_name?.trim() || (is_admin ? 'مدیر ارشد سیستم' : 'کارشناس'),
        is_admin: Boolean(is_admin),
        is_active: user.is_active !== undefined ? user.is_active : true,
        permissions: is_admin ? allPermKeys : userPerms,
        created_at: now,
        updated_at: now,
      };
      users.push(targetUser);
      this.logAudit('تعریف کاربر جدید', 'USER', targetUser.id, undefined, {
        user_code: targetUser.user_code,
        name: targetUser.name,
        username: targetUser.username,
        role: targetUser.role_name,
      });
    } else {
      const index = users.findIndex((u) => u.id === user.id);
      const existing = users[index];
      const oldUser = { ...existing };

      // Strictly respect user permissions without forcing senior admin
      const userPerms = Array.isArray(user.permissions) ? [...user.permissions] : (existing.permissions || []);
      const hasAll = allPermKeys.length > 0 && allPermKeys.every((k) => userPerms.includes(k));
      const is_admin = hasAll;
      const finalPermissions = userPerms;

      targetUser = {
        ...existing,
        ...user,
        id: existing.id, // IMMUTABLE ID
        user_code: existing.user_code || user.user_code || `USR-${1000 + index + 1}`, // IMMUTABLE PERMANENT CODE
        name: user.name ? user.name.trim() : existing.name,
        username: user.username ? user.username.trim().toLowerCase() : existing.username,
        password: user.password !== undefined && user.password !== '' ? user.password : existing.password,
        role_id: is_admin ? 'role-admin' : (user.role_id === 'role-admin' ? 'role-custom' : (user.role_id || existing.role_id || 'role-sales')),
        role_name: user.role_name?.trim() || (is_admin ? 'مدیر ارشد سیستم' : (existing.role_name && existing.role_name !== 'مدیر ارشد سیستم' ? existing.role_name : 'کارشناس')),
        is_admin: Boolean(is_admin),
        is_active: user.is_active !== undefined ? user.is_active : existing.is_active,
        permissions: finalPermissions,
        updated_at: now,
      };
      users[index] = targetUser;
      this.logAudit('ویرایش اطلاعات کاربر', 'USER', targetUser.id, oldUser, {
        user_code: targetUser.user_code,
        name: targetUser.name,
        username: targetUser.username,
        role: targetUser.role_name,
        is_active: targetUser.is_active,
        permissions_count: targetUser.permissions?.length,
      });
    }

    this.saveUsers(users);
    this.notifyUserChanged();
    return targetUser;
  }

  static deleteUser(userId: string): { success: boolean; message: string } {
    if (userId === 'usr-1') {
      return { success: false, message: 'حساب کاربری مدیر ارشد سیستم غیرقابل حذف است.' };
    }
    const activeUser = this.getActiveUser();
    if (activeUser && activeUser.id === userId) {
      return { success: false, message: 'شما نمی‌توانید حساب کاربری که هم‌اکنون با آن وارد سیستم هستید را حذف نمایید.' };
    }
    const currentUsers = this.getUsers().filter((u) => u.id !== userId);
    writeStorage(STORAGE_KEYS.USERS, currentUsers.length > 0 ? currentUsers : defaultUsers);
    this.notifyUserChanged();
    this.logAudit('حذف حساب کاربر', 'USER', userId);
    return { success: true, message: 'حساب کاربری با موفقیت حذف گردید.' };
  }

  static setUserActive(userId: string, isActive: boolean): { success: boolean; message: string } {
    const users = this.getUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, message: 'کاربر مورد نظر یافت نشد.' };
    }

    const activeUser = this.getActiveUser();
    if (activeUser.id === userId && !isActive) {
      return { success: false, message: 'نمی‌توانید حساب کاربری جاری خود را غیرفعال کنید.' };
    }

    if (!isActive && user.is_admin) {
      const activeAdmins = users.filter((u) => u.is_admin && u.is_active && u.id !== userId);
      if (activeAdmins.length === 0) {
        return { success: false, message: 'امکان غیرفعال‌سازی تنها مدیر ارشد فعال سامانه وجود ندارد.' };
      }
    }

    const oldStatus = user.is_active;
    user.is_active = isActive;
    user.updated_at = new Date().toISOString();
    this.saveUsers(users);

    this.logAudit(
      isActive ? 'فعال‌سازی حساب کاربر' : 'غیرفعال‌سازی حساب کاربر',
      'USER',
      user.id,
      { is_active: oldStatus },
      { is_active: isActive },
      {
        entityTitle: user.name,
        documentNumber: user.username,
      }
    );

    return {
      success: true,
      message: `حساب کاربری «${user.name}» با موفقیت ${isActive ? 'فعال' : 'غیرفعال'} گردید. تمام اسناد، فاکتورها و سوابق این کاربر محفوظ باقی ماند.`,
    };
  }

  static getRoles(): Role[] {
    const stored = readStorage<Role[]>(STORAGE_KEYS.ROLES, defaultRoles);
    if (!Array.isArray(stored) || stored.length === 0) {
      writeStorage(STORAGE_KEYS.ROLES, defaultRoles);
      return defaultRoles;
    }
    const storedIds = new Set(stored.map((r) => r.id));
    const merged = [...stored];
    let changed = false;
    for (const dr of defaultRoles) {
      if (!storedIds.has(dr.id)) {
        merged.push(dr);
        changed = true;
      }
    }
    if (changed) {
      writeStorage(STORAGE_KEYS.ROLES, merged);
    }
    return merged;
  }

  static saveRoles(roles: Role[]): void {
    writeStorage(STORAGE_KEYS.ROLES, roles);
  }

  static getPermissions(): Permission[] {
    const stored = readStorage<Permission[]>(STORAGE_KEYS.PERMISSIONS, defaultPermissions);
    if (!Array.isArray(stored) || stored.length === 0) {
      writeStorage(STORAGE_KEYS.PERMISSIONS, defaultPermissions);
      return defaultPermissions;
    }
    // Ensure all default system permissions are always present
    const storedMap = new Map(stored.map((p) => [p.key, p]));
    const merged: Permission[] = [...stored];
    let changed = false;
    for (const dp of defaultPermissions) {
      if (!storedMap.has(dp.key)) {
        merged.push(dp);
        changed = true;
      }
    }
    if (changed) {
      writeStorage(STORAGE_KEYS.PERMISSIONS, merged);
    }
    return merged;
  }

  // Permissions & Access Control Evaluation
  static hasPermission(permissionKey: string, user?: User): boolean {
    const currentUser = user || this.getActiveUser();
    if (!currentUser) return false;

    // Inactive user has no permissions (except superadmin safety check)
    if (currentUser.is_active === false && currentUser.id !== 'usr-1' && currentUser.username !== 'admin') {
      return false;
    }

    // 1. ROOT IMMUNITY: If user is root super admin or has is_admin flag (all permissions)
    if (
      currentUser.id === 'usr-1' ||
      currentUser.username === 'admin' ||
      currentUser.is_admin === true
    ) {
      return true;
    }

    // 2. Check if user has all permissions
    const allPermKeys = defaultPermissions.map((p) => p.key);
    if (Array.isArray(currentUser.permissions) && allPermKeys.length > 0 && allPermKeys.every((k) => currentUser.permissions!.includes(k))) {
      return true;
    }

    // 3. Explicit User Permissions check (Defined array takes strict precedence)
    if (Array.isArray(currentUser.permissions)) {
      if (currentUser.permissions.includes('*') || currentUser.permissions.includes('all')) return true;
      return currentUser.permissions.includes(permissionKey);
    }

    // 4. Role-based permissions fallback
    const roles = this.getRoles();
    const userRole = roles.find((r) => r.id === currentUser.role_id);
    if (userRole && userRole.is_active !== false && Array.isArray(userRole.permissions)) {
      if (userRole.permissions.includes('*') || userRole.permissions.includes('all')) return true;
      return userRole.permissions.includes(permissionKey);
    }

    return false;
  }

  static canAccessTab(tabId: string, user?: User): boolean {
    const currentUser = user || this.getActiveUser();
    if (!currentUser) return false;

    // ROOT IMMUNITY: Root Super Admin can access every tab unconditionally
    if (
      currentUser.id === 'usr-1' ||
      currentUser.username === 'admin' ||
      currentUser.is_admin === true
    ) {
      return true;
    }

    if (currentUser.is_active === false) return false;

    // If permissions array is set and empty, block all tabs
    if (Array.isArray(currentUser.permissions) && currentUser.permissions.length === 0) {
      return false;
    }

    switch (tabId) {
      case 'dashboard':
        return (
          this.hasPermission('reports.view', currentUser) ||
          this.hasPermission('orders.view', currentUser) ||
          this.hasPermission('customers.view', currentUser) ||
          this.hasPermission('invoices.view', currentUser) ||
          this.hasPermission('warehouse.view', currentUser) ||
          this.hasPermission('production.view', currentUser) ||
          this.hasPermission('employees.view', currentUser) ||
          this.hasPermission('expenses.view', currentUser)
        );
      case 'new_order':
        return this.hasPermission('orders.create', currentUser);
      case 'orders':
        return this.hasPermission('orders.view', currentUser);
      case 'invoices':
        return this.hasPermission('invoices.view', currentUser);
      case 'deliveries':
        return this.hasPermission('deliveries.view', currentUser);
      case 'customers':
        return this.hasPermission('customers.view', currentUser);
      case 'products':
        return (
          this.hasPermission('warehouse.view', currentUser) ||
          this.hasPermission('orders.create', currentUser) ||
          this.hasPermission('orders.edit', currentUser) ||
          this.hasPermission('production.view', currentUser)
        );
      case 'payments':
        return (
          this.hasPermission('customers.payments', currentUser) ||
          this.hasPermission('customers.financial', currentUser)
        );
      case 'cheques':
        return (
          this.hasPermission('customers.cheques', currentUser) ||
          this.hasPermission('customers.financial', currentUser)
        );
      case 'adjustments':
        return (
          this.hasPermission('customers.adjustments', currentUser) ||
          this.hasPermission('customers.financial', currentUser)
        );
      case 'returns':
        return this.hasPermission('deliveries.returns', currentUser);
      case 'warehouse':
        return this.hasPermission('warehouse.view', currentUser);
      case 'production':
        return this.hasPermission('production.view', currentUser);
      case 'employees':
        return this.hasPermission('employees.view', currentUser);
      case 'expenses':
        return this.hasPermission('expenses.view', currentUser);
      case 'reports':
        return false;
      case 'settings':
      case 'users':
      case 'audit_logs':
        return (
          this.hasPermission('settings.general', currentUser) ||
          this.hasPermission('settings.users', currentUser) ||
          this.hasPermission('settings.backup', currentUser) ||
          this.hasPermission('settings.audit', currentUser)
        );
      default:
        return false;
    }
  }

  // Backup Reminder Status Check
  static isBackupReminderDismissedToday(): boolean {
    if (typeof window === 'undefined') return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    const dismissedDate = localStorage.getItem('pe_backup_reminder_dismissed_date');
    return dismissedDate === todayStr;
  }

  static dismissBackupReminderToday(): void {
    if (typeof window === 'undefined') return;
    const todayStr = new Date().toISOString().slice(0, 10);
    localStorage.setItem('pe_backup_reminder_dismissed_date', todayStr);
    window.dispatchEvent(new CustomEvent('polyethylene-backup-status-changed'));
  }

  static checkBackupReminder(): {
    isOverdue: boolean;
    daysSinceLastBackup: number;
    lastBackupDate: string | null;
    reminderDays: number;
    isEnabled: boolean;
    isDismissedToday: boolean;
  } {
    const settings = this.getSettings();
    const isEnabled = settings.backup_reminder_enabled !== false;
    const reminderDays = settings.backup_reminder_interval_days || 7;
    const lastBackup = settings.last_backup_date || null;
    const isDismissedToday = this.isBackupReminderDismissedToday();

    if (!lastBackup) {
      return {
        isOverdue: isEnabled,
        daysSinceLastBackup: 999,
        lastBackupDate: null,
        reminderDays,
        isEnabled,
        isDismissedToday,
      };
    }

    const lastTime = new Date(lastBackup).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.floor((nowTime - lastTime) / (1000 * 60 * 60 * 24));

    return {
      isOverdue: isEnabled && diffDays >= reminderDays,
      daysSinceLastBackup: Math.max(0, diffDays),
      lastBackupDate: lastBackup,
      reminderDays,
      isEnabled,
      isDismissedToday,
    };
  }

  static markBackupCompleted(): void {
    const settings = this.getSettings();
    settings.last_backup_date = new Date().toISOString();
    writeStorage(STORAGE_KEYS.SETTINGS, settings);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pe_backup_reminder_dismissed_date');
      window.dispatchEvent(new CustomEvent('polyethylene-backup-status-changed'));
    }
  }

  // Customer Account Balance Summary
  static getCustomerAccountSummary(customerId: string): CustomerAccountSummary {
    const customers = this.getCustomers() || [];
    const customer = customers.find((c) => c && c.id === customerId);
    const transactions = (this.getTransactions() || []).filter((t) => t && t.customer_id === customerId);

    const total_debit = transactions.reduce((sum, t) => sum + (Number(t?.debit) || 0), 0);
    const total_credit = transactions.reduce((sum, t) => sum + (Number(t?.credit) || 0), 0);
    const balance = total_debit - total_credit;

    let status: 'debit' | 'credit' | 'settled' = 'settled';
    if (balance > 0) status = 'debit';
    else if (balance < 0) status = 'credit';

    // Active invoices count
    const invoices = (this.getInvoices() || []).filter((i) => i && i.customer_id === customerId && i.status === 'active');
    
    // Calculate pending delivery meters for this customer
    // Total invoiced meters - total delivered meters
    const allDeliveries = (this.getDeliveries() || []).filter((d) => d && d.customer_id === customerId && d.status === 'delivered');
    let totalInvoicedMeters = 0;
    invoices.forEach((inv) => {
      ensureArray(inv?.items).forEach((item) => {
        totalInvoicedMeters += Number(item?.quantity_meters) || 0;
      });
    });

    let totalDeliveredMeters = 0;
    allDeliveries.forEach((del) => {
      ensureArray(del?.items).forEach((item) => {
        totalDeliveredMeters += Number(item?.quantity_meters) || 0;
      });
    });

    const pending_delivery_meters = Math.max(0, totalInvoicedMeters - totalDeliveredMeters);

    return {
      customer_id: customerId,
      customer_name: customer?.name || 'مشتری ناشناس',
      customer_code: customer?.code || '',
      total_debit,
      total_credit,
      balance,
      status,
      last_transaction_date: transactions.length > 0 ? transactions[transactions.length - 1]?.transaction_date : undefined,
      active_invoices_count: invoices.length,
      pending_delivery_meters,
    };
  }

  // Complete Export of Entire System (Backup)
  static exportFullBackup(): string {
    const backupData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      system_name: 'نرم‌افزار مدیریت فروش و تولید لوله پلی‌اتیلن',
      data: {
        customers: this.getCustomers(),
        products: this.getProducts(),
        orders: this.getOrders(),
        invoices: this.getInvoices(),
        transactions: this.getTransactions(),
        payments: this.getPayments(),
        cheques: this.getCheques(),
        adjustments: this.getAdjustments(),
        drivers: this.getDrivers(),
        vehicles: this.getVehicles(),
        deliveries: this.getDeliveries(),
        returns: this.getReturns(),
        materials: this.getMaterials(),
        warehouses: this.getWarehouses(),
        movements: this.getMovements(),
        employees: this.getEmployees(),
        employee_txs: this.getEmployeeTransactions(),
        employee_leaves: this.getEmployeeLeaves(),
        employment_periods: this.getEmploymentPeriods(),
        expenses: this.getExpenses(),
        production_logs: this.getProductionLogs(),
        users: this.getUsers(),
        roles: this.getRoles(),
        settings: this.getSettings(),
        audit_logs: this.getAuditLogs(),
      },
    };

    return JSON.stringify(backupData);
  }

  // Helper to extract Jalali Year from date string
  static extractJalaliYear(dateStr?: string | null): number {
    if (!dateStr) {
      const today = getTodayJalali();
      return parseInt(today.split('/')[0], 10) || 1404;
    }
    const clean = toEnglishDigits(String(dateStr)).trim();
    const match = clean.match(/(?:^|[^\d])(13\d\d|14\d\d)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const [jy] = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        return jy;
      }
    } catch {
      // fallback
    }
    return 1404;
  }

  // Get list of all available fiscal years present in data
  static getAvailableFiscalYears(): number[] {
    const yearsSet = new Set<number>();
    const today = getTodayJalali();
    const currentYear = parseInt(today.split('/')[0], 10) || 1404;
    yearsSet.add(currentYear);
    yearsSet.add(currentYear - 1);
    yearsSet.add(currentYear + 1);

    this.getInvoices().forEach((i) => {
      const y = this.extractJalaliYear(i.invoice_date || i.created_at);
      if (y >= 1390 && y <= 1450) yearsSet.add(y);
    });

    this.getOrders().forEach((o) => {
      const y = this.extractJalaliYear(o.order_date || o.created_at);
      if (y >= 1390 && y <= 1450) yearsSet.add(y);
    });

    this.getTransactions().forEach((t) => {
      const y = this.extractJalaliYear(t.transaction_date || t.created_at);
      if (y >= 1390 && y <= 1450) yearsSet.add(y);
    });

    this.getExpenses().forEach((e) => {
      const y = this.extractJalaliYear(e.expense_date || e.created_at);
      if (y >= 1390 && y <= 1450) yearsSet.add(y);
    });

    return Array.from(yearsSet).sort((a, b) => b - a);
  }

  // Get statistics for a specific fiscal year
  static getFiscalYearStats(fiscalYear: number) {
    const invoices = this.getInvoices().filter((i) => this.extractJalaliYear(i.invoice_date || i.created_at) === fiscalYear);
    const orders = this.getOrders().filter((o) => this.extractJalaliYear(o.order_date || o.created_at) === fiscalYear);
    const transactions = this.getTransactions().filter((t) => this.extractJalaliYear(t.transaction_date || t.created_at) === fiscalYear);
    const expenses = this.getExpenses().filter((e) => this.extractJalaliYear(e.expense_date || e.created_at) === fiscalYear);
    const productionLogs = this.getProductionLogs().filter((l) => this.extractJalaliYear(l.production_date || l.created_at) === fiscalYear);
    const totalSales = invoices.reduce((sum, inv) => sum + (inv.final_total || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    return {
      fiscalYear,
      invoicesCount: invoices.length,
      ordersCount: orders.length,
      transactionsCount: transactions.length,
      expensesCount: expenses.length,
      productionLogsCount: productionLogs.length,
      totalSales,
      totalExpenses,
    };
  }

  // Export annual fiscal year archive
  static exportAnnualBackup(fiscalYear: number): string {
    const invoices = this.getInvoices().filter((i) => this.extractJalaliYear(i.invoice_date || i.created_at) === fiscalYear);
    const orders = this.getOrders().filter((o) => this.extractJalaliYear(o.order_date || o.created_at) === fiscalYear);
    const transactions = this.getTransactions().filter((t) => this.extractJalaliYear(t.transaction_date || t.created_at) === fiscalYear);
    const payments = this.getPayments().filter((p) => this.extractJalaliYear(p.payment_date || p.created_at) === fiscalYear);
    const cheques = this.getCheques().filter((c) => this.extractJalaliYear(c.due_date || c.created_at) === fiscalYear);
    const expenses = this.getExpenses().filter((e) => this.extractJalaliYear(e.expense_date || e.created_at) === fiscalYear);
    const productionLogs = this.getProductionLogs().filter((l) => this.extractJalaliYear(l.production_date || l.created_at) === fiscalYear);
    const deliveries = this.getDeliveries().filter((d) => this.extractJalaliYear(d.delivery_date || d.created_at) === fiscalYear);
    const returns = this.getReturns().filter((r) => this.extractJalaliYear(r.return_date || r.created_at) === fiscalYear);

    const archiveData = {
      version: '1.0',
      type: 'ANNUAL_FISCAL_YEAR_ARCHIVE',
      fiscal_year: fiscalYear,
      exported_at: new Date().toISOString(),
      system_name: 'نرم‌افزار مدیریت فروش و تولید لوله پلی‌اتیلن البرز',
      statistics: this.getFiscalYearStats(fiscalYear),
      data: {
        fiscal_year: fiscalYear,
        customers: this.getCustomers(),
        products: this.getProducts(),
        orders,
        invoices,
        transactions,
        payments,
        cheques,
        expenses,
        production_logs: productionLogs,
        deliveries,
        returns,
        materials: this.getMaterials(),
        warehouses: this.getWarehouses(),
        employees: this.getEmployees(),
        settings: this.getSettings(),
        roles: this.getRoles(),
        users: this.getUsers(),
      },
    };

    return JSON.stringify(archiveData, null, 2);
  }


  // Standard SQL schemas for all 26 canonical database tables
  static getStandardSqlSchemas(): Record<string, string> {
    return {
      customers: `CREATE TABLE IF NOT EXISTS \`customers\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`code\` VARCHAR(64) NULL,
  \`name\` VARCHAR(255) NULL,
  \`national_id\` VARCHAR(64) NULL,
  \`phone\` VARCHAR(64) NULL,
  \`mobile\` VARCHAR(64) NULL,
  \`economic_code\` VARCHAR(64) NULL,
  \`address\` TEXT NULL,
  \`description\` TEXT NULL,
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`code\`),
  INDEX (\`name\`),
  INDEX (\`national_id\`),
  INDEX (\`phone\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      invoices: `CREATE TABLE IF NOT EXISTS \`invoices\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`order_id\` VARCHAR(64) NULL,
  \`customer_id\` VARCHAR(64) NULL,
  \`customer_name\` VARCHAR(255) NULL,
  \`customer_code\` VARCHAR(64) NULL,
  \`invoice_number\` VARCHAR(64) NULL,
  \`invoice_date\` VARCHAR(64) NULL,
  \`status\` VARCHAR(64) NULL,
  \`items\` LONGTEXT NULL,
  \`subtotal\` BIGINT NULL,
  \`discount_enabled\` TINYINT(1) DEFAULT 0,
  \`discount\` BIGINT DEFAULT 0,
  \`tax_enabled\` TINYINT(1) DEFAULT 0,
  \`tax_percent\` INT DEFAULT 0,
  \`tax_amount\` BIGINT DEFAULT 0,
  \`final_total\` BIGINT NULL,
  \`total_amount\` BIGINT NULL,
  \`description\` TEXT NULL,
  \`stamp_signature_enabled\` TINYINT(1) DEFAULT 1,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`invoice_number\`),
  INDEX (\`order_id\`),
  INDEX (\`customer_id\`),
  INDEX (\`invoice_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      orders: `CREATE TABLE IF NOT EXISTS \`orders\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`customer_id\` VARCHAR(64) NULL,
  \`customer_name\` VARCHAR(255) NULL,
  \`customer_code\` VARCHAR(64) NULL,
  \`order_number\` VARCHAR(64) NULL,
  \`order_date\` VARCHAR(64) NULL,
  \`status\` VARCHAR(64) NULL,
  \`items\` LONGTEXT NULL,
  \`subtotal\` BIGINT NULL,
  \`discount_enabled\` TINYINT(1) DEFAULT 0,
  \`discount\` BIGINT DEFAULT 0,
  \`tax_enabled\` TINYINT(1) DEFAULT 0,
  \`tax_percent\` INT DEFAULT 0,
  \`tax_amount\` BIGINT DEFAULT 0,
  \`final_total\` BIGINT NULL,
  \`total_amount\` BIGINT NULL,
  \`description\` TEXT NULL,
  \`stamp_signature_enabled\` TINYINT(1) DEFAULT 1,
  \`created_at_fa\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`order_number\`),
  INDEX (\`customer_id\`),
  INDEX (\`status\`),
  INDEX (\`order_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      transactions: `CREATE TABLE IF NOT EXISTS \`transactions\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`customer_id\` VARCHAR(64) NULL,
  \`transaction_date\` VARCHAR(64) NULL,
  \`date\` VARCHAR(64) NULL,
  \`type\` VARCHAR(64) NULL,
  \`debit\` BIGINT DEFAULT 0,
  \`credit\` BIGINT DEFAULT 0,
  \`amount\` BIGINT DEFAULT 0,
  \`description\` TEXT NULL,
  \`reference_type\` VARCHAR(64) NULL,
  \`reference_id\` VARCHAR(64) NULL,
  \`reference_number\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`customer_id\`),
  INDEX (\`transaction_date\`),
  INDEX (\`type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      payments: `CREATE TABLE IF NOT EXISTS \`payments\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`customer_id\` VARCHAR(64) NULL,
  \`customer_name\` VARCHAR(255) NULL,
  \`customer_code\` VARCHAR(64) NULL,
  \`payment_date\` VARCHAR(64) NULL,
  \`date\` VARCHAR(64) NULL,
  \`amount\` BIGINT DEFAULT 0,
  \`payment_method\` VARCHAR(64) NULL,
  \`description\` TEXT NULL,
  \`created_by\` VARCHAR(64) NULL,
  \`status\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`customer_id\`),
  INDEX (\`payment_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      cheques: `CREATE TABLE IF NOT EXISTS \`cheques\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`payment_id\` VARCHAR(64) NULL,
  \`customer_id\` VARCHAR(64) NULL,
  \`customer_name\` VARCHAR(255) NULL,
  \`customer_code\` VARCHAR(64) NULL,
  \`cheque_number\` VARCHAR(64) NULL,
  \`bank_name\` VARCHAR(128) NULL,
  \`branch\` VARCHAR(128) NULL,
  \`due_date\` VARCHAR(64) NULL,
  \`amount\` BIGINT DEFAULT 0,
  \`status\` VARCHAR(64) NULL,
  \`description\` TEXT NULL,
  \`created_by\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`cheque_number\`),
  INDEX (\`customer_id\`),
  INDEX (\`due_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      adjustments: `CREATE TABLE IF NOT EXISTS \`adjustments\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`customer_id\` VARCHAR(64) NULL,
  \`customer_name\` VARCHAR(255) NULL,
  \`adjustment_date\` VARCHAR(64) NULL,
  \`amount\` BIGINT DEFAULT 0,
  \`type\` VARCHAR(64) NULL,
  \`description\` TEXT NULL,
  \`created_by\` VARCHAR(64) NULL,
  \`status\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`customer_id\`),
  INDEX (\`adjustment_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      drivers: `CREATE TABLE IF NOT EXISTS \`drivers\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(255) NULL,
  \`phone\` VARCHAR(64) NULL,
  \`mobile\` VARCHAR(64) NULL,
  \`plate_number\` VARCHAR(64) NULL,
  \`vehicle_type\` VARCHAR(64) NULL,
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`name\`),
  INDEX (\`phone\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      vehicles: `CREATE TABLE IF NOT EXISTS \`vehicles\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`plate_number\` VARCHAR(64) NULL,
  \`plate\` VARCHAR(64) NULL,
  \`vehicle_type\` VARCHAR(64) NULL,
  \`driver_id\` VARCHAR(64) NULL,
  \`driver_name\` VARCHAR(255) NULL,
  \`driver_phone\` VARCHAR(64) NULL,
  \`description\` TEXT NULL,
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`plate_number\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      deliveries: `CREATE TABLE IF NOT EXISTS \`deliveries\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`customer_id\` VARCHAR(64) NULL,
  \`customer_name\` VARCHAR(255) NULL,
  \`customer_code\` VARCHAR(64) NULL,
  \`delivery_number\` VARCHAR(64) NULL,
  \`doc_number\` VARCHAR(64) NULL,
  \`delivery_date\` VARCHAR(64) NULL,
  \`date\` VARCHAR(64) NULL,
  \`order_id\` VARCHAR(64) NULL,
  \`driver_id\` VARCHAR(64) NULL,
  \`driver_name\` VARCHAR(255) NULL,
  \`driver_phone\` VARCHAR(64) NULL,
  \`vehicle_plate\` VARCHAR(64) NULL,
  \`vehicle_type\` VARCHAR(64) NULL,
  \`status\` VARCHAR(64) NULL,
  \`items\` LONGTEXT NULL,
  \`total_meters\` DOUBLE DEFAULT 0,
  \`description\` TEXT NULL,
  \`created_by\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`delivery_number\`),
  INDEX (\`customer_id\`),
  INDEX (\`delivery_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      returns: `CREATE TABLE IF NOT EXISTS \`returns\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`customer_id\` VARCHAR(64) NULL,
  \`customer_name\` VARCHAR(255) NULL,
  \`customer_code\` VARCHAR(64) NULL,
  \`return_number\` VARCHAR(64) NULL,
  \`doc_number\` VARCHAR(64) NULL,
  \`return_date\` VARCHAR(64) NULL,
  \`date\` VARCHAR(64) NULL,
  \`status\` VARCHAR(64) NULL,
  \`reason\` TEXT NULL,
  \`items\` LONGTEXT NULL,
  \`total_meters\` DOUBLE DEFAULT 0,
  \`total_amount\` BIGINT DEFAULT 0,
  \`description\` TEXT NULL,
  \`created_by\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`return_number\`),
  INDEX (\`customer_id\`),
  INDEX (\`return_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      materials: `CREATE TABLE IF NOT EXISTS \`materials\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(255) NULL,
  \`code\` VARCHAR(64) NULL,
  \`category\` VARCHAR(64) NULL,
  \`unit\` VARCHAR(64) NULL,
  \`current_stock\` DOUBLE DEFAULT 0,
  \`min_stock_alert\` DOUBLE DEFAULT 0,
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`code\`),
  INDEX (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      warehouses: `CREATE TABLE IF NOT EXISTS \`warehouses\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(255) NULL,
  \`code\` VARCHAR(64) NULL,
  \`location\` TEXT NULL,
  \`manager_name\` VARCHAR(255) NULL,
  \`phone\` VARCHAR(64) NULL,
  \`description\` TEXT NULL,
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`code\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      movements: `CREATE TABLE IF NOT EXISTS \`movements\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`code\` VARCHAR(64) NULL,
  \`material_id\` VARCHAR(64) NULL,
  \`material_name\` VARCHAR(255) NULL,
  \`material_code\` VARCHAR(64) NULL,
  \`warehouse_id\` VARCHAR(64) NULL,
  \`warehouse_name\` VARCHAR(255) NULL,
  \`type\` VARCHAR(64) NULL,
  \`quantity\` DOUBLE DEFAULT 0,
  \`bags_count\` INT DEFAULT 0,
  \`driver_name\` VARCHAR(255) NULL,
  \`driver_phone\` VARCHAR(64) NULL,
  \`reference_type\` VARCHAR(64) NULL,
  \`date\` VARCHAR(64) NULL,
  \`created_by\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`material_id\`),
  INDEX (\`type\`),
  INDEX (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      employees: `CREATE TABLE IF NOT EXISTS \`employees\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`code\` VARCHAR(64) NULL,
  \`name\` VARCHAR(255) NULL,
  \`full_name\` VARCHAR(255) NULL,
  \`national_id\` VARCHAR(64) NULL,
  \`phone1\` VARCHAR(64) NULL,
  \`phone2\` VARCHAR(64) NULL,
  \`address\` TEXT NULL,
  \`position\` VARCHAR(128) NULL,
  \`salary_base\` BIGINT DEFAULT 0,
  \`balance\` BIGINT DEFAULT 0,
  \`status\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`code\`),
  INDEX (\`name\`),
  INDEX (\`national_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      employee_txs: `CREATE TABLE IF NOT EXISTS \`employee_txs\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`employee_id\` VARCHAR(64) NULL,
  \`employee_name\` VARCHAR(255) NULL,
  \`employee_code\` VARCHAR(64) NULL,
  \`date\` VARCHAR(64) NULL,
  \`type\` VARCHAR(64) NULL,
  \`amount\` BIGINT DEFAULT 0,
  \`payment_method\` VARCHAR(64) NULL,
  \`reference_number\` VARCHAR(64) NULL,
  \`description\` TEXT NULL,
  \`created_by\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`employee_id\`),
  INDEX (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      employee_leaves: `CREATE TABLE IF NOT EXISTS \`employee_leaves\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`employee_id\` VARCHAR(64) NULL,
  \`employee_name\` VARCHAR(255) NULL,
  \`employee_code\` VARCHAR(64) NULL,
  \`type\` VARCHAR(64) NULL,
  \`category\` VARCHAR(64) NULL,
  \`from_date\` VARCHAR(64) NULL,
  \`to_date\` VARCHAR(64) NULL,
  \`days_count\` INT DEFAULT 0,
  \`status\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`employee_id\`),
  INDEX (\`from_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      employment_periods: `CREATE TABLE IF NOT EXISTS \`employment_periods\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`employee_id\` VARCHAR(64) NULL,
  \`employee_name\` VARCHAR(255) NULL,
  \`start_date\` VARCHAR(64) NULL,
  \`end_date\` VARCHAR(64) NULL,
  \`contract_type\` VARCHAR(64) NULL,
  \`position\` VARCHAR(128) NULL,
  \`reason_for_leaving\` TEXT NULL,
  \`notes\` TEXT NULL,
  \`status\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`employee_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      expenses: `CREATE TABLE IF NOT EXISTS \`expenses\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`code\` VARCHAR(64) NULL,
  \`doc_number\` VARCHAR(64) NULL,
  \`title\` VARCHAR(255) NULL,
  \`category\` VARCHAR(64) NULL,
  \`amount\` BIGINT DEFAULT 0,
  \`expense_date\` VARCHAR(64) NULL,
  \`date\` VARCHAR(64) NULL,
  \`beneficiary\` VARCHAR(255) NULL,
  \`payment_method\` VARCHAR(64) NULL,
  \`description\` TEXT NULL,
  \`created_by\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`code\`),
  INDEX (\`category\`),
  INDEX (\`expense_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      production_logs: `CREATE TABLE IF NOT EXISTS \`production_logs\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`code\` VARCHAR(64) NULL,
  \`log_number\` VARCHAR(64) NULL,
  \`line_name\` VARCHAR(64) NULL,
  \`production_date\` VARCHAR(64) NULL,
  \`date\` VARCHAR(64) NULL,
  \`size\` VARCHAR(64) NULL,
  \`pressure\` VARCHAR(64) NULL,
  \`type\` VARCHAR(64) NULL,
  \`diameter\` VARCHAR(64) NULL,
  \`thickness\` VARCHAR(64) NULL,
  \`motor_speed\` VARCHAR(64) NULL,
  \`traction_speed\` VARCHAR(64) NULL,
  \`die_mold\` VARCHAR(64) NULL,
  \`pin_needle\` VARCHAR(64) NULL,
  \`weight_unit\` VARCHAR(64) NULL,
  \`meters\` DOUBLE DEFAULT 0,
  \`total_weight\` DOUBLE DEFAULT 0,
  \`customer_name\` VARCHAR(255) NULL,
  \`notes\` TEXT NULL,
  \`pipe_size\` VARCHAR(64) NULL,
  \`meters_produced\` DOUBLE DEFAULT 0,
  \`weight_kg\` DOUBLE DEFAULT 0,
  \`material_type\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`code\`),
  INDEX (\`production_date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      users: `CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`user_code\` VARCHAR(64) NULL,
  \`name\` VARCHAR(255) NULL,
  \`username\` VARCHAR(64) NULL,
  \`password\` VARCHAR(255) NULL,
  \`role_id\` VARCHAR(64) NULL,
  \`role_name\` VARCHAR(128) NULL,
  \`is_admin\` TINYINT(1) DEFAULT 0,
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`permissions\` LONGTEXT NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  UNIQUE INDEX (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      roles: `CREATE TABLE IF NOT EXISTS \`roles\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(255) NULL,
  \`description\` TEXT NULL,
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`permissions\` LONGTEXT NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      permissions: `CREATE TABLE IF NOT EXISTS \`permissions\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`name\` VARCHAR(255) NULL,
  \`key\` VARCHAR(128) NULL,
  \`perm_key\` VARCHAR(128) NULL,
  \`category\` VARCHAR(64) NULL,
  \`description\` TEXT NULL,
  \`data_json\` LONGTEXT NULL,
  \`updated_at\` VARCHAR(64) NULL,
  INDEX (\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      settings: `CREATE TABLE IF NOT EXISTS \`settings\` (
  \`id\` INT PRIMARY KEY DEFAULT 1,
  \`business_name\` VARCHAR(255) NULL,
  \`company_name\` VARCHAR(255) NULL,
  \`brand_subtitle\` VARCHAR(255) NULL,
  \`logo_url\` LONGTEXT NULL,
  \`stamp_signature_url\` LONGTEXT NULL,
  \`login_cover_url\` LONGTEXT NULL,
  \`login_background_url\` LONGTEXT NULL,
  \`phone\` VARCHAR(64) NULL,
  \`fax\` VARCHAR(64) NULL,
  \`email\` VARCHAR(128) NULL,
  \`economic_code\` VARCHAR(64) NULL,
  \`national_id\` VARCHAR(64) NULL,
  \`registration_number\` VARCHAR(64) NULL,
  \`postal_code\` VARCHAR(64) NULL,
  \`address\` TEXT NULL,
  \`default_tax_percent\` INT DEFAULT 0,
  \`default_tax_rate\` DOUBLE DEFAULT 0,
  \`default_order_notes_enabled\` TINYINT(1) DEFAULT 0,
  \`default_order_notes_text\` TEXT NULL,
  \`default_invoice_notes_enabled\` TINYINT(1) DEFAULT 0,
  \`default_invoice_notes_text\` TEXT NULL,
  \`default_delivery_notes_enabled\` TINYINT(1) DEFAULT 0,
  \`default_delivery_notes_text\` TEXT NULL,
  \`backup_reminder_enabled\` TINYINT(1) DEFAULT 1,
  \`backup_reminder_interval_days\` INT DEFAULT 7,
  \`last_backup_date\` VARCHAR(64) NULL,
  \`order_prefix\` VARCHAR(32) NULL,
  \`invoice_prefix\` VARCHAR(32) NULL,
  \`customer_prefix\` VARCHAR(32) NULL,
  \`product_prefix\` VARCHAR(32) NULL,
  \`delivery_prefix\` VARCHAR(32) NULL,
  \`return_prefix\` VARCHAR(32) NULL,
  \`material_prefix\` VARCHAR(32) NULL,
  \`currency_unit\` VARCHAR(32) NULL,
  \`print_invoice_header\` TINYINT(1) DEFAULT 1,
  \`print_invoice_footer_terms\` TINYINT(1) DEFAULT 1,
  \`default_invoice_notes\` TEXT NULL,
  \`print_invoice_signatures\` TINYINT(1) DEFAULT 1,
  \`timezone\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      audit_logs: `CREATE TABLE IF NOT EXISTS \`audit_logs\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`user_id\` VARCHAR(64) NULL,
  \`user_code\` VARCHAR(64) NULL,
  \`user_name\` VARCHAR(255) NULL,
  \`user_role\` VARCHAR(128) NULL,
  \`action\` VARCHAR(255) NULL,
  \`action_type\` VARCHAR(64) NULL,
  \`entity_type\` VARCHAR(64) NULL,
  \`entity_id\` VARCHAR(64) NULL,
  \`document_number\` VARCHAR(64) NULL,
  \`entity_title\` VARCHAR(255) NULL,
  \`old_values\` LONGTEXT NULL,
  \`new_values\` LONGTEXT NULL,
  \`ip_address\` VARCHAR(64) NULL,
  \`user_agent\` TEXT NULL,
  \`timestamp\` VARCHAR(64) NULL,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`created_at\`),
  INDEX (\`user_id\`),
  INDEX (\`action\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
      products: `CREATE TABLE IF NOT EXISTS \`products\` (
  \`id\` VARCHAR(64) PRIMARY KEY,
  \`code\` VARCHAR(64) NULL,
  \`name\` VARCHAR(255) NULL,
  \`size\` VARCHAR(64) NULL,
  \`size_mm\` INT NULL,
  \`pressure\` VARCHAR(64) NULL,
  \`type\` VARCHAR(64) NULL,
  \`pe_type\` VARCHAR(64) NULL,
  \`unit\` VARCHAR(64) NULL,
  \`unit_price\` BIGINT DEFAULT 0,
  \`weight_per_meter\` DOUBLE DEFAULT 0,
  \`stock_meters\` DOUBLE DEFAULT 0,
  \`description\` TEXT NULL,
  \`is_active\` TINYINT(1) DEFAULT 1,
  \`created_at\` VARCHAR(64) NULL,
  \`updated_at\` VARCHAR(64) NULL,
  \`data_json\` LONGTEXT NULL,
  INDEX (\`code\`),
  INDEX (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    };;
  }

  // Generate standard MySQL dump script
  static generateSqlDump(filteredFiscalYear?: number): string {
    const timestamp = new Date().toISOString();
    const settings = this.getSettings();
    const companyName = settings.company_name || 'شرکت کبیر لوله دره شهر';
    const fiscalNote = filteredFiscalYear ? `بایگانی سال مالی ${filteredFiscalYear}` : 'پشتیبان‌گیری جامع تمام سال‌ها';

    const escapeSql = (val: any): string => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
      if (typeof val === 'boolean') return val ? '1' : '0';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `'${str.replace(/[\0\x08\x09\x1a\n\r"'\\]/g, (char) => {
        switch (char) {
          case "\0": return "\\0";
          case "\x08": return "\\b";
          case "\x09": return "\\t";
          case "\x1a": return "\\z";
          case "\n": return "\\n";
          case "\r": return "\\r";
          case "'": return "\\'";
          case "\\": return "\\\\";
          default: return char;
        }
      })}'`;
    };

    let sql = `-- ====================================================================\n`;
    sql += `-- پایگاه داده رسمی: ${companyName}\n`;
    sql += `-- نوع پشتیبان: ${fiscalNote}\n`;
    sql += `-- زمان خروجی: ${timestamp}\n`;
    sql += `-- سازگار با: MySQL 5.7+ / MySQL 8.0+ / MariaDB / phpMyAdmin\n`;
    sql += `-- ====================================================================\n\n`;
    sql += `SET NAMES utf8mb4;\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    const tableSchemas: Record<string, string> = this.getStandardSqlSchemas();

    const targetDbTableName: Record<string, string> = {};

    const tables: Array<{ name: string; items: any[]; cols?: string[] }> = [
      { name: 'customers', items: this.getCustomers(), cols: ['id', 'code', 'name', 'national_id', 'phone', 'address', 'is_active', 'created_at', 'updated_at'] },
      { name: 'products', items: this.getProducts(), cols: ['id', 'code', 'name', 'size', 'pressure', 'type', 'unit', 'unit_price', 'weight_per_meter', 'stock_meters', 'description', 'is_active', 'created_at', 'updated_at'] },
      {
        name: 'invoices',
        items: filteredFiscalYear
          ? this.getInvoices().filter((i) => this.extractJalaliYear(i.invoice_date || i.created_at) === filteredFiscalYear)
          : this.getInvoices(),
        cols: ['id', 'order_id', 'customer_id', 'customer_name', 'customer_code', 'invoice_number', 'invoice_date', 'status', 'items', 'subtotal', 'discount_enabled', 'discount', 'tax_enabled', 'tax_percent', 'tax_amount', 'final_total', 'description', 'stamp_signature_enabled', 'created_at', 'updated_at'],
      },
      {
        name: 'orders',
        items: filteredFiscalYear
          ? this.getOrders().filter((o) => this.extractJalaliYear(o.order_date || o.created_at) === filteredFiscalYear)
          : this.getOrders(),
        cols: ['id', 'customer_id', 'customer_name', 'customer_code', 'order_number', 'order_date', 'status', 'items', 'subtotal', 'discount_enabled', 'discount', 'tax_enabled', 'tax_percent', 'tax_amount', 'final_total', 'description', 'stamp_signature_enabled', 'created_at', 'updated_at'],
      },
      {
        name: 'transactions',
        items: filteredFiscalYear
          ? this.getTransactions().filter((t) => this.extractJalaliYear(t.transaction_date || t.created_at) === filteredFiscalYear)
          : this.getTransactions(),
        cols: ['id', 'customer_id', 'transaction_date', 'type', 'debit', 'credit', 'description', 'reference_type', 'reference_id', 'reference_number', 'created_at', 'updated_at'],
      },
      {
        name: 'payments',
        items: filteredFiscalYear
          ? this.getPayments().filter((p) => this.extractJalaliYear(p.payment_date || p.created_at) === filteredFiscalYear)
          : this.getPayments(),
        cols: ['id', 'customer_id', 'customer_name', 'customer_code', 'payment_date', 'amount', 'payment_method', 'description', 'created_by', 'status', 'created_at', 'updated_at'],
      },
      {
        name: 'cheques',
        items: filteredFiscalYear
          ? this.getCheques().filter((c) => this.extractJalaliYear(c.due_date || c.created_at) === filteredFiscalYear)
          : this.getCheques(),
        cols: ['id', 'customer_id', 'customer_name', 'customer_code', 'cheque_number', 'bank_name', 'branch', 'due_date', 'amount', 'status', 'description', 'created_by', 'created_at', 'updated_at'],
      },
      {
        name: 'adjustments',
        items: filteredFiscalYear
          ? this.getAdjustments().filter((a: any) => this.extractJalaliYear(a.adjustment_date || a.created_at) === filteredFiscalYear)
          : this.getAdjustments(),
        cols: ['id', 'customer_id', 'customer_name', 'adjustment_date', 'amount', 'type', 'description', 'created_by', 'status', 'created_at', 'updated_at'],
      },
      { name: 'drivers', items: this.getDrivers(), cols: ['id', 'name', 'phone', 'plate_number', 'vehicle_type', 'is_active', 'created_at', 'updated_at'] },
      { name: 'vehicles', items: this.getVehicles(), cols: ['id', 'plate_number', 'vehicle_type', 'driver_id', 'driver_name', 'driver_phone', 'is_active', 'created_at', 'updated_at'] },
      {
        name: 'deliveries',
        items: filteredFiscalYear
          ? this.getDeliveries().filter((d) => this.extractJalaliYear(d.delivery_date || d.created_at) === filteredFiscalYear)
          : this.getDeliveries(),
        cols: ['id', 'customer_id', 'customer_name', 'customer_code', 'delivery_number', 'delivery_date', 'driver_id', 'driver_name', 'driver_phone', 'vehicle_plate', 'vehicle_type', 'status', 'items', 'total_meters', 'description', 'created_by', 'created_at', 'updated_at'],
      },
      {
        name: 'returns',
        items: filteredFiscalYear
          ? this.getReturns().filter((r) => this.extractJalaliYear(r.return_date || r.created_at) === filteredFiscalYear)
          : this.getReturns(),
        cols: ['id', 'customer_id', 'customer_name', 'customer_code', 'return_number', 'return_date', 'status', 'reason', 'description', 'items', 'total_meters', 'total_amount', 'created_by', 'created_at', 'updated_at'],
      },
      { name: 'materials', items: this.getMaterials(), cols: ['id', 'name', 'code', 'category', 'unit', 'current_stock', 'min_stock_alert', 'is_active', 'created_at', 'updated_at'] },
      { name: 'warehouses', items: this.getWarehouses(), cols: ['id', 'name', 'code', 'location', 'manager_name', 'phone', 'description', 'is_active', 'created_at', 'updated_at'] },
      {
        name: 'movements',
        items: filteredFiscalYear
          ? this.getMovements().filter((m: any) => this.extractJalaliYear(m.date || m.created_at) === filteredFiscalYear)
          : this.getMovements(),
        cols: ['id', 'code', 'material_id', 'material_name', 'material_code', 'warehouse_id', 'warehouse_name', 'type', 'quantity', 'bags_count', 'driver_name', 'driver_phone', 'reference_type', 'created_by', 'created_at', 'updated_at'],
      },
      { name: 'employees', items: this.getEmployees(), cols: ['id', 'code', 'name', 'national_id', 'phone1', 'phone2', 'address', 'position', 'salary_base', 'balance', 'status', 'created_at', 'updated_at'] },
      {
        name: 'employee_txs',
        items: filteredFiscalYear
          ? this.getEmployeeTransactions().filter((tx: any) => this.extractJalaliYear(tx.date || tx.created_at) === filteredFiscalYear)
          : this.getEmployeeTransactions(),
        cols: ['id', 'employee_id', 'employee_name', 'employee_code', 'date', 'type', 'amount', 'payment_method', 'reference_number', 'description', 'created_by', 'created_at', 'updated_at'],
      },
      { name: 'employee_leaves', items: this.getEmployeeLeaves(), cols: ['id', 'employee_id', 'employee_name', 'employee_code', 'type', 'category', 'from_date', 'to_date', 'days_count', 'status', 'created_at', 'updated_at'] },
      { name: 'employment_periods', items: this.getEmploymentPeriods(), cols: ['id', 'employee_id', 'employee_name', 'start_date', 'end_date', 'contract_type', 'position', 'reason_for_leaving', 'notes', 'status', 'created_at', 'updated_at'] },
      {
        name: 'expenses',
        items: filteredFiscalYear
          ? this.getExpenses().filter((e) => this.extractJalaliYear(e.expense_date || e.created_at) === filteredFiscalYear)
          : this.getExpenses(),
        cols: ['id', 'code', 'title', 'category', 'amount', 'expense_date', 'beneficiary', 'payment_method', 'description', 'created_by', 'created_at', 'updated_at'],
      },
      {
        name: 'production_logs',
        items: filteredFiscalYear
          ? this.getProductionLogs().filter((l) => this.extractJalaliYear(l.production_date || l.created_at) === filteredFiscalYear)
          : this.getProductionLogs(),
        cols: ['id', 'code', 'production_date', 'size', 'pressure', 'type', 'diameter', 'thickness', 'motor_speed', 'traction_speed', 'die_mold', 'pin_needle', 'weight_unit', 'meters', 'total_weight', 'customer_name', 'notes', 'created_at', 'pipe_size', 'meters_produced', 'weight_kg', 'material_type'],
      },
      { name: 'users', items: this.getUsers(), cols: ['id', 'user_code', 'name', 'username', 'password', 'role_id', 'role_name', 'is_admin', 'is_active', 'permissions', 'created_at', 'updated_at'] },
      { name: 'roles', items: this.getRoles(), cols: ['id', 'name', 'description', 'is_active', 'permissions', 'created_at', 'updated_at'] },
      { name: 'permissions', items: this.getPermissions(), cols: ['id', 'name', 'key', 'category', 'description'] },
      { name: 'settings', items: [this.getSettings()], cols: ['id', 'business_name', 'company_name', 'brand_subtitle', 'logo_url', 'stamp_signature_url', 'login_cover_url', 'login_background_url', 'phone', 'fax', 'email', 'economic_code', 'national_id', 'registration_number', 'postal_code', 'address', 'default_tax_percent', 'default_tax_rate', 'default_order_notes_enabled', 'default_order_notes_text', 'default_invoice_notes_enabled', 'default_invoice_notes_text', 'default_delivery_notes_enabled', 'default_delivery_notes_text', 'backup_reminder_enabled', 'backup_reminder_interval_days', 'last_backup_date', 'order_prefix', 'invoice_prefix', 'customer_prefix', 'product_prefix', 'delivery_prefix', 'return_prefix', 'material_prefix', 'currency_unit', 'print_invoice_header', 'print_invoice_footer_terms', 'default_invoice_notes', 'print_invoice_signatures', 'timezone', 'updated_at'] },
      { name: 'audit_logs', items: this.getAuditLogs(), cols: ['id', 'user_id', 'user_code', 'user_name', 'user_role', 'action', 'action_type', 'entity_type', 'entity_id', 'document_number', 'entity_title', 'old_values', 'new_values', 'ip_address', 'user_agent', 'created_at'] },
    ];

    tables.forEach(({ name, items, cols }) => {
      const dbTable = targetDbTableName[name] || name;
      const schemaKey = targetDbTableName[name] || name;
      sql += `-- -----------------------------------------------------\n`;
      sql += `-- پاک‌سازی و داده‌های جدول \`${dbTable}\` (تعداد رکورد: ${items ? items.length : 0})\n`;
      sql += `-- -----------------------------------------------------\n`;
      sql += `DELETE FROM \`${dbTable}\`;\n`;
      if (!items || items.length === 0) return;

      const effectiveCols = cols && cols.length > 0 ? cols : Object.keys(items[0] || {});
      const colHeadersStr = effectiveCols.map((c) => `\`${c}\``).join(', ');

      items.forEach((item) => {
        const valStrings = effectiveCols.map((colName) => {
          if (colName === 'id') {
            const idVal = name === 'settings' ? 1 : (item.id || `rec_${Math.random().toString(36).substring(2, 9)}`);
            return escapeSql(idVal);
          }
          let v = item[colName];
          if (v === undefined) v = null;
          return escapeSql(v);
        });
        sql += `REPLACE INTO \`${dbTable}\` (${colHeadersStr}) VALUES (${valStrings.join(', ')});\n`;
      });
      sql += `\n`;
    });

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sql += `-- اتمام ساخت نسخه پشتیبان SQL.\n`;
    return sql;
  }

  // Direct download of JSON Backup (Full or Annual)
  static downloadJsonBackup(fiscalYear?: number): void {
    if (typeof window === 'undefined') return;
    const jsonContent = fiscalYear ? this.exportAnnualBackup(fiscalYear) : this.exportFullBackup();
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = fiscalYear
      ? `AlborzPipe_FiscalYear_${fiscalYear}_Archive.json`
      : `AlborzPipe_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.markBackupCompleted();
  }

  // Direct download of SQL Backup (Attempts live MySQL dump from server first, fallback to client generator)
  static async downloadSqlBackup(fiscalYear?: number): Promise<void> {
    if (typeof window === 'undefined') return;

    // Try fetching live MySQL dump directly from the host if online and full backup
    if (!fiscalYear) {
      try {
        const url = this.getApiUrl(`api.php?action=backup_sql&_t=${Date.now()}`);
        const res = await fetch(url);
        if (res.ok) {
          const sqlText = await res.text();
          if (sqlText && (sqlText.includes('SET NAMES utf8mb4') || sqlText.includes('CREATE TABLE') || sqlText.includes('INSERT INTO'))) {
            const blob = new Blob([sqlText], { type: 'application/sql;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `AlborzPipe_MySQL_DirectDump_${new Date().toISOString().split('T')[0]}.sql`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            this.markBackupCompleted();
            return;
          }
        }
      } catch (err) {
        console.warn('Server SQL dump unavailable, using client generator', err);
      }
    }

    // Client-side fallback generator
    const sqlContent = this.generateSqlDump(fiscalYear);
    const blob = new Blob([sqlContent], { type: 'application/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = fiscalYear
      ? `AlborzPipe_FiscalYear_${fiscalYear}_Dump.sql`
      : `AlborzPipe_MySQL_FullDump_${new Date().toISOString().split('T')[0]}.sql`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.markBackupCompleted();
  }

  // Repair SQL script by ensuring all CREATE TABLE IF NOT EXISTS statements are included before data operations
  static repairSqlForPhpMyAdmin(sqlString: string): string {
    if (!sqlString || !sqlString.trim()) return '';

    const standardSchemas = typeof this?.getStandardSqlSchemas === 'function' 
      ? this.getStandardSqlSchemas() 
      : StorageService.getStandardSqlSchemas();

    let header = `-- ====================================================================\n`;
    header += `-- پایگاه‌داده البرز لوله - اسکریپت استاندارد اصلاح‌شده جهت Import در phpMyAdmin\n`;
    header += `-- این اسکریپت حاوی ساختار کامل کلیه جداول و داده‌های واقعی شماست و خطای 1146 یا ساختار ناقص نمی‌دهد\n`;
    header += `-- ====================================================================\n\n`;
    header += `SET NAMES utf8mb4;\n`;
    header += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // Add schemas of any table not yet created in the file
    let schemasBlock = `-- ساختار کلیه جداول سیستم جهت جلوگیری از خطای عدم وجود جدول\n`;
    for (const [table, schema] of Object.entries(standardSchemas)) {
      if (!sqlString.includes(`CREATE TABLE IF NOT EXISTS \`${table}\``) && !sqlString.includes(`CREATE TABLE \`${table}\``)) {
        schemasBlock += schema + `\n\n`;
      }
    }

    return header + schemasBlock + sqlString + `\n\nSET FOREIGN_KEY_CHECKS = 1;\n`;
  }

  // Restore SQL script directly into MySQL on the host and populate local memory
  static async restoreSqlBackup(sqlString: string): Promise<{ success: boolean; message: string; details?: string }> {
    if (!sqlString || !sqlString.trim()) {
      return { success: false, message: 'محتوای فایل SQL خالی است.' };
    }

    // 1. FIRST: Zero out database and browser cache completely before restore so no stale records mix in
    await this.resetToDefaultData();

    // 2. Auto-repair script with full schemas so execution never fails on missing tables
    const repairedSql = this.repairSqlForPhpMyAdmin(sqlString);

    // 3. Direct MySQL Host execution: Send repaired SQL to api.php?action=restore_sql
    let remoteSqlSuccess = false;
    let remoteSqlMsg = '';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const url = this.getApiUrl(`api.php?action=restore_sql&_t=${Date.now()}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: repairedSql,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          remoteSqlSuccess = true;
          remoteSqlMsg = json.message || '';
          if (json.revision) {
            lastKnownServerRevision = Number(json.revision);
          }
        }
      }
    } catch (err: any) {
      console.warn('Direct restore_sql execution via api.php was not reachable or timed out:', err);
    }

    // 4. Synchronize data:
    // If MySQL executed the restore, pull all records straight from MySQL into localStorage!
    if (remoteSqlSuccess) {
      await this.pullFromHost();
    } else {
      // Offline fallback: parse SQL directly into localStorage
      try {
        this.parseAndApplySqlDump(repairedSql);
        await this.pushToHost(true);
      } catch (parseErr: any) {
        console.error('Local SQL parsing error:', parseErr);
      }
    }

    const customersCount = this.getCustomers().length;
    const ordersCount = this.getOrders().length;
    const invoicesCount = this.getInvoices().length;
    const transactionsCount = this.getTransactions().length;
    const deliveriesCount = this.getDeliveries().length;
    const settings = this.getSettings();

    if (customersCount === 0 && ordersCount === 0 && invoicesCount === 0 && !remoteSqlSuccess) {
      return {
        success: false,
        message: 'خطا: هیچ داده معتبری از این فایل بازیابی نشد. لطفاً بررسی کنید فایل حاوی اطلاعات معتبر باشد.',
      };
    }

    this.logAudit('بازیابی پایگاه‌داده از فایل SQL', 'SYSTEM', 'RESTORE_SQL');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      window.dispatchEvent(new CustomEvent('polyethylene-settings-changed', { detail: settings }));
      window.dispatchEvent(new CustomEvent('user-permissions-changed'));
    }

    const detailsMsg = `تعداد ${customersCount} مشتری، ${ordersCount} سفارش، ${invoicesCount} فاکتور، ${transactionsCount} سند مالی و ${deliveriesCount} رسید تحویل با موفقیت بازیابی و تثبیت گردید.`;
    return {
      success: true,
      message: `بازیابی با موفقیت کامل انجام شد! ${detailsMsg}`,
      details: detailsMsg,
    };
  }

  // State-machine SQL statement splitter (comment-safe, quote-safe, escape-safe)
  static splitSqlStatements(rawSql: string): string[] {
    const queries: string[] = [];
    let currentQuery = '';
    let inString = false;
    let stringChar = '';
    let inLineComment = false;
    let inBlockComment = false;
    let isEscaped = false;
    const len = rawSql.length;

    for (let i = 0; i < len; i++) {
      const char = rawSql[i];
      const nextChar = i + 1 < len ? rawSql[i + 1] : '';

      if (inLineComment) {
        if (char === '\n' || char === '\r') {
          inLineComment = false;
        }
        currentQuery += char;
        continue;
      }

      if (inBlockComment) {
        if (char === '*' && nextChar === '/') {
          inBlockComment = false;
          currentQuery += '*/';
          i++;
          continue;
        }
        currentQuery += char;
        continue;
      }

      if (isEscaped) {
        currentQuery += char;
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        currentQuery += char;
        continue;
      }

      if (inString) {
        if (char === stringChar) {
          inString = false;
        }
        currentQuery += char;
        continue;
      }

      if (char === '-' && nextChar === '-') {
        inLineComment = true;
        currentQuery += char;
        continue;
      }
      if (char === '#') {
        inLineComment = true;
        currentQuery += char;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        inBlockComment = true;
        currentQuery += '/*';
        i++;
        continue;
      }

      if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
        currentQuery += char;
      } else if (char === ';') {
        const trimmed = currentQuery.trim();
        if (trimmed) queries.push(trimmed);
        currentQuery = '';
      } else {
        currentQuery += char;
      }
    }
    if (currentQuery.trim()) {
      queries.push(currentQuery.trim());
    }
    return queries;
  }

  // Extract all value tuples from a VALUES block (e.g. "(val1, val2), (val3, val4)")
  static parseSqlTuples(valuesBlock: string): string[][] {
    const rows: string[][] = [];
    let inTuple = false;
    let inString = false;
    let quoteChar = '';
    let isEscaped = false;
    let currentTuple: string[] = [];
    let currentVal = '';

    for (let i = 0; i < valuesBlock.length; i++) {
      const char = valuesBlock[i];

      if (isEscaped) {
        if (inTuple) currentVal += char;
        isEscaped = false;
        continue;
      }

      if (char === '\\') {
        isEscaped = true;
        if (inTuple) currentVal += char;
        continue;
      }

      if (inString) {
        if (char === quoteChar) {
          inString = false;
        }
        currentVal += char;
        continue;
      }

      if (char === "'" || char === '"') {
        inString = true;
        quoteChar = char;
        currentVal += char;
        continue;
      }

      if (!inTuple) {
        if (char === '(') {
          inTuple = true;
          currentTuple = [];
          currentVal = '';
        }
        continue;
      }

      // Inside tuple:
      if (char === ',') {
        currentTuple.push(currentVal.trim());
        currentVal = '';
      } else if (char === ')') {
        currentTuple.push(currentVal.trim());
        rows.push(currentTuple);
        inTuple = false;
        currentTuple = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }

    return rows;
  }

  // Parse SQL statement dump and update collections
  static parseAndApplySqlDump(sql: string): number {
    isRestoringFromRemote = true;
    let totalItems = 0;

    try {
      // Map MySQL table names to storage keys (including singular, plural, and custom variations)
      const tableMap: Record<string, keyof typeof STORAGE_KEYS> = {
        customers: 'CUSTOMERS',
        customer: 'CUSTOMERS',
        products: 'PRODUCTS',
        product: 'PRODUCTS',
        orders: 'ORDERS',
        order: 'ORDERS',
        invoices: 'INVOICES',
        invoice: 'INVOICES',
        transactions: 'TRANSACTIONS',
        customer_transactions: 'TRANSACTIONS',
        payments: 'PAYMENTS',
        payment: 'PAYMENTS',
        cheques: 'CHEQUES',
        cheque: 'CHEQUES',
        adjustments: 'ADJUSTMENTS',
        adjustment: 'ADJUSTMENTS',
        drivers: 'DRIVERS',
        driver: 'DRIVERS',
        vehicles: 'VEHICLES',
        vehicle: 'VEHICLES',
        deliveries: 'DELIVERIES',
        delivery: 'DELIVERIES',
        returns: 'RETURNS',
        return: 'RETURNS',
        materials: 'MATERIALS',
        material: 'MATERIALS',
        warehouses: 'WAREHOUSES',
        warehouse: 'WAREHOUSES',
        movements: 'MOVEMENTS',
        material_movements: 'MOVEMENTS',
        employees: 'EMPLOYEES',
        employee: 'EMPLOYEES',
        employee_txs: 'EMPLOYEE_TXS',
        employee_transactions: 'EMPLOYEE_TXS',
        employee_leaves: 'EMPLOYEE_LEAVES',
        employment_periods: 'EMPLOYMENT_PERIODS',
        expenses: 'EXPENSES',
        expense: 'EXPENSES',
        production_logs: 'PRODUCTION_LOGS',
        production_log: 'PRODUCTION_LOGS',
        users: 'USERS',
        user: 'USERS',
        roles: 'ROLES',
        role: 'ROLES',
        permissions: 'PERMISSIONS',
        permission: 'PERMISSIONS',
        settings: 'SETTINGS',
        setting: 'SETTINGS',
        system_settings: 'SETTINGS',
        system_setting: 'SETTINGS',
        company_settings: 'SETTINGS',
        company_setting: 'SETTINGS',
        pe_settings: 'SETTINGS',
        app_settings: 'SETTINGS',
        options: 'SETTINGS',
        configs: 'SETTINGS',
        configuration: 'SETTINGS',
        audit_logs: 'AUDIT_LOGS',
      };

      // Standard positional column order fallback for settings tables
      const defaultSettingsColumns = [
        'id',
        'business_name',
        'company_name',
        'brand_subtitle',
        'logo_url',
        'stamp_signature_url',
        'login_cover_url',
        'login_background_url',
        'phone',
        'fax',
        'email',
        'economic_code',
        'national_id',
        'registration_number',
        'postal_code',
        'address',
        'default_tax_percent',
        'default_tax_rate',
        'default_order_notes_enabled',
        'default_order_notes_text',
        'default_invoice_notes_enabled',
        'default_invoice_notes_text',
        'default_delivery_notes_enabled',
        'default_delivery_notes_text',
        'order_prefix',
        'invoice_prefix',
        'customer_prefix',
        'product_prefix',
        'delivery_prefix',
        'return_prefix',
        'material_prefix',
        'currency_unit'
      ];

      // Pre-extract table column definitions from CREATE TABLE statements in SQL
      const tableColumnDefinitions: Record<string, string[]> = {};
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[`"]?[a-zA-Z0-9_]+[`"]?\.)?[`"]?([a-zA-Z0-9_]+)[`"]?\s*\(([\s\S]*?)\)(?:[^;]*);/gi;
      let ctMatch;
      while ((ctMatch = createTableRegex.exec(sql)) !== null) {
        const ctTbl = ctMatch[1].toLowerCase();
        const ctBody = ctMatch[2];
        const lines = ctBody.split('\n');
        const colNames: string[] = [];
        for (const line of lines) {
          const colM = /^\s*[`"]([a-zA-Z0-9_]+)[`"]\s+/i.exec(line.trim());
          if (colM) {
            colNames.push(colM[1].toLowerCase());
          }
        }
        if (colNames.length > 0) {
          tableColumnDefinitions[ctTbl] = colNames;
        }
      }

      const extractedByTable: Record<string, any[]> = {};
      const statements = this.splitSqlStatements(sql);

      for (const rawStmt of statements) {
        // Strip leading comments
        const cleanStmt = rawStmt.replace(/^\s*(--[^\r\n]*|#[^\r\n]*|\/\*[\s\S]*?\*\/)\s*/g, '').trim();
        if (!cleanStmt) continue;

        // Check for UPDATE statements on settings
        const updateMatch = /^UPDATE\s+(?:[`"]?[a-zA-Z0-9_]+[`"]?\.)?[`"]?([a-zA-Z0-9_]+)[`"]?\s+SET\s+([\s\S]*?)(?:WHERE|;|$)/i.exec(cleanStmt);
        if (updateMatch) {
          const updTbl = updateMatch[1].toLowerCase();
          if (tableMap[updTbl] === 'SETTINGS') {
            const setClause = updateMatch[2];
            const updObj: Record<string, any> = {};
            const pairRegex = /[`"]?([a-zA-Z0-9_]+)[`"]?\s*=\s*(?:'((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"|([^,;]+))/g;
            let pMatch;
            while ((pMatch = pairRegex.exec(setClause)) !== null) {
              const col = pMatch[1].toLowerCase();
              let val = pMatch[2] !== undefined ? pMatch[2] : (pMatch[3] !== undefined ? pMatch[3] : pMatch[4].trim());
              if (val === 'NULL' || val === 'null') val = null;
              if (col === 'data_json') {
                const dec = safeParseJsonFromSql(val);
                if (dec && typeof dec === 'object') Object.assign(updObj, dec);
              } else {
                if (typeof val === 'string') {
                  val = val.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\r/g, '\r').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
                }
                updObj[col] = val;
              }
            }
            if (Object.keys(updObj).length > 0) {
              if (!extractedByTable[updTbl]) extractedByTable[updTbl] = [];
              extractedByTable[updTbl].push(updObj);
              totalItems++;
            }
          }
          continue;
        }

        // Match statement: (INSERT|REPLACE) INTO [db.]table [(columns)] VALUES valuesBlock
        const stmtMatch = /^(?:INSERT|REPLACE)\s+INTO\s+(?:[`"]?[a-zA-Z0-9_]+[`"]?\.)?[`"]?([a-zA-Z0-9_]+)[`"]?\s*(?:\(([^)]*)\))?\s*VALUES\s*([\s\S]*)$/i.exec(cleanStmt);
        if (!stmtMatch) continue;

        const tblName = stmtMatch[1].toLowerCase();
        const columnsStr = stmtMatch[2];
        const valuesBlock = stmtMatch[3];

        if (!tableMap[tblName]) continue;

        if (!extractedByTable[tblName]) {
          extractedByTable[tblName] = [];
        }

        // Check if there is an explicit columns definition or use scanned CREATE TABLE columns
        let columns: string[] = [];
        if (columnsStr && columnsStr.trim()) {
          columns = columnsStr.split(',').map((c) => c.replace(/[`"' \r\n\t]/g, '').toLowerCase());
        } else if (tableColumnDefinitions[tblName]) {
          columns = tableColumnDefinitions[tblName];
        }

        const isSettingsTable = tableMap[tblName] === 'SETTINGS';

        // Parse tuples safely
        const rows = this.parseSqlTuples(valuesBlock);
        for (const values of rows) {
          if (values.length === 0) continue;

          let rowObj: any = null;

          // 1. First priority: Check if any raw value is a JSON object (handles escaped quotes & control characters cleanly)
          for (const rawVal of values) {
            const parsedJson = safeParseJsonFromSql(rawVal);
            if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
              rowObj = parsedJson;
              break;
            }
          }

          const unquoted = values.map((v) => {
            if (v === 'NULL' || v === 'null') return null;
            if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
              const inner = v.slice(1, -1);
              return inner
                .replace(/\\'/g, "'")
                .replace(/\\"/g, '"')
                .replace(/\\r/g, '\r')
                .replace(/\\n/g, '\n')
                .replace(/\\\\/g, '\\');
            }
            if (!isNaN(Number(v)) && v !== '') {
              return Number(v);
            }
            return v;
          });

          // 2. If not found, check unquoted values
          if (!rowObj) {
            for (const val of unquoted) {
              const parsedJson = safeParseJsonFromSql(val);
              if (parsedJson && typeof parsedJson === 'object' && !Array.isArray(parsedJson)) {
                rowObj = parsedJson;
                break;
              }
            }
          }

          // 3. If not found from JSON, map columns if column names exist
          if (!rowObj && columns.length > 0) {
            rowObj = {};
            columns.forEach((col, idx) => {
              if (idx < unquoted.length) {
                let val = unquoted[idx];
                if (typeof val === 'string') {
                  const asJson = safeParseJsonFromSql(val);
                  if (asJson !== null) val = asJson;
                }
                rowObj[col] = val;
              }
            });
          }

          // 4. Fallback for Settings tables: handle Key-Value pairs or Positional Columns
          if (isSettingsTable && !rowObj) {
            if (unquoted.length === 2 && typeof unquoted[0] === 'string') {
              // Key - Value tuple (e.g. ('company_name', 'البرز پایپ'))
              rowObj = { [unquoted[0].toLowerCase()]: unquoted[1], key: unquoted[0], value: unquoted[1] };
            } else if (unquoted.length === 3 && typeof unquoted[1] === 'string') {
              // ID - Key - Value tuple (e.g. (1, 'company_name', 'البرز پایپ'))
              rowObj = { [unquoted[1].toLowerCase()]: unquoted[2], key: unquoted[1], value: unquoted[2] };
            } else if (unquoted.length > 3) {
              // Positional mapping
              rowObj = {};
              defaultSettingsColumns.forEach((col, idx) => {
                if (idx < unquoted.length && unquoted[idx] !== null && unquoted[idx] !== undefined) {
                  rowObj[col] = unquoted[idx];
                }
              });

              // Heuristic inspection: find phone, email, address, company name
              for (const item of unquoted) {
                if (typeof item === 'string') {
                  const str = item.trim();
                  if (str.includes('@') && !rowObj.email) {
                    rowObj.email = str;
                  } else if ((str.startsWith('021') || str.startsWith('۰۲۱') || str.startsWith('09') || str.startsWith('۰۹')) && !rowObj.phone) {
                    rowObj.phone = str;
                  } else if ((str.includes('تهران') || str.includes('خیابان') || str.includes('بلوار') || str.includes('شهرک صنعتی')) && !rowObj.address) {
                    rowObj.address = str;
                  } else if ((str.includes('شرکت') || str.includes('تولیدی') || str.includes('پلی‌اتیلن') || str.includes('پلی اتیلن') || str.includes('کارخانه')) && !rowObj.company_name) {
                    rowObj.company_name = str;
                    rowObj.business_name = str;
                  }
                }
              }
            }
          }

          if (rowObj && typeof rowObj === 'object') {
            if (rowObj.data_json) {
              const inner = safeParseJsonFromSql(rowObj.data_json);
              if (inner && typeof inner === 'object') {
                rowObj = { ...inner, ...rowObj };
                delete rowObj.data_json;
              }
            }
            extractedByTable[tblName].push(rowObj);
            totalItems++;
          }
        }
      }

      // If no valid items were found, NEVER wipe existing data!
      if (totalItems === 0) {
        console.warn('هیچ داده‌ای در فایل SQL شناسایی نشد. داده‌های موجود سیستم حفظ گردید.');
        return 0;
      }

      // Explicitly wipe existing business data arrays before applying backup records to avoid any duplication or conflicts
      const keysToWipe: Array<keyof typeof STORAGE_KEYS> = [
        'CUSTOMERS', 'PRODUCTS', 'ORDERS', 'INVOICES', 'TRANSACTIONS',
        'PAYMENTS', 'CHEQUES', 'ADJUSTMENTS', 'DRIVERS', 'VEHICLES',
        'DELIVERIES', 'RETURNS', 'MATERIALS', 'WAREHOUSES', 'MOVEMENTS',
        'EMPLOYEES', 'EMPLOYEE_TXS', 'EMPLOYEE_LEAVES', 'EMPLOYMENT_PERIODS',
        'EXPENSES', 'PRODUCTION_LOGS', 'AUDIT_LOGS'
      ];
      keysToWipe.forEach((k) => {
        writeStorage(STORAGE_KEYS[k], []);
      });

      // Write extracted entities
      let settingsExtracted = false;

      for (const [tblName, items] of Object.entries(extractedByTable)) {
        const storageKeyProp = tableMap[tblName];
        if (storageKeyProp && Array.isArray(items) && items.length > 0) {
          const cleanItems = items.map((it) => {
            if (it && it.data_json) {
              const inner = safeParseJsonFromSql(it.data_json);
              if (inner && typeof inner === 'object') {
                const merged = { ...inner, ...it };
                delete merged.data_json;
                return merged;
              }
            }
            return it;
          });

          if (storageKeyProp === 'SETTINGS') {
            const normSett = normalizeSettingsObject(cleanItems);
            writeStorage(STORAGE_KEYS.SETTINGS, normSett, true);
            settingsExtracted = true;
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('polyethylene-settings-changed', { detail: normSett }));
              window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
            }
          } else if (['orders', 'order', 'invoices', 'invoice', 'deliveries', 'delivery', 'returns', 'return'].includes(tblName)) {
            const safeList = cleanItems.map((entity: any) => normalizeEntityWithItems(entity));
            writeStorage(STORAGE_KEYS[storageKeyProp], safeList);
          } else {
            writeStorage(STORAGE_KEYS[storageKeyProp], cleanItems);
          }
        }
      }

      // If settings were not found in explicit tables, try extracting from SQL comments/headers
      if (!settingsExtracted) {
        const headerMatch = /--\s*(?:پایگاه\s*داده\s*رسمی|نام\s*شرکت|Company|Official\s*Database)\s*:\s*([^\r\n]+)/i.exec(sql);
        if (headerMatch && headerMatch[1].trim()) {
          const headerName = headerMatch[1].trim();
          const currentSett = this.getSettings();
          const updated = normalizeSettingsObject({ ...currentSett, company_name: headerName, business_name: headerName });
          writeStorage(STORAGE_KEYS.SETTINGS, updated, true);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('polyethylene-settings-changed', { detail: updated }));
            window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
          }
        }
      }

      clearLocalChangePending();
    } finally {
      isRestoringFromRemote = false;
    }

    return totalItems;
  }

  // Restore Complete System Backup with Multi-step Validation
  static async restoreFullBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      const data = (parsed && typeof parsed.data === 'object' && !Array.isArray(parsed.data)) ? parsed.data : parsed;
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'ساختار فایل پشتیبان نامعتبر است. شیء داده یافت نشد.' };
      }

      isRestoringFromRemote = true;
      try {
        // Pre-wipe existing entity arrays before writing restored dataset
        const keysToWipe: Array<keyof typeof STORAGE_KEYS> = [
          'CUSTOMERS', 'PRODUCTS', 'ORDERS', 'INVOICES', 'TRANSACTIONS',
          'PAYMENTS', 'CHEQUES', 'ADJUSTMENTS', 'DRIVERS', 'VEHICLES',
          'DELIVERIES', 'RETURNS', 'MATERIALS', 'WAREHOUSES', 'MOVEMENTS',
          'EMPLOYEES', 'EMPLOYEE_TXS', 'EMPLOYEE_LEAVES', 'EMPLOYMENT_PERIODS',
          'EXPENSES', 'PRODUCTION_LOGS', 'AUDIT_LOGS'
        ];
        keysToWipe.forEach((k) => {
          writeStorage(STORAGE_KEYS[k], []);
        });

        if (Array.isArray(data.customers)) writeStorage(STORAGE_KEYS.CUSTOMERS, data.customers);
        if (Array.isArray(data.products)) writeStorage(STORAGE_KEYS.PRODUCTS, data.products);
        if (Array.isArray(data.orders)) writeStorage(STORAGE_KEYS.ORDERS, data.orders.map((o: any) => normalizeEntityWithItems(o)));
        if (Array.isArray(data.invoices)) writeStorage(STORAGE_KEYS.INVOICES, data.invoices.map((i: any) => normalizeEntityWithItems(i)));
        if (Array.isArray(data.transactions)) writeStorage(STORAGE_KEYS.TRANSACTIONS, data.transactions);
        if (Array.isArray(data.payments)) writeStorage(STORAGE_KEYS.PAYMENTS, data.payments);
        if (Array.isArray(data.cheques)) writeStorage(STORAGE_KEYS.CHEQUES, data.cheques);
        if (Array.isArray(data.adjustments)) writeStorage(STORAGE_KEYS.ADJUSTMENTS, data.adjustments);
        if (Array.isArray(data.drivers)) writeStorage(STORAGE_KEYS.DRIVERS, data.drivers);
        if (Array.isArray(data.vehicles)) writeStorage(STORAGE_KEYS.VEHICLES, data.vehicles);
        if (Array.isArray(data.deliveries)) writeStorage(STORAGE_KEYS.DELIVERIES, data.deliveries.map((d: any) => normalizeEntityWithItems(d)));
        if (Array.isArray(data.returns)) writeStorage(STORAGE_KEYS.RETURNS, data.returns.map((r: any) => normalizeEntityWithItems(r)));
        if (Array.isArray(data.materials)) writeStorage(STORAGE_KEYS.MATERIALS, data.materials);
        if (Array.isArray(data.warehouses)) writeStorage(STORAGE_KEYS.WAREHOUSES, data.warehouses);
        if (Array.isArray(data.movements)) writeStorage(STORAGE_KEYS.MOVEMENTS, data.movements);
        if (Array.isArray(data.employees)) writeStorage(STORAGE_KEYS.EMPLOYEES, data.employees);

        const employeeTxs = data.employee_txs || data.employeeTxs;
        if (Array.isArray(employeeTxs)) writeStorage(STORAGE_KEYS.EMPLOYEE_TXS, employeeTxs);

        const employeeLeaves = data.employee_leaves || data.employeeLeaves;
        if (Array.isArray(employeeLeaves)) writeStorage(STORAGE_KEYS.EMPLOYEE_LEAVES, employeeLeaves);

        const employmentPeriods = data.employment_periods || data.employmentPeriods;
        if (Array.isArray(employmentPeriods)) writeStorage(STORAGE_KEYS.EMPLOYMENT_PERIODS, employmentPeriods);

        if (Array.isArray(data.expenses)) writeStorage(STORAGE_KEYS.EXPENSES, data.expenses);

        const productionLogs = data.production_logs || data.productionLogs;
        if (Array.isArray(productionLogs)) writeStorage(STORAGE_KEYS.PRODUCTION_LOGS, productionLogs);

        if (Array.isArray(data.users)) writeStorage(STORAGE_KEYS.USERS, data.users);
        if (Array.isArray(data.roles)) writeStorage(STORAGE_KEYS.ROLES, data.roles);
        
        // Extract settings flexibly from any possible structure
        const rawSettings =
          data.settings ||
          data.system_settings ||
          data.company_settings ||
          parsed.settings ||
          parsed.system_settings ||
          parsed.company_settings ||
          (data.business_name || data.company_name ? data : (parsed.business_name || parsed.company_name ? parsed : null));

        if (rawSettings) {
          const normSett = normalizeSettingsObject(rawSettings);
          writeStorage(STORAGE_KEYS.SETTINGS, normSett, true);
        }

        const auditLogs = data.audit_logs || data.auditLogs;
        if (Array.isArray(auditLogs)) writeStorage(STORAGE_KEYS.AUDIT_LOGS, auditLogs);
      } finally {
        isRestoringFromRemote = false;
      }

      this.logAudit('بازیابی کامل نسخه پشتیبان (Restore Backup)', 'SYSTEM', 'RESTORE');

      const settings = this.getSettings();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
        window.dispatchEvent(new CustomEvent('polyethylene-settings-changed', { detail: settings }));
      }

      // CRITICAL: Await committing to MySQL host so data is completely saved BEFORE finishing!
      const pushRes = await this.pushToHost(true);
      if (!pushRes.success) {
        return {
          success: false,
          message: `اطلاعات در حافظه موقت مرورگر بارگذاری شد، اما ثبت آن روی پایگاه‌داده MySQL هاست با خطا مواجه گردید:\n${pushRes.message}\nلطفاً مشخصات اتصال دیتابیس را در فایل db_config.php بررسی فرمایید.`,
        };
      }

      return { success: true, message: 'نسخه پشتیبان با موفقیت کامل بازیابی شد و در پایگاه‌داده MySQL هاست ثبت و تایید گردید.' };
    } catch (err: any) {
      return { success: false, message: `خطا در بازیابی پشتیبان: ${err?.message || 'فرمت نامعتبر'}` };
    }
  }

  // Helper to get correct API base path whether running at root or inside subfolder (e.g. /alborz/)
  static getApiUrl(path: string): string {
    if (typeof window === 'undefined') return path;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    // If running in subfolder like http://localhost/alborz/
    const pathname = window.location.pathname;
    const baseDir = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    return `${baseDir}${cleanPath}`;
  }

  // Check if Host PHP API & MySQL are reachable and return full diagnostic
  static async checkHostApi(): Promise<{
    available: boolean;
    online: boolean;
    engine?: 'mysql' | 'none';
    message?: string;
    error?: string;
    info?: any;
  }> {
    try {
      if (typeof window === 'undefined' || typeof fetch !== 'function') {
        return { available: false, online: false, message: 'محیط مرورگر در دسترس نیست' };
      }
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const url = this.getApiUrl(`api.php?action=status&_t=${Date.now()}`);
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      const rawText = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        const cleanErr = rawText.replace(/<[^>]+>/g, ' ').trim().substring(0, 150);
        return {
          available: false,
          online: false,
          error: cleanErr,
          message: cleanErr || `خطای سرور (کد ${res.status})`,
        };
      }

      if (!res.ok || !data.success) {
        return {
          available: true,
          online: false,
          engine: data?.engine || 'none',
          error: data?.error,
          message: data?.message || `عدم اتصال به دیتابیس (کد وضعیت: ${res.status})`,
          info: data,
        };
      }

      return {
        available: true,
        online: data.status === 'online',
        engine: data.engine,
        error: undefined,
        message: data.message,
        info: data,
      };
    } catch (err: any) {
      return {
        available: false,
        online: false,
        error: err?.message,
        message: 'عدم پاسخگویی فایل api.php در هاست (بررسی کنید فایل‌ها به درستی آپلود شده باشند)',
      };
    }
  }

  // Test MySQL connection with specified parameters on the host
  static async testDbConnection(config: { host: string; dbname: string; user: string; pass: string; port?: number }): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const url = this.getApiUrl(`api.php?action=test_db&_t=${Date.now()}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      return {
        success: !!data.success,
        message: data.message || (data.success ? 'ارتباط برقرار شد' : 'عدم برقراری ارتباط'),
        version: data.version,
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'عدم پاسخگویی سرور هاست: ' + (e?.message || ''),
      };
    }
  }

  // Save MySQL database configuration to host db_config.php and auto-migrate tables
  static async saveDbConfig(config: { host: string; dbname: string; user: string; pass: string; port?: number }): Promise<{ success: boolean; message: string }> {
    try {
      const url = this.getApiUrl(`api.php?action=save_db_config&_t=${Date.now()}`);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (data.success) {
        // Immediately push current local data to newly connected MySQL database!
        await this.pushToHost(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
        }
      }
      return {
        success: !!data.success,
        message: data.message || (data.success ? 'تنظیمات با موفقیت ذخیره شد.' : 'خطا در ذخیره تنظیمات'),
      };
    } catch (e: any) {
      return {
        success: false,
        message: 'عدم پاسخگویی سرور: ' + (e?.message || ''),
      };
    }
  }

  // Fast Single Entity direct upsert to MySQL database (sub-millisecond single record sync)
  static async saveSingleItem(table: string, item: any): Promise<{ success: boolean; message: string }> {
    if (!table || !item) return { success: false, message: 'اطلاعات ناقص است' };
    try {
      const url = this.getApiUrl(`api.php?action=save_item&_t=${Date.now()}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, item }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return { success: !!data.success, message: data.message || 'ثبت با موفقیت انجام شد.' };
      }
      return { success: false, message: 'خطا در ثبت مستقیم سرور' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'خطا در ارتباط با سرور' };
    }
  }

  // Fast Single Entity direct deletion from MySQL database
  static async deleteSingleItem(table: string, id: string): Promise<{ success: boolean; message: string }> {
    if (!table || !id) return { success: false, message: 'اطلاعات ناقص است' };
    try {
      const url = this.getApiUrl(`api.php?action=delete_item&_t=${Date.now()}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return { success: !!data.success, message: data.message || 'حذف با موفقیت انجام شد.' };
      }
      return { success: false, message: 'خطا در حذف از سرور' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'خطا در ارتباط با سرور' };
    }
  }

  // Push current full database to Host MySQL tables (with deduplication, queued re-push and dirty tracking)
  static async pushToHost(force = false): Promise<{ success: boolean; message: string }> {
    if (activePushPromise) {
      pushQueued = true;
      return activePushPromise;
    }

    activePushPromise = (async () => {
      let finalResult = { success: false, message: '' };
      let attempts = 0;

      while (attempts < 2) {
        attempts++;
        pushQueued = false;
        const snapshotTimestamp = Date.now();
        const fullJson = this.exportFullBackup();

        try {
          notifySyncListeners({
            ...currentSyncState,
            state: 'syncing',
            message: 'در حال ذخیره‌سازی اطلاعات در دیتابیس MySQL هاست...',
          });

          const actionName = force ? 'restore' : 'save';
          const url = this.getApiUrl(`api.php?action=${actionName}&_t=${Date.now()}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: fullJson,
            cache: 'no-store',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const rawText = await res.text();
          let data: any = null;
          try {
            data = JSON.parse(rawText);
          } catch (jsonErr) {
            const cleanErr = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            throw new Error(`پاسخ سرور نامعتبر بود: ${cleanErr.substring(0, 150)}`);
          }

          if (!res.ok) {
            throw new Error(data?.message || `پاسخ سرور ناموفق بود (کد وضعیت: ${res.status})`);
          }

          if (data && data.success === true) {
            if (data.revision) {
              lastKnownServerRevision = Number(data.revision);
            }

            clearLocalChangePending();
            const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            notifySyncListeners({
              state: 'synced',
              lastSyncedAt: timeStr,
              message: data.message || 'تمام اطلاعات در دیتابیس MySQL هاست ذخیره گردید.',
            });
            finalResult = { success: true, message: data.message || 'ذخیره در هاست انجام شد.' };

            if (pushQueued && attempts < 2) {
              await new Promise((r) => setTimeout(r, 800));
              continue;
            }
            break;
          } else {
            notifySyncListeners({
              state: 'error',
              lastSyncedAt: currentSyncState.lastSyncedAt,
              message: data?.message || 'خطا در ذخیره‌سازی در دیتابیس',
            });
            finalResult = { success: false, message: data?.message || 'خطا در ذخیره‌سازی در دیتابیس' };
            break;
          }
        } catch (err: any) {
          notifySyncListeners({
            state: 'offline',
            lastSyncedAt: currentSyncState.lastSyncedAt,
            message: 'عدم ارتباط با دیتابیس سرور - تغییرات در حافظه دستگاه نگهداری شد اما روی سرور مرکزی ثبت نگردید.',
          });
          finalResult = { success: false, message: 'عدم ارتباط با دیتابیس هاست: ' + (err?.message || '') };
          break;
        }
      }

      return finalResult;
    })().finally(() => {
      activePushPromise = null;
    });

    return activePushPromise;
  }

  // Apply server data directly to local storage without re-triggering save loop
  // Apply server data directly to local storage without re-triggering save loop
  static applyRemoteData(remoteData: any): { success: boolean; changed: boolean; message: string } {
    if (!remoteData || typeof remoteData !== 'object') {
      return { success: false, changed: false, message: 'داده‌های دریافتی از هاست نامعتبر است.' };
    }

    const DB_RESET_EPOCH_KEY = 'alborz_db_reset_epoch';
    const remoteResetEpoch = String(remoteData.reset_epoch || (remoteData.settings && remoteData.settings.reset_epoch) || '0');
    const localResetEpoch = typeof localStorage !== 'undefined' ? (localStorage.getItem(DB_RESET_EPOCH_KEY) || '0') : '0';

    // If server has a newer reset epoch, or if server was factory reset:
    // Wipe all stale local cache completely so other devices immediately reflect zero/clean state!
    const isServerReset = remoteResetEpoch !== '0' && remoteResetEpoch !== localResetEpoch;
    if (isServerReset && typeof localStorage !== 'undefined') {
      localStorage.setItem(DB_RESET_EPOCH_KEY, remoteResetEpoch);
      clearLocalChangePending();
      // Wipe all business keys from localStorage so zero ghost records survive
      Object.values(STORAGE_KEYS).forEach((k) => {
        if (k !== DB_RESET_EPOCH_KEY && k !== STORAGE_KEYS.AUTH_SESSION && k !== STORAGE_KEYS.REMEMBERED_USERNAME) {
          localStorage.removeItem(k);
        }
      });
    }

    isRestoringFromRemote = true;
    let hasChanges = false;
    try {
      const keysMapping: Array<[keyof typeof STORAGE_KEYS, any]> = [
        ['CUSTOMERS', remoteData.customers],
        ['PRODUCTS', remoteData.products],
        ['ORDERS', remoteData.orders],
        ['INVOICES', remoteData.invoices],
        ['TRANSACTIONS', remoteData.transactions],
        ['PAYMENTS', remoteData.payments],
        ['CHEQUES', remoteData.cheques],
        ['ADJUSTMENTS', remoteData.adjustments],
        ['DRIVERS', remoteData.drivers],
        ['VEHICLES', remoteData.vehicles],
        ['DELIVERIES', remoteData.deliveries],
        ['RETURNS', remoteData.returns],
        ['MATERIALS', remoteData.materials],
        ['WAREHOUSES', remoteData.warehouses],
        ['MOVEMENTS', remoteData.movements],
        ['EMPLOYEES', remoteData.employees],
        ['EMPLOYEE_TXS', remoteData.employee_txs || remoteData.employeeTxs],
        ['EMPLOYEE_LEAVES', remoteData.employee_leaves || remoteData.employeeLeaves],
        ['EMPLOYMENT_PERIODS', remoteData.employment_periods || remoteData.employmentPeriods],
        ['EXPENSES', remoteData.expenses],
        ['PRODUCTION_LOGS', remoteData.production_logs || remoteData.productionLogs],
        ['USERS', remoteData.users],
        ['ROLES', remoteData.roles],
        ['PERMISSIONS', remoteData.permissions],
        ['SETTINGS', remoteData.settings || remoteData.system_settings || remoteData.company_settings],
        ['AUDIT_LOGS', remoteData.audit_logs || remoteData.auditLogs],
      ];

      for (const [keyProp, val] of keysMapping) {
        if (val !== undefined && val !== null) {
          const storageKey = STORAGE_KEYS[keyProp];
          let finalVal = val;

          // Special handling for system metadata
          if (keyProp === 'PERMISSIONS') {
            const systemPerms = defaultPermissions;
            if (Array.isArray(val) && val.length > 0) {
              const map = new Map(systemPerms.map((p) => [p.key, p]));
              val.forEach((p: Permission) => { if (p && p.key) map.set(p.key, p); });
              finalVal = Array.from(map.values());
            } else {
              finalVal = systemPerms;
            }
          } else if (keyProp === 'ROLES') {
            finalVal = (Array.isArray(val) && val.length > 0) ? val : defaultRoles;
          } else if (keyProp === 'USERS') {
            finalVal = (Array.isArray(val) && val.length > 0) ? val : defaultUsers;
          } else if (keyProp === 'SETTINGS') {
            if (val && typeof val === 'object') {
              finalVal = normalizeSettingsObject(val);
            } else {
              finalVal = StorageService.getSettings();
            }
          } else if (Array.isArray(val)) {
            let serverList = val;
            if (['ORDERS', 'INVOICES', 'DELIVERIES', 'RETURNS'].includes(keyProp)) {
              serverList = val.map((entity: any) => normalizeEntityWithItems(entity));
            }

            // Protection against losing locally added items:
            // If this client had unsynced local changes, and server was NOT reset, preserve any locally created items
            if (!isServerReset && hasLocalChangePending()) {
              const currentLocalStr = localStorage.getItem(storageKey);
              if (currentLocalStr) {
                try {
                  const currentLocal = JSON.parse(currentLocalStr);
                  if (Array.isArray(currentLocal) && currentLocal.length > 0) {
                    const serverIds = new Set(serverList.map((x: any) => String(x.id || x.code || '')));
                    const pendingNewItems = currentLocal.filter((x: any) => x && (x.id || x.code) && !serverIds.has(String(x.id || x.code)));
                    if (pendingNewItems.length > 0) {
                      serverList = [...serverList, ...pendingNewItems];
                    }
                  }
                } catch (e) {}
              }
            }

            finalVal = serverList;
          }

          const currentStr = localStorage.getItem(storageKey);
          const newStr = JSON.stringify(finalVal);
          if (currentStr !== newStr) {
            localStorage.setItem(storageKey, newStr);
            hasChanges = true;
          }
        }
      }
    } catch (err: any) {
      return { success: false, changed: false, message: 'خطا در نگاشت داده‌ها: ' + (err?.message || '') };
    } finally {
      isRestoringFromRemote = false;
    }

    if (hasChanges && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      window.dispatchEvent(new CustomEvent('polyethylene-settings-changed'));
    }

    return {
      success: true,
      changed: hasChanges,
      message: hasChanges ? 'داده‌ها با آخرین وضعیت دیتابیس بروزرسانی شد.' : 'داده‌ها هماهنگ هستند.',
    };
  }

  // Pull latest full database from Host and update locally
  static async pullFromHost(): Promise<{ success: boolean; message: string; applied?: boolean }> {
    // If a push is currently in progress, wait for it first
    if (activePushPromise) {
      await activePushPromise;
    }

    try {
      const url = this.getApiUrl(`api.php?action=load&_t=${Date.now()}`);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return { success: false, message: 'پاسخ ناموفق از هاست.' };
      let data: any = null;
      try {
        const rawText = await res.text();
        data = JSON.parse(rawText);
      } catch {
        return { success: false, message: 'پاسخ نامعتبر از سرور' };
      }
      if (data && data.success && data.data) {
        if (data.revision) {
          lastKnownServerRevision = Number(data.revision);
        }
        if (data.reset_epoch) {
          data.data.reset_epoch = data.reset_epoch;
        }
        const applyRes = this.applyRemoteData(data.data);
        
        // If there are still unsynced local changes (e.g. newly created order preserved during merge),
        // trigger background sync to flush them to the server
        if (hasLocalChangePending()) {
          setTimeout(() => {
            StorageService.pushToHost(false).catch(() => {});
          }, 200);
        }

        const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        notifySyncListeners({
          state: hasLocalChangePending() ? 'syncing' : 'synced',
          lastSyncedAt: timeStr,
          message: 'دیتابیس متصل و با موفقیت همگام‌سازی شد.',
        });
        return { success: applyRes.success, message: applyRes.message, applied: applyRes.changed };
      } else if (data && data.success) {
        const timeStr = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        notifySyncListeners({
          state: 'synced',
          lastSyncedAt: timeStr,
          message: 'دیتابیس متصل و آماده است.',
        });
      }
      return { success: true, message: 'دیتابیس در وضعیت آماده به کار است.', applied: false };
    } catch (err: any) {
      return { success: false, message: 'خطا در بارگذاری از هاست: ' + (err?.message || '') };
    }
  }

  // Start background realtime polling for multi-device live sync
  static startBackgroundRealtimePolling(): void {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    if (realtimePollingTimer) return;

    realtimePollingTimer = setInterval(async () => {
      if (!navigator.onLine) return;
      if (activePushPromise) return;

      try {
        const url = StorageService.getApiUrl(`api.php?action=version&_t=${Date.now()}`);
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          let data: any = null;
          try {
            const rawText = await res.text();
            data = JSON.parse(rawText);
          } catch {}
          if (data && data.success) {
            const remoteRev = Number(data.revision || 0);
            const remoteRows = Number(data.total_rows || 0);
            const remoteResetEpoch = String(data.reset_epoch || '0');
            const localResetEpoch = typeof localStorage !== 'undefined' ? (localStorage.getItem('alborz_db_reset_epoch') || '0') : '0';
            const resetDetected = remoteResetEpoch !== '0' && remoteResetEpoch !== localResetEpoch;

            if (resetDetected) {
              lastKnownServerRevision = remoteRev;
              lastKnownServerRows = remoteRows;
              await StorageService.pullFromHost();
              return;
            }

            if (remoteRev > lastKnownServerRevision || remoteRows !== lastKnownServerRows) {
              // Server has newer data: PULL FIRST! NEVER overwrite with local stale cache!
              lastKnownServerRevision = remoteRev;
              lastKnownServerRows = remoteRows;
              await StorageService.pullFromHost();
              return;
            }

            // Only flush local pending changes if server is already in sync and not ahead
            if (hasLocalChangePending()) {
              await StorageService.pushToHost(false).catch(() => {});
            }
          }
        }
      } catch (e) {}
    }, 3500);
  }

  // Real-time synchronization hooks & utilities
  static onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    syncStatusListeners.push(callback);
    callback(currentSyncState);
    return () => {
      const idx = syncStatusListeners.indexOf(callback);
      if (idx > -1) syncStatusListeners.splice(idx, 1);
    };
  }

  static getSyncStatus(): SyncStatus {
    return currentSyncState;
  }

  // Automatically executed on application startup and tab switches: always load authoritative database state first
  static async syncWithServerOnStartup(): Promise<void> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;

    try {
      notifySyncListeners({
        ...currentSyncState,
        state: 'syncing',
        message: 'در حال دریافت اطلاعات از دیتابیس MySQL هاست...',
      });

      const url = this.getApiUrl(`api.php?action=load&_t=${Date.now()}`);
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        notifySyncListeners({
          ...currentSyncState,
          state: 'offline',
          message: 'عدم دریافت پاسخ از سرور دیتابیس (استفاده از نسخه محلی)',
        });
        this.startBackgroundRealtimePolling();
        return;
      }
      let json: any = null;
      try {
        const rawText = await res.text();
        json = JSON.parse(rawText);
      } catch {
        notifySyncListeners({
          ...currentSyncState,
          state: 'offline',
          message: 'عدم دریافت پاسخ معتبر از سرور دیتابیس (استفاده از نسخه محلی)',
        });
        this.startBackgroundRealtimePolling();
        return;
      }

      if (json && json.success && json.data) {
        if (json.revision) {
          lastKnownServerRevision = Number(json.revision);
        }
        this.applyRemoteData(json.data);
        clearLocalChangePending();
        notifySyncListeners({
          state: 'synced',
          lastSyncedAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          message: json.engine === 'mysql'
            ? 'اطلاعات با موفقیت از پایگاه‌داده MySQL دریافت شد.'
            : 'اطلاعات از فایل سرور دریافت شد (پایگاه‌داده MySQL هنوز متصل نیست).',
        });
      } else if (json && json.success) {
        notifySyncListeners({
          state: 'synced',
          lastSyncedAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          message: 'ارتباط با سرور برقرار است.',
        });
      } else {
        notifySyncListeners({
          state: 'error',
          lastSyncedAt: currentSyncState.lastSyncedAt,
          message: json?.message || 'پایگاه‌داده MySQL متصل نیست یا مشخصات دیتابیس پیش‌فرض است.',
        });
      }
    } catch (err: any) {
      notifySyncListeners({
        ...currentSyncState,
        state: 'offline',
        message: 'عدم ارتباط با دیتابیس هاست (آفلاین)',
      });
    } finally {
      this.startBackgroundRealtimePolling();
    }
  }

  // User or system triggered instant force sync
  static async forceFullSync(): Promise<{ success: boolean; message: string }> {
    try {
      notifySyncListeners({
        ...currentSyncState,
        state: 'syncing',
        message: 'در حال همگام‌سازی کامل با دیتابیس...',
      });

      // 1. Pull latest from server
      const pullRes = await this.pullFromHost();

      if (!pullRes.success) {
        notifySyncListeners({
          state: 'error',
          lastSyncedAt: currentSyncState.lastSyncedAt,
          message: pullRes.message || 'خطا در ارتباط با دیتابیس MySQL هاست',
        });
        return { success: false, message: pullRes.message || 'خطا در ارتباط با دیتابیس هاست.' };
      }

      notifySyncListeners({
        state: 'synced',
        lastSyncedAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message: 'همگام‌سازی موفق با دیتابیس MySQL هاست.',
      });

      return { success: true, message: pullRes.message || 'همگام‌سازی با موفقیت انجام شد.' };
    } catch (err: any) {
      notifySyncListeners({
        state: 'error',
        lastSyncedAt: currentSyncState.lastSyncedAt,
        message: err?.message || 'خطا در ارتباط با دیتابیس',
      });
      return { success: false, message: 'خطا در ارتباط با دیتابیس هاست.' };
    }
  }

  // Reset to Factory Clean Zero State (Wipes all tables to 0 records with NO sample data, wipes MySQL on host)
  static async resetToDefaultData(): Promise<{ success: boolean; message: string }> {
    let serverWiped = false;
    let serverMessage = '';

    // 1. Tell central host to wipe MySQL tables atomically
    try {
      if (typeof window !== 'undefined' && typeof fetch === 'function') {
        const url = this.getApiUrl(`api.php?action=factory_reset&_t=${Date.now()}`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'factory_reset', timestamp: Date.now() }),
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success) {
            serverWiped = true;
            serverMessage = json.message || '';
            if (json.revision) {
              lastKnownServerRevision = Number(json.revision);
            }
            if (json.reset_epoch) {
              localStorage.setItem('alborz_db_reset_epoch', String(json.reset_epoch));
            }
          }
        }
      }
    } catch (err) {
      console.warn('Network call to factory_reset failed:', err);
    }

    // 2. Wipe local browser cache completely to 0 state
    isRestoringFromRemote = true;
    try {
      const entityKeys = [
        STORAGE_KEYS.CUSTOMERS,
        STORAGE_KEYS.PRODUCTS,
        STORAGE_KEYS.ORDERS,
        STORAGE_KEYS.INVOICES,
        STORAGE_KEYS.TRANSACTIONS,
        STORAGE_KEYS.PAYMENTS,
        STORAGE_KEYS.CHEQUES,
        STORAGE_KEYS.ADJUSTMENTS,
        STORAGE_KEYS.DRIVERS,
        STORAGE_KEYS.VEHICLES,
        STORAGE_KEYS.DELIVERIES,
        STORAGE_KEYS.RETURNS,
        STORAGE_KEYS.MATERIALS,
        STORAGE_KEYS.WAREHOUSES,
        STORAGE_KEYS.MOVEMENTS,
        STORAGE_KEYS.EMPLOYEES,
        STORAGE_KEYS.EMPLOYEE_TXS,
        STORAGE_KEYS.EMPLOYEE_LEAVES,
        STORAGE_KEYS.EMPLOYMENT_PERIODS,
        STORAGE_KEYS.EXPENSES,
        STORAGE_KEYS.PRODUCTION_LOGS,
        STORAGE_KEYS.AUDIT_LOGS,
      ];

      entityKeys.forEach((k) => {
        localStorage.setItem(k, JSON.stringify([]));
      });

      // Retain only the standard root superadmin user
      const cleanAdmin: User = {
        id: 'usr-1',
        user_code: 'USR-1001',
        name: 'مدیر ارشد سیستم',
        username: 'admin',
        password: '123',
        role_id: 'role-admin',
        role_name: 'مدیر ارشد سیستم',
        is_admin: true,
        is_active: true,
        permissions: defaultPermissions.map((p) => p.key),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([cleanAdmin]));
      localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(defaultRoles));
      localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(defaultPermissions));

      const cleanSettings: SystemSettings = {
        ...defaultSettings,
        business_name: '',
        company_name: '',
        brand_subtitle: '',
        logo_url: '',
        stamp_signature_url: '',
        login_cover_url: '',
        login_background_url: '',
        phone: '',
        fax: '',
        email: '',
        economic_code: '',
        national_id: '',
        registration_number: '',
        postal_code: '',
        address: '',
      };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cleanSettings));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, JSON.stringify('usr-1'));
    } finally {
      isRestoringFromRemote = false;
    }

    clearLocalChangePending();
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }

    // Fallback sync clean zero state to MySQL host if factory_reset endpoint was not reached
    if (!serverWiped) {
      try {
        const syncRes = await this.pushToHost(true);
        if (syncRes && syncRes.success) {
          serverWiped = true;
        }
      } catch (pushErr) {
        console.warn('Post-reset sync push:', pushErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      window.dispatchEvent(new CustomEvent('user-permissions-changed'));
    }

    notifySyncListeners({
      state: 'synced',
      lastSyncedAt: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message: 'سامانه و پایگاه‌داده MySQL هاست با موفقیت صفر و به تنظیمات کارخانه بازنشانی شد.',
    });

    return {
      success: true,
      message: serverWiped
        ? 'کلیه اطلاعات، مشتریان، اسناد و جداول پایگاه‌داده MySQL هاست با موفقیت پاک‌سازی و به وضعیت صفر بازنشانی گردید.'
        : 'کلیه اطلاعات سیستم در حافظه محلی پاک‌سازی شد. (وضعیت سرور هاست: ' + (serverMessage || 'در انتظار ارتباط بعدی') + ')',
    };
  }

  // Aliases for compatibility
  static saveSettings(settings: SystemSettings) {
    return this.updateSettings(settings);
  }

  static getCompanySettings() {
    return this.getSettings();
  }

  static saveCompanySettings(settings: SystemSettings) {
    return this.updateSettings(settings);
  }

  static addAuditLog(action: string, entity_type: string, entity_id: string, old_values?: any, new_values?: any) {
    return this.logAudit(action, entity_type, entity_id, old_values, new_values);
  }

  static exportDatabaseJSON() {
    return this.exportFullBackup();
  }

  static importDatabaseJSON(jsonString: string) {
    return this.restoreFullBackup(jsonString);
  }

  static resetToDefaults() {
    return this.resetToDefaultData();
  }
}
