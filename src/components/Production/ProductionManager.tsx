import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { ProductionLog } from '../../types';
import { formatJalaliDate, getTodayISO, toPersianDigits } from '../../utils/jalali';
import { JalaliDatePicker } from '../Common/JalaliDatePicker';
import { ProductionFilterReport } from './ProductionFilterReport';
import { SortableHeader } from '../Common/SortableHeader';
import { AuditHistoryModal } from '../Common/AuditHistoryModal';
import {
  Factory,
  Plus,
  Search,
  Calendar,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Scale,
  Gauge,
  User,
  Activity,
  History,
} from 'lucide-react';

const COMMON_SIZES = [
  '16',
  '20',
  '25',
  '32',
  '40',
  '50',
  '63',
  '75',
  '90',
  '110',
  '125',
  '160',
  '200',
  '250',
  '315',
  '400',
];

const COMMON_PRESSURES = ['4 بار', '6 بار', '10 بار', '16 بار', '20 بار', '25 بار'];

const TYPE_OPTIONS = [
  { value: 'PE100', label: 'PE100' },
  { value: 'PE80', label: 'PE80' },
  { value: '', label: 'خالی' },
];

export const ProductionManager: React.FC = () => {
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<ProductionLog | null>(null);
  const [historyLog, setHistoryLog] = useState<ProductionLog | null>(null);

  // Form State
  const [form, setForm] = useState({
    production_date: getTodayISO(),
    size: '63',
    pressure: '10 بار',
    type: 'PE100',
    diameter: '',
    thickness: '',
    motor_speed: '',
    traction_speed: '',
    die_mold: '',
    pin_needle: '',
    weight_unit: '' as number | '',
    meters: '' as number | '',
    total_weight: 0,
    customer_name: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
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
    setLogs(StorageService.getProductionLogs());
  };

  // Real-time calculation of total weight
  const calculatedTotalWeight =
    typeof form.weight_unit === 'number' && typeof form.meters === 'number'
      ? parseFloat((form.weight_unit * form.meters).toFixed(3))
      : 0;

  const handleOpenModal = (log?: ProductionLog) => {
    setIsSubmitting(false);
    if (log) {
      setEditingLog(log);
      setForm({
        production_date: log.production_date || getTodayISO(),
        size: log.size || log.pipe_size || '',
        pressure: log.pressure || '',
        type: log.type || (log.material_type?.includes('PE80') ? 'PE80' : 'PE100') || '',
        diameter: log.diameter || '',
        thickness: log.thickness || '',
        motor_speed: log.motor_speed || '',
        traction_speed: log.traction_speed || '',
        die_mold: log.die_mold || '',
        pin_needle: log.pin_needle || '',
        weight_unit: log.weight_unit !== undefined ? log.weight_unit : (log.weight_kg && log.meters_produced ? parseFloat((log.weight_kg / log.meters_produced).toFixed(3)) : ''),
        meters: log.meters !== undefined ? log.meters : (log.meters_produced || ''),
        total_weight: log.total_weight !== undefined ? log.total_weight : (log.weight_kg || 0),
        customer_name: log.customer_name || '',
        notes: log.notes || '',
      });
    } else {
      setEditingLog(null);
      setForm({
        production_date: getTodayISO(),
        size: '63',
        pressure: '10 بار',
        type: 'PE100',
        diameter: '',
        thickness: '',
        motor_speed: '',
        traction_speed: '',
        die_mold: '',
        pin_needle: '',
        weight_unit: '',
        meters: '',
        total_weight: 0,
        customer_name: '',
        notes: '',
      });
    }
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!form.size.trim()) {
      setFormError('لطفاً سایز لوله را وارد نمایید.');
      return;
    }
    if (!form.meters || Number(form.meters) <= 0) {
      setFormError('متراژ تولیدی باید بزرگتر از صفر باشد.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const unitW = typeof form.weight_unit === 'number' ? form.weight_unit : 0;
      const mtrs = typeof form.meters === 'number' ? form.meters : 0;
      const computedTotalW = calculatedTotalWeight > 0 ? calculatedTotalWeight : parseFloat((unitW * mtrs).toFixed(3));

      const logData: ProductionLog = {
        id: editingLog ? editingLog.id : `prdlog-${Date.now()}`,
        code: editingLog?.code || StorageService.generateProductionCode(),
        production_date: form.production_date,
        size: form.size.trim(),
        pressure: form.pressure.trim(),
        type: form.type,
        diameter: form.diameter.trim(),
        thickness: form.thickness.trim(),
        motor_speed: form.motor_speed.trim(),
        traction_speed: form.traction_speed.trim(),
        die_mold: form.die_mold.trim(),
        pin_needle: form.pin_needle.trim(),
        weight_unit: unitW,
        meters: mtrs,
        total_weight: computedTotalW,
        customer_name: form.customer_name.trim(),
        notes: form.notes.trim() || undefined,
        created_at: editingLog ? editingLog.created_at : new Date().toISOString(),
        // Legacy compatibility
        pipe_size: form.size.trim(),
        meters_produced: mtrs,
        weight_kg: computedTotalW,
        material_type: form.type || 'پلی اتیلن',
      };

      StorageService.saveProductionLog(logData);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('polyethylene-db-synced'));
      }
      StorageService.pushToHost().catch(() => {});

      setIsSubmitting(false);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err?.message || 'خطای غیرمنتظره در ثبت گزارش تولید');
    }
  };

  const handleDelete = (log: ProductionLog) => {
    if (!window.confirm(`آیا از حذف این گزارش تولید (سایز ${log.size || log.pipe_size}) اطمینان دارید؟`)) return;
    StorageService.deleteProductionLog(log.id);
    loadData();
  };

  const filteredLogs = logs.filter((l) => {
    if (!l) return false;
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const matchSearch =
        (l.code && String(l.code).toLowerCase().includes(query)) ||
        (l.size && String(l.size).toLowerCase().includes(query)) ||
        (l.pipe_size && String(l.pipe_size).toLowerCase().includes(query)) ||
        (l.customer_name && String(l.customer_name).toLowerCase().includes(query)) ||
        (l.pressure && String(l.pressure).toLowerCase().includes(query)) ||
        (l.die_mold && String(l.die_mold).toLowerCase().includes(query)) ||
        (l.pin_needle && String(l.pin_needle).toLowerCase().includes(query)) ||
        (l.notes && String(l.notes).toLowerCase().includes(query));

      if (!matchSearch) return false;
    }
    if (typeFilter !== 'all' && (l.type || '') !== typeFilter) return false;
    return true;
  });

  // Sorting state - defaults to newest production logs first (production_date desc)
  const [sortKey, setSortKey] = useState<string>('production_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'production_date' ? 'desc' : 'asc');
    }
  };

  const sortedLogs = React.useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'production_date') {
        const dA = a.production_date || a.created_at || '';
        const dB = b.production_date || b.created_at || '';
        valA = dA ? new Date(dA).getTime() || 0 : 0;
        valB = dB ? new Date(dB).getTime() || 0 : 0;
      } else if (sortKey === 'size') {
        valA = parseFloat(String(a.size || a.pipe_size || '0')) || 0;
        valB = parseFloat(String(b.size || b.pipe_size || '0')) || 0;
      } else if (sortKey === 'pressure') {
        valA = String(a.pressure || '');
        valB = String(b.pressure || '');
      } else if (sortKey === 'type') {
        valA = String(a.type || '');
        valB = String(b.type || '');
      } else if (sortKey === 'meters') {
        valA = Number(a.meters !== undefined && a.meters !== null ? a.meters : (a.meters_produced || 0)) || 0;
        valB = Number(b.meters !== undefined && b.meters !== null ? b.meters : (b.meters_produced || 0)) || 0;
      } else if (sortKey === 'total_weight') {
        valA = Number(a.total_weight !== undefined && a.total_weight !== null ? a.total_weight : (a.weight_kg || 0)) || 0;
        valB = Number(b.total_weight !== undefined && b.total_weight !== null ? b.total_weight : (b.weight_kg || 0)) || 0;
      } else if (sortKey === 'customer_name') {
        valA = String(a.customer_name || '');
        valB = String(b.customer_name || '');
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLogs, sortKey, sortOrder]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Factory className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>مدیریت خط تولید</span>
          </h1>
        </div>

        {StorageService.hasPermission('production.create') && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت گزارش تولید</span>
          </button>
        )}
      </div>

      {/* Advanced Filter & Print Report */}
      <ProductionFilterReport
        logs={logs}
        onFilteredChange={() => {}}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجو در سایز، فشار، سفارش‌دهنده، قالب، سوزنی، توضیحات..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-10 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
          >
            <option value="all">همه انواع مواد</option>
            <option value="PE100">PE100</option>
            <option value="PE80">PE80</option>
            <option value="">خالی / بدون نوع</option>
          </select>
        </div>
      </div>

      {/* Production Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <SortableHeader
                  label="تاریخ"
                  sortKey="production_date"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="سایز"
                  sortKey="size"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="فشار"
                  sortKey="pressure"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="نوع"
                  sortKey="type"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <th className="py-3.5 px-3 text-center">قطر / ضخامت</th>
                <th className="py-3.5 px-3 text-center">موتور / کشش</th>
                <th className="py-3.5 px-3 text-center">قالب / سوزنی</th>
                <th className="py-3.5 px-3 text-center">وزن واحد (kg)</th>
                <SortableHeader
                  label="متراژ (متر)"
                  sortKey="meters"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="مجموع وزن (kg)"
                  sortKey="total_weight"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <SortableHeader
                  label="سفارش دهنده"
                  sortKey="customer_name"
                  currentSortKey={sortKey}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  align="center"
                />
                <th className="py-3.5 px-3 text-center">توضیحات</th>
                <th className="py-3.5 px-3 text-center w-24">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedLogs.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    گزارش تولیدی یافت نشد.
                  </td>
                </tr>
              ) : (
                sortedLogs.map((log) => {
                  const mtrs = log.meters !== undefined && log.meters !== null ? Number(log.meters) || 0 : (log.meters_produced ? Number(log.meters_produced) || 0 : 0);
                  const rawWUnit = log.weight_unit !== undefined && log.weight_unit !== null ? log.weight_unit : (log.weight_kg && mtrs ? Number(log.weight_kg) / Number(mtrs) : 0);
                  const wUnit = typeof rawWUnit === 'number' ? rawWUnit : (parseFloat(String(rawWUnit)) || 0);
                  const totW = log.total_weight !== undefined && log.total_weight !== null ? Number(log.total_weight) || 0 : (log.weight_kg ? Number(log.weight_kg) || 0 : 0);

                  return (
                    <tr key={log.id || `prd-${Math.random()}`} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-3 font-bold text-slate-600 dark:text-slate-300 text-center font-mono">
                        {log.production_date ? formatJalaliDate(log.production_date) : (log.created_at ? formatJalaliDate(log.created_at) : '—')}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-slate-200">
                        {log.size || log.pipe_size || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                        {log.pressure || '—'}
                      </td>
                      <td className="py-3.5 px-3">
                        {log.type ? (
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono font-bold text-xs">
                            {log.type}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-mono text-xs">
                        {log.diameter || log.thickness ? `${log.diameter || '-'} / ${log.thickness || '-'}` : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-mono text-xs">
                        {log.motor_speed || log.traction_speed ? `${log.motor_speed || '-'} / ${log.traction_speed || '-'}` : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 text-xs">
                        {log.die_mold || log.pin_needle ? `${log.die_mold || '-'} / ${log.pin_needle || '-'}` : '—'}
                      </td>
                      <td className="py-3.5 px-3 font-mono font-medium text-slate-800 dark:text-slate-200 text-xs">
                        {wUnit > 0 ? wUnit.toFixed(3) : '—'}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">
                        {mtrs > 0 ? Number(mtrs).toLocaleString('fa-IR') : '—'}
                      </td>
                      <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-white font-mono text-xs">
                        {totW > 0 ? Number(totW).toLocaleString('fa-IR') : '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-800 dark:text-slate-200 font-medium text-xs">
                        {log.customer_name || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 text-xs max-w-xs truncate">
                        {log.notes || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {(StorageService.isAdmin() || StorageService.hasPermission('settings.audit') || StorageService.hasPermission('production.view')) && (
                            <button
                              type="button"
                              onClick={() => setHistoryLog(log)}
                              title="تاریخچه و رویدادهای گزارش تولید"
                              className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {StorageService.hasPermission('production.edit') && (
                            <button
                              onClick={() => handleOpenModal(log)}
                              title="ویرایش گزارش تولید"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {StorageService.hasPermission('production.delete') && (
                            <button
                              onClick={() => handleDelete(log)}
                              title="حذف گزارش"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PRODUCTION MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 dark:border-slate-800 my-8 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Factory className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {editingLog ? 'ویرایش گزارش خط تولید' : 'ثبت گزارش خط تولید'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    ورود مشخصات فنی، متراژ تولیدی، وزن واحد و مجموع وزن
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

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Row 1: Date & Customer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <JalaliDatePicker
                    label="تاریخ تولید (پیش‌فرض امروز)"
                    value={form.production_date}
                    onChange={(d) => setForm({ ...form, production_date: d })}
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    سفارش دهنده (نام مشتری یا پروژه)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: شرکت آبرسانی کویر / آقای احمدی"
                    value={form.customer_name}
                    onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Row 2: Size, Pressure, Type */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    سایز <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    list="size-suggestions"
                    placeholder="مثال: 63 یا 110"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none text-xs font-bold text-center"
                    required
                  />
                  <datalist id="size-suggestions">
                    {COMMON_SIZES.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    فشار
                  </label>
                  <input
                    type="text"
                    list="pressure-suggestions"
                    placeholder="مثال: 10 بار"
                    value={form.pressure}
                    onChange={(e) => setForm({ ...form, pressure: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none text-xs text-center"
                  />
                  <datalist id="pressure-suggestions">
                    {COMMON_PRESSURES.map((p) => (
                      <option key={p} value={p} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    نوع
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none text-xs font-semibold"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.label} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Dimensions & Technical Settings: Diameter, Thickness, Motor, Traction */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">قطر</label>
                  <input
                    type="text"
                    placeholder="قطر..."
                    value={form.diameter}
                    onChange={(e) => setForm({ ...form, diameter: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">ضخامت</label>
                  <input
                    type="text"
                    placeholder="ضخامت دیواره..."
                    value={form.thickness}
                    onChange={(e) => setForm({ ...form, thickness: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">موتور</label>
                  <input
                    type="text"
                    placeholder="دور موتور..."
                    value={form.motor_speed}
                    onChange={(e) => setForm({ ...form, motor_speed: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-center font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">کشش</label>
                  <input
                    type="text"
                    placeholder="سرعت کشش..."
                    value={form.traction_speed}
                    onChange={(e) => setForm({ ...form, traction_speed: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs text-center font-mono"
                  />
                </div>
              </div>

              {/* Row 4: Die Mold & Pin Needle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">قالب</label>
                  <input
                    type="text"
                    placeholder="کد یا مشخصات قالب..."
                    value={form.die_mold}
                    onChange={(e) => setForm({ ...form, die_mold: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">سوزنی</label>
                  <input
                    type="text"
                    placeholder="مشخصات سوزنی..."
                    value={form.pin_needle}
                    onChange={(e) => setForm({ ...form, pin_needle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs"
                  />
                </div>
              </div>

              {/* Row 5: Weights & Meters (Auto Calculated) */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 space-y-3">
                <div className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>وزن و متراژ تولیدی</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      وزن واحد (کیلوگرم - تا ۳ رقم اعشار)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="مثال: 0.350"
                      value={form.weight_unit}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          weight_unit: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none font-mono text-xs font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      متراژ (متر) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="مثال: 500"
                      value={form.meters}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          meters: e.target.value === '' ? '' : parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none font-mono text-xs font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      مجموع وزن (محاسبه خودکار)
                    </label>
                    <div className="w-full px-3 py-2 rounded-xl bg-slate-200/80 dark:bg-slate-700/80 border border-slate-300 dark:border-slate-600 font-mono text-xs font-bold text-center text-slate-900 dark:text-white flex items-center justify-center h-[38px]">
                      {calculatedTotalWeight > 0 ? (
                        <span>{calculatedTotalWeight.toLocaleString('fa-IR')} <span className="text-[11px] font-normal text-slate-600 dark:text-slate-300">kg</span></span>
                      ) : (
                        <span className="text-slate-400">خودکار</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 6: Notes */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">توضیحات</label>
                <textarea
                  rows={2}
                  placeholder="توضیحات تکمیلی، نتایج کنترل کیفی، بچ مواد و..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-xs resize-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition cursor-pointer disabled:opacity-40"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ثبت گزارش...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editingLog ? 'ذخیره تغییرات' : 'ثبت گزارش تولید'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Audit History Modal */}
      {historyLog && (
        <AuditHistoryModal
          isOpen={!!historyLog}
          onClose={() => setHistoryLog(null)}
          entityType="PRODUCTION"
          entityId={historyLog.id}
          documentNumber={historyLog.code || historyLog.id}
          title="تاریخچه و رویدادهای گزارش تولید"
          subtitle={`تاریخ: ${formatJalaliDate(historyLog.production_date)} - سایز: ${historyLog.size || historyLog.pipe_size} - متراژ: ${historyLog.meters || historyLog.meters_produced || 0} متر`}
        />
      )}
    </div>
  );
};
