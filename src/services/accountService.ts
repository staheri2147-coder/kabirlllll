import { StorageService } from './storageService';
import {
  CustomerTransaction,
  Adjustment,
  Payment,
  Cheque,
  ChequeStatus,
  AdjustmentType,
  PaymentMethod,
} from '../types';

export class CustomerAccountService {
  // Get full transaction ledger for a customer with running balance
  static getCustomerLedger(customerId: string) {
    const transactions = (StorageService.getTransactions() || [])
      .filter((t) => t && t.customer_id === customerId)
      .sort((a, b) => {
        const timeA = new Date(a?.transaction_date || a?.created_at || 0).getTime() || 0;
        const timeB = new Date(b?.transaction_date || b?.created_at || 0).getTime() || 0;
        return timeA - timeB;
      });

    let runningBalance = 0;
    const ledgerWithBalance = transactions.map((t) => {
      const debit = Number(t?.debit) || 0;
      const credit = Number(t?.credit) || 0;
      runningBalance += debit - credit;
      let status: 'debit' | 'credit' | 'settled' = 'settled';
      if (runningBalance > 0) status = 'debit';
      else if (runningBalance < 0) status = 'credit';

      return {
        ...t,
        debit,
        credit,
        running_balance: runningBalance,
        balance_status: status,
      };
    });

    return ledgerWithBalance;
  }

  // Record a Customer Payment
  static createPayment(data: {
    customer_id: string;
    payment_date: string;
    amount: number;
    payment_method: PaymentMethod;
    reference_number?: string;
    description?: string;
    cheque_data?: {
      cheque_number: string;
      bank_name: string;
      due_date: string;
      description?: string;
    };
  }): { success: boolean; message: string; payment?: Payment } {
    if (!data.customer_id) return { success: false, message: 'انتخاب مشتری الزامی است.' };
    if (!data.amount || data.amount <= 0) return { success: false, message: 'مبلغ پرداختی باید بیشتر از صفر باشد.' };

    const customers = StorageService.getCustomers();
    const customer = customers.find((c) => c.id === data.customer_id);
    if (!customer) return { success: false, message: 'مشتری مورد نظر یافت نشد.' };

    const currentUser = StorageService.getActiveUser();
    const payments = StorageService.getPayments();
    const transactions = StorageService.getTransactions();

    const paymentId = `pay-${Date.now()}`;
    let chequeId: string | undefined;

    // Handle Cheque creation if payment method is cheque
    if (data.payment_method === 'cheque' && data.cheque_data) {
      if (!data.cheque_data.cheque_number || !data.cheque_data.bank_name || !data.cheque_data.due_date) {
        return { success: false, message: 'اطلاعات کامل چک (شماره، نام بانک، تاریخ سررسید) الزامی است.' };
      }
      chequeId = `chq-${Date.now()}`;
      const newCheque: Cheque = {
        id: chequeId,
        payment_id: paymentId,
        customer_id: customer.id,
        customer_name: customer.name,
        cheque_number: data.cheque_data.cheque_number,
        bank_name: data.cheque_data.bank_name,
        due_date: data.cheque_data.due_date,
        amount: data.amount,
        status: 'pending',
        description: data.cheque_data.description || data.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const cheques = StorageService.getCheques();
      cheques.unshift(newCheque);
      StorageService.saveCheques(cheques);
    }

    const newPayment: Payment = {
      id: paymentId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_code: customer.code,
      payment_date: data.payment_date,
      amount: data.amount,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      description: data.description,
      cheque_id: chequeId,
      created_by: currentUser.name,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    payments.unshift(newPayment);
    StorageService.savePayments(payments);

    // Financial Transaction: credit to customer account
    const methodNames: Record<string, string> = {
      cash: 'نقدی',
      card: 'کارتخوان',
      pos: 'کارتخوان',
      bank_transfer: 'حواله بانکی',
      transfer: 'حواله بانکی',
      cheque: 'چک صیادی',
      other: 'سایر',
    };

    const newTx: CustomerTransaction = {
      id: `tx-${Date.now()}`,
      customer_id: customer.id,
      transaction_date: data.payment_date,
      type: 'payment',
      debit: 0,
      credit: data.amount,
      description: `دریافت وجه (${methodNames[data.payment_method]}) ${data.reference_number ? `- رهگیری: ${data.reference_number}` : ''} ${data.description ? `- ${data.description}` : ''}`.trim(),
      reference_type: 'payment',
      reference_id: paymentId,
      reference_number: data.reference_number || `PAY-${paymentId.slice(-4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    transactions.push(newTx);
    StorageService.saveTransactions(transactions);

    StorageService.logAudit('ثبت دریافت و پرداخت', 'PAYMENT', paymentId, null, newPayment);

    return { success: true, message: 'پرداخت با موفقیت ثبت شد و حساب مشتری بستانکار گردید.', payment: newPayment };
  }

  // Record a Deposit/Payout to Customer (واریز وجه به حساب مشتری - عودت وجه / تسویه بستانکاری)
  static createPayout(data: {
    customer_id: string;
    payout_date: string;
    amount: number;
    payment_method: PaymentMethod;
    reference_number?: string;
    description?: string;
  }): { success: boolean; message: string; payment?: Payment } {
    if (!data.customer_id) return { success: false, message: 'انتخاب مشتری الزامی است.' };
    if (!data.amount || data.amount <= 0) return { success: false, message: 'مبلغ پرداختی باید بیشتر از صفر باشد.' };

    const customers = StorageService.getCustomers();
    const customer = customers.find((c) => c.id === data.customer_id);
    if (!customer) return { success: false, message: 'مشتری مورد نظر یافت نشد.' };

    const currentUser = StorageService.getActiveUser();
    const payments = StorageService.getPayments();
    const transactions = StorageService.getTransactions();

    const paymentId = `payout-${Date.now()}`;
    const newPayment: Payment = {
      id: paymentId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_code: customer.code,
      payment_date: data.payout_date,
      amount: data.amount,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      description: data.description ? `واریز/عودت وجه به مشتری: ${data.description}` : 'واریز/عودت وجه به مشتری',
      created_by: currentUser.name,
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    payments.unshift(newPayment);
    StorageService.savePayments(payments);

    const methodNames: Record<PaymentMethod, string> = {
      cash: 'نقدی',
      card: 'کارتخوان',
      bank_transfer: 'حواله بانکی / پایا / ساتنا',
      transfer: 'حواله بانکی',
      pos: 'دستگاه کارتخوان (POS)',
      cheque: 'چک صیادی',
      other: 'سایر',
    };

    // Financial Transaction: DEBIT to customer account (افزایش بدهکاری مشتری / کاهش بستانکاری)
    const newTx: CustomerTransaction = {
      id: `tx-${Date.now()}`,
      customer_id: customer.id,
      transaction_date: data.payout_date,
      type: 'payment',
      debit: data.amount,
      credit: 0,
      description: `واریز وجه به مشتری (${methodNames[data.payment_method]}) ${data.reference_number ? `- پیگیری: ${data.reference_number}` : ''} ${data.description ? `- ${data.description}` : ''}`.trim(),
      reference_type: 'payment',
      reference_id: paymentId,
      reference_number: data.reference_number || `OUT-${paymentId.slice(-4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    transactions.push(newTx);
    StorageService.saveTransactions(transactions);

    StorageService.logAudit('ثبت واریز وجه به مشتری (عودت وجه)', 'PAYMENT', paymentId, null, newPayment);

    return { success: true, message: 'مبلغ با موفقیت به حساب مشتری واریز شد و در صورتحساب بدهکار گردید.', payment: newPayment };
  }

  // Update Cheque Status
  static updateChequeStatus(chequeId: string, newStatus: ChequeStatus, note?: string): { success: boolean; message: string } {
    const cheques = StorageService.getCheques();
    const chequeIndex = cheques.findIndex((c) => c.id === chequeId);
    if (chequeIndex === -1) return { success: false, message: 'چک یافت نشد.' };

    const oldCheque = { ...cheques[chequeIndex] };
    cheques[chequeIndex].status = newStatus;
    if (note) cheques[chequeIndex].description = `${cheques[chequeIndex].description || ''} | ${note}`.trim();
    cheques[chequeIndex].updated_at = new Date().toISOString();

    StorageService.saveCheques(cheques);
    StorageService.logAudit(`تغییر وضعیت چک به ${newStatus}`, 'CHEQUE', chequeId, oldCheque, cheques[chequeIndex]);

    return { success: true, message: 'وضعیت چک با موفقیت بروزرسانی شد.' };
  }

  // Create Customer Adjustment (تعدیل دوطرفه - debit or credit)
  static createAdjustment(data: {
    customer_id: string;
    adjustment_date: string;
    amount: number;
    type: AdjustmentType; // debit or credit
    description: string;
  }): { success: boolean; message: string; adjustment?: Adjustment } {
    if (!data.customer_id) return { success: false, message: 'انتخاب مشتری الزامی است.' };
    if (!data.amount || data.amount <= 0) return { success: false, message: 'مبلغ تعدیل باید همیشه عدد مثبت و بزرگتر از صفر باشد.' };
    if (!data.description) return { success: false, message: 'درج شرح و علت تعدیل الزامی است.' };

    const customers = StorageService.getCustomers();
    const customer = customers.find((c) => c.id === data.customer_id);
    if (!customer) return { success: false, message: 'مشتری مورد نظر یافت نشد.' };

    const currentUser = StorageService.getActiveUser();
    const adjustments = StorageService.getAdjustments();
    const transactions = StorageService.getTransactions();

    const adjId = `adj-${Date.now()}`;
    const newAdjustment: Adjustment = {
      id: adjId,
      customer_id: customer.id,
      customer_name: customer.name,
      adjustment_date: data.adjustment_date,
      amount: data.amount,
      type: data.type,
      description: data.description,
      created_by: currentUser.name,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    adjustments.unshift(newAdjustment);
    StorageService.saveAdjustments(adjustments);

    // Create CustomerTransaction according to type
    const newTx: CustomerTransaction = {
      id: `tx-${Date.now()}`,
      customer_id: customer.id,
      transaction_date: data.adjustment_date,
      type: 'adjustment',
      debit: data.type === 'debit' ? data.amount : 0,
      credit: data.type === 'credit' ? data.amount : 0,
      description: `تعدیل حساب (${data.type === 'debit' ? 'بدهکار' : 'بستانکار'}): ${data.description}`,
      reference_type: 'adjustment',
      reference_id: adjId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    transactions.push(newTx);
    StorageService.saveTransactions(transactions);

    StorageService.logAudit('ثبت تعدیل حساب مشتری', 'ADJUSTMENT', adjId, null, newAdjustment);

    return { success: true, message: 'تعدیل مالی با موفقیت ثبت شد و مانده حساب بروزرسانی گردید.', adjustment: newAdjustment };
  }

  // Edit Adjustment
  static updateAdjustment(
    adjustmentId: string,
    data: {
      adjustment_date: string;
      amount: number;
      type: AdjustmentType;
      description: string;
    }
  ): { success: boolean; message: string } {
    const adjustments = StorageService.getAdjustments();
    const adjIndex = adjustments.findIndex((a) => a.id === adjustmentId);
    if (adjIndex === -1) return { success: false, message: 'سند تعدیل یافت نشد.' };

    const oldAdj = { ...adjustments[adjIndex] };
    const currentUser = StorageService.getActiveUser();

    adjustments[adjIndex] = {
      ...adjustments[adjIndex],
      adjustment_date: data.adjustment_date,
      amount: data.amount,
      type: data.type,
      description: data.description,
      updated_by: currentUser.name,
      updated_at: new Date().toISOString(),
    };
    StorageService.saveAdjustments(adjustments);

    // Sync matching transaction
    const transactions = StorageService.getTransactions();
    const txIndex = transactions.findIndex((t) => t.reference_type === 'adjustment' && t.reference_id === adjustmentId);
    if (txIndex !== -1) {
      transactions[txIndex] = {
        ...transactions[txIndex],
        transaction_date: data.adjustment_date,
        debit: data.type === 'debit' ? data.amount : 0,
        credit: data.type === 'credit' ? data.amount : 0,
        description: `تعدیل حساب (${data.type === 'debit' ? 'بدهکار' : 'بستانکار'}): ${data.description}`,
        updated_at: new Date().toISOString(),
      };
      StorageService.saveTransactions(transactions);
    }

    StorageService.logAudit('ویرایش سند تعدیل حساب', 'ADJUSTMENT', adjustmentId, oldAdj, adjustments[adjIndex]);

    return { success: true, message: 'سند تعدیل و اثرات مالی آن با موفقیت ویرایش شدند.' };
  }

  // Edit Payment / Payout
  static updatePayment(
    paymentId: string,
    data: {
      payment_date: string;
      amount: number;
      payment_method: PaymentMethod;
      reference_number?: string;
      description?: string;
    }
  ): { success: boolean; message: string } {
    const payments = StorageService.getPayments();
    const idx = payments.findIndex((p) => p.id === paymentId);
    if (idx === -1) return { success: false, message: 'تراکنش پرداخت یافت نشد.' };

    const oldPayment = { ...payments[idx] };
    const isPayout = paymentId.startsWith('payout');

    payments[idx] = {
      ...payments[idx],
      payment_date: data.payment_date,
      amount: data.amount,
      payment_method: data.payment_method,
      reference_number: data.reference_number,
      description: data.description,
      updated_at: new Date().toISOString(),
    };
    StorageService.savePayments(payments);

    // Sync transaction
    const transactions = StorageService.getTransactions();
    const txIdx = transactions.findIndex((t) => t.reference_type === 'payment' && t.reference_id === paymentId);
    if (txIdx !== -1) {
      const methodNames: Record<PaymentMethod, string> = {
        cash: 'نقدی',
        card: 'کارتخوان',
        bank_transfer: 'حواله بانکی',
        transfer: 'حواله بانکی',
        pos: 'دستگاه کارتخوان (POS)',
        cheque: 'چک صیادی',
        other: 'سایر',
      };
      transactions[txIdx] = {
        ...transactions[txIdx],
        transaction_date: data.payment_date,
        debit: isPayout ? data.amount : 0,
        credit: isPayout ? 0 : data.amount,
        description: isPayout
          ? `واریز وجه به مشتری (${methodNames[data.payment_method]}) ${data.reference_number ? `- پیگیری: ${data.reference_number}` : ''} ${data.description ? `- ${data.description}` : ''}`.trim()
          : `دریافت وجه (${methodNames[data.payment_method]}) ${data.reference_number ? `- رهگیری: ${data.reference_number}` : ''} ${data.description ? `- ${data.description}` : ''}`.trim(),
        updated_at: new Date().toISOString(),
      };
      StorageService.saveTransactions(transactions);
    }

    StorageService.logAudit('ویرایش تراکنش پرداخت/دریافت', 'PAYMENT', paymentId, oldPayment, payments[idx]);
    return { success: true, message: 'تراکنش مالی با موفقیت ویرایش شد.' };
  }

  // Delete Payment / Payout
  static deletePayment(paymentId: string): { success: boolean; message: string } {
    const payments = StorageService.getPayments();
    const idx = payments.findIndex((p) => p.id === paymentId);
    if (idx === -1) return { success: false, message: 'تراکنش پرداخت یافت نشد.' };

    const payment = payments[idx];
    payments.splice(idx, 1);
    StorageService.savePayments(payments);

    // Delete matching transaction
    const transactions = StorageService.getTransactions();
    const newTransactions = transactions.filter((t) => !(t.reference_type === 'payment' && t.reference_id === paymentId));
    StorageService.saveTransactions(newTransactions);

    StorageService.logAudit('حذف تراکنش پرداخت/دریافت', 'PAYMENT', paymentId, payment, null);
    return { success: true, message: 'تراکنش مالی با موفقیت حذف شد.' };
  }

  // Delete Adjustment
  static deleteAdjustment(adjustmentId: string): { success: boolean; message: string } {
    const adjustments = StorageService.getAdjustments();
    const idx = adjustments.findIndex((a) => a.id === adjustmentId);
    if (idx === -1) return { success: false, message: 'سند تعدیل یافت نشد.' };

    const adj = adjustments[idx];
    adjustments.splice(idx, 1);
    StorageService.saveAdjustments(adjustments);

    // Delete matching transaction
    const transactions = StorageService.getTransactions();
    const newTransactions = transactions.filter((t) => !(t.reference_type === 'adjustment' && t.reference_id === adjustmentId));
    StorageService.saveTransactions(newTransactions);

    StorageService.logAudit('حذف سند تعدیل حساب', 'ADJUSTMENT', adjustmentId, adj, null);
    return { success: true, message: 'سند تعدیل با موفقیت حذف شد.' };
  }

  // Aliases for compatibility
  static recordPayment(data: Parameters<typeof CustomerAccountService.createPayment>[0]) {
    return this.createPayment(data);
  }

  static recordAdjustment(data: Parameters<typeof CustomerAccountService.createAdjustment>[0]) {
    return this.createAdjustment(data);
  }
}
