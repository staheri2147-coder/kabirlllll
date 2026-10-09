import { StorageService } from './storageService';
import {
  DeliveryNote,
  DeliveryItem,
  ReturnDoc,
  ReturnItem,
  CustomerTransaction,
} from '../types';
import { formatJalaliDate } from '../utils/jalali';
import { ensureArray } from '../utils/itemUtils';

export interface PendingInvoiceItemForDelivery {
  invoice_id: string;
  invoice_item_id: string;
  invoice_number: string;
  product_id: string;
  product_name: string;
  product_code: string;
  product_spec?: string;
  size?: string;
  pressure?: string;
  type?: string;
  invoiced_quantity: number;
  delivered_quantity: number;
  returned_quantity: number;
  available_for_delivery: number;
  unit_price: number;
}

export interface DeliveredItemForReturn {
  invoice_id: string;
  invoice_item_id: string;
  invoice_number: string;
  product_id: string;
  product_name: string;
  product_code: string;
  product_spec?: string;
  size?: string;
  pressure?: string;
  type?: string;
  invoiced_quantity: number;
  delivered_quantity: number;
  returned_quantity: number;
  available_for_return: number;
  unit_price: number;
  latest_delivery_date?: string;
}

function isMatchingRecordItem(
  recordItem: {
    invoice_id: string;
    invoice_item_id?: string;
    product_id?: string;
    product_name?: string;
    size?: string;
    pressure?: string;
    type?: string;
    product_code?: string;
  },
  invItem: {
    id?: string;
    product_id?: string;
    product_name?: string;
    size?: string;
    pressure?: string;
    type?: string;
    product_code?: string;
  },
  invoiceId: string,
  itemIndexFallback?: string
): boolean {
  if (recordItem.invoice_id !== invoiceId) return false;

  const targetItemId = invItem.id || itemIndexFallback;
  if (recordItem.invoice_item_id && targetItemId) {
    return recordItem.invoice_item_id === targetItemId;
  }

  // If specific product ID is present and not generic
  const hasSpecificProductId =
    invItem.product_id &&
    invItem.product_id !== 'prd-custom' &&
    recordItem.product_id &&
    recordItem.product_id !== 'prd-custom';

  if (hasSpecificProductId) {
    if (recordItem.product_id !== invItem.product_id) return false;
  }

  // Strict check on product name and specifications to prevent cross-matching between distinct rows
  const name1 = (recordItem.product_name || '').trim().toLowerCase();
  const name2 = (invItem.product_name || '').trim().toLowerCase();
  if (name1 && name2 && name1 !== name2) return false;

  if (invItem.size && recordItem.size && invItem.size !== recordItem.size) return false;
  if (invItem.pressure && recordItem.pressure && invItem.pressure !== recordItem.pressure) return false;
  if (invItem.type && recordItem.type && invItem.type !== recordItem.type) return false;
  if (invItem.product_code && recordItem.product_code && invItem.product_code !== recordItem.product_code) return false;

  return true;
}

export class DeliveryReturnService {
  // Get all items available for delivery for a customer across their active invoices
  static getCustomerPendingDeliveries(customerId: string): PendingInvoiceItemForDelivery[] {
    const invoices = StorageService.getInvoices().filter(
      (i) => i.customer_id === customerId && i.status === 'active'
    );
    const deliveries = StorageService.getDeliveries().filter(
      (d) => d.customer_id === customerId && d.status === 'delivered'
    );
    const returns = StorageService.getReturns().filter(
      (r) => r.customer_id === customerId && r.status === 'active'
    );

    const result: PendingInvoiceItemForDelivery[] = [];

    for (const inv of invoices) {
      const invItems = ensureArray(inv.items);
      for (let idx = 0; idx < invItems.length; idx++) {
        const item = invItems[idx];
        const itemId = item.id || `inv-item-${inv.id}-${idx}`;

        // Calculate total delivered meters for this specific invoice item
        let deliveredQty = 0;
        for (const del of deliveries) {
          for (const delItem of ensureArray(del.items)) {
            if (isMatchingRecordItem(delItem, item, inv.id, itemId)) {
              deliveredQty += delItem.quantity_meters || 0;
            }
          }
        }

        // Calculate total returned meters for this specific invoice item
        let returnedQty = 0;
        for (const ret of returns) {
          for (const retItem of ensureArray(ret.items)) {
            if (isMatchingRecordItem(retItem, item, inv.id, itemId)) {
              returnedQty += retItem.quantity_meters || 0;
            }
          }
        }

        const available = Math.max(0, item.quantity_meters - deliveredQty);

        if (available > 0) {
          result.push({
            invoice_id: inv.id,
            invoice_item_id: itemId,
            invoice_number: inv.invoice_number,
            product_id: item.product_id || 'prd-custom',
            product_name: item.product_name,
            product_code: item.product_code || '',
            product_spec: item.product_spec,
            size: item.size,
            pressure: item.pressure,
            type: item.type,
            invoiced_quantity: item.quantity_meters,
            delivered_quantity: deliveredQty,
            returned_quantity: returnedQty,
            available_for_delivery: available,
            unit_price: item.unit_price,
          });
        }
      }
    }

    return result;
  }

  // Get all delivered items eligible for return for a customer
  static getCustomerDeliveredItemsForReturn(customerId: string, excludeReturnId?: string): DeliveredItemForReturn[] {
    const invoices = StorageService.getInvoices().filter(
      (i) => i.customer_id === customerId && i.status === 'active'
    );
    const deliveries = StorageService.getDeliveries().filter(
      (d) => d.customer_id === customerId && d.status === 'delivered'
    );
    const returns = StorageService.getReturns().filter(
      (r) => r.customer_id === customerId && r.status === 'active' && (!excludeReturnId || r.id !== excludeReturnId)
    );

    const result: DeliveredItemForReturn[] = [];

    for (const inv of invoices) {
      const invItems = ensureArray(inv.items);
      for (let idx = 0; idx < invItems.length; idx++) {
        const item = invItems[idx];
        const itemId = item.id || `inv-item-${inv.id}-${idx}`;

        let deliveredQty = 0;
        let maxDelDate: string | undefined = undefined;

        for (const del of deliveries) {
          for (const delItem of ensureArray(del.items)) {
            if (isMatchingRecordItem(delItem, item, inv.id, itemId)) {
              deliveredQty += delItem.quantity_meters || 0;
              if (del.delivery_date && (!maxDelDate || del.delivery_date > maxDelDate)) {
                maxDelDate = del.delivery_date;
              }
            }
          }
        }

        let returnedQty = 0;
        for (const ret of returns) {
          for (const retItem of ensureArray(ret.items)) {
            if (isMatchingRecordItem(retItem, item, inv.id, itemId)) {
              returnedQty += retItem.quantity_meters || 0;
            }
          }
        }

        const availableReturn = Math.max(0, deliveredQty - returnedQty);

        if (availableReturn > 0) {
          result.push({
            invoice_id: inv.id,
            invoice_item_id: itemId,
            invoice_number: inv.invoice_number,
            product_id: item.product_id || 'prd-custom',
            product_name: item.product_name,
            product_code: item.product_code || '',
            product_spec: item.product_spec,
            size: item.size,
            pressure: item.pressure,
            type: item.type,
            invoiced_quantity: item.quantity_meters,
            delivered_quantity: deliveredQty,
            returned_quantity: returnedQty,
            available_for_return: availableReturn,
            unit_price: item.unit_price,
            latest_delivery_date: maxDelDate || inv.invoice_date,
          });
        }
      }
    }

    return result;
  }

  // Create Delivery Note (can bundle items from multiple invoices of the customer)
  static createDeliveryNote(data: {
    customer_id: string;
    delivery_date: string;
    driver_id?: string;
    driver_name?: string;
    driver_phone?: string;
    vehicle_id?: string;
    vehicle_plate?: string;
    vehicle_type?: string;
    destination_address?: string;
    items: {
      invoice_id: string;
      invoice_item_id?: string;
      product_id: string;
      product_name?: string;
      size?: string;
      pressure?: string;
      type?: string;
      quantity_meters: number;
      description?: string;
    }[];
    description?: string;
  }): { success: boolean; message: string; deliveryNote?: DeliveryNote } {
    if (!data.customer_id) return { success: false, message: 'انتخاب مشتری الزامی است.' };
    if (!data.items || data.items.length === 0) return { success: false, message: 'حداقل یک قلم کالا برای تحویل باید مشخص شود.' };

    const customers = StorageService.getCustomers();
    const customer = customers.find((c) => c.id === data.customer_id);
    if (!customer) return { success: false, message: 'مشتری مورد نظر یافت نشد.' };

    const pendingList = this.getCustomerPendingDeliveries(customer.id);
    const preparedItems: DeliveryItem[] = [];
    let totalMeters = 0;

    const deliveryId = `del-${Date.now()}`;
    const deliveryNumber = StorageService.generateDeliveryNumber();

    for (const item of data.items) {
      if (!item.quantity_meters || item.quantity_meters <= 0) {
        return { success: false, message: 'مقدار تحویل برای تمام ردیف‌ها باید بزرگتر از صفر باشد.' };
      }

      const match = pendingList.find((p) => {
        if (item.invoice_item_id && p.invoice_item_id) {
          return p.invoice_id === item.invoice_id && p.invoice_item_id === item.invoice_item_id;
        }
        if (p.invoice_id !== item.invoice_id) return false;
        if (item.product_id && p.product_id && p.product_id !== item.product_id) return false;
        if (item.size && p.size && p.size !== item.size) return false;
        if (item.pressure && p.pressure && p.pressure !== item.pressure) return false;
        if (item.type && p.type && p.type !== item.type) return false;
        if (item.product_name && p.product_name && p.product_name.trim().toLowerCase() !== item.product_name.trim().toLowerCase()) return false;
        return true;
      });

      if (!match) {
        return {
          success: false,
          message: `قلم انتخابی در فاکتور مربوطه موجود نیست یا تمام متراژ آن قبلاً تحویل داده شده است.`,
        };
      }

      if (item.quantity_meters > match.available_for_delivery) {
        return {
          success: false,
          message: `خطای کنترل سقف تحویل: برای کالا "${match.product_name}" حداکثر ${match.available_for_delivery} متر در فاکتور ${match.invoice_number} باقی‌مانده است. تحویل ${item.quantity_meters} متر غیرمجاز است.`,
        };
      }

      totalMeters += item.quantity_meters;
      preparedItems.push({
        id: `del-item-${Date.now()}-${preparedItems.length}`,
        delivery_note_id: deliveryId,
        invoice_id: item.invoice_id,
        invoice_item_id: match.invoice_item_id,
        invoice_number: match.invoice_number,
        product_id: item.product_id,
        product_name: match.product_name,
        product_code: match.product_code,
        product_spec: match.product_spec,
        size: match.size,
        pressure: match.pressure,
        type: match.type,
        quantity_meters: item.quantity_meters,
        total_price: Math.round(item.quantity_meters * match.unit_price),
        description: item.description,
      });
    }

    const drivers = StorageService.getDrivers();
    const driver = drivers.find((d) => d.id === data.driver_id);

    const vehicles = StorageService.getVehicles();
    const vehicle = vehicles.find((v) => v.id === data.vehicle_id);

    const currentUser = StorageService.getActiveUser();

    const newDeliveryNote: DeliveryNote = {
      id: deliveryId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_code: customer.code,
      delivery_number: deliveryNumber,
      delivery_date: data.delivery_date,
      driver_id: driver?.id || data.driver_id,
      driver_name: data.driver_name || driver?.name,
      driver_phone: data.driver_phone || driver?.phone,
      vehicle_id: vehicle?.id || data.vehicle_id,
      vehicle_plate: data.vehicle_plate || vehicle?.plate_number,
      vehicle_type: data.vehicle_type || vehicle?.vehicle_type,
      status: 'delivered',
      items: preparedItems,
      total_meters: totalMeters,
      description: data.description,
      created_by: currentUser.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const deliveries = StorageService.getDeliveries();
    deliveries.unshift(newDeliveryNote);
    StorageService.saveDeliveries(deliveries);

    StorageService.logAudit(
      `صدور رسید تحویل و بارگیری ${deliveryNumber} (${totalMeters} متر)`,
      'DELIVERY',
      deliveryId,
      null,
      newDeliveryNote
    );

    return {
      success: true,
      message: `رسید تحویل به شماره ${deliveryNumber} با موفقیت ثبت شد (${totalMeters.toLocaleString('fa-IR')} متر بارگیری گردید).`,
      deliveryNote: newDeliveryNote,
    };
  }

  // Cancel Delivery Note (Status changes to 'cancelled' so items revert to undelivered while keeping receipt number sequence)
  static cancelDeliveryNote(deliveryId: string, reason?: string): { success: boolean; message: string } {
    const deliveries = StorageService.getDeliveries();
    const idx = deliveries.findIndex((d) => d.id === deliveryId);
    if (idx === -1) {
      return { success: false, message: 'رسید تحویل مورد نظر یافت نشد.' };
    }

    const del = deliveries[idx];
    const oldDel = { ...del };
    del.status = 'cancelled';
    del.description = reason ? `${del.description ? del.description + ' | ' : ''}علت لغو: ${reason}` : del.description;
    del.updated_at = new Date().toISOString();

    StorageService.saveDeliveries(deliveries);
    StorageService.logAudit(
      `ابطال و لغو رسید تحویل ${del.delivery_number} (${del.total_meters} متر کالا به اقلام تحویل‌نشده بازگشت)`,
      'DELIVERY',
      del.id,
      oldDel,
      del
    );

    return {
      success: true,
      message: `رسید تحویل شماره ${del.delivery_number} با موفقیت لغو شد و متراژ کالاها به وضعیت تحویل‌نشده بازگشت.`,
    };
  }

  // Update Delivery Note Details (Driver, vehicle, date, destination, description, and full item quantities)
  static updateDeliveryNote(
    deliveryId: string,
    updates: {
      delivery_date?: string;
      driver_id?: string;
      driver_name?: string;
      driver_phone?: string;
      vehicle_id?: string;
      vehicle_plate?: string;
      vehicle_type?: string;
      destination_address?: string;
      description?: string;
      customer_id?: string;
      customer_name?: string;
      customer_code?: string;
      items?: {
        id?: string;
        invoice_id: string;
        invoice_item_id?: string;
        invoice_number?: string;
        product_id: string;
        product_name?: string;
        product_code?: string;
        product_spec?: string;
        size?: string;
        pressure?: string;
        type?: string;
        quantity_meters: number;
        total_price?: number;
        description?: string;
      }[];
    }
  ): { success: boolean; message: string; deliveryNote?: DeliveryNote } {
    const deliveries = StorageService.getDeliveries();
    const idx = deliveries.findIndex((d) => d.id === deliveryId);
    if (idx === -1) {
      return { success: false, message: 'رسید تحویل مورد نظر یافت نشد.' };
    }

    const del = deliveries[idx];
    const oldDel = { ...del, items: del.items.map((i) => ({ ...i })) };

    // If items are being updated, validate delivery limits against invoices
    if (updates.items && updates.items.length > 0) {
      const activeInvoices = StorageService.getInvoices().filter(
        (i) => i.customer_id === del.customer_id && i.status === 'active'
      );
      const otherDeliveries = deliveries.filter(
        (d) => d.id !== deliveryId && d.customer_id === del.customer_id && d.status === 'delivered'
      );

      const preparedItems: DeliveryItem[] = [];
      let totalMeters = 0;

      for (const item of updates.items) {
        if (!item.quantity_meters || item.quantity_meters <= 0) {
          return { success: false, message: 'متراژ تمام اقلام تحویل باید بزرگتر از صفر باشد.' };
        }

        const inv = activeInvoices.find((i) => i.id === item.invoice_id);
        if (!inv) {
          return { success: false, message: `فاکتور مربوط به یکی از اقلام یافت نشد یا معتبر نیست.` };
        }

        // Find invoice item
        const invItem = inv.items.find((ii, iIdx) => {
          const itemId = ii.id || `inv-item-${inv.id}-${iIdx}`;
          if (item.invoice_item_id) {
            return ii.id === item.invoice_item_id || itemId === item.invoice_item_id;
          }
          if (item.product_id && ii.product_id && ii.product_id !== item.product_id) return false;
          if (item.size && ii.size && ii.size !== item.size) return false;
          if (item.pressure && ii.pressure && ii.pressure !== item.pressure) return false;
          if (item.type && ii.type && ii.type !== item.type) return false;
          if (item.product_name && ii.product_name && ii.product_name.trim().toLowerCase() !== item.product_name.trim().toLowerCase()) return false;
          return true;
        });

        if (!invItem) {
          return { success: false, message: `قلم انتخابی در فاکتور شماره ${inv.invoice_number} یافت نشد.` };
        }

        // Calculate other delivered
        let otherDelivered = 0;
        for (const oDel of otherDeliveries) {
          for (const oItem of oDel.items) {
            if (isMatchingRecordItem(oItem, invItem, inv.id, item.invoice_item_id || '')) {
              otherDelivered += oItem.quantity_meters || 0;
            }
          }
        }

        const maxAvailable = Math.max(0, (invItem.quantity_meters || 0) - otherDelivered);
        if (item.quantity_meters > maxAvailable) {
          return {
            success: false,
            message: `خطای کنترل سقف تحویل: برای "${invItem.product_name || 'کالا'}" حداکثر ${maxAvailable} متر در فاکتور ${inv.invoice_number} باقی‌مانده است.`,
          };
        }

        totalMeters += item.quantity_meters;
        preparedItems.push({
          id: item.id || `del-item-${Date.now()}-${preparedItems.length}`,
          delivery_note_id: del.id,
          invoice_id: item.invoice_id,
          invoice_item_id: item.invoice_item_id || invItem.id,
          invoice_number: inv.invoice_number,
          product_id: item.product_id || invItem.product_id || 'prd-custom',
          product_name: item.product_name || invItem.product_name,
          product_code: item.product_code || invItem.product_code,
          product_spec: item.product_spec || invItem.product_spec,
          size: item.size || invItem.size,
          pressure: item.pressure || invItem.pressure,
          type: item.type || invItem.type,
          quantity_meters: item.quantity_meters,
          total_price: Math.round(item.quantity_meters * (invItem.unit_price || 0)),
          description: item.description,
        });
      }

      del.items = preparedItems;
      del.total_meters = totalMeters;
    }

    if (updates.customer_id) del.customer_id = updates.customer_id;
    if (updates.customer_name) del.customer_name = updates.customer_name;
    if (updates.customer_code !== undefined) del.customer_code = updates.customer_code;
    if (updates.delivery_date) del.delivery_date = updates.delivery_date;
    if (updates.driver_id !== undefined) del.driver_id = updates.driver_id;
    if (updates.driver_name !== undefined) del.driver_name = updates.driver_name;
    if (updates.driver_phone !== undefined) del.driver_phone = updates.driver_phone;
    if (updates.vehicle_id !== undefined) del.vehicle_id = updates.vehicle_id;
    if (updates.vehicle_plate !== undefined) del.vehicle_plate = updates.vehicle_plate;
    if (updates.vehicle_type !== undefined) del.vehicle_type = updates.vehicle_type;
    if (updates.destination_address !== undefined) del.destination_address = updates.destination_address;
    if (updates.description !== undefined) del.description = updates.description;
    del.updated_at = new Date().toISOString();

    StorageService.saveDeliveries(deliveries);
    StorageService.logAudit(
      `ویرایش کامل اطلاعات رسید تحویل ${del.delivery_number}`,
      'DELIVERY',
      del.id,
      oldDel,
      del
    );

    return {
      success: true,
      message: `رسید تحویل شماره ${del.delivery_number} با موفقیت ویرایش و به‌روزرسانی شد.`,
      deliveryNote: del,
    };
  }

  // Create Sales Return (برگشت از فروش)
  static createReturn(data: {
    customer_id: string;
    return_date: string;
    reason: string;
    items: {
      invoice_id: string;
      invoice_item_id?: string;
      product_id: string;
      product_name?: string;
      size?: string;
      pressure?: string;
      type?: string;
      quantity_meters: number;
      unit_price?: number;
      description?: string;
    }[];
    description?: string;
  }): { success: boolean; message: string; returnDoc?: ReturnDoc } {
    if (!data.customer_id) return { success: false, message: 'انتخاب مشتری الزامی است.' };
    if (!data.reason) return { success: false, message: 'درج علت برگشت کالا الزامی است.' };
    if (!data.items || data.items.length === 0) return { success: false, message: 'حداقل یک قلم کالا برای برگشت باید مشخص گردد.' };

    const customers = StorageService.getCustomers();
    const customer = customers.find((c) => c.id === data.customer_id);
    if (!customer) return { success: false, message: 'مشتری مورد نظر یافت نشد.' };

    const eligibleList = this.getCustomerDeliveredItemsForReturn(customer.id);
    const preparedItems: ReturnItem[] = [];
    let totalReturnAmount = 0;

    const returnId = `ret-${Date.now()}`;
    const returnNumber = StorageService.generateReturnNumber();

    for (const item of data.items) {
      if (!item.quantity_meters || item.quantity_meters <= 0) {
        return { success: false, message: 'متراژ برگشتی باید بزرگتر از صفر باشد.' };
      }

      const match = eligibleList.find((e) => {
        if (item.invoice_item_id && e.invoice_item_id) {
          return e.invoice_id === item.invoice_id && e.invoice_item_id === item.invoice_item_id;
        }
        if (e.invoice_id !== item.invoice_id) return false;
        if (item.product_id && e.product_id && e.product_id !== item.product_id) return false;
        if (item.size && e.size && e.size !== item.size) return false;
        if (item.pressure && e.pressure && e.pressure !== item.pressure) return false;
        if (item.type && e.type && e.type !== item.type) return false;
        if (item.product_name && e.product_name && e.product_name.trim().toLowerCase() !== item.product_name.trim().toLowerCase()) return false;
        return true;
      });

      if (!match) {
        return {
          success: false,
          message: 'کالای انتخاب‌شده اصلاً تحویل داده نشده است، لذا امکان برگشت ندارد.',
        };
      }

      // Check date: return_date MUST be >= delivery_date
      if (match.latest_delivery_date && data.return_date < match.latest_delivery_date) {
        return {
          success: false,
          message: `خطای کنترل تاریخ: تاریخ برگشت کالا (${formatJalaliDate(data.return_date)}) نمی‌تواند قبل از تاریخ تحویل کالا (${formatJalaliDate(match.latest_delivery_date)}) باشد. تاریخ برگشت باید بعد از تاریخ تحویل یا برابر آن باشد.`,
        };
      }

      if (item.quantity_meters > match.available_for_return) {
        return {
          success: false,
          message: `خطای سقف برگشت: حداکثر ${match.available_for_return} متر از کالای "${match.product_name}" تحویل داده شده و قابل برگشت است. ثبت ${item.quantity_meters} متر غیرمجاز است.`,
        };
      }

      const effectiveUnitPrice = item.unit_price !== undefined && item.unit_price >= 0 ? item.unit_price : match.unit_price;
      const lineTotal = Math.round(item.quantity_meters * effectiveUnitPrice);
      totalReturnAmount += lineTotal;

      preparedItems.push({
        id: `ret-item-${Date.now()}-${preparedItems.length}`,
        return_id: returnId,
        invoice_id: item.invoice_id,
        invoice_item_id: match.invoice_item_id,
        invoice_number: match.invoice_number,
        product_id: item.product_id,
        product_name: match.product_name,
        product_code: match.product_code,
        product_spec: match.product_spec,
        quantity_meters: item.quantity_meters,
        unit_price: effectiveUnitPrice,
        total_price: lineTotal,
        description: item.description,
      });
    }

    const currentUser = StorageService.getActiveUser();

    const newReturnDoc: ReturnDoc = {
      id: returnId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_code: customer.code,
      return_number: returnNumber,
      return_date: data.return_date,
      status: 'active',
      reason: data.reason,
      description: data.description,
      items: preparedItems,
      total_amount: totalReturnAmount,
      created_by: currentUser.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const returns = StorageService.getReturns();
    returns.unshift(newReturnDoc);
    StorageService.saveReturns(returns);

    // Financial Effect: Credit transaction to Customer Account (بستانکاری مشتری)
    const transactions = StorageService.getTransactions();
    const newTx: CustomerTransaction = {
      id: `tx-${Date.now()}`,
      customer_id: customer.id,
      transaction_date: data.return_date,
      type: 'return',
      debit: 0,
      credit: totalReturnAmount,
      description: `برگشت از فروش شماره ${returnNumber} (علت: ${data.reason})`,
      reference_type: 'return',
      reference_id: returnId,
      reference_number: returnNumber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    transactions.push(newTx);
    StorageService.saveTransactions(transactions);

    StorageService.logAudit(
      `ثبت سند برگشت از فروش ${returnNumber} به مبلغ ${totalReturnAmount.toLocaleString('fa-IR')} ریال`,
      'RETURN',
      returnId,
      null,
      newReturnDoc
    );

    return {
      success: true,
      message: `سند برگشت با شماره ${returnNumber} ثبت شد و مبلغ ${totalReturnAmount.toLocaleString('fa-IR')} ریال به عنوان بستانکاری به حساب مشتری واریز شد.`,
      returnDoc: newReturnDoc,
    };
  }

  // Update an existing Sales Return document
  static updateReturn(
    returnId: string,
    data: {
      return_date: string;
      reason: string;
      description?: string;
      items: {
        invoice_id: string;
        invoice_item_id?: string;
        product_id: string;
        product_name?: string;
        size?: string;
        pressure?: string;
        type?: string;
        quantity_meters: number;
        unit_price?: number;
        description?: string;
      }[];
    }
  ): { success: boolean; message: string; returnDoc?: ReturnDoc } {
    const returns = StorageService.getReturns();
    const returnIndex = returns.findIndex((r) => r.id === returnId);
    if (returnIndex === -1) {
      return { success: false, message: 'سند برگشت از فروش مورد نظر یافت نشد.' };
    }

    const oldReturn = { ...returns[returnIndex] };
    const customerId = oldReturn.customer_id;
    if (!data.reason || !data.reason.trim()) {
      return { success: false, message: 'درج علت برگشت کالا الزامی است.' };
    }
    if (!data.items || data.items.length === 0) {
      return { success: false, message: 'حداقل یک قلم کالا برای برگشت باید مشخص گردد.' };
    }

    // Eligible items for return excluding this return's own items
    const eligibleList = this.getCustomerDeliveredItemsForReturn(customerId, returnId);
    const preparedItems: ReturnItem[] = [];
    let totalReturnAmount = 0;

    for (const item of data.items) {
      if (!item.quantity_meters || item.quantity_meters <= 0) {
        return { success: false, message: 'متراژ برگشتی باید بزرگتر از صفر باشد.' };
      }

      const match = eligibleList.find((e) => {
        if (item.invoice_item_id && e.invoice_item_id) {
          return e.invoice_id === item.invoice_id && e.invoice_item_id === item.invoice_item_id;
        }
        if (e.invoice_id !== item.invoice_id) return false;
        if (item.product_id && e.product_id && e.product_id !== item.product_id) return false;
        if (item.size && e.size && e.size !== item.size) return false;
        if (item.pressure && e.pressure && e.pressure !== item.pressure) return false;
        if (item.type && e.type && e.type !== item.type) return false;
        if (item.product_name && e.product_name && e.product_name.trim().toLowerCase() !== item.product_name.trim().toLowerCase()) return false;
        return true;
      });

      if (!match) {
        return {
          success: false,
          message: 'کالای انتخاب‌شده اصلاً تحویل داده نشده است، لذا امکان برگشت ندارد.',
        };
      }

      // Check date: return_date MUST be >= delivery_date
      if (match.latest_delivery_date && data.return_date < match.latest_delivery_date) {
        return {
          success: false,
          message: `خطای کنترل تاریخ: تاریخ برگشت کالا (${formatJalaliDate(data.return_date)}) نمی‌تواند قبل از تاریخ تحویل کالا (${formatJalaliDate(match.latest_delivery_date)}) باشد. تاریخ برگشت باید بعد از تاریخ تحویل یا برابر آن باشد.`,
        };
      }

      if (item.quantity_meters > match.available_for_return) {
        return {
          success: false,
          message: `خطای سقف برگشت: حداکثر ${match.available_for_return} متر از کالای "${match.product_name}" تحویل داده شده و قابل برگشت است. ثبت ${item.quantity_meters} متر غیرمجاز است.`,
        };
      }

      const effectiveUnitPrice =
        item.unit_price !== undefined && item.unit_price >= 0 ? item.unit_price : match.unit_price;
      const lineTotal = Math.round(item.quantity_meters * effectiveUnitPrice);
      totalReturnAmount += lineTotal;

      preparedItems.push({
        id: `ret-item-${Date.now()}-${preparedItems.length}`,
        return_id: returnId,
        invoice_id: item.invoice_id,
        invoice_item_id: match.invoice_item_id,
        invoice_number: match.invoice_number,
        product_id: item.product_id,
        product_name: match.product_name,
        product_code: match.product_code,
        product_spec: match.product_spec,
        quantity_meters: item.quantity_meters,
        unit_price: effectiveUnitPrice,
        total_price: lineTotal,
        description: item.description,
      });
    }

    const updatedReturnDoc: ReturnDoc = {
      ...oldReturn,
      return_date: data.return_date,
      reason: data.reason.trim(),
      description: data.description?.trim() || undefined,
      items: preparedItems,
      total_amount: totalReturnAmount,
      updated_at: new Date().toISOString(),
    };

    returns[returnIndex] = updatedReturnDoc;
    StorageService.saveReturns(returns);

    // Sync financial transaction
    const transactions = StorageService.getTransactions();
    const txIndex = transactions.findIndex(
      (t) => t.reference_type === 'return' && t.reference_id === returnId
    );
    if (txIndex !== -1) {
      transactions[txIndex] = {
        ...transactions[txIndex],
        transaction_date: data.return_date,
        credit: totalReturnAmount,
        description: `برگشت از فروش شماره ${oldReturn.return_number} (علت: ${data.reason.trim()})`,
        updated_at: new Date().toISOString(),
      };
      StorageService.saveTransactions(transactions);
    }

    StorageService.logAudit(
      `ویرایش سند برگشت از فروش ${oldReturn.return_number}`,
      'RETURN',
      returnId,
      oldReturn,
      updatedReturnDoc
    );

    return {
      success: true,
      message: `سند برگشت با شماره ${oldReturn.return_number} با موفقیت ویرایش شد و مانده حساب مشتری اصلاح گردید.`,
      returnDoc: updatedReturnDoc,
    };
  }

  // Delete/Cancel a Return Document
  static deleteReturn(returnId: string): { success: boolean; message: string } {
    const returns = StorageService.getReturns();
    const target = returns.find((r) => r.id === returnId);
    if (!target) {
      return { success: false, message: 'سند برگشت یافت نشد.' };
    }

    const newReturns = returns.filter((r) => r.id !== returnId);
    StorageService.saveReturns(newReturns);

    // Remove matching transaction
    const transactions = StorageService.getTransactions().filter(
      (t) => !(t.reference_type === 'return' && t.reference_id === returnId)
    );
    StorageService.saveTransactions(transactions);

    StorageService.logAudit(
      `ابطال و حذف سند برگشت از فروش ${target.return_number}`,
      'RETURN',
      returnId,
      target,
      null
    );

    return {
      success: true,
      message: `سند برگشت شماره ${target.return_number} با موفقیت ابطال و اثر مالی آن از حساب مشتری حذف شد.`,
    };
  }

  // Aliases for compatibility
  static getEligibleInvoiceItemsForDelivery(customerId: string) {
    return this.getCustomerPendingDeliveries(customerId);
  }

  static getEligibleItemsForReturn(customerId: string, excludeReturnId?: string) {
    return this.getCustomerDeliveredItemsForReturn(customerId, excludeReturnId);
  }

  static createReturnDoc(data: Parameters<typeof DeliveryReturnService.createReturn>[0]) {
    return this.createReturn(data);
  }
}
