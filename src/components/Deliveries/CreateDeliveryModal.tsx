import React, { useState, useEffect } from 'react';
import { Customer, Driver, Vehicle, Invoice } from '../../types';
import { StorageService } from '../../services/storageService';
import { DeliveryReturnService, PendingInvoiceItemForDelivery } from '../../services/deliveryReturnService';
import { formatJalaliDate, getTodayISO } from '../../utils/jalali';
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
} from 'lucide-react';

interface CreateDeliveryModalProps {
  customer: Customer;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateDeliveryModal: React.FC<CreateDeliveryModalProps> = ({
  customer,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [deliveryNumber, setDeliveryNumber] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(getTodayISO());

  // Drivers
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [description, setDescription] = useState('');
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

  // Pending items grouped by invoice
  const [pendingItems, setPendingItems] = useState<
    (PendingInvoiceItemForDelivery & {
      unique_key: string;
      deliver_now_meters: number | '';
      is_selected: boolean;
    })[]
  >([]);

  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && customer) {
      setDeliveryNumber(StorageService.generateDeliveryNumber());
      setDeliveryDate(getTodayISO());
      setDestinationAddress(customer.address || '');
      setErrorMessage('');

      // Load drivers
      const drvList = StorageService.getDrivers();
      setDrivers(drvList);
      setDriverSearchQuery('');
      setSelectedDriverId('');
      setDriverName('');
      setDriverPhone('');
      setVehiclePlate('');
      setVehicleType('');
      setDescription('');

      // Load pending items for this customer - default unchecked & empty delivery meters
      const eligibles = DeliveryReturnService.getCustomerPendingDeliveries(customer.id);
      setPendingItems(
        eligibles.map((item, idx) => ({
          ...item,
          unique_key: `${item.invoice_id}_${item.invoice_item_id}_${idx}`,
          deliver_now_meters: '',
          is_selected: false,
        }))
      );
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  // Handle Driver selection from search
  const handleSelectDriver = (driver: Driver) => {
    setSelectedDriverId(driver.id);
    setDriverName(driver.name);
    setDriverPhone(driver.phone || '');
    setVehiclePlate(driver.plate_number || '');
    setVehicleType(driver.vehicle_type || '');
    setDriverSearchQuery(driver.name);
  };

  const handleToggleItemSelect = (uniqueKey: string) => {
    setPendingItems((prev) =>
      prev.map((it) => {
        if (it.unique_key === uniqueKey) {
          const nextSelected = !it.is_selected;
          return {
            ...it,
            is_selected: nextSelected,
            deliver_now_meters: nextSelected ? (it.deliver_now_meters !== '' ? it.deliver_now_meters : '') : '',
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

  const totalSelectedMeters = pendingItems
    .filter((i) => i.is_selected)
    .reduce((s, i) => s + (Number(i.deliver_now_meters) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');

    const itemsToDeliver = pendingItems.filter(
      (i) => i.is_selected && Number(i.deliver_now_meters) > 0
    );

    if (itemsToDeliver.length === 0) {
      setErrorMessage('لطفاً حداقل یک قلم کالا با متراژ تحویل بزرگتر از صفر انتخاب کنید.');
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

    // Call service to create delivery note
    const res = DeliveryReturnService.createDeliveryNote({
      customer_id: customer.id,
      delivery_date: deliveryDate,
      driver_id: finalDriverId || undefined,
      driver_name: driverName.trim() || undefined,
      driver_phone: driverPhone.trim() || undefined,
      vehicle_plate: vehiclePlate.trim() || undefined,
      vehicle_type: vehicleType.trim() || undefined,
      destination_address: destinationAddress.trim() || undefined,
      description: description.trim() || undefined,
      items: itemsToDeliver.map((it) => ({
        invoice_id: it.invoice_id,
        invoice_item_id: it.invoice_item_id,
        product_id: it.product_id,
        product_name: it.product_name,
        size: it.size,
        pressure: it.pressure,
        type: it.type,
        quantity_meters: Number(it.deliver_now_meters),
        description: it.product_spec || it.product_name,
      })),
    });

    if (!res.success) {
      setIsSubmitting(false);
      setErrorMessage(res.message || 'خطا در صدور رسید تحویل');
      return;
    }

    // Direct fast server sync to guarantee persistence before closing form
    if (res.deliveryNote) {
      try {
        await StorageService.saveSingleItem('deliveries', res.deliveryNote);
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
    }
    StorageService.pushToHost().catch(() => {});
    setIsSubmitting(false);
    onSuccess();
    onClose();
  };

  const filteredDrivers = drivers.filter((d) =>
    d.name.toLowerCase().includes(driverSearchQuery.toLowerCase()) ||
    (d.phone && d.phone.includes(driverSearchQuery)) ||
    (d.plate_number && d.plate_number.includes(driverSearchQuery))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in no-print overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                صدور رسید تحویل کالا (حواله خروج انبار)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                مشتری: {customer.name}
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
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Top Section: Delivery Number & Delivery Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">شماره رسید تحویل (سیستمی)</label>
              <input
                type="text"
                readOnly
                value={deliveryNumber}
                className="w-full px-3 py-2 rounded-xl bg-slate-200/80 border border-slate-300 font-mono font-bold text-center text-slate-700 cursor-not-allowed select-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">شماره به صورت خودکار تخصیص یافته و غیرقابل تغییر است.</span>
            </div>

            <div>
              <JalaliDatePicker
                label="تاریخ تحویل بار (خورشیدی)"
                required
                value={deliveryDate}
                onChange={(iso) => setDeliveryDate(iso)}
              />
              <span className="text-[11px] text-slate-500 mt-1 block">تاریخ پیش‌فرض امروز است و از تقویم قابل تغییر می‌باشد.</span>
            </div>
          </div>

          {/* 2. Customer Information Display */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
            <h3 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>اطلاعات مشتری و پروژه</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[11px] block">نام شخص / شرکت:</span>
                <span className="font-bold text-slate-800">{customer.name}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[11px] block">شماره تماس:</span>
                <span className="font-mono text-slate-800">{customer.phone || '—'}</span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                <span className="text-slate-500 text-[11px] block">کد مشتری:</span>
                <span className="font-mono text-slate-800">{customer.code || '—'}</span>
              </div>
            </div>
          </div>

          {/* 3. Pending Invoices and Items Cards */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>فاکتورهای دارای اقلام تحویل‌نشده و تعیین متراژ بارگیری</span>
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                {pendingItems.filter((i) => i.is_selected && Number(i.deliver_now_meters) > 0).length > 0 ? (
                  pendingItems
                    .filter((i) => i.is_selected && Number(i.deliver_now_meters) > 0)
                    .map((item, idx) => (
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
                هیچ فاکتور دارای اقلام تحویل‌نشده‌ای برای این مشتری یافت نشد.
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
                        {group.items.length} قلم در انتظار تحویل
                      </span>
                    </div>

                    {/* Table of items for this invoice */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-center text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                            <th className="py-2.5 px-3">انتخاب</th>
                            <th className="py-2.5 px-3">شرح کالا</th>
                            <th className="py-2.5 px-3">سایز / فشار / نوع</th>
                            <th className="py-2.5 px-3">کل فاکتور</th>
                            <th className="py-2.5 px-3">قبلاً تحویل</th>
                            <th className="py-2.5 px-3 text-amber-700">باقی‌مانده مجاز</th>
                            <th className="py-2.5 px-3 text-blue-700">متراژ این تحویل (متر)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((item) => (
                            <tr
                              key={item.unique_key}
                              className={item.is_selected ? 'bg-amber-50/20' : 'opacity-60'}
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
                                {item.product_spec || [item.size, item.pressure, item.type].filter(Boolean).join(' - ') || '—'}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-700">
                                {item.invoiced_quantity.toLocaleString('fa-IR')} م
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-500">
                                {item.delivered_quantity.toLocaleString('fa-IR')} م
                              </td>
                              <td className="py-2.5 px-3 font-bold text-amber-700">
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
                                    handleItemQtyChange(
                                      item.unique_key,
                                      e.target.value
                                    )
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
                  onChange={(e) => {
                    setDriverSearchQuery(e.target.value);
                    if (!selectedDriverId) {
                      setDriverName(e.target.value);
                    }
                  }}
                  className="w-full pl-3 pr-9 py-2 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Suggestions Dropdown */}
              {driverSearchQuery.trim() && filteredDrivers.length > 0 && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-100 z-10">
                  {filteredDrivers.map((drv) => (
                    <button
                      key={drv.id}
                      type="button"
                      onClick={() => handleSelectDriver(drv)}
                      className="w-full px-3 py-2 text-right hover:bg-amber-50/50 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="font-bold text-slate-800">{drv.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-3">
                        {drv.phone && <span>{drv.phone}</span>}
                        {drv.plate_number && <span>{drv.plate_number}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Driver Fields (Name, Phone, Plate, Vehicle Type) */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div className="relative">
                <label className="block text-slate-700 font-bold mb-1">نام راننده</label>
                <input
                  type="text"
                  placeholder="مثال: علی رضایی"
                  value={driverName}
                  onFocus={() => setShowDriverNameSuggestions(true)}
                  onChange={(e) => {
                    setDriverName(e.target.value);
                    setShowDriverNameSuggestions(true);
                  }}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center font-medium"
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
                <label className="block text-slate-700 font-bold mb-1">شماره تماس راننده</label>
                <input
                  type="text"
                  placeholder="0912..."
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">پلاک انتظامی</label>
                <input
                  type="text"
                  placeholder="مثال: 12 ج 345 ایران 68"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">نوع خودرو</label>
                <input
                  type="text"
                  placeholder="خاور / تک / تریلی / وانت"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center font-medium"
                />
              </div>
            </div>

            {/* Address & Description */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-700 font-bold mb-1">آدرس و محل تخلیه بار</label>
                <input
                  type="text"
                  placeholder="محل تخلیه در پروژه..."
                  value={destinationAddress}
                  onChange={(e) => setDestinationAddress(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">توضیحات و یادداشت بارنامه</label>
                <input
                  type="text"
                  placeholder="ملاحظات بارگیری، وزن باسکول و..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalSelectedMeters === 0}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال ثبت و ارسال به دیتابیس...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>ثبت و صدور رسید تحویل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
