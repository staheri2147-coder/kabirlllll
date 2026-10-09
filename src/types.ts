export type CustomerStatus = 'debit' | 'credit' | 'settled';

export interface Customer {
  id: string;
  code: string; // e.g. CUS-1001
  name: string;
  national_id?: string; // شناسه یا کد ملی
  economic_code?: string; // کد اقتصادی
  phone?: string;
  address?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  code: string; // e.g. PRD-101
  name: string; // پیش‌فرض: «لوله پلی اتیلن»
  size?: string; // e.g. 63mm, 90mm, 110mm, 125mm, 160mm, 200mm, 250mm
  pressure?: string; // e.g. 4 bar, 6 bar, 10 bar, 16 bar, 20 bar
  type?: string; // e.g. PE100, PE80, اتصالات، رینگ، فلنج
  unit: string; // متر (meter)
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'draft' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string; // پیش‌فرض: «لوله پلی اتیلن» (قابل تغییر)
  product_code?: string;
  product_spec?: string;
  size?: string; // سایز (قطر)
  pressure?: string; // فشار - اختیاری (4, 6, 10, 16, 20, 25 bar)
  type?: string; // نوع: PE100, PE80 یا خالی
  quantity_meters: number; // متراژ
  unit_price: number; // قیمت واحد (ریال)
  total_price: number; // quantity_meters * unit_price
  description?: string;
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  customer_national_id?: string;
  customer_phone?: string;
  customer_address?: string;
  order_number: string; // PRO-1001, PRO-1002, ...
  order_date: string; // ISO date YYYY-MM-DD
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number; // جمع مبالغ اقلام
  discount_enabled: boolean;
  discount: number; // مبلغ تخفیف (ریال)
  tax_enabled: boolean;
  tax_percent: number; // درصد مالیات
  tax_amount: number; // مبلغ مالیات (ریال)
  final_total: number; // جمع کل و قابل پرداخت
  notes_enabled?: boolean;
  description?: string; // توضیحات
  stamp_signature_enabled?: boolean; // درج مهر و امضا
  created_at: string;
  updated_at: string;
}

export type InvoiceStatus = 'active' | 'delivered' | 'rejected' | 'cancelled';

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id?: string;
  product_name: string;
  product_code?: string;
  product_spec?: string;
  size?: string;
  pressure?: string;
  type?: string;
  quantity_meters: number;
  unit_price: number;
  total_price: number;
  description?: string;
}

export interface Invoice {
  id: string;
  order_id: string;
  order_number?: string;
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  customer_national_id?: string;
  customer_phone?: string;
  customer_address?: string;
  invoice_number: string; // INV-1001, INV-1002, ...
  invoice_date: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  discount_enabled: boolean;
  discount: number;
  tax_enabled: boolean;
  tax_percent: number;
  tax_amount: number;
  final_total: number;
  notes_enabled?: boolean;
  description?: string;
  stamp_signature_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export type TransactionType = 'invoice' | 'invoice_cancel' | 'payment' | 'adjustment' | 'return';

export interface CustomerTransaction {
  id: string;
  customer_id: string;
  transaction_date: string;
  type: TransactionType;
  debit: number; // بدهکار (ریال)
  credit: number; // بستانکار (ریال)
  description: string;
  reference_type?: 'invoice' | 'payment' | 'adjustment' | 'return' | 'order';
  reference_id?: string;
  reference_number?: string;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'other';
export type PaymentStatus = 'completed' | 'cancelled';

export interface Payment {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string; // شماره پیگیری / ارجاع
  description?: string;
  cheque_id?: string;
  created_by: string;
  updated_by?: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export type ChequeStatus = 'pending' | 'deposited' | 'cleared' | 'returned' | 'cancelled';

export interface Cheque {
  id: string;
  payment_id?: string;
  customer_id: string;
  customer_name: string;
  cheque_number: string;
  bank_name: string;
  due_date: string; // تاریخ سررسید
  amount: number;
  status: ChequeStatus;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type AdjustmentType = 'debit' | 'credit';

export interface Adjustment {
  id: string;
  customer_id: string;
  customer_name: string;
  adjustment_date: string;
  amount: number; // همیشه مثبت
  type: AdjustmentType;
  description: string;
  created_by: string;
  updated_by?: string;
  status: 'active' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  national_id?: string;
  plate_number?: string;
  vehicle_type?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  plate_number: string; // پلاک خودرو
  vehicle_type: string; // خاور، تریلی، وانت، تک، ده چرخ
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DeliveryStatus = 'pending' | 'delivered' | 'partial' | 'cancelled';

export interface DeliveryItem {
  id: string;
  delivery_note_id: string;
  invoice_id: string;
  invoice_item_id?: string;
  invoice_number: string;
  product_id?: string;
  product_name: string;
  product_code?: string;
  product_spec?: string;
  size?: string;
  pressure?: string;
  type?: string;
  quantity_meters: number; // مقدار تحویل داده شده
  total_price?: number;
  description?: string;
}

export interface DeliveryNote {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_code?: string;
  delivery_number: string; // DEL-1001, DEL-1002, ...
  delivery_date: string;
  driver_id?: string;
  driver_name?: string;
  driver_phone?: string;
  driver_national_id?: string;
  vehicle_id?: string;
  vehicle_plate?: string;
  vehicle_type?: string;
  destination_address?: string;
  cancel_reason?: string;
  status: DeliveryStatus;
  items: DeliveryItem[];
  total_meters: number;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ReturnItem {
  id: string;
  return_id: string;
  invoice_id: string;
  invoice_item_id?: string;
  invoice_number: string;
  product_id?: string;
  product_name: string;
  product_code?: string;
  product_spec?: string;
  size?: string;
  pressure?: string;
  type?: string;
  quantity_meters: number;
  unit_price: number;
  total_price: number; // quantity_meters * unit_price
  description?: string;
}

export interface ReturnDoc {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  return_number: string; // RET-1001
  return_date: string;
  status: 'active' | 'cancelled';
  reason: string;
  description?: string;
  items: ReturnItem[];
  total_amount: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ------------------------------------
// کارمندان و امور مالی پرسنل (Employees)
// ------------------------------------
export interface Employee {
  id: string;
  code: string; // EMP-1001
  name: string;
  national_id?: string;
  phone1: string;
  phone2?: string;
  address?: string;
  position?: string; // سمت
  salary_base?: number; // پایه حقوق به ریال
  balance: number; // مانده حساب به ریال: مثبت = طلبکار (سبز)، منفی = بدهکار (قرمز)
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export type EmployeeTxType = 'accrual' | 'payment'; // طلب (حقوق/پاداش) | پرداخت (واریزی)

export interface EmployeeTransaction {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string; // ISO date
  type: EmployeeTxType;
  amount: number; // مبلغ به ریال
  payment_method?: 'cash' | 'card' | 'bank_transfer' | 'cheque';
  reference_number?: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export type LeaveType = 'daily' | 'hourly';
export type LeaveCategory = 'استحقاقی' | 'استعلاجی' | 'بدون حقوق' | 'تشویقی' | 'سایر';

export interface EmployeeLeave {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  type: LeaveType; // 'daily' | 'hourly'
  category: LeaveCategory;
  from_date?: string; // ISO date
  to_date?: string;   // ISO date
  days_count?: number; // e.g. 1, 2, 3
  date?: string;      // ISO date
  from_time?: string; // e.g. "08:30"
  to_time?: string;   // e.g. "12:00"
  hours_count?: number; // e.g. 3.5
  hours_text?: string;
  description?: string;
  replacement_person?: string;
  status?: 'approved' | 'pending' | 'rejected';
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface EmploymentPeriod {
  id: string;
  employee_id: string;
  employee_name?: string;
  start_date: string; // ISO date
  end_date?: string;   // ISO date or undefined if active
  contract_type?: 'رسمی' | 'قراردادی' | 'آزمایشی' | 'پروژه‌ای' | 'ساعتی' | 'روزانه';
  position?: string;
  reason_for_leaving?: 'پایان قرارداد' | 'استعفا' | 'تعدیل نیرو' | 'توافق طرفین' | 'بازنشستگی' | 'سایر';
  notes?: string;
  status: 'active' | 'completed';
  created_at: string;
  updated_at?: string;
}

// ------------------------------------
// هزینه‌ها (Expenses)
// ------------------------------------
export type ExpenseCategory =
  | 'حقوق و دستمزد'
  | 'اجاره و رهن'
  | 'قبوض (برق، گاز، آب، تلفن)'
  | 'خرید ابزار، قطعات و لوازم یدکی'
  | 'حمل و نقل و سوخت'
  | 'پذیرایی، ملزومات و اداری'
  | 'تعمیرات و نگهداری خطوط'
  | 'تبلیغات و بازاریابی'
  | 'بیمه و مالیات'
  | 'سایر هزینه‌ها';

export interface Expense {
  id: string;
  code: string; // EXP-1001
  title: string;
  category: ExpenseCategory;
  amount: number; // ریال
  expense_date: string; // ISO date
  beneficiary?: string; // دریافت‌کننده وجه
  payment_method: 'cash' | 'transfer' | 'cheque' | 'card';
  reference_number?: string;
  description?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ------------------------------------
// مواد اولیه (Raw Materials)
// ------------------------------------
export interface Material {
  id: string;
  code: string; // MAT-101
  name: string; // گرانول PE100، گرانول PE80، مستربچ مشکی، پایدارکننده
  grade?: string; // EX3, CRP100N, 0035, ...
  category?: string;
  unit: string; // کیلوگرم (kg)
  current_stock: number;
  min_stock_alert: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type MovementType = 'in' | 'out' | 'adjustment' | 'return_in' | 'waste';

export interface MaterialMovement {
  id: string;
  code?: string; // MOV-1001
  material_id?: string;
  material_name?: string;
  material_code?: string;
  warehouse_id?: string;
  warehouse_name?: string;
  type: MovementType; // ورود خرید | خروج مصرف
  supplier_or_line?: string; // نام تأمین‌کننده (پتروشیمی) یا شماره خط مصرف
  quantity?: number;
  quantity_kg?: number; // وزن خالص (کیلوگرم)
  bags_count?: number; // تعداد کیسه
  driver_name?: string; // نام راننده
  driver_phone?: string; // تلفن راننده
  vehicle_plate?: string; // پلاک خودرو
  unit_price?: number; // قیمت هر کیلوگرم به ریال (برای ورود)
  total_price?: number;
  waybill_number?: string; // شماره بارنامه / حواله
  reference_type?: string;
  reference_id?: string;
  shift?: 'صبح' | 'عصر' | 'شب';
  operator?: string;
  movement_date?: string; // ISO date
  description?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

// ------------------------------------
// تولید (Production Logs)
// ------------------------------------
export interface ProductionLog {
  id: string;
  code?: string;
  production_date: string; // تاریخ
  size?: string; // سایز
  pressure?: string; // فشار
  type?: string; // نوع (PE80 / PE100 / خالی)
  diameter?: string; // قطر (چیزی که در تولید شده)
  thickness?: string; // ضخامت
  motor_speed?: string; // موتور
  traction_speed?: string; // کشش
  die_mold?: string; // قالب
  pin_needle?: string; // سوزنی
  weight_unit?: number; // وزن بر اساس کیلوگرم (تا ۳ رقم اعشار)
  meters?: number; // متراژ
  total_weight?: number; // مجموع وزن (محاسبه خودکار)
  customer_name?: string; // سفارش دهنده
  notes?: string; // توضیحات
  created_at: string;
  // اختیاری جهت سازگاری با متدهای قبلی
  line_number?: string;
  pipe_size?: string;
  material_type?: string;
  meters_produced?: number;
  weight_kg?: number;
  waste_kg?: number;
  shift?: string;
  operator?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  key: string;
  category: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  user_code?: string; // Unique permanent code (e.g. USR-1001) that never changes
  name: string;
  username: string;
  password?: string;
  role_id: string;
  role_name: string;
  is_admin?: boolean;
  is_active: boolean;
  permissions?: string[]; // Specific granular permission keys
  avatar?: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_code?: string; // کد یکتا و شناسه ثابت کاربر (مانند USR-1001)
  user_name: string;
  user_role?: string;
  action: string;
  action_type?: 'create' | 'update' | 'delete' | 'status_change' | 'confirm' | 'cancel' | 'print' | 'auth' | 'other';
  entity_type: string;
  entity_id: string;
  document_number?: string;
  entity_title?: string;
  old_values?: any;
  new_values?: any;
  changes_summary?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  business_name: string;
  company_name?: string;
  brand_subtitle: string;
  logo_url: string;
  phone: string;
  fax?: string;
  email?: string;
  economic_code?: string; // کد اقتصادی
  national_id?: string; // شناسه ملی شرکت
  registration_number?: string; // شماره ثبت
  postal_code?: string;
  address: string;
  default_tax_percent: number; // e.g. 10
  default_tax_rate?: number; // alias
  
  // Default notes for documents
  default_order_notes_enabled: boolean;
  default_order_notes_text: string;
  default_invoice_notes_enabled: boolean;
  default_invoice_notes_text: string;
  default_delivery_notes_enabled: boolean;
  default_delivery_notes_text: string;

  // Backup and Reminder settings
  backup_reminder_enabled: boolean;
  backup_reminder_interval_days: number; // e.g. 7 for weekly
  last_backup_date?: string;

  order_prefix: string; // PRO
  invoice_prefix: string; // INV
  customer_prefix: string; // CUS
  product_prefix: string; // PRD
  delivery_prefix: string; // DEL
  return_prefix: string; // RET
  material_prefix: string; // MAT
  currency_unit: string; // ریال
  stamp_signature_url?: string;
  login_cover_url?: string; // تصویر کاور ستون چپ صفحه ورود (لاگین)
  login_background_url?: string; // تصویر پس‌زمینه کامل صفحه ورود (Login Background)
  print_invoice_header: string;
  print_invoice_footer_terms: string;
  default_invoice_notes?: string;
  print_invoice_signatures: {
    seller: string;
    buyer: string;
    delivery: string;
    accountant: string;
  };
  timezone: string;
  updated_at: string;
}

export type CompanySettings = SystemSettings;

export interface CustomerAccountSummary {
  customer_id: string;
  customer_name: string;
  customer_code: string;
  total_debit: number;
  total_credit: number;
  balance: number; // total_debit - total_credit
  status: CustomerStatus; // debit > 0: 'debit' | < 0: 'credit' | = 0: 'settled'
  last_transaction_date?: string;
  active_invoices_count: number;
  pending_delivery_meters: number;
}

