import React, { useState, useEffect } from 'react';
import { Customer, PaymentMethod, AdjustmentType, ReturnDoc, Payment, Adjustment } from '../../types';
import { CustomerAccountService } from '../../services/accountService';
import { DeliveryReturnService, DeliveredItemForReturn } from '../../services/deliveryReturnService';
import { StorageService } from '../../services/storageService';
import { formatCurrency, formatJalaliDate, formatNumber, getTodayISO } from '../../utils/jalali';
import { PriceInput } from '../Common/PriceInput';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import {
  CreditCard,
  Scale,
  Truck,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

// ==========================================
// 1. Payment / Deposit Modal (دریافت یا واریز وجه)
// ==========================================
interface CustomerPaymentModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultMode?: 'receipt' | 'payout'; // receipt = دریافت از مشتری, payout = واریز به مشتری
  editingPayment?: Payment | null;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess,
  defaultMode = 'receipt',
  editingPayment = null,
}) => {
  const [mode, setMode] = useState<'receipt' | 'payout'>(defaultMode);
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Cheque Fields
  const [chequeNumber, setChequeNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [dueDate, setDueDate] = useState(getTodayISO());

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (editingPayment) {
        const isPayout = editingPayment.id.startsWith('payout');
        setMode(isPayout ? 'payout' : 'receipt');
        setAmount(editingPayment.amount);
        setPaymentDate(editingPayment.payment_date);
        setPaymentMethod(editingPayment.payment_method);
        setReferenceNumber(editingPayment.reference_number || '');
        setDescription(editingPayment.description || '');
      } else {
        setMode(defaultMode);
        setAmount(0);
        setPaymentDate(getTodayISO());
        setPaymentMethod('card');
        setReferenceNumber('');
        setDescription('');
        setChequeNumber('');
        setBankName('');
        setDueDate(getTodayISO());
      }
      setErrorMessage('');
    }
  }, [isOpen, defaultMode, editingPayment]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!amount || amount <= 0) {
      setErrorMessage('مبلغ باید بزرگتر از صفر باشد.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      if (editingPayment) {
        const res = CustomerAccountService.updatePayment(editingPayment.id, {
          payment_date: paymentDate,
          amount,
          payment_method: paymentMethod,
          reference_number: referenceNumber.trim() || undefined,
          description: description.trim() || undefined,
        });
        if (!res.success) {
          setIsSubmitting(false);
          setErrorMessage(res.message || 'خطا در ویرایش پرداخت');
          return;
        }
      } else {
        if (mode === 'receipt') {
          const res = CustomerAccountService.createPayment({
            customer_id: customer.id,
            payment_date: paymentDate,
            amount,
            payment_method: paymentMethod,
            reference_number: referenceNumber.trim() || undefined,
            description: description.trim() || undefined,
            cheque_data:
              paymentMethod === 'cheque'
                ? {
                    cheque_number: chequeNumber.trim(),
                    bank_name: bankName.trim(),
                    due_date: dueDate || paymentDate,
                    description: description.trim(),
                  }
                : undefined,
          });

          if (!res.success) {
            setIsSubmitting(false);
            setErrorMessage(res.message || 'خطا در ثبت دریافت وجه');
            return;
          }
        } else {
          // Payout / refund to customer
          const res = CustomerAccountService.createPayout({
            customer_id: customer.id,
            payout_date: paymentDate,
            amount,
            payment_method: paymentMethod,
            reference_number: referenceNumber.trim() || undefined,
            description: description.trim() || undefined,
          });

          if (!res.success) {
            setIsSubmitting(false);
            setErrorMessage(res.message || 'خطا در ثبت واریز به مشتری');
            return;
          }
        }
      }

      // Synchronous local state update and refresh
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'خطای غیرمنتظره در ثبت تراکنش');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-xl ${
                mode === 'receipt' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {mode === 'receipt' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">
                {mode === 'receipt' ? 'ثبت دریافت وجه از مشتری' : 'ثبت واریز وجه به مشتری (عودت وجه)'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">مشتری: {customer.name} ({customer.code})</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('receipt')}
            className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              mode === 'receipt'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            دریافت از مشتری (بستانکار)
          </button>
          <button
            type="button"
            onClick={() => setMode('payout')}
            className={`py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              mode === 'payout'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            واریز به مشتری (بدهکار / عودت)
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <PriceInput
            label={mode === 'receipt' ? 'مبلغ دریافتی (ریال)' : 'مبلغ واریزی به حساب مشتری (ریال)'}
            required
            value={amount}
            onChange={setAmount}
            placeholder="مثال: ۲۵۰,۰۰۰,۰۰۰"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <JalaliDatePicker
              label="تاریخ تراکنش"
              required
              value={paymentDate}
              onChange={(iso) => setPaymentDate(iso)}
            />

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                روش پرداخت / واریز <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-medium"
              >
                <option value="card">کارتخوان (POS)</option>
                <option value="bank_transfer">حواله بانکی / پایا / ساتنا</option>
                <option value="cash">نقدی</option>
                {mode === 'receipt' && <option value="cheque">چک صیادی</option>}
                <option value="other">سایر</option>
              </select>
            </div>
          </div>

          {/* Cheque specific inputs if receipt and cheque */}
          {mode === 'receipt' && paymentMethod === 'cheque' && (
            <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
              <div className="text-[11px] font-bold text-blue-900 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                مشخصات چک صیادی
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">شماره صیاد / سریال چک *</label>
                  <input
                    type="text"
                    required
                    placeholder="۱۶ رقمی یا سریال"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">نام بانک و شعبه *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ملی شعبه مرکزی"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs"
                  />
                </div>
              </div>
              <JalaliDatePicker
                label="تاریخ سررسید چک"
                required
                value={dueDate}
                onChange={(iso) => setDueDate(iso)}
              />
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">شماره پیگیری / مرجع بانکی</label>
            <input
              type="text"
              placeholder="کد پیگیری تراکنش..."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">شرح و توضیحات</label>
            <textarea
              rows={2}
              placeholder="توضیحات تکمیلی..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer disabled:opacity-40"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-white font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                mode === 'receipt' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال ثبت اطلاعات...</span>
                </>
              ) : (
                <span>{mode === 'receipt' ? 'ثبت دریافت وجه' : 'ثبت واریز به مشتری'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 2. Adjustment Modal (تعدیل مالی)
// ==========================================
interface CustomerAdjustmentModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingAdjustment?: Adjustment | null;
}

export const CustomerAdjustmentModal: React.FC<CustomerAdjustmentModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess,
  editingAdjustment = null,
}) => {
  const [adjustmentDate, setAdjustmentDate] = useState<string>(getTodayISO());
  const [type, setType] = useState<AdjustmentType>('credit');
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      if (editingAdjustment) {
        setAdjustmentDate(editingAdjustment.adjustment_date);
        setType(editingAdjustment.type);
        setAmount(editingAdjustment.amount);
        setDescription(editingAdjustment.description);
      } else {
        setAdjustmentDate(getTodayISO());
        setType('credit');
        setAmount(0);
        setDescription('');
      }
      setErrorMessage('');
    }
  }, [isOpen, editingAdjustment]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!amount || amount <= 0) {
      setErrorMessage('مبلغ تعدیل باید بزرگتر از صفر باشد.');
      return;
    }
    if (!description.trim()) {
      setErrorMessage('درج شرح و علت تعدیل الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      let res;
      if (editingAdjustment) {
        res = CustomerAccountService.updateAdjustment(editingAdjustment.id, {
          adjustment_date: adjustmentDate,
          type,
          amount,
          description: description.trim(),
        });
      } else {
        res = CustomerAccountService.createAdjustment({
          customer_id: customer.id,
          adjustment_date: adjustmentDate,
          type,
          amount,
          description: description.trim(),
        });
      }

      if (!res.success) {
        setIsSubmitting(false);
        setErrorMessage(res.message || 'خطا در ثبت سند تعدیل');
        return;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'خطای غیرمنتظره در ثبت سند تعدیل');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">ثبت تعدیل مالی حساب مشتری</h3>
              <p className="text-[11px] text-slate-500 font-medium">مشتری: {customer.name} ({customer.code})</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              نوع تعدیل <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('credit')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                  type === 'credit'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                تعدیل بستانکار (کاهش بدهی مشتری)
              </button>
              <button
                type="button"
                onClick={() => setType('debit')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition cursor-pointer ${
                  type === 'debit'
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                تعدیل بدهکار (افزایش بدهی مشتری)
              </button>
            </div>
          </div>

          <PriceInput
            label="مبلغ تعدیل (ریال)"
            required
            value={amount}
            onChange={setAmount}
            placeholder="مثال: ۱۰,۰۰۰,۰۰۰"
          />

          <JalaliDatePicker
            label="تاریخ سند تعدیل"
            required
            value={adjustmentDate}
            onChange={(iso) => setAdjustmentDate(iso)}
          />

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              شرح و علت تعدیل <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              placeholder="مثال: تخفیف ویژه توافق‌شده در جلسه، اصلاح خطای حسابداری، رند کردن مانده حساب..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden leading-relaxed"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer disabled:opacity-40"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال ثبت اطلاعات...</span>
                </>
              ) : (
                <span>ثبت سند تعدیل</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// 3. Direct Sales Return Modal (برگشت از فروش)
// ==========================================
interface ReturnRowState {
  unique_key: string;
  invoice_id: string;
  invoice_item_id: string;
  invoice_number: string;
  product_id: string;
  product_name: string;
  product_code: string;
  product_spec?: string;
  available_for_return: number;
  return_now_meters: number;
  unit_price: number;
  latest_delivery_date?: string;
  is_selected: boolean;
}

interface CustomerReturnModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialInvoiceId?: string;
  editingReturn?: ReturnDoc | null;
}

export const CustomerReturnModal: React.FC<CustomerReturnModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess,
  initialInvoiceId,
  editingReturn,
}) => {
  const [returnDate, setReturnDate] = useState<string>(getTodayISO());
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [returnRows, setReturnRows] = useState<ReturnRowState[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setErrorMessage('');

      if (editingReturn) {
        setReturnDate(editingReturn.return_date || getTodayISO());
        setReason(editingReturn.reason || '');
        setDescription(editingReturn.description || '');

        const items = DeliveryReturnService.getCustomerDeliveredItemsForReturn(
          customer.id,
          editingReturn.id
        );

        const availableItemsToMatch = [...(editingReturn.items || [])];

        const rows: ReturnRowState[] = items.map((item, idx) => {
          let matchIdx = -1;

          // 1. Match by invoice_item_id if available
          if (item.invoice_item_id) {
            matchIdx = availableItemsToMatch.findIndex(
              (ri) => ri.invoice_item_id && ri.invoice_item_id === item.invoice_item_id
            );
          }

          // 2. Match by invoice_id AND product_name / spec / code
          if (matchIdx === -1) {
            matchIdx = availableItemsToMatch.findIndex((ri) => {
              if (ri.invoice_id !== item.invoice_id) return false;
              if (item.product_name && ri.product_name && item.product_name.trim().toLowerCase() === ri.product_name.trim().toLowerCase()) return true;
              if (item.product_spec && ri.product_spec && item.product_spec.trim().toLowerCase() === ri.product_spec.trim().toLowerCase()) return true;
              if (item.product_code && ri.product_code && item.product_code === ri.product_code) return true;
              if (item.product_id && ri.product_id && item.product_id !== 'prd-custom' && item.product_id === ri.product_id) return true;
              return false;
            });
          }

          // 3. Match by invoice_id and unit price
          if (matchIdx === -1) {
            matchIdx = availableItemsToMatch.findIndex(
              (ri) => ri.invoice_id === item.invoice_id && ri.unit_price === item.unit_price
            );
          }

          // 4. Fallback by invoice_id
          if (matchIdx === -1) {
            matchIdx = availableItemsToMatch.findIndex(
              (ri) => ri.invoice_id === item.invoice_id
            );
          }

          let matchedItem: any = null;
          if (matchIdx !== -1) {
            matchedItem = availableItemsToMatch[matchIdx];
            availableItemsToMatch.splice(matchIdx, 1); // CRITICAL: Consume so next items cannot match it
          }

          const isSelected = !!matchedItem;
          const returnMeters = matchedItem ? matchedItem.quantity_meters : item.available_for_return;
          const unitPrice = matchedItem ? matchedItem.unit_price : item.unit_price;

          return {
            unique_key: `${item.invoice_id}_${item.invoice_item_id}_${idx}`,
            invoice_id: item.invoice_id,
            invoice_item_id: item.invoice_item_id,
            invoice_number: item.invoice_number,
            product_id: item.product_id,
            product_name: item.product_name,
            product_code: item.product_code,
            product_spec: item.product_spec,
            available_for_return: item.available_for_return,
            return_now_meters: returnMeters,
            unit_price: unitPrice,
            latest_delivery_date: item.latest_delivery_date,
            is_selected: isSelected,
          };
        });

        setReturnRows(rows);
      } else {
        setReturnDate(getTodayISO());
        setReason('');
        setDescription('');

        const items = DeliveryReturnService.getCustomerDeliveredItemsForReturn(customer.id);
        const rows: ReturnRowState[] = items.map((item, idx) => ({
          unique_key: `${item.invoice_id}_${item.invoice_item_id}_${idx}`,
          invoice_id: item.invoice_id,
          invoice_item_id: item.invoice_item_id,
          invoice_number: item.invoice_number,
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          product_spec: item.product_spec,
          available_for_return: item.available_for_return,
          return_now_meters: item.available_for_return,
          unit_price: item.unit_price,
          latest_delivery_date: item.latest_delivery_date,
          // decoupled: default to unselected so user explicitly chooses which item to return
          is_selected: initialInvoiceId ? item.invoice_id === initialInvoiceId : false,
        }));
        setReturnRows(rows);
      }
    }
  }, [isOpen, customer.id, initialInvoiceId, editingReturn]);

  if (!isOpen) return null;

  const handleToggleRow = (idx: number) => {
    setReturnRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, is_selected: !row.is_selected } : row))
    );
  };

  const handleMetersChange = (idx: number, val: number) => {
    setReturnRows((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        const safeVal = Math.min(Math.max(0, val), row.available_for_return);
        return { ...row, return_now_meters: safeVal };
      })
    );
  };

  const handlePriceChange = (idx: number, val: number) => {
    setReturnRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, unit_price: Math.max(0, val) } : row))
    );
  };

  const totalCalculatedReturn = returnRows.reduce((sum, item) => {
    if (item.is_selected && item.return_now_meters > 0) {
      return sum + Math.round(item.return_now_meters * item.unit_price);
    }
    return sum;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!reason.trim()) {
      setErrorMessage('درج علت برگشت کالا الزامی است.');
      return;
    }

    const selectedItems = returnRows.filter((r) => r.is_selected && r.return_now_meters > 0);
    if (selectedItems.length === 0) {
      setErrorMessage('حداقل یک قلم کالا با متراژ معتبر باید برای برگشت تیک زده شود.');
      return;
    }

    // Client-side date check against delivery date
    for (const item of selectedItems) {
      if (item.latest_delivery_date && returnDate < item.latest_delivery_date) {
        setErrorMessage(
          `خطای تاریخ: تاریخ برگشت کالا (${formatJalaliDate(returnDate)}) نمی‌تواند قبل از تاریخ تحویل (${formatJalaliDate(item.latest_delivery_date)}) باشد. تاریخ برگشت باید بعد از تحویل کالا یا برابر با آن باشد.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        customer_id: customer.id,
        return_date: returnDate,
        reason: reason.trim(),
        description: description.trim() || undefined,
        items: selectedItems.map((item) => ({
          invoice_id: item.invoice_id,
          invoice_item_id: item.invoice_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          product_spec: item.product_spec,
          quantity_meters: item.return_now_meters,
          unit_price: item.unit_price,
        })),
      };

      let res: { success: boolean; message: string };
      if (editingReturn) {
        res = DeliveryReturnService.updateReturn(editingReturn.id, payload);
      } else {
        res = DeliveryReturnService.createReturn(payload);
      }

      if (!res.success) {
        setIsSubmitting(false);
        setErrorMessage(res.message || 'خطا در ثبت سند مرجوعی');
        return;
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});
      setIsSubmitting(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'خطای غیرمنتظره در ثبت سند مرجوعی');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 z-50">
      <div className="bg-white rounded-2xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${editingReturn ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">
                {editingReturn
                  ? `ویرایش سند برگشت از فروش (${editingReturn.return_number})`
                  : 'ثبت سند برگشت از فروش (مرجوعی کالا)'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                مشتری: <span className="font-bold text-slate-700">{customer.name}</span> (کد: {customer.code})
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-5 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <JalaliDatePicker
                label="تاریخ برگشت کالا"
                required
                value={returnDate}
                onChange={(iso) => setReturnDate(iso)}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                * توجه: تاریخ برگشت باید هم‌زمان با تاریخ تحویل یا بعد از آن باشد.
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                علت برگشت کالا <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="مثال: معیوب بودن لوله، تغییر نقشه پروژه، انصراف خریدار..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden font-medium text-slate-800"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-slate-800 font-bold text-xs sm:text-sm">
                اقلام تحویل‌شده دارای قابلیت برگشت (انتخاب مستقل هر قلم، متراژ و قیمت واحد):
              </label>
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                {returnRows.filter((r) => r.is_selected).length} از {returnRows.length} قلم انتخاب شده
              </span>
            </div>

            {returnRows.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-sm">
                هیچ کالای تحویل‌شده‌ای برای این مشتری جهت برگشت یافت نشد.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-xs">
                <table className="w-full text-center text-xs sm:text-sm min-w-[700px]">
                  <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-12">انتخاب</th>
                      <th className="py-3 px-3">شماره فاکتور</th>
                      <th className="py-3 px-3">نام و مشخصات کالا</th>
                      <th className="py-3 px-3">تاریخ تحویل</th>
                      <th className="py-3 px-3">سقف قابل برگشت</th>
                      <th className="py-3 px-3 w-32">متراژ مرجوعی (متر)</th>
                      <th className="py-3 px-3 w-36">قیمت واحد (ریال)</th>
                      <th className="py-3 px-3">مبلغ کل ردیف (ریال)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {returnRows.map((row, idx) => {
                      const lineTotal = Math.round((row.return_now_meters || 0) * (row.unit_price || 0));

                      return (
                        <tr key={row.unique_key} className={row.is_selected ? 'bg-rose-50/40' : 'hover:bg-slate-50/60'}>
                          <td className="py-3 px-3">
                            <input
                              type="checkbox"
                              checked={row.is_selected}
                              onChange={() => handleToggleRow(idx)}
                              className="w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 font-bold text-slate-700">{row.invoice_number}</td>
                          <td className="py-3 px-3 text-slate-900 font-medium text-right pr-4">
                            <span className="block font-bold">{row.product_name}</span>
                            {row.product_spec && (
                              <span className="text-[11px] text-slate-500 block font-medium">{row.product_spec}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-slate-600 text-xs font-medium">
                            {row.latest_delivery_date ? formatJalaliDate(row.latest_delivery_date) : '—'}
                          </td>
                          <td className="py-3 px-3 font-bold text-blue-700">
                            {formatNumber(row.available_for_return)} م
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              step="any"
                              disabled={!row.is_selected}
                              min={0.1}
                              max={row.available_for_return}
                              value={row.return_now_meters || ''}
                              onChange={(e) => handleMetersChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-center font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden disabled:opacity-40 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              step="any"
                              disabled={!row.is_selected}
                              min={0}
                              value={row.unit_price || ''}
                              onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-center font-bold focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden disabled:opacity-40 disabled:bg-slate-100"
                            />
                          </td>
                          <td className="py-3 px-3 font-black text-slate-900">
                            {row.is_selected ? formatCurrency(lineTotal) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="font-bold text-slate-700 text-xs sm:text-sm">مجموع مبلغ بستانکاری حاصل از برگشت:</span>
            <span className="font-black text-rose-600 text-base sm:text-lg">
              {formatCurrency(totalCalculatedReturn)}
            </span>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1.5">توضیحات تکمیلی سند برگشت</label>
            <textarea
              rows={2}
              placeholder="توضیحات بیشتر در خصوص علت یا شرایط بار مرجوعی..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-hidden leading-relaxed text-slate-800"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer transition disabled:opacity-40"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting || returnRows.length === 0}
              className={`px-6 py-2.5 rounded-xl ${
                editingReturn ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
              } disabled:opacity-50 text-white font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال ثبت اطلاعات...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>{editingReturn ? 'ذخیره تغییرات سند برگشت' : 'ثبت سند برگشت از فروش'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

