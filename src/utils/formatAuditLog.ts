import { AuditLog } from '../types';
import {
  formatJalaliDateTime,
  formatJalaliDate,
  formatCurrency,
  formatNumber,
  toPersianDigits,
} from './jalali';

export const FIELD_LABELS: Record<string, string> = {
  amount: 'مبلغ',
  total_amount: 'مبلغ کل',
  final_total: 'مبلغ نهایی',
  subtotal: 'جمع قبل از تخفیف و مالیات',
  discount: 'مبلغ تخفیف',
  discount_enabled: 'اعمال تخفیف',
  tax_amount: 'مبلغ مالیات و ارزش افزوده',
  tax_enabled: 'اعمال مالیات',
  tax_percent: 'درصد مالیات',
  balance: 'مانده حساب',
  status: 'وضعیت',
  name: 'نام / عنوان',
  customer_name: 'نام مشتری',
  customer_code: 'کد مشتری',
  customer_id: 'شناسه مشتری',
  phone: 'شماره تماس',
  mobile: 'موبایل',
  national_id: 'کد ملی / شناسه ملی',
  economic_code: 'کد اقتصادی',
  registration_number: 'شماره ثبت',
  postal_code: 'کد پستی',
  address: 'نشانی',
  province: 'استان',
  city: 'شهر',
  credit_limit: 'سقف اعتبار',
  reason: 'علت / بابت',
  description: 'توضیحات و یادداشت',
  quantity_meters: 'متراژ',
  total_meters: 'مجموع متراژ',
  meters: 'متراژ',
  unit_price: 'قیمت واحد',
  delivery_number: 'شماره رسید تحویل',
  invoice_number: 'شماره فاکتور',
  order_number: 'شماره سفارش',
  return_number: 'شماره سند برگشت',
  reference_number: 'شماره پیگیری / سند مرجع',
  payment_number: 'شماره سند دریافت/پرداخت',
  payment_method: 'روش پرداخت',
  bank_name: 'نام بانک',
  due_date: 'تاریخ سررسید',
  cheque_number: 'شماره صیادی / سریال چک',
  sayad_number: 'شناسه صیاد',
  account_number: 'شماره حساب',
  sheba_number: 'شماره شبا',
  drawer_name: 'صاحب حساب / صادرکننده چک',
  branch: 'نام شعبه',
  driver_name: 'نام راننده',
  driver_phone: 'تلفن راننده',
  vehicle_plate: 'پلاک خودرو',
  waybill_number: 'شماره بارنامه',
  material_name: 'نام ماده اولیه / کالا',
  material_code: 'کد ماده اولیه',
  quantity_kg: 'وزن (کیلوگرم)',
  bags_count: 'تعداد کیسه',
  supplier_or_line: 'تأمین‌کننده / خط مصرف',
  shift: 'شیفت کاری',
  operator: 'اپراتور شیفت',
  line_number: 'شماره خط تولید',
  pipe_size: 'سایز لوله',
  size: 'سایز لوله',
  pressure: 'فشار کاری (PE)',
  type: 'نوع',
  diameter: 'قطر خارجی',
  thickness: 'ضخامت جداره',
  motor_speed: 'دور موتور',
  traction_speed: 'سرعت کشش',
  weight_unit: 'وزن در متر',
  total_weight: 'وزن کل تولیدی',
  items: 'اقلام کالا',
  order_date: 'تاریخ سفارش',
  invoice_date: 'تاریخ فاکتور',
  delivery_date: 'تاریخ تحویل بار',
  payment_date: 'تاریخ پرداخت',
  expense_date: 'تاریخ ثبت هزینه',
  production_date: 'تاریخ شیفت تولید',
  category: 'دسته‌بندی',
  title: 'عنوان',
  full_name: 'نام و نام خانوادگی',
  role: 'سمت شغلی',
  department: 'واحد سازمانی',
  base_salary: 'حقوق پایه',
  hire_date: 'تاریخ استخدام',
  leave_type: 'نوع مرخصی',
  days_count: 'تعداد روز مرخصی',
  hours_count: 'تعداد ساعت مرخصی',
  from_date: 'از تاریخ',
  to_date: 'تا تاریخ',
  from_time: 'از ساعت',
  to_time: 'تا ساعت',
  date: 'تاریخ',
  replacement_person: 'شخص جانشین',
};

export const ENTITY_LABELS: Record<string, string> = {
  CUSTOMER: 'پرونده مشتری',
  ORDER: 'سفارش فروش',
  INVOICE: 'فاکتور فروش',
  PAYMENT: 'سند دریافت وجه',
  CHEQUE: 'چک صیادی',
  ADJUSTMENT: 'سند تعدیل حساب',
  RETURN: 'سند برگشت از فروش',
  DELIVERY: 'رسید تحویل بار',
  PRODUCT: 'محصول لوله',
  MATERIAL: 'ماده اولیه',
  MATERIAL_MOVEMENT: 'گردش انبار مواد اولیه',
  WAREHOUSE: 'انبار',
  PRODUCTION: 'گزارش شیفت تولید',
  EMPLOYEE: 'پرونده پرسنل',
  EMPLOYEE_TX: 'تراکنش مالی پرسنل',
  EMPLOYEE_LEAVE: 'مرخصی پرسنل',
  EMPLOYMENT_PERIOD: 'دوره همکاری پرسنل',
  EXPENSE: 'سند هزینه',
  SETTINGS: 'تنظیمات سامانه',
  USER: 'کاربر سیستم',
  AUTH: 'ورود و دسترسی',
  SYSTEM: 'سیستم و پشتیبان',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: 'پیش‌نویس',
  active: 'فعال / ثبت‌شده',
  confirmed: 'تایید نهایی',
  cancelled: 'لغو شده / باطل',
  completed: 'تسویه شده / تکمیل',
  pending: 'در انتظار',
  in_production: 'در حال تولید',
  delivered: 'تحویل داده شده',
  partial: 'تحویل جزئی',
  settled: 'تسویه شده',
  cleared: 'پاس شده',
  passed: 'پاس شده',
  bounced: 'برگشت خورده',
  rejected: 'رد شده',
  returned: 'عودت داده شده',
  debit: 'بدهکار',
  credit: 'بستانکار',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'نقدی',
  cheque: 'چک صیادی',
  transfer: 'کارت به کارت / حواله پایا',
  pos: 'دستگاه کارتخوان (POS)',
  other: 'سایر روش‌ها',
};

const LEAVE_CATEGORY_MAP: Record<string, string> = {
  daily: 'روزانه',
  hourly: 'ساعتی',
  entitlement: 'استحقاقی',
  sick: 'استعلاجی',
  unpaid: 'بدون حقوق',
  marriage: 'ازدواج',
  bereavement: 'فوت بستگان',
  other: 'سایر',
};

const TX_TYPE_MAP: Record<string, string> = {
  accrual: 'طلب / حقوق',
  payment: 'پرداخت وجه',
  advance: 'مساعده',
  bonus: 'پاداش',
  salary: 'حقوق ماهانه',
  penalty: 'کسورات',
  loan: 'وام پرسنلی',
};

export function formatFieldValue(key: string, val: any): string {
  if (val === undefined || val === null || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'بله / فعال' : 'خیر / غیرفعال';
  if (typeof val === 'number') {
    if (
      key.includes('amount') ||
      key.includes('total') ||
      key.includes('price') ||
      key.includes('balance') ||
      key.includes('discount') ||
      key.includes('tax') ||
      key.includes('salary') ||
      key.includes('debit') ||
      key.includes('credit')
    ) {
      return `${formatCurrency(val, false)} ریال`;
    }
    if (key.includes('meter') || key.includes('quantity_meters')) {
      return `${formatNumber(val)} متر`;
    }
    if (key.includes('weight') || key.includes('kg')) {
      return `${formatNumber(val)} کیلوگرم`;
    }
    if (key.includes('bags')) {
      return `${formatNumber(val)} کیسه`;
    }
    if (key === 'days_count') {
      return `${formatNumber(val)} روز`;
    }
    if (key === 'hours_count') {
      return `${formatNumber(val)} ساعت`;
    }
    if (key.includes('percent')) {
      return `${formatNumber(val)}%`;
    }
    return formatNumber(val);
  }
  if (typeof val === 'string') {
    if (STATUS_LABELS[val]) return STATUS_LABELS[val];
    if (PAYMENT_METHOD_LABELS[val]) return PAYMENT_METHOD_LABELS[val];
    if (LEAVE_CATEGORY_MAP[val]) return LEAVE_CATEGORY_MAP[val];
    if (TX_TYPE_MAP[val]) return TX_TYPE_MAP[val];
    if (val.length === 10 && val.includes('-') && !val.startsWith('ORD-') && !val.startsWith('INV-')) {
      return formatJalaliDate(val);
    }
    return val;
  }
  if (Array.isArray(val)) {
    return `${formatNumber(val.length)} قلم`;
  }
  if (typeof val === 'object' && val !== null) {
    if (val.name) return String(val.name);
    if (val.title) return String(val.title);
    if (val.label) return String(val.label);
    if (val.order_number) return String(val.order_number);
    if (val.invoice_number) return String(val.invoice_number);
    return 'اطلاعات ثبت‌شده';
  }
  return String(val);
}

export interface AuditFieldDiff {
  field: string;
  label: string;
  oldValue: any;
  newValue: any;
  formattedOld: string;
  formattedNew: string;
}

/**
 * Fallback helpers to resolve names from localStorage if not available directly in log.
 */
function getEmployeeNameById(id?: string): string {
  if (!id) return '';
  try {
    const raw = localStorage.getItem('pe_employees_v1');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const found = list.find((e: any) => e.id === id);
        if (found) return found.full_name || found.name || '';
      }
    }
  } catch {}
  return '';
}

function getCustomerNameById(id?: string): string {
  if (!id) return '';
  try {
    const raw = localStorage.getItem('pe_customers_v1');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const found = list.find((c: any) => c.id === id);
        if (found) return found.name || '';
      }
    }
  } catch {}
  return '';
}

/**
 * Returns a clean, human-readable identifier for an item row.
 */
function getItemDisplayName(item: any, index: number): string {
  if (!item) return `قلم ${toPersianDigits(index + 1)}`;
  if (item.product_name) return item.product_name;
  if (item.pipe_size) {
    const p = item.pressure ? ` (${item.pressure} بار)` : '';
    return `لوله سایز ${item.pipe_size}${p}`;
  }
  if (item.name) return item.name;
  if (item.title) return item.title;
  return `قلم ${toPersianDigits(index + 1)}`;
}

/**
 * Intelligent field diff engine:
 * - Detects exact changes inside item arrays (e.g. meter of a specific pipe)
 * - Automatically suppresses derived totals (subtotal, final_total, total_meters)
 *   that recalculated solely because items changed.
 * - Suppresses noise IDs and internal metadata.
 */
export function getAuditFieldDiffs(log: AuditLog): AuditFieldDiff[] {
  const oldVal = log.old_values;
  const newVal = log.new_values;
  if (!oldVal || !newVal || typeof oldVal !== 'object' || typeof newVal !== 'object') {
    return [];
  }

  const diffs: AuditFieldDiff[] = [];
  let itemsChanged = false;

  // 1. In-depth Items Array Comparison
  const oldItems = Array.isArray(oldVal.items) ? oldVal.items : null;
  const newItems = Array.isArray(newVal.items) ? newVal.items : null;

  if (oldItems && newItems && JSON.stringify(oldItems) !== JSON.stringify(newItems)) {
    itemsChanged = true;
    const maxLen = Math.max(oldItems.length, newItems.length);

    for (let i = 0; i < maxLen; i++) {
      const o = oldItems[i];
      const n = newItems[i];

      // Item added
      if (!o && n) {
        const name = getItemDisplayName(n, i);
        const m = n.quantity_meters ?? n.meters ?? n.quantity ?? 0;
        diffs.push({
          field: `items[${i}].added`,
          label: 'افزودن قلم کالا',
          oldValue: null,
          newValue: n,
          formattedOld: '—',
          formattedNew: `«${name}» (${formatNumber(m)} متر)`,
        });
        continue;
      }

      // Item removed
      if (o && !n) {
        const name = getItemDisplayName(o, i);
        const m = o.quantity_meters ?? o.meters ?? o.quantity ?? 0;
        diffs.push({
          field: `items[${i}].removed`,
          label: 'حذف قلم کالا',
          oldValue: o,
          newValue: null,
          formattedOld: `«${name}» (${formatNumber(m)} متر)`,
          formattedNew: 'حذف شد',
        });
        continue;
      }

      // Item modified: inspect key attributes
      const name = getItemDisplayName(n, i);

      // Quantity / Meters
      const oMeters = o.quantity_meters ?? o.meters ?? o.quantity;
      const nMeters = n.quantity_meters ?? n.meters ?? n.quantity;
      if (
        oMeters !== undefined &&
        nMeters !== undefined &&
        Number(oMeters) !== Number(nMeters)
      ) {
        diffs.push({
          field: `items[${i}].quantity_meters`,
          label: `متراژ «${name}»`,
          oldValue: oMeters,
          newValue: nMeters,
          formattedOld: `${formatNumber(oMeters)} متر`,
          formattedNew: `${formatNumber(nMeters)} متر`,
        });
      }

      // Unit Price
      const oPrice = o.unit_price;
      const nPrice = n.unit_price;
      if (
        oPrice !== undefined &&
        nPrice !== undefined &&
        Number(oPrice) !== Number(nPrice)
      ) {
        diffs.push({
          field: `items[${i}].unit_price`,
          label: `قیمت فی «${name}»`,
          oldValue: oPrice,
          newValue: nPrice,
          formattedOld: `${formatCurrency(oPrice, false)} ریال`,
          formattedNew: `${formatCurrency(nPrice, false)} ریال`,
        });
      }

      // Pipe size or pressure
      if (o.pipe_size && n.pipe_size && o.pipe_size !== n.pipe_size) {
        diffs.push({
          field: `items[${i}].pipe_size`,
          label: `سایز «${name}»`,
          oldValue: o.pipe_size,
          newValue: n.pipe_size,
          formattedOld: `سایز ${o.pipe_size}`,
          formattedNew: `سایز ${n.pipe_size}`,
        });
      }

      if (o.pressure && n.pressure && o.pressure !== n.pressure) {
        diffs.push({
          field: `items[${i}].pressure`,
          label: `فشار کاری «${name}»`,
          oldValue: o.pressure,
          newValue: n.pressure,
          formattedOld: `${o.pressure} بار`,
          formattedNew: `${n.pressure} بار`,
        });
      }
    }
  }

  // 2. Keys that are purely internal metadata
  const ignoredKeys = new Set([
    'id',
    'created_at',
    'updated_at',
    'user_id',
    'order_id',
    'invoice_id',
    'product_id',
    'material_id',
    'items',
    'history',
    'logs',
    'transactions',
    'balance',
    'created_by',
    'driver_phone',
  ]);

  // If customer name or employee name is present, suppress ID keys to prevent noise
  if (oldVal.customer_name || newVal.customer_name) ignoredKeys.add('customer_id');
  if (oldVal.employee_name || newVal.employee_name) ignoredKeys.add('employee_id');

  // If items changed, suppress derived totals so we don't spam the user with formula byproducts
  if (itemsChanged) {
    ignoredKeys.add('subtotal');
    ignoredKeys.add('final_total');
    ignoredKeys.add('total_amount');
    ignoredKeys.add('total_meters');
    ignoredKeys.add('total_weight');
    ignoredKeys.add('raw_materials_summary');

    // Only suppress tax_amount if tax_percent or tax_enabled did NOT change
    const taxRateChanged =
      oldVal.tax_percent !== newVal.tax_percent ||
      oldVal.tax_enabled !== newVal.tax_enabled;
    if (!taxRateChanged) {
      ignoredKeys.add('tax_amount');
    }
  }

  const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));

  for (const key of allKeys) {
    if (ignoredKeys.has(key)) continue;

    const vOld = oldVal[key];
    const vNew = newVal[key];

    if (vOld === undefined && (vNew === null || vNew === '' || vNew === 0 || vNew === undefined)) continue;
    if (vNew === undefined && (vOld === null || vOld === '' || vOld === 0 || vOld === undefined)) continue;

    if (JSON.stringify(vOld) !== JSON.stringify(vNew)) {
      diffs.push({
        field: key,
        label: FIELD_LABELS[key] || key,
        oldValue: vOld,
        newValue: vNew,
        formattedOld: formatFieldValue(key, vOld),
        formattedNew: formatFieldValue(key, vNew),
      });
    }
  }

  return diffs;
}

/**
 * Returns a human-friendly document/card header without raw internal UUIDs.
 */
export function getAuditTargetTitle(log: AuditLog): string {
  const entityType = log.entity_type?.toUpperCase() || '';
  const entityName = ENTITY_LABELS[entityType] || log.entity_type || 'سند';

  // 1. Employee Leave
  if (entityType === 'EMPLOYEE_LEAVE') {
    const empName =
      log.new_values?.employee_name ||
      log.old_values?.employee_name ||
      log.entity_title ||
      getEmployeeNameById(log.new_values?.employee_id || log.old_values?.employee_id);
    return empName ? `مرخصی پرسنل: ${empName}` : 'مرخصی پرسنل';
  }

  // 2. Employee Transaction
  if (entityType === 'EMPLOYEE_TX') {
    const empName =
      log.new_values?.employee_name ||
      log.old_values?.employee_name ||
      log.entity_title ||
      getEmployeeNameById(log.new_values?.employee_id || log.old_values?.employee_id);
    return empName ? `تراکنش مالی پرسنل: ${empName}` : 'تراکنش مالی پرسنل';
  }

  // 3. Employee Profile
  if (entityType === 'EMPLOYEE') {
    const empName =
      log.new_values?.full_name ||
      log.old_values?.full_name ||
      log.new_values?.name ||
      log.old_values?.name ||
      log.entity_title;
    const code = log.new_values?.code || log.old_values?.code;
    return empName ? `پرونده پرسنل: ${empName}${code ? ` (${code})` : ''}` : 'پرونده پرسنل';
  }

  // 4. Employment Period
  if (entityType === 'EMPLOYMENT_PERIOD') {
    const empName =
      log.new_values?.employee_name ||
      log.old_values?.employee_name ||
      log.entity_title ||
      getEmployeeNameById(log.new_values?.employee_id || log.old_values?.employee_id);
    return empName ? `سابقه همکاری: ${empName}` : 'سابقه همکاری پرسنل';
  }

  // 5. Customer Profile
  if (entityType === 'CUSTOMER') {
    const custName =
      log.new_values?.name ||
      log.old_values?.name ||
      log.new_values?.customer_name ||
      log.old_values?.customer_name ||
      log.entity_title;
    const code = log.new_values?.code || log.old_values?.code;
    return custName ? `پرونده مشتری «${custName}»${code ? ` (${code})` : ''}` : 'پرونده مشتری';
  }

  // 6. Orders, Invoices, Deliveries, Returns, Payments
  const docNum =
    log.document_number ||
    log.new_values?.order_number ||
    log.old_values?.order_number ||
    log.new_values?.invoice_number ||
    log.old_values?.invoice_number ||
    log.new_values?.delivery_number ||
    log.old_values?.delivery_number ||
    log.new_values?.payment_number ||
    log.old_values?.payment_number ||
    log.new_values?.return_number ||
    log.old_values?.return_number ||
    log.new_values?.code ||
    log.old_values?.code ||
    (typeof log.entity_id === 'string' &&
    (log.entity_id.startsWith('ORD-') ||
      log.entity_id.startsWith('INV-') ||
      log.entity_id.startsWith('DEL-') ||
      log.entity_id.startsWith('PAY-') ||
      log.entity_id.startsWith('RET-') ||
      log.entity_id.startsWith('EMP-'))
      ? log.entity_id
      : undefined);

  const customerName =
    log.new_values?.customer_name ||
    log.old_values?.customer_name ||
    getCustomerNameById(log.new_values?.customer_id || log.old_values?.customer_id);

  if (docNum) {
    return `${entityName} شماره ${docNum}${customerName ? ` (${customerName})` : ''}`;
  }

  // 7. Cheques
  if (entityType === 'CHEQUE') {
    const chqNum =
      log.new_values?.cheque_number ||
      log.old_values?.cheque_number ||
      log.new_values?.sayad_number ||
      log.old_values?.sayad_number;
    const drawer =
      log.new_values?.drawer_name ||
      log.old_values?.drawer_name ||
      customerName;
    return `چک صیادی${chqNum ? ` شماره ${chqNum}` : ''}${drawer ? ` (${drawer})` : ''}`;
  }

  // 8. Expense
  if (entityType === 'EXPENSE') {
    const title = log.new_values?.title || log.old_values?.title || log.new_values?.category;
    return `سند هزینه${title ? ` «${title}»` : ''}`;
  }

  // 9. Production
  if (entityType === 'PRODUCTION') {
    const line = log.new_values?.line_number || log.old_values?.line_number;
    const shift = log.new_values?.shift || log.old_values?.shift;
    return `گزارش شیفت تولید${line ? ` (خط ${line}${shift ? ` - شیفت ${shift}` : ''})` : ''}`;
  }

  // 10. Material Movement
  if (entityType === 'MATERIAL_MOVEMENT') {
    const mat = log.new_values?.material_name || log.old_values?.material_name;
    return `گردش انبار مواد اولیه${mat ? ` «${mat}»` : ''}`;
  }

  // 11. Adjustment
  if (entityType === 'ADJUSTMENT') {
    return `سند تعدیل حساب${customerName ? ` (${customerName})` : ''}`;
  }

  // Fallback: Never display raw random internal UUIDs
  if (customerName) {
    return `${entityName} (${customerName})`;
  }

  return entityName;
}

/**
 * Creates natural, concise Persian audit log narratives.
 */
export function formatAuditNarrative(log: AuditLog): string {
  const dateTimeStr = formatJalaliDateTime(log.created_at || (log as any).timestamp);
  const userName = log.user_name || 'کاربر سیستم';
  const roleStr = log.user_role ? ` (${log.user_role})` : '';
  const entityType = log.entity_type?.toUpperCase() || '';
  const targetDocTitle = getAuditTargetTitle(log);

  // System & Auth
  if (entityType === 'AUTH') {
    return `${log.action} توسط ${userName}${roleStr} در تاریخ ${dateTimeStr}`;
  }
  if (entityType === 'SYSTEM') {
    return `${log.action} توسط ${userName}${roleStr} در تاریخ ${dateTimeStr}`;
  }

  const oldVal = log.old_values;
  const newVal = log.new_values;

  const isOldEmpty =
    oldVal === undefined ||
    oldVal === null ||
    oldVal === '' ||
    (typeof oldVal === 'object' && Object.keys(oldVal).length === 0);

  const isNewEmpty =
    newVal === undefined ||
    newVal === null ||
    newVal === '' ||
    (typeof newVal === 'object' && Object.keys(newVal).length === 0);

  const actionText = log.action || '';
  const isDelete =
    log.action_type === 'delete' ||
    actionText.includes('حذف') ||
    actionText.includes('ابطال') ||
    actionText.includes('لغو') ||
    (!isOldEmpty && isNewEmpty);

  const isConfirm =
    log.action_type === 'confirm' ||
    actionText.includes('تایید');

  const isPrint =
    log.action_type === 'print' ||
    actionText.includes('چاپ') ||
    actionText.includes('خروجی');

  // -------------------------------------------------------------
  // 1. DELETE / CANCELLATION
  // -------------------------------------------------------------
  if (isDelete) {
    if (entityType === 'EMPLOYEE_LEAVE') {
      const empName =
        oldVal?.employee_name ||
        log.entity_title ||
        getEmployeeNameById(oldVal?.employee_id) ||
        'کارمند';
      return `حذف مرخصی «${empName}» توسط ${userName}${roleStr} از سامانه انجام شد.`;
    }
    if (entityType === 'EMPLOYEE_TX') {
      const empName =
        oldVal?.employee_name ||
        getEmployeeNameById(oldVal?.employee_id) ||
        'کارمند';
      return `حذف تراکنش مالی «${empName}» توسط ${userName}${roleStr} از سامانه انجام شد.`;
    }
    if (entityType === 'EMPLOYEE') {
      const empName = oldVal?.full_name || oldVal?.name || 'کارمند';
      return `حذف پرونده کارمند «${empName}» توسط ${userName}${roleStr} انجام شد.`;
    }
    return `«${actionText || 'حذف'}» ${targetDocTitle} توسط ${userName}${roleStr} انجام شد.`;
  }

  // -------------------------------------------------------------
  // 2. CONFIRMATION
  // -------------------------------------------------------------
  if (isConfirm) {
    return `${targetDocTitle}: تایید نهایی توسط ${userName}${roleStr} انجام گردید.`;
  }

  // -------------------------------------------------------------
  // 3. PRINT / EXPORT
  // -------------------------------------------------------------
  if (isPrint) {
    return `چاپ یا خروجی ${targetDocTitle} توسط ${userName}${roleStr} دریافت شد.`;
  }

  // -------------------------------------------------------------
  // 4. CREATION / REGISTRATION
  // -------------------------------------------------------------
  const isCreate =
    log.action_type === 'create' ||
    (isOldEmpty && !isNewEmpty) ||
    actionText.includes('ثبت') ||
    actionText.includes('ایجاد') ||
    actionText.includes('تعریف') ||
    actionText.includes('صدور');

  if (isCreate) {
    // 4.1. Employee Leave (مرخصی پرسنل)
    if (entityType === 'EMPLOYEE_LEAVE') {
      const empName =
        newVal?.employee_name ||
        oldVal?.employee_name ||
        log.entity_title ||
        getEmployeeNameById(newVal?.employee_id) ||
        'کارمند';

      const isHourly = newVal?.type === 'hourly' || (newVal?.hours_count && !newVal?.days_count);
      const cat = LEAVE_CATEGORY_MAP[newVal?.category] || newVal?.category || 'استحقاقی';

      if (isHourly) {
        const hours = newVal?.hours_count ? `${toPersianDigits(newVal.hours_count)} ساعت` : '';
        const dateStr = newVal?.date ? ` در تاریخ ${formatJalaliDate(newVal.date)}` : '';
        const reason = newVal?.description ? ` (علت: ${newVal.description})` : '';
        return `ثبت مرخصی ساعتی «${empName}» (${hours} - ${cat}${dateStr}${reason}) توسط ${userName}${roleStr} در سامانه انجام شد.`;
      } else {
        const days = newVal?.days_count ? `${toPersianDigits(newVal.days_count)} روز` : '۱ روز';
        let dateInfo = '';
        if (newVal?.from_date) {
          const fromJ = formatJalaliDate(newVal.from_date);
          const toJ = newVal.to_date ? formatJalaliDate(newVal.to_date) : fromJ;
          dateInfo = fromJ === toJ ? ` (تاریخ ${fromJ})` : ` (از ${fromJ} تا ${toJ})`;
        }
        const reason = newVal?.description ? ` - علت: ${newVal.description}` : '';
        return `ثبت مرخصی روزانه «${empName}» (${days} - ${cat}${dateInfo}${reason}) توسط ${userName}${roleStr} در سامانه انجام شد.`;
      }
    }

    // 4.2. Employee Transaction (تراکنش مالی پرسنل)
    if (entityType === 'EMPLOYEE_TX') {
      const empName =
        newVal?.employee_name ||
        getEmployeeNameById(newVal?.employee_id) ||
        'کارمند';
      const typeLabel =
        TX_TYPE_MAP[newVal?.category] ||
        TX_TYPE_MAP[newVal?.type] ||
        'تراکنش مالی';
      const amtStr = newVal?.amount ? `${formatCurrency(newVal.amount, false)} ریال` : '';
      const reason = newVal?.description ? ` (بابت: ${newVal.description})` : '';
      return `ثبت ${typeLabel} «${empName}» به مبلغ ${amtStr}${reason} توسط ${userName}${roleStr} در سامانه انجام شد.`;
    }

    // 4.3. Employee Profile (پرونده پرسنل)
    if (entityType === 'EMPLOYEE') {
      const empName = newVal?.full_name || newVal?.name || 'کارمند';
      const role = newVal?.role || newVal?.department || '';
      const salary = newVal?.base_salary ? `حقوق: ${formatCurrency(newVal.base_salary, false)} ریال` : '';
      const info = [role, salary].filter(Boolean).join(' - ');
      return `ثبت پرونده پرسنل «${empName}»${info ? ` (${info})` : ''} توسط ${userName}${roleStr} در سامانه انجام شد.`;
    }

    // 4.4. Order (سفارش فروش)
    if (entityType === 'ORDER') {
      const isDraft = actionText.includes('پیش‌نویس') || newVal?.status === 'draft';
      const amt = newVal?.final_total || newVal?.total_amount;
      const amtStr = amt ? ` به مبلغ ${formatCurrency(amt, false)} ریال` : '';
      const meters = newVal?.total_meters ? ` (${formatNumber(newVal.total_meters)} متر)` : '';
      return `ثبت ${isDraft ? 'پیش‌نویس ' : ''}${targetDocTitle}${amtStr}${meters} توسط ${userName}${roleStr} در سامانه انجام شد.`;
    }

    // 4.5. Invoice (فاکتور فروش)
    if (entityType === 'INVOICE') {
      const amt = newVal?.final_total || newVal?.total_amount;
      const amtStr = amt ? ` به مبلغ ${formatCurrency(amt, false)} ریال` : '';
      return `صدور ${targetDocTitle}${amtStr} توسط ${userName}${roleStr} در سامانه انجام شد.`;
    }

    // 4.6. Delivery (رسید تحویل بار)
    if (entityType === 'DELIVERY') {
      const driver = newVal?.driver_name ? `راننده: ${newVal.driver_name}` : '';
      const meters = newVal?.total_meters ? `${formatNumber(newVal.total_meters)} متر` : '';
      const info = [driver, meters].filter(Boolean).join(' - ');
      return `صدور ${targetDocTitle}${info ? ` (${info})` : ''} توسط ${userName}${roleStr} انجام شد.`;
    }

    // 4.7. Payment (دریافت وجه)
    if (entityType === 'PAYMENT') {
      const amt = newVal?.amount ? ` به مبلغ ${formatCurrency(newVal.amount, false)} ریال` : '';
      const method = newVal?.payment_method ? ` (روش: ${PAYMENT_METHOD_LABELS[newVal.payment_method] || newVal.payment_method})` : '';
      return `ثبت ${targetDocTitle}${amt}${method} توسط ${userName}${roleStr} انجام شد.`;
    }

    // 4.8. Cheque (چک صیادی)
    if (entityType === 'CHEQUE') {
      const amt = newVal?.amount ? ` به مبلغ ${formatCurrency(newVal.amount, false)} ریال` : '';
      return `ثبت ${targetDocTitle}${amt} توسط ${userName}${roleStr} انجام شد.`;
    }

    // 4.9. Production (شیفت تولید)
    if (entityType === 'PRODUCTION') {
      const line = newVal?.line_number ? `خط ${newVal.line_number}` : '';
      const shift = newVal?.shift ? `شیفت ${newVal.shift}` : '';
      const size = newVal?.pipe_size ? `لوله ${newVal.pipe_size}` : '';
      const meters = newVal?.quantity_meters ? `${formatNumber(newVal.quantity_meters)} متر` : '';
      const info = [line, shift, size, meters].filter(Boolean).join(' - ');
      return `ثبت ${targetDocTitle}${info ? ` (${info})` : ''} توسط ${userName}${roleStr} انجام شد.`;
    }

    // 4.10. Material Movement (گردش مواد اولیه)
    if (entityType === 'MATERIAL_MOVEMENT') {
      const isEntry = newVal?.type === 'in' || actionText.includes('ورود');
      const qty = newVal?.quantity || newVal?.quantity_kg ? ` به مقدار ${formatNumber(newVal.quantity || newVal.quantity_kg)} کیلوگرم` : '';
      return `ثبت ${isEntry ? 'ورود به' : 'خروج از'} انبار: ${targetDocTitle}${qty} توسط ${userName}${roleStr} انجام شد.`;
    }

    // 4.11. General Creation Fallback
    return `${targetDocTitle}: «${actionText || 'ثبت و ایجاد'}» توسط ${userName}${roleStr} در سامانه انجام شد.`;
  }

  // -------------------------------------------------------------
  // 5. FIELD UPDATES & EDITS (Both old and new exist)
  // -------------------------------------------------------------
  if (!isOldEmpty && !isNewEmpty && typeof oldVal === 'object' && typeof newVal === 'object') {
    const diffs = getAuditFieldDiffs(log);

    if (diffs.length === 1) {
      const d = diffs[0];
      return `در ${targetDocTitle}، «${d.label}» توسط ${userName}${roleStr} از «${d.formattedOld}» به «${d.formattedNew}» تغییر یافت.`;
    }

    if (diffs.length === 2 || diffs.length === 3) {
      const changesText = diffs
        .map((d) => `«${d.label}» از «${d.formattedOld}» به «${d.formattedNew}»`)
        .join(' و ');
      return `در ${targetDocTitle}، ${changesText} توسط ${userName}${roleStr} تغییر کرد.`;
    }

    if (diffs.length > 3) {
      const topLabels = diffs.slice(0, 3).map((d) => `«${d.label}»`).join('، ');
      return `اطلاعات ${targetDocTitle} شامل ${topLabels} و ${toPersianDigits(diffs.length - 3)} مورد دیگر توسط ${userName}${roleStr} ویرایش و بروزرسانی شد.`;
    }

    // No field diffs detected (e.g. metadata or untouched save)
    return `اطلاعات ${targetDocTitle} توسط ${userName}${roleStr} ویرایش و بروزرسانی شد.`;
  }

  // -------------------------------------------------------------
  // 6. Primitive Value Update Fallback
  // -------------------------------------------------------------
  if (
    oldVal !== undefined &&
    oldVal !== null &&
    newVal !== undefined &&
    newVal !== null &&
    typeof oldVal !== 'object' &&
    typeof newVal !== 'object'
  ) {
    const formattedOld = formatFieldValue(log.entity_type, oldVal);
    const formattedNew = formatFieldValue(log.entity_type, newVal);
    return `${targetDocTitle}: مقدار توسط ${userName}${roleStr} از «${formattedOld}» به «${formattedNew}» تغییر یافت.`;
  }

  // Default Fallback
  return `عملیات «${actionText || 'رویداد'}» در ${targetDocTitle} توسط ${userName}${roleStr} انجام شد.`;
}
