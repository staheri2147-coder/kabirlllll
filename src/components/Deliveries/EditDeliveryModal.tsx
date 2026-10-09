import React, { useState, useEffect } from 'react';
import { DeliveryNote, Customer, Driver, Invoice } from '../../types';
import { StorageService } from '../../services/storageService';
import {
  DeliveryReturnService,
  PendingInvoiceItemForDelivery,
} from '../../services/deliveryReturnService';
import { formatJalaliDate, formatNumber, toPersianDigits } from '../../utils/jalali';
import { formatCompactItemSummary } from '../../utils/formatItemSummary';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import {
  X,
  Truck,
  User,
  MapPin,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Layers,
  Package,
} from 'lucide-react';

interface EditDeliveryModalProps {
  delivery: DeliveryNote | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export const EditDeliveryModal: React.FC<EditDeliveryModalProps> = ({
  delivery,
  isOpen,
  onClose,
  onSaved,
}) => {
  if (!isOpen || !delivery) return null;

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(delivery.customer_id);
  const [deliveryDate, setDeliveryDate] = useState<string>(delivery.delivery_date);

  // Drivers
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>(delivery.driver_id || '');
  const [driverName, setDriverName] = useState(delivery.driver_name || '');
  const [driverPhone, setDriverPhone] = useState(delivery.driver_phone || '');
  const [vehiclePlate, setVehiclePlate] = useState(delivery.vehicle_plate || '');
  const [vehicleType, setVehicleType] = useState(delivery.vehicle_type || '');
  const [destinationAddress, setDestinationAddress] = useState(delivery.destination_address || '');
  const [description, setDescription] = useState(delivery.description || '');
  const [showDriverNameSuggestions, setShowDriverNameSuggestions] = useState(false);

  const driverNameSuggestions = driverName.trim()
    ? drivers.filter((d) => d.name.toLowerCase().includes(driverName.toLowerCase()))
    : [];

  const selectDriverFromName = (driver: Driver) => {
    setSelectedDriverId(driver.id);
    setDriverName(driver.name);
    setDriverPhone(driver.phone || '');
    setVehiclePlate(driver.plate_number || '');
    setVehicleType(driver.vehicle_type || '');
    setDriverSearchQuery(driver.name);
    setShowDriverNameSuggestions(false);
  };

  // Pending and active items grouped by invoice
  const [pendingItems, setPendingItems] = useState<
    (PendingInvoiceItemForDelivery & {
      unique_key: string;
      deliver_now_meters: number | '';
      is_selected: boolean;
      existing_delivery_item_id?: string;
    })[]
  >([]);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && delivery) {
      const customersList = StorageService.getCustomers().filter((c) => c.is_active);
      setAllCustomers(customersList);
      setSelectedCustomerId(delivery.customer_id);
      setDeliveryDate(delivery.delivery_date);
      setDestinationAddress(delivery.destination_address || '');
      setDescription(delivery.description || '');
      setErrorMessage('');

      // Load drivers
      const drvList = StorageService.getDrivers();
      setDrivers(drvList);
      setDriverSearchQuery('');
      setSelectedDriverId(delivery.driver_id || '');
      setDriverName(delivery.driver_name || '');
      setDriverPhone(delivery.driver_phone || '');
      setVehiclePlate(delivery.vehicle_plate || '');
      setVehicleType(delivery.vehicle_type || '');

      loadCustomerInvoicesAndItems(delivery.customer_id, delivery);
    }
  }, [isOpen, delivery]);

  const loadCustomerInvoicesAndItems = (customerId: string, currentDelivery: DeliveryNote) => {
    const customerInvoices = StorageService.getInvoices().filter(
      (i) => i.customer_id === customerId && i.status === 'active'
    );
    const otherDeliveries = StorageService.getDeliveries().filter(
      (d) => d.id !== currentDelivery.id && d.customer_id === customerId && d.status === 'delivered'
    );

    const itemsPool: (PendingInvoiceItemForDelivery & {
      unique_key: string;
      deliver_now_meters: number | '';
      is_selected: boolean;
      existing_delivery_item_id?: string;
    })[] = [];

    customerInvoices.forEach((inv) => {
      inv.items.forEach((invItem, idx) => {
        const itemId = invItem.id || `inv-item-${inv.id}-${idx}`;

        // Calculate other deliveries quantity for this invoice item
        let otherDelivered = 0;
        for (const oDel of otherDeliveries) {
          for (const oItem of oDel.items) {
            if (oItem.invoice_id === inv.id) {
              if (oItem.invoice_item_id) {
                if (oItem.invoice_item_id === itemId) {
                  otherDelivered += oItem.quantity_meters || 0;
                }
              } else {
                const sameProd = !oItem.product_id || oItem.product_id === 'prd-custom' || oItem.product_id === invItem.product_id;
                const sameSize = !invItem.size || oItem.size === invItem.size;
                const samePress = !invItem.pressure || oItem.pressure === invItem.pressure;
                const sameType = !invItem.type || oItem.type === invItem.type;
                const sameName = !invItem.product_name || !oItem.product_name || oItem.product_name.trim().toLowerCase() === invItem.product_name.trim().toLowerCase();
                if (sameProd && sameSize && samePress && sameType && sameName) {
                  otherDelivered += oItem.quantity_meters || 0;
                }
              }
            }
          }
        }

        const invoicedQty = invItem.quantity_meters || 0;
        const maxAvailable = Math.max(0, invoicedQty - otherDelivered);

        // Find if currently present in this delivery
        const matchedCurrentItem = currentDelivery.items.find((di) => {
          if (di.invoice_id !== inv.id) return false;
          if (di.invoice_item_id) {
            return di.invoice_item_id === itemId;
          }
          const sameProd = !di.product_id || di.product_id === 'prd-custom' || di.product_id === invItem.product_id;
          const sameSize = !invItem.size || di.size === invItem.size;
          const samePress = !invItem.pressure || di.pressure === invItem.pressure;
          const sameType = !invItem.type || di.type === invItem.type;
          const sameName = !invItem.product_name || !di.product_name || di.product_name.trim().toLowerCase() === invItem.product_name.trim().toLowerCase();
          return sameProd && sameSize && samePress && sameType && sameName;
        });

        const isSelected = !!matchedCurrentItem;
        const deliverNowMeters = matchedCurrentItem
          ? matchedCurrentItem.quantity_meters
          : '';

        itemsPool.push({
          invoice_id: inv.id,
          invoice_item_id: itemId,
          invoice_number: inv.invoice_number,
          product_id: invItem.product_id || 'prd-custom',
          product_name: invItem.product_name || 'لوله پلی اتیلن',
          product_code: invItem.product_code || '',
          product_spec: invItem.product_spec || '',
          size: invItem.size,
          pressure: invItem.pressure,
          type: invItem.type,
          unit_price: invItem.unit_price,
          invoiced_quantity: invoicedQty,
          delivered_quantity: otherDelivered,
          returned_quantity: 0,
          available_for_delivery: maxAvailable,
          unique_key: `${inv.id}_${itemId}_${idx}`,
          deliver_now_meters: deliverNowMeters,
          is_selected: isSelected,
          existing_delivery_item_id: matchedCurrentItem?.id,
        });
      });
    });

    setPendingItems(itemsPool);
  };

  const handleCustomerChange = (newCustomerId: string) => {
    setSelectedCustomerId(newCustomerId);
    const newCust = allCustomers.find((c) => c.id === newCustomerId);
    if (newCust && newCust.address) {
      setDestinationAddress(newCust.address);
    }
    loadCustomerInvoicesAndItems(newCustomerId, delivery);
  };

  // Handle Driver selection from search
  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriverId(driver.id);
    setDriverName(driver.name);
    setDriverPhone(driver.phone || '');
    setVehiclePlate(driver.plate_number || '');
    setVehicleType(driver.vehicle_type || '');
    setDriverSearchQuery('');
  };

  const handleToggleItemSelect = (uniqueKey: string) => {
    setPendingItems((prev) =>
      prev.map((it) => {
        if (it.unique_key === uniqueKey) {
          const nextSelected = !it.is_selected;
          return {
            ...it,
            is_selected: nextSelected,
            deliver_now_meters: nextSelected
              ? it.deliver_now_meters !== ''
                ? it.deliver_now_meters
                : it.available_for_delivery
              : '',
          };
        }
        return it;
      })
    );
  };

  const handleItemQtyChange = (uniqueKey: string, rawValue: string) => {
    setPendingItems((prev) =>
      prev.map((it) => {
        if (it.unique_key === uniqueKey) {
          if (rawValue === '') {
            return {
              ...it,
              deliver_now_meters: '',
            };
          }
          const parsed = parseFloat(rawValue);
          if (isNaN(parsed)) {
            return {
              ...it,
              deliver_now_meters: '',
            };
          }
          const safe = Math.min(it.available_for_delivery, Math.max(0, parsed));
          return {
            ...it,
            deliver_now_meters: safe,
            is_selected: safe > 0 ? true : it.is_selected,
          };
        }
        return it;
      })
    );
  };

  // Group pending items by invoice
  const groupedInvoices: {
    [invoiceId: string]: {
      invoice_number: string;
      items: typeof pendingItems;
    };
  } = {};

  pendingItems.forEach((item) => {
    if (!groupedInvoices[item.invoice_id]) {
      groupedInvoices[item.invoice_id] = {
        invoice_number: item.invoice_number,
        items: [],
      };
    }
    groupedInvoices[item.invoice_id].items.push(item);
  });

  const selectedCustomer =
    allCustomers.find((c) => c.id === selectedCustomerId) || {
      id: delivery.customer_id,
      name: delivery.customer_name,
      code: delivery.customer_code,
      phone: '',
      address: '',
    };

  const selectedItemsToDeliver = pendingItems.filter(
    (i) => i.is_selected && Number(i.deliver_now_meters) > 0
  );

  const totalSelectedMeters = selectedItemsToDeliver.reduce(
    (s, i) => s + (Number(i.deliver_now_meters) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    if (selectedItemsToDeliver.length === 0) {
      setErrorMessage('لطفاً حداقل یک قلم کالا با متراژ تحویل بزرگتر از صفر برای رسید تحویل انتخاب نمایید.');
      return;
    }

    setIsSubmitting(true);

    // Save or update driver in Drivers list if name is provided
    let finalDriverId = selectedDriverId;
    if (driverName.trim()) {
      const allDrivers = StorageService.getDrivers();
      if (selectedDriverId) {
        // Update existing driver
        const existingIdx = allDrivers.findIndex((d) => d.id === selectedDriverId);
        if (existingIdx >= 0) {
          allDrivers[existingIdx] = {
            ...allDrivers[existingIdx],
            name: driverName.trim(),
            phone: driverPhone.trim(),
            plate_number: vehiclePlate.trim(),
            vehicle_type: vehicleType.trim(),
            updated_at: new Date().toISOString(),
          };
          StorageService.saveDrivers(allDrivers);
        }
      } else {
        // Check if driver with same name exists
        const matched = allDrivers.find(
          (d) => d.name.trim().toLowerCase() === driverName.trim().toLowerCase()
        );
        if (matched) {
          finalDriverId = matched.id;
          matched.phone = driverPhone.trim();
          matched.plate_number = vehiclePlate.trim();
          matched.vehicle_type = vehicleType.trim();
          matched.updated_at = new Date().toISOString();
          StorageService.saveDrivers(allDrivers);
        } else {
          // Create new driver
          const newDriver: Driver = {
            id: `drv-${Date.now()}`,
            name: driverName.trim(),
            phone: driverPhone.trim(),
            plate_number: vehiclePlate.trim(),
            vehicle_type: vehicleType.trim(),
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          allDrivers.push(newDriver);
          StorageService.saveDrivers(allDrivers);
          finalDriverId = newDriver.id;
        }
      }
    }

    // Call service to update delivery note
    const res = DeliveryReturnService.updateDeliveryNote(delivery.id, {
      customer_id: selectedCustomer.id,
      customer_name: selectedCustomer.name,
      customer_code: selectedCustomer.code,
      delivery_date: deliveryDate,
      driver_id: finalDriverId || undefined,
      driver_name: driverName.trim() || undefined,
      driver_phone: driverPhone.trim() || undefined,
      vehicle_plate: vehiclePlate.trim() || undefined,
      vehicle_type: vehicleType.trim() || undefined,
      destination_address: destinationAddress.trim() || undefined,
      description: description.trim() || undefined,
      items: selectedItemsToDeliver.map((it) => ({
        id: it.existing_delivery_item_id,
        invoice_id: it.invoice_id,
        invoice_item_id: it.invoice_item_id,
        invoice_number: it.invoice_number,
        product_id: it.product_id,
        product_name: it.product_name,
        product_code: it.product_code,
        product_spec: it.product_spec,
        size: it.size,
        pressure: it.pressure,
        type: it.type,
        quantity_meters: Number(it.deliver_now_meters),
      })),
    });

    if (!res.success) {
      setIsSubmitting(false);
      setErrorMessage(res.message);
      return;
    }

    // Await server sync confirmation
    const syncRes = await StorageService.pushToHost();
    setIsSubmitting(false);

    if (!syncRes.success) {
      setErrorMessage('تغییرات رسید در سیستم محلی ثبت شد، اما به دلیل قطعی ارتباط با سرور هنوز در دیتابیس هاست ذخیره نشده است.');
      onSaved();
      onClose();
      return;
    }

    onSaved();
    onClose();
  };

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
      (d.phone && d.phone.includes(driverSearchQuery)) ||
      (d.plate_number && d.plate_number.includes(driverSearchQuery))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in no-print overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span>ویرایش کامل رسید تحویل کالا (حواله خروج انبار)</span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                  {delivery.delivery_number}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                مشتری: <span className="font-bold text-slate-700">{selectedCustomer.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* 1. Top Section: Delivery Number (Fixed) & Delivery Date & Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">شماره رسید تحویل (سیستمی)</label>
              <input
                type="text"
                readOnly
                value={delivery.delivery_number}
                className="w-full px-3 py-2 rounded-xl bg-slate-200/80 border border-slate-300 font-mono font-bold text-center text-slate-700 cursor-not-allowed select-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">شماره سند غیرقابل تغییر است.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">انتخاب / تغییر مشتری</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {allCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(کد: ${c.code})` : ''}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">با تغییر مشتری فاکتورهای مربوطه لود می‌شوند.</span>
            </div>

            <div>
              <JalaliDatePicker
                label="تاریخ تحویل بار (خورشیدی)"
                required
                value={deliveryDate}
                onChange={(iso) => setDeliveryDate(iso)}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">تاریخ تحویل و بارگیری حواله</span>
            </div>
          </div>

          {/* 2. Customer Information & Destination Address */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-3">
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>اطلاعات مشتری و آدرس تحویل بار</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[11px] block">نام شخص / شرکت:</span>
                <span className="font-bold text-slate-800">{selectedCustomer.name}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[11px] block">شماره تماس:</span>
                <span className="font-mono text-slate-800">{selectedCustomer.phone || '—'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[11px] block">کد مشتری:</span>
                <span className="font-mono text-slate-800">{selectedCustomer.code || '—'}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>محل و آدرس تخلیه بار / انبار مقصد</span>
              </label>
              <input
                type="text"
                placeholder="آدرس کارگاه یا انبار مشتری..."
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800"
              />
            </div>
          </div>

          {/* 3. Invoices and Items Table & Selection */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>فاکتورها، اقلام کالا و تعیین متراژ تحویل</span>
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                {selectedItemsToDeliver.length > 0 ? (
                  selectedItemsToDeliver.map((item, idx) => (
                    <div
                      key={`${item.invoice_id}-${item.product_id}-${idx}`}
                      className="text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-mono shadow-2xs"
                    >
                      {formatCompactItemSummary(Number(item.deliver_now_meters), item)}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    متراژ تحویلی انتخاب نشده است
                  </div>
                )}
              </div>
            </div>

            {Object.keys(groupedInvoices).length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500">
                هیچ فاکتور فعالی برای این مشتری یافت نشد.
              </div>
            ) : (
              Object.keys(groupedInvoices).map((invId) => {
                const group = groupedInvoices[invId];
                return (
                  <div
                    key={invId}
                    className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs bg-white"
                  >
                    {/* Invoice Card Header */}
                    <div className="bg-slate-100/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">شماره فاکتور:</span>
                        <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                          {group.invoice_number}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {group.items.length} قلم کالا در فاکتور
                      </span>
                    </div>

                    {/* Table of items for this invoice */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <th className="py-2.5 px-3 w-14">انتخاب</th>
                            <th className="py-2.5 px-3">شرح کالا</th>
                            <th className="py-2.5 px-3">سایز / فشار / نوع</th>
                            <th className="py-2.5 px-3">کل فاکتور</th>
                            <th className="py-2.5 px-3">سایر رسیدها</th>
                            <th className="py-2.5 px-3 text-blue-700">سقف مجاز این تحویل</th>
                            <th className="py-2.5 px-3 text-emerald-700 font-bold">متراژ این تحویل (متر)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((item) => (
                            <tr
                              key={item.unique_key}
                              className={item.is_selected ? 'bg-blue-50/20' : 'opacity-60'}
                            >
                              <td className="py-2.5 px-3">
                                <input
                                  type="checkbox"
                                  checked={item.is_selected}
                                  onChange={() => handleToggleItemSelect(item.unique_key)}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                {item.product_name || 'لوله پلی اتیلن'}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 font-semibold text-xs">
                                {item.product_spec ||
                                  [item.size, item.pressure, item.type].filter(Boolean).join(' - ') ||
                                  '—'}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-700">
                                {item.invoiced_quantity.toLocaleString('fa-IR')} م
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-500">
                                {item.delivered_quantity.toLocaleString('fa-IR')} م
                              </td>
                              <td className="py-2.5 px-3 font-bold text-blue-700 font-mono">
                                {item.available_for_delivery.toLocaleString('fa-IR')} م
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.available_for_delivery}
                                  step="any"
                                  placeholder="۰"
                                  value={item.deliver_now_meters}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
                                  }}
                                  onChange={(e) =>
                                    handleItemQtyChange(item.unique_key, e.target.value)
                                  }
                                  className={`w-28 px-2 py-1.5 rounded-lg border font-bold text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition ${
                                    item.is_selected
                                      ? 'bg-white border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white focus:bg-white focus:border-blue-500'
                                  }`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Driver and Transport Details */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-slate-700" />
              <span>مشخصات راننده و خودروی بارگیر</span>
            </h3>

            {/* Driver Search Box */}
            <div className="relative">
              <label className="block text-slate-700 font-semibold mb-1">
                جستجو در بین رانندگان قبلی
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو بر اساس نام راننده، شماره تلفن یا پلاک..."
                  value={driverSearchQuery}
                  onChange={(e) => setDriverSearchQuery(e.target.value)}
                  className="w-full pr-9 pl-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800"
                />
              </div>

              {driverSearchQuery && filteredDrivers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredDrivers.map((drv) => (
                    <div
                      key={drv.id}
                      onClick={() => handleSelectDriver(drv)}
                      className="p-2.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{drv.name}</div>
                        <div className="text-[11px] text-slate-500">
                          تلفن: {drv.phone || '—'} | نوع: {drv.vehicle_type || '—'}
                        </div>
                      </div>
                      {drv.plate_number && (
                        <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {drv.plate_number}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Driver Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="relative">
                <label className="block text-slate-700 font-medium mb-1">نام راننده</label>
                <input
                  type="text"
                  placeholder="نام و نام خانوادگی..."
                  value={driverName}
                  onFocus={() => setShowDriverNameSuggestions(true)}
                  onChange={(e) => {
                    setDriverName(e.target.value);
                    setShowDriverNameSuggestions(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none text-xs text-slate-800"
                />
                {showDriverNameSuggestions && driverNameSuggestions.length > 0 && (
                  <div className="absolute z-30 w-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {driverNameSuggestions.map((drv) => (
                      <button
                        key={drv.id}
                        type="button"
                        onClick={() => selectDriverFromName(drv)}
                        className="w-full px-3 py-2 text-right hover:bg-blue-50 flex items-center justify-between text-xs transition cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{drv.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {drv.phone ? `تلفن: ${drv.phone}` : ''} {drv.plate_number ? `پلاک: ${drv.plate_number}` : ''}
                          </div>
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">
                          انتخاب
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">شماره تماس راننده</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="۰۹۱۲..."
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none font-mono text-xs text-slate-800 text-left"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">نوع خودرو</label>
                <input
                  type="text"
                  placeholder="خاور، تک، تریلی..."
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">پلاک انتظامی خودرو</label>
                <input
                  type="text"
                  dir="ltr"
                  placeholder="۱۲ج۳۴۵-ایران۱۱"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none font-mono text-xs text-slate-800 text-left"
                />
              </div>
            </div>
          </div>

          {/* 5. Description / Notes */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">توضیحات و یادداشت رسید تحویل</label>
            <textarea
              rows={2}
              placeholder="توضیحات تکمیلی، شرایط تحویل یا شماره بارنامه..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none text-xs text-slate-800 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-600">
              مجموع متراژ انتخاب‌شده این حواله:{' '}
              <span className="font-bold text-blue-600 font-mono text-sm">
                {formatNumber(totalSelectedMeters)}
              </span>{' '}
              متر
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'در حال ذخیره...' : 'ذخیره کلیه تغییرات رسید تحویل'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
