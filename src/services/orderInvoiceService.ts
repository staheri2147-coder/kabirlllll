import { StorageService } from './storageService';
import {
  Order,
  OrderItem,
  Invoice,
  InvoiceItem,
  CustomerTransaction,
} from '../types';
import { ensureArray } from '../utils/itemUtils';

export class OrderInvoiceService {
  // Calculate Totals Formula
  static calculateTotals(
    items: { quantity_meters: number; unit_price: number }[],
    discountEnabled: boolean,
    discountAmount: number,
    taxEnabled: boolean,
    taxPercent: number
  ) {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity_meters || 0) * Number(item.unit_price || 0)), 0);
    const discount = discountEnabled ? Math.min(subtotal, Math.max(0, Number(discountAmount || 0))) : 0;
    const taxBase = Math.max(0, subtotal - discount);
    const taxAmount = taxEnabled ? (taxBase * Math.max(0, Number(taxPercent || 0))) / 100 : 0;
    const finalTotal = taxBase + taxAmount;

    return {
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      tax_amount: Math.round(taxAmount),
      final_total: Math.round(finalTotal),
    };
  }

  // Create Order (Draft by default)
  static createOrder(data: {
    customer_id: string;
    order_date: string;
    items: Omit<OrderItem, 'id' | 'order_id' | 'total_price'>[];
    discount_enabled: boolean;
    discount: number;
    tax_enabled: boolean;
    tax_percent: number;
    description?: string;
    stamp_signature_enabled?: boolean;
    auto_confirm?: boolean;
  }): { success: boolean; message: string; order?: Order; invoice?: Invoice } {
    if (!StorageService.hasPermission('orders.create')) {
      return { success: false, message: 'شما دسترسی لازم برای ثبت سفارش جدید را ندارید.' };
    }
    if (!data.customer_id) return { success: false, message: 'انتخاب مشتری الزامی است.' };
    if (!data.items || data.items.length === 0) return { success: false, message: 'حداقل یک قلم کالا در سفارش باید اضافه شود.' };

    for (const item of data.items) {
      if (!item.product_id) return { success: false, message: 'مشخصات تمام اقلام کالا باید انتخاب شود.' };
      if (!item.quantity_meters || item.quantity_meters <= 0) return { success: false, message: 'متراژ اقلام باید بزرگتر از صفر باشد.' };
      if (item.unit_price === undefined || item.unit_price < 0) return { success: false, message: 'قیمت واحد اقلام نمی‌تواند منفی باشد.' };
    }

    const customers = StorageService.getCustomers();
    const customer = customers.find((c) => c.id === data.customer_id);
    if (!customer) return { success: false, message: 'مشتری مورد نظر یافت نشد.' };

    const orderId = `ord-${Date.now()}`;
    const orderNumber = StorageService.generateOrderNumber();

    const preparedItems: OrderItem[] = data.items.map((item, idx) => ({
      ...item,
      id: `item-${Date.now()}-${idx}`,
      order_id: orderId,
      total_price: Math.round(item.quantity_meters * item.unit_price),
    }));

    const totals = this.calculateTotals(
      preparedItems,
      data.discount_enabled,
      data.discount,
      data.tax_enabled,
      data.tax_percent
    );

    const newOrder: Order = {
      id: orderId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_code: customer.code,
      order_number: orderNumber,
      order_date: data.order_date,
      status: 'draft',
      items: preparedItems,
      subtotal: totals.subtotal,
      discount_enabled: data.discount_enabled,
      discount: totals.discount,
      tax_enabled: data.tax_enabled,
      tax_percent: data.tax_percent,
      tax_amount: totals.tax_amount,
      final_total: totals.final_total,
      description: data.description,
      stamp_signature_enabled: Boolean(data.stamp_signature_enabled),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const orders = StorageService.getOrders();
    orders.unshift(newOrder);
    StorageService.saveOrders(orders);

    StorageService.logAudit('ثبت پیش‌نویس سفارش (Draft)', 'ORDER', orderId, null, newOrder);

    if (data.auto_confirm) {
      return this.confirmOrder(orderId);
    }

    return { success: true, message: `پیش‌نویس سفارش با شماره ${orderNumber} با موفقیت ثبت گردید.`, order: newOrder };
  }

  // Update Order (only if draft, or sync with invoice if confirmed)
  static updateOrder(
    orderId: string,
    data: {
      customer_id: string;
      customer_name?: string;
      order_date: string;
      items: Omit<OrderItem, 'id' | 'order_id' | 'total_price'>[];
      discount_enabled: boolean;
      discount: number;
      tax_enabled: boolean;
      tax_percent: number;
      description?: string;
      stamp_signature_enabled?: boolean;
    }
  ): { success: boolean; message: string; order?: Order } {
    if (!StorageService.hasPermission('orders.edit')) {
      return { success: false, message: 'شما دسترسی لازم برای ویرایش سفارش را ندارید.' };
    }
    const orders = StorageService.getOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) return { success: false, message: 'سفارش یافت نشد.' };

    const currentOrder = orders[orderIndex];
    if (currentOrder.status === 'cancelled') {
      return { success: false, message: 'امکان ویرایش سفارش لغوشده وجود ندارد.' };
    }

    const customers = StorageService.getCustomers();
    const customer = customers.find((c) => c.id === data.customer_id);
    if (!customer) return { success: false, message: 'مشتری نامعتبر است.' };

    // Update customer entity if name changed
    if (data.customer_name && customer.name !== data.customer_name.trim()) {
      customer.name = data.customer_name.trim();
      customer.updated_at = new Date().toISOString();
      const cIdx = customers.findIndex((c) => c.id === customer.id);
      if (cIdx !== -1) {
        customers[cIdx] = customer;
        StorageService.saveCustomers(customers);
      }
    }

    const resolvedCustomerName = data.customer_name?.trim() || customer.name;
    const resolvedCustomerCode = customer.code;

    const preparedItems: OrderItem[] = data.items.map((item, idx) => ({
      ...item,
      id: `item-${Date.now()}-${idx}`,
      order_id: orderId,
      total_price: Math.round(item.quantity_meters * item.unit_price),
    }));

    const totals = this.calculateTotals(
      preparedItems,
      data.discount_enabled,
      data.discount,
      data.tax_enabled,
      data.tax_percent
    );

    const oldOrder = { ...currentOrder };

    orders[orderIndex] = {
      ...currentOrder,
      customer_id: customer.id,
      customer_name: resolvedCustomerName,
      customer_code: resolvedCustomerCode,
      order_date: data.order_date,
      items: preparedItems,
      subtotal: totals.subtotal,
      discount_enabled: data.discount_enabled,
      discount: totals.discount,
      tax_enabled: data.tax_enabled,
      tax_percent: data.tax_percent,
      tax_amount: totals.tax_amount,
      final_total: totals.final_total,
      description: data.description,
      stamp_signature_enabled: data.stamp_signature_enabled !== undefined ? data.stamp_signature_enabled : currentOrder.stamp_signature_enabled,
      updated_at: new Date().toISOString(),
    };
    StorageService.saveOrders(orders);

    // If order was confirmed, synchronize with Invoice and Customer Transaction
    if (currentOrder.status === 'confirmed') {
      const invoices = StorageService.getInvoices();
      const invIndex = invoices.findIndex((i) => i.order_id === orderId);
      if (invIndex !== -1) {
        const matchingInvoice = invoices[invIndex];

        // Check if any delivered quantity exceeds the new quantity
        const deliveries = StorageService.getDeliveries().filter((d) => d.status === 'delivered');
        for (const pi of preparedItems) {
          let deliveredForThisProduct = 0;
          for (const del of deliveries) {
            for (const item of ensureArray(del.items)) {
              if (item.invoice_id === matchingInvoice.id && item.product_id === pi.product_id) {
                deliveredForThisProduct += item.quantity_meters || 0;
              }
            }
          }

          if (pi.quantity_meters < deliveredForThisProduct) {
            return {
              success: false,
              message: `امکان ویرایش وجود ندارد: متراژ قلم "${pi.product_name}" نمی‌تواند کمتر از متراژ تحویل‌داده‌شده (${deliveredForThisProduct} متر) باشد.`,
            };
          }
        }

        const invItems: InvoiceItem[] = preparedItems.map((pi) => ({
          id: `inv-item-${pi.id}`,
          invoice_id: invoices[invIndex].id,
          product_id: pi.product_id,
          product_name: pi.product_name,
          product_code: pi.product_code,
          product_spec: pi.product_spec || [pi.size, pi.pressure, pi.type].filter(Boolean).join(' - '),
          size: pi.size,
          pressure: pi.pressure,
          type: pi.type,
          quantity_meters: pi.quantity_meters,
          unit_price: pi.unit_price,
          total_price: pi.total_price,
          description: pi.description,
        }));

        invoices[invIndex] = {
          ...invoices[invIndex],
          customer_id: customer.id,
          customer_name: resolvedCustomerName,
          customer_code: resolvedCustomerCode,
          invoice_date: data.order_date,
          items: invItems,
          subtotal: totals.subtotal,
          discount_enabled: data.discount_enabled,
          discount: totals.discount,
          tax_enabled: data.tax_enabled,
          tax_percent: data.tax_percent,
          tax_amount: totals.tax_amount,
          final_total: totals.final_total,
          description: data.description,
          stamp_signature_enabled: data.stamp_signature_enabled !== undefined ? data.stamp_signature_enabled : invoices[invIndex].stamp_signature_enabled,
          updated_at: new Date().toISOString(),
        };
        StorageService.saveInvoices(invoices);

        // Sync Customer Transaction Debit
        const transactions = StorageService.getTransactions();
        const txIndex = transactions.findIndex(
          (t) => t.reference_type === 'invoice' && t.reference_id === invoices[invIndex].id
        );
        if (txIndex !== -1) {
          transactions[txIndex] = {
            ...transactions[txIndex],
            customer_id: customer.id,
            debit: totals.final_total,
            transaction_date: data.order_date,
            updated_at: new Date().toISOString(),
          };
          StorageService.saveTransactions(transactions);
        }
      }
    }

    StorageService.logAudit('ویرایش سفارش', 'ORDER', orderId, oldOrder, orders[orderIndex]);

    return {
      success: true,
      message: 'سفارش و اسناد متناظر با موفقیت بروزرسانی شدند.',
      order: orders[orderIndex],
    };
  }

  // Update Invoice directly
  static updateInvoice(
    invoiceId: string,
    data: {
      customer_id: string;
      invoice_date: string;
      items: Omit<InvoiceItem, 'id' | 'invoice_id' | 'total_price'>[];
      discount_enabled: boolean;
      discount: number;
      tax_enabled: boolean;
      tax_percent: number;
      description?: string;
      stamp_signature_enabled?: boolean;
    }
  ): { success: boolean; message: string } {
    if (!StorageService.hasPermission('invoices.edit')) {
      return { success: false, message: 'شما دسترسی لازم برای ویرایش فاکتور را ندارید.' };
    }
    const invoices = StorageService.getInvoices();
    const invIndex = invoices.findIndex((i) => i.id === invoiceId);
    if (invIndex === -1) return { success: false, message: 'فاکتور یافت نشد.' };

    const currentInvoice = invoices[invIndex];
    if (currentInvoice.status === 'cancelled') {
      return { success: false, message: 'امکان ویرایش فاکتور لغوشده وجود ندارد.' };
    }

    const customers = StorageService.getCustomers();
    const customer = customers.find((c) => c.id === data.customer_id);
    if (!customer) return { success: false, message: 'مشتری نامعتبر است.' };

    // Validate deliver limit
    const deliveries = StorageService.getDeliveries().filter((d) => d.status === 'delivered');
    for (const item of data.items) {
      if (!item.product_name || !item.product_name.trim()) return { success: false, message: 'نام تمام اقلام کالا الزامی است.' };
      if (!item.quantity_meters || item.quantity_meters <= 0) return { success: false, message: 'متراژ اقلام باید بزرگتر از صفر باشد.' };
      if (item.unit_price === undefined || item.unit_price < 0) return { success: false, message: 'قیمت واحد اقلام نمی‌تواند منفی باشد.' };

      let deliveredForThisProduct = 0;
      for (const del of deliveries) {
        for (const dItem of ensureArray(del.items)) {
          if (dItem.invoice_id === invoiceId && (dItem.product_id === item.product_id || (item.size && dItem.size === item.size && dItem.pressure === item.pressure))) {
            deliveredForThisProduct += dItem.quantity_meters || 0;
          }
        }
      }

      if (item.quantity_meters < deliveredForThisProduct) {
        return {
          success: false,
          message: `امکان ویرایش وجود ندارد: متراژ قلم "${item.product_name}" نمی‌تواند کمتر از متراژ تحویل‌داده‌شده (${deliveredForThisProduct} متر) باشد.`,
        };
      }
    }

    const preparedItems: InvoiceItem[] = data.items.map((item, idx) => ({
      ...item,
      id: `inv-item-${Date.now()}-${idx}`,
      invoice_id: invoiceId,
      product_spec: item.product_spec || [item.size, item.pressure, item.type].filter(Boolean).join(' - '),
      total_price: Math.round(item.quantity_meters * item.unit_price),
    }));

    const totals = this.calculateTotals(
      preparedItems,
      data.discount_enabled,
      data.discount,
      data.tax_enabled,
      data.tax_percent
    );

    const oldInvoice = { ...currentInvoice };

    invoices[invIndex] = {
      ...currentInvoice,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_code: customer.code,
      invoice_date: data.invoice_date,
      items: preparedItems,
      subtotal: totals.subtotal,
      discount_enabled: data.discount_enabled,
      discount: totals.discount,
      tax_enabled: data.tax_enabled,
      tax_percent: data.tax_percent,
      tax_amount: totals.tax_amount,
      final_total: totals.final_total,
      description: data.description,
      stamp_signature_enabled: data.stamp_signature_enabled !== undefined ? data.stamp_signature_enabled : currentInvoice.stamp_signature_enabled,
      updated_at: new Date().toISOString(),
    };
    StorageService.saveInvoices(invoices);

    // Sync matching Order
    const orders = StorageService.getOrders();
    const ordIndex = orders.findIndex((o) => o.id === currentInvoice.order_id);
    if (ordIndex !== -1) {
      const orderItems: OrderItem[] = preparedItems.map((pi) => ({
        id: `ord-item-${pi.id}`,
        order_id: orders[ordIndex].id,
        product_id: pi.product_id,
        product_name: pi.product_name,
        product_code: pi.product_code,
        product_spec: pi.product_spec,
        size: pi.size,
        pressure: pi.pressure,
        type: pi.type,
        quantity_meters: pi.quantity_meters,
        unit_price: pi.unit_price,
        total_price: pi.total_price,
        description: pi.description,
      }));

      orders[ordIndex] = {
        ...orders[ordIndex],
        customer_id: customer.id,
        customer_name: customer.name,
        customer_code: customer.code,
        order_date: data.invoice_date,
        items: orderItems,
        subtotal: totals.subtotal,
        discount_enabled: data.discount_enabled,
        discount: totals.discount,
        tax_enabled: data.tax_enabled,
        tax_percent: data.tax_percent,
        tax_amount: totals.tax_amount,
        final_total: totals.final_total,
        description: data.description,
        updated_at: new Date().toISOString(),
      };
      StorageService.saveOrders(orders);
    }

    // Sync Customer Transaction Debit
    const transactions = StorageService.getTransactions();
    const txIndex = transactions.findIndex(
      (t) => t.reference_type === 'invoice' && t.reference_id === invoiceId
    );
    if (txIndex !== -1) {
      transactions[txIndex] = {
        ...transactions[txIndex],
        customer_id: customer.id,
        debit: totals.final_total,
        transaction_date: data.invoice_date,
        updated_at: new Date().toISOString(),
      };
      StorageService.saveTransactions(transactions);
    }

    StorageService.logAudit('ویرایش فاکتور فروش', 'INVOICE', invoiceId, oldInvoice, invoices[invIndex]);

    return { success: true, message: 'فاکتور فروش، سفارش و اثرات مالی حساب با موفقیت بروزرسانی شدند.' };
  }

  // Confirm Order: creates Invoice & Customer Debit Transaction, enters Delivery Queue
  static confirmOrder(orderId: string): { success: boolean; message: string; invoice?: Invoice } {
    if (!StorageService.hasPermission('orders.confirm')) {
      return { success: false, message: 'شما دسترسی لازم برای تایید سفارش و صدور فاکتور را ندارید.' };
    }
    const orders = StorageService.getOrders();
    const orderIndex = orders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) return { success: false, message: 'سفارش یافت نشد.' };

    const order = orders[orderIndex];
    if (order.status === 'confirmed') {
      return { success: false, message: 'این سفارش قبلاً تایید شده و فاکتور دارد.' };
    }
    if (order.status === 'cancelled') {
      return { success: false, message: 'سفارش لغوشده قابل تایید نیست.' };
    }

    // Check if an active invoice already exists for this order
    const invoices = StorageService.getInvoices();
    const existingInv = invoices.find((i) => i.order_id === orderId && i.status === 'active');
    if (existingInv) {
      return { success: false, message: 'برای این سفارش در حال حاضر یک فاکتور فعال وجود دارد.' };
    }

    const invoiceId = `inv-${Date.now()}`;
    const invoiceNumber = StorageService.generateInvoiceNumber();

    const invoiceItems: InvoiceItem[] = order.items.map((oi) => ({
      id: `inv-item-${Date.now()}-${oi.id}`,
      invoice_id: invoiceId,
      product_id: oi.product_id,
      product_name: oi.product_name,
      product_code: oi.product_code,
      product_spec: oi.product_spec || [oi.size, oi.pressure, oi.type].filter(Boolean).join(' - '),
      size: oi.size,
      pressure: oi.pressure,
      type: oi.type,
      quantity_meters: oi.quantity_meters,
      unit_price: oi.unit_price,
      total_price: oi.total_price,
      description: oi.description,
    }));

    const newInvoice: Invoice = {
      id: invoiceId,
      order_id: order.id,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_code: order.customer_code,
      invoice_number: invoiceNumber,
      invoice_date: order.order_date,
      status: 'active',
      items: invoiceItems,
      subtotal: order.subtotal,
      discount_enabled: order.discount_enabled,
      discount: order.discount,
      tax_enabled: order.tax_enabled,
      tax_percent: order.tax_percent,
      tax_amount: order.tax_amount,
      final_total: order.final_total,
      description: order.description,
      stamp_signature_enabled: order.stamp_signature_enabled,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save Invoice
    invoices.unshift(newInvoice);
    StorageService.saveInvoices(invoices);

    // Update Order Status to confirmed
    const oldOrder = { ...orders[orderIndex] };
    orders[orderIndex].status = 'confirmed';
    orders[orderIndex].updated_at = new Date().toISOString();
    StorageService.saveOrders(orders);

    // Financial Transaction: Debit to Customer Account if final_total > 0
    if (order.final_total > 0) {
      const transactions = StorageService.getTransactions();
      const newTx: CustomerTransaction = {
        id: `tx-${Date.now()}`,
        customer_id: order.customer_id,
        transaction_date: order.order_date,
        type: 'invoice',
        debit: order.final_total,
        credit: 0,
        description: `فاکتور فروش شماره ${invoiceNumber} (سفارش ${order.order_number})`,
        reference_type: 'invoice',
        reference_id: invoiceId,
        reference_number: invoiceNumber,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      transactions.push(newTx);
      StorageService.saveTransactions(transactions);
    }

    StorageService.logAudit(
      `تایید سفارش ${order.order_number} و صدور فاکتور ${invoiceNumber}`,
      'ORDER',
      orderId,
      oldOrder,
      { status: 'confirmed', invoice: invoiceNumber }
    );

    StorageService.logAudit(
      `صدور فاکتور فروش ${invoiceNumber} (سفارش ${order.order_number})`,
      'INVOICE',
      invoiceId,
      null,
      newInvoice,
      { documentNumber: invoiceNumber, entityTitle: `فاکتور ${invoiceNumber} - ${newInvoice.customer_name}` }
    );

    return {
      success: true,
      message: `سفارش تایید شد، فاکتور ${invoiceNumber} صادر گردید، بدهی به حساب مشتری منظور شد و کالا در صف تحویل قرار گرفت.`,
      invoice: newInvoice,
    };
  }

  // Cancel Invoice: strictly forbidden if deliveries exist!
  static cancelInvoice(invoiceId: string, reason?: string): { success: boolean; message: string } {
    if (!StorageService.hasPermission('invoices.cancel')) {
      return { success: false, message: 'شما دسترسی لازم برای ابطال فاکتور را ندارید.' };
    }
    const invoices = StorageService.getInvoices();
    const invIndex = invoices.findIndex((i) => i.id === invoiceId);
    if (invIndex === -1) return { success: false, message: 'فاکتور یافت نشد.' };

    const invoice = invoices[invIndex];
    if (invoice.status === 'cancelled') {
      return { success: false, message: 'این فاکتور قبلاً لغو شده است.' };
    }

    // Check Deliveries for this invoice
    const deliveries = StorageService.getDeliveries();
    let totalDeliveredMeters = 0;
    for (const del of deliveries) {
      for (const item of ensureArray(del.items)) {
        if (item.invoice_id === invoiceId) {
          totalDeliveredMeters += item.quantity_meters;
        }
      }
    }

    if (totalDeliveredMeters > 0) {
      return {
        success: false,
        message: `خطای قطعی: از این فاکتور تاکنون ${totalDeliveredMeters} متر کالا تحویل داده شده است. لغو مستقیم فاکتور دارای تحویل امکان‌پذیر نیست. برای اصلاح، باید سند «برگشت از فروش» ثبت گردد.`,
      };
    }

    // Cancel Invoice
    const oldInv = { ...invoice };
    invoices[invIndex].status = 'cancelled';
    invoices[invIndex].description = `${invoices[invIndex].description || ''} | لغو فاکتور: ${reason || 'توسط کاربر'}`.trim();
    invoices[invIndex].updated_at = new Date().toISOString();
    StorageService.saveInvoices(invoices);

    // Cancel Matching Order
    const orders = StorageService.getOrders();
    const ordIndex = orders.findIndex((o) => o.id === invoice.order_id);
    if (ordIndex !== -1) {
      orders[ordIndex].status = 'cancelled';
      orders[ordIndex].updated_at = new Date().toISOString();
      StorageService.saveOrders(orders);
    }

    // Financial Reversal: Reverse customer debit with a credit transaction (do not delete original transaction)
    const transactions = StorageService.getTransactions();
    const reversalTx: CustomerTransaction = {
      id: `tx-${Date.now()}`,
      customer_id: invoice.customer_id,
      transaction_date: new Date().toISOString().split('T')[0],
      type: 'invoice_cancel',
      debit: 0,
      credit: invoice.final_total,
      description: `ابطال فاکتور شماره ${invoice.invoice_number} ${reason ? `(علت: ${reason})` : ''}`.trim(),
      reference_type: 'invoice',
      reference_id: invoice.id,
      reference_number: invoice.invoice_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    transactions.push(reversalTx);
    StorageService.saveTransactions(transactions);

    StorageService.logAudit(
      `ابطال فاکتور فروش ${invoice.invoice_number}`,
      'INVOICE',
      invoiceId,
      oldInv,
      { status: 'cancelled', reversal_credit: invoice.final_total }
    );

    return {
      success: true,
      message: `فاکتور شماره ${invoice.invoice_number} با موفقیت لغو شد و مبلغ ${invoice.final_total.toLocaleString('fa-IR')} تومان به عنوان سند برگشت بدهی در دفتر مشتری ثبت گردید.`,
    };
  }

  // Cancel Draft Order
  static cancelOrder(orderId: string): { success: boolean; message: string } {
    if (!StorageService.hasPermission('orders.delete')) {
      return { success: false, message: 'شما دسترسی لازم برای لغو یا حذف سفارش را ندارید.' };
    }
    const orders = StorageService.getOrders();
    const ordIndex = orders.findIndex((o) => o.id === orderId);
    if (ordIndex === -1) return { success: false, message: 'سفارش یافت نشد.' };

    const order = orders[ordIndex];
    if (order.status === 'confirmed') {
      const invoices = StorageService.getInvoices();
      const matchingInv = invoices.find((i) => i.order_id === orderId);
      if (matchingInv) {
        return this.cancelInvoice(matchingInv.id, 'لغو از بخش سفارشات');
      }
    }

    orders[ordIndex].status = 'cancelled';
    orders[ordIndex].updated_at = new Date().toISOString();
    StorageService.saveOrders(orders);

    StorageService.logAudit(`لغو پیش‌نویس سفارش ${order.order_number}`, 'ORDER', orderId, null, { status: 'cancelled' });

    return { success: true, message: `سفارش ${order.order_number} لغو گردید.` };
  }
}
