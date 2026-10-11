import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { InventoryService } from '../../services/inventoryService';
import { MaterialMovement } from '../../types';
import { formatJalaliDate, getTodayISO, toPersianDigits } from '../../utils/jalali';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { exportToExcel } from '../../utils/exportExcel';
import { WarehouseFilterReport } from './WarehouseFilterReport';
import { SortableHeader } from '../Common/SortableHeader';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Download,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertCircle,
  History,
} from 'lucide-react';

export const WarehouseManager: React.FC = () => {
  const [movements, setMovements] = useState<MaterialMovement[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'in' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingMovement, setEditingMovement] = useState<MaterialMovement | null>(null);
  const [historyMovement, setHistoryMovement] = useState<MaterialMovement | null>(null);
  const [modalType, setModalType] = useState<'in' | 'out'>('in');
  const [materialName, setMaterialName] = useState<string>('');
  const [movementDate, setMovementDate] = useState<string>(getTodayISO());
  const [quantity, setQuantity] = useState<string>('');
  const [bagsCount, setBagsCount] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [referenceType, setReferenceType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
    const handleDbSynced = () => {
      if (!showModal) {
        loadData();
      }
    };
    window.addEventListener('polyethylene-db-synced', handleDbSynced);
    return () => {
      window.removeEventListener('polyethylene-db-synced', handleDbSynced);
    };
  }, [showModal]);

  const loadData = () => {
    setMovements(StorageService.getMovements());
  };

  const handleOpenModal = (type: 'in' | 'out') => {
    setEditingMovement(null);
    setModalType(type);
    setMaterialName('');
    setMovementDate(getTodayISO());
    setQuantity('');
    setBagsCount('');
    setDriverName('');
    setDriverPhone('');
    setVehiclePlate('');
    setReferenceType('');
    setDescription('');
    setErrorMessage('');
    setIsSubmitting(false);
    setShowModal(true);
  };

  const handleOpenEditMovement = (m: MaterialMovement) => {
    setEditingMovement(m);
    setModalType(m.type === 'out' ? 'out' : 'in');
    setMaterialName(m.material_name);
    setMovementDate(m.created_at ? m.created_at.substring(0, 10) : getTodayISO());
    setQuantity(String(m.quantity));
    setBagsCount(m.bags_count ? String(m.bags_count) : '');
    setDriverName(m.driver_name || '');
    setDriverPhone(m.driver_phone || '');
    setVehiclePlate(m.vehicle_plate || '');
    setReferenceType(m.reference_type || '');
    setDescription(m.description || '');
    setErrorMessage('');
    setIsSubmitting(false);
    setShowModal(true);
  };

  const handleBagsChange = (val: string) => {
    setBagsCount(val);
  };

  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!materialName.trim()) {
      setErrorMessage('ورود نام ماده اولیه الزامی است.');
      return;
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setErrorMessage('مقدار وزن (کیلوگرم) باید عددی بزرگتر از صفر باشد.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const numBags = bagsCount ? parseFloat(bagsCount) : undefined;

      const movementData: MaterialMovement = {
        id: editingMovement ? editingMovement.id : `mov-${Date.now()}`,
        material_name: materialName.trim(),
        material_code: editingMovement ? editingMovement.material_code : undefined,
        type: modalType,
        quantity: numQty,
        bags_count: numBags && !isNaN(numBags) ? numBags : undefined,
        driver_name: driverName.trim() || undefined,
        driver_phone: driverPhone.trim() || undefined,
        vehicle_plate: vehiclePlate.trim() || undefined,
        reference_type: referenceType.trim() || undefined,
        description: description.trim() || undefined,
        created_at: movementDate ? new Date(movementDate).toISOString() : editingMovement?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      StorageService.saveMovement(movementData);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});

      setIsSubmitting(false);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'خطای غیرمنتظره در ثبت انبار');
    }
  };

  const handleDeleteMovement = async (m: MaterialMovement) => {
    if (!window.confirm(`آیا از حذف این رکورد گردش ماده اولیه «${m.material_name}» اطمینان دارید؟`)) return;
    StorageService.deleteMovement(m.id);
    await StorageService.pushToHost();
    loadData();
  };

  const handleExportMovementsExcel = () => {
    const data = filteredMovements.map((m, idx) => ({
      ردیف: idx + 1,
      نوع_سند: m.type === 'in' ? 'ورود به انبار' : 'خروج از انبار',
      تاریخ: formatJalaliDate(m.created_at),
      ماده_اولیه: m.material_name,
      کد_ماده: m.material_code || '—',
      تعداد_کیسه: m.bags_count || '—',
      وزن_کیلوگرم: m.quantity,
      تامین‌کننده_یا_مقصد: m.reference_type || '—',
      راننده: m.driver_name || '—',
      شماره_تماس: m.driver_phone || '—',
      پلاک_خودرو: m.vehicle_plate || '—',
      توضیحات: m.description || '—',
    }));

    exportToExcel({
      fileName: 'گردش_ورود_و_خروج_مواد_اولیه',
      sheetName: 'مواد اولیه',
      data,
    });
  };

  const filteredMovements = movements.filter((m) => {
    if (activeFilter === 'in' && m.type !== 'in') return false;
    if (activeFilter === 'out' && m.type !== 'out') return false;

    const query = searchQuery.toLowerCase();
    const match =
      m.material_name.toLowerCase().includes(query) ||
      (m.material_code && m.material_code.toLowerCase().includes(query)) ||
      (m.reference_type && m.reference_type.toLowerCase().includes(query)) ||
      (m.driver_name && m.driver_name.toLowerCase().includes(query)) ||
      (m.vehicle_plate && m.vehicle_plate.toLowerCase().includes(query)) ||
      (m.description && m.description.toLowerCase().includes(query));

    return match;
  });

  // Sorting state - defaults to newest material movements first (created_at desc)
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'created_at' ? 'desc' : 'asc');
    }
  };

  const sortedMovements = React.useMemo(() => {
    return [...filteredMovements].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'created_at') {
        valA = new Date(a.created_at).getTime() || 0;
        valB = new Date(b.created_at).getTime() || 0;
      } else if (sortKey === 'type') {
        valA = a.type || '';
        valB = b.type || '';
      } else if (sortKey === 'material_name') {
        valA = a.material_name || '';
        valB = b.material_name || '';
      } else if (sortKey === 'bags_count') {
        valA = a.bags_count || 0;
        valB = b.bags_count || 0;
      } else if (sortKey === 'quantity') {
        valA = a.quantity || 0;
        valB = b.quantity || 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredMovements, sortKey, sortOrder]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Banner (Cards and total weight summary removed per request) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <span>مواد اولیه</span>
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Entry Button */}
          {StorageService.hasPermission('warehouse.create') && (
            <button
              onClick={() => handleOpenModal('in')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>ثبت ورود مواد اولیه</span>
            </button>
          )}

          {/* Exit Button */}
          {StorageService.hasPermission('warehouse.create') && (
            <button
              onClick={() => handleOpenModal('out')}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>ثبت خروج مواد اولیه</span>
            </button>
          )}

          {/* Export Excel */}
          {StorageService.hasPermission('warehouse.print') && (
            <button
              onClick={handleExportMovementsExcel}
              title="دریافت فایل اکسل گردش مواد اولیه"
              className="p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter & Print Report */}
      <WarehouseFilterReport
        movements={movements}
        onFilteredChange={() => {}}
      />

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex bg-slate-100/90 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              همه تراکنش‌ها ({toPersianDigits(movements.length)})
            </button>
            <button
              onClick={() => setActiveFilter('in')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeFilter === 'in'
                  ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
              <span>ورودی‌ها</span>
            </button>
            <button
              onClick={() => setActiveFilter('out')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                activeFilter === 'out'
                  ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
              <span>خروجی‌ها</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجوی ماده اولیه، تامین‌کننده، راننده، پلاک..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-slate-50/70 dark:bg-slate-800 text-slate-800 dark:text-slate-100 transition"
            />
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-3.5 px-4 text-center w-16">ردیف</th>
                <SortableHeader
                  label="نوع سند"
                  sortKey="type"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="تاریخ"
                  sortKey="created_at"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="ماده اولیه"
                  sortKey="material_name"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="تعداد کیسه"
                  sortKey="bags_count"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="وزن (کیلوگرم)"
                  sortKey="quantity"
                  currentSort={sortKey ? { key: sortKey, direction: sortOrder } : null}
                  onSort={handleSort}
                  align="center"
                />
                <th className="py-3.5 px-4 text-center">تامین‌کننده / مقصد</th>
                <th className="py-3.5 px-4 text-center">راننده و پلاک</th>
                <th className="py-3.5 px-4 text-center">توضیحات</th>
                <th className="py-3.5 px-4 text-center w-24">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedMovements.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    هیچ تراکنش یا سندی برای مواد اولیه ثبت نشده است.
                  </td>
                </tr>
              ) : (
                sortedMovements.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500 dark:text-slate-400 text-center">
                      {toPersianDigits(idx + 1)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {m.type === 'in' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>ورود مواد</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>خروج مواد</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-center font-bold text-xs">
                      {formatJalaliDate(m.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{m.material_name}</div>
                      {m.material_code && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {m.material_code}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300 text-center">
                      {m.bags_count ? `${toPersianDigits(m.bags_count)} کیسه` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`font-mono font-black ${m.type === 'in' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                        {m.type === 'in' ? '+' : '-'}{toPersianDigits(Number(m.quantity || 0).toLocaleString('fa-IR'))}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">{m.reference_type || '—'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{m.driver_name || '—'}</div>
                      {m.vehicle_plate && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                          {toPersianDigits(m.vehicle_plate)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="text-slate-600 dark:text-slate-400 text-xs max-w-xs mx-auto truncate">
                        {m.description || '—'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('warehouse.view')) && (
                          <button
                            type="button"
                            onClick={() => setHistoryMovement(m)}
                            title="تاریخچه و رویدادهای گردش انبار"
                            className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {StorageService.hasPermission('warehouse.create') && (
                          <button
                            onClick={() => handleOpenEditMovement(m)}
                            title="ویرایش سند گردش"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {StorageService.hasPermission('warehouse.delete') && (
                          <button
                            onClick={() => handleDeleteMovement(m)}
                            title="حذف سند گردش"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MOVEMENT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-100 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                    modalType === 'in' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/50'
                  }`}
                >
                  {modalType === 'in' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {modalType === 'in' ? 'ثبت ورود مواد اولیه به انبار' : 'ثبت خروج مواد اولیه (مصرف خط تولید)'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    مشخصات بار، وزن، راننده و مبدا/مقصد را وارد فرمایید.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveMovement} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Manual Material Name Input - No default value */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    نام ماده اولیه <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="نام ماده اولیه را وارد نمایید (مثلاً: PE100 پتروشیمی جم، مستربچ و...)"
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none text-xs text-slate-900 dark:text-white font-bold"
                  />
                </div>

                {/* Date */}
                <div className="sm:col-span-2">
                  <JalaliDatePicker
                    label="تاریخ ورود / خروج"
                    value={movementDate}
                    onChange={setMovementDate}
                    required
                  />
                </div>

                {/* Bags Count - No default value */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">تعداد کیسه</label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="تعداد کیسه..."
                    value={bagsCount}
                    onChange={(e) => handleBagsChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none font-mono text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Weight in KG - No default value */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    وزن (کیلوگرم) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0.001}
                    step="any"
                    required
                    placeholder="وزن به کیلوگرم..."
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none font-mono text-xs font-black text-blue-700 dark:text-blue-400"
                  />
                </div>

                {/* Source / Destination - No default value */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    {modalType === 'in' ? 'تامین‌کننده / پتروشیمی مبدا' : 'خط تولید مقصد / مصرف‌کننده'}
                  </label>
                  <input
                    type="text"
                    placeholder={
                      modalType === 'in'
                        ? 'تامین‌کننده / پتروشیمی مبدا...'
                        : 'خط تولید مقصد / مصرف‌کننده...'
                    }
                    value={referenceType}
                    onChange={(e) => setReferenceType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none text-xs text-slate-800 dark:text-slate-100 font-medium"
                  />
                </div>

                {/* Driver */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">نام راننده</label>
                  <input
                    type="text"
                    placeholder="نام راننده..."
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Driver Phone */}
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">شماره تماس راننده</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="0912..."
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none font-mono text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Vehicle Plate */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">پلاک انتظامی خودرو</label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="مثال: ۲۲ع۴۵۶-ایران۵۵"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none font-mono text-xs text-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">توضیحات و شماره بارنامه / بچ</label>
                  <textarea
                    rows={2}
                    placeholder="شماره بچ مواد، حواله باسکول، توضیحات تکمیلی..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-none text-xs text-slate-800 dark:text-slate-100 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white font-bold shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                    modalType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ثبت گردش انبار...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{modalType === 'in' ? 'ثبت ورود به انبار' : 'ثبت خروج از انبار'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Audit History Modal */}
      {historyMovement && (
        <AuditHistoryModal
          isOpen={!!historyMovement}
          onClose={() => setHistoryMovement(null)}
          entityType="MATERIAL_MOVEMENT"
          entityId={historyMovement.id}
          documentNumber={historyMovement.id}
          title="تاریخچه و رویدادهای گردش انبار مواد اولیه"
          subtitle={`ماده: ${historyMovement.material_name} - نوع: ${historyMovement.type === 'in' ? 'ورود' : 'خروج'} - مقدار: ${historyMovement.quantity.toLocaleString('fa-IR')} کیلوگرم`}
        />
      )}
    </div>
  );
};
