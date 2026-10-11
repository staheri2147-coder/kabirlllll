import React, { useState } from 'react';
import { Employee, EmployeeTransaction, EmployeeTxType } from '../../types';
import { StorageService } from '../../services/storageService';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { RialInput } from '../Common/RialInput';
import { Edit2, CheckCircle2, AlertCircle, X, ArrowUpRight, DollarSign } from 'lucide-react';

interface EditTxModalProps {
  transaction: EmployeeTransaction;
  employee: Employee;
  onClose: () => void;
  onSaved: () => void;
}

export const EditTxModal: React.FC<EditTxModalProps> = ({
  transaction,
  employee,
  onClose,
  onSaved,
}) => {
  const [date, setDate] = useState(transaction.date);
  const [type, setType] = useState<EmployeeTxType>(transaction.type);
  const [amount, setAmount] = useState<number>(transaction.amount);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'cheque'>(
    transaction.payment_method || 'bank_transfer'
  );
  const [referenceNumber, setReferenceNumber] = useState(transaction.reference_number || '');
  const [description, setDescription] = useState(transaction.description || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('مبلغ تراکنش باید بزرگتر از صفر باشد.');
      return;
    }

    const updated: EmployeeTransaction = {
      ...transaction,
      date,
      type,
      amount,
      payment_method: type === 'payment' ? paymentMethod : undefined,
      reference_number: referenceNumber.trim() || undefined,
      description: description.trim(),
    };

    StorageService.updateEmployeeTransaction(updated);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
    }
    StorageService.pushToHost().catch(() => {});
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Edit2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm">ویرایش سند مالی کارمند</h3>
              <p className="text-[11px] text-slate-500 font-medium">
                کارمند: <span className="font-bold text-slate-800">{employee.name}</span> ({employee.code})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Transaction Type Select */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">نوع سند</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('accrual')}
                className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  type === 'accrual'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>حقوق / بستانکاری</span>
              </button>
              <button
                type="button"
                onClick={() => setType('payment')}
                className={`py-2 px-3 rounded-xl border text-center font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  type === 'payment'
                    ? 'bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-500/20'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>پرداخت / مساعده</span>
              </button>
            </div>
          </div>

          <JalaliDatePicker
            label="تاریخ سند"
            value={date}
            onChange={(d) => setDate(d)}
            required
          />

          <RialInput
            label="مبلغ سند (ریال)"
            value={amount}
            onChange={(val) => setAmount(val)}
            required
            placeholder="مبلغ به ریال"
          />

          {type === 'payment' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">روش پرداخت</label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as 'cash' | 'card' | 'bank_transfer' | 'cheque')
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 font-medium"
                >
                  <option value="bank_transfer">حواله پایا / ساتنا</option>
                  <option value="card">کارت به کارت / پوز</option>
                  <option value="cash">نقدی / صندوق</option>
                  <option value="cheque">چک بانکی</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">شماره پیگیری / فیش</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="کد پیگیری..."
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none font-mono text-xs text-slate-800"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">بابت / شرح سند</label>
            <input
              type="text"
              placeholder="توضیحات و بابت سند..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-xs transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ذخیره تغییرات سند</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
