import React, { useState, useEffect } from 'react';
import { StorageService } from '../../services/storageService';
import { Product } from '../../types';
import {
  Search,
  Plus,
  Edit2,
  Package,
  SlidersHorizontal,
  CheckCircle2,
  AlertCircle,
  Layers,
} from 'lucide-react';

export const ProductManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [pressureFilter, setPressureFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: 'لوله پلی اتیلن',
    size: '',
    pressure: '',
    type: 'PE100',
    unit: 'متر',
    description: '',
    is_active: true,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    setProducts(StorageService.getProducts());
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: 'لوله پلی اتیلن',
      size: '63 میلیمتر (۲ اینچ)',
      pressure: '10 بار',
      type: 'PE100',
      unit: 'متر',
      description: '',
      is_active: true,
    });
    setIsSubmitting(false);
    setErrorMessage('');
    setShowModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      size: product.size || '',
      pressure: product.pressure || '',
      type: product.type || 'PE100',
      unit: product.unit || 'متر',
      description: product.description || '',
      is_active: product.is_active,
    });
    setIsSubmitting(false);
    setErrorMessage('');
    setShowModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!formData.name.trim()) {
      setErrorMessage('نام محصول الزامی است.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const all = StorageService.getProducts();

    if (editingProduct) {
      const idx = all.findIndex((p) => p.id === editingProduct.id);
      if (idx !== -1) {
        const oldProd = { ...all[idx] };
        all[idx] = {
          ...all[idx],
          name: formData.name.trim(),
          size: formData.size.trim() || undefined,
          pressure: formData.pressure.trim() || undefined,
          type: formData.type.trim() || undefined,
          unit: formData.unit.trim() || 'متر',
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        };
        StorageService.saveProducts(all);
        StorageService.logAudit('ویرایش محصول', 'PRODUCT', editingProduct.id, oldProd, all[idx]);
      }
    } else {
      const newCode = StorageService.generateProductCode();
      const newProd: Product = {
        id: `prd-${Date.now()}`,
        code: newCode,
        name: formData.name.trim(),
        size: formData.size.trim() || undefined,
        pressure: formData.pressure.trim() || undefined,
        type: formData.type.trim() || undefined,
        unit: formData.unit.trim() || 'متر',
        description: formData.description.trim() || undefined,
        is_active: formData.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      all.unshift(newProd);
      StorageService.saveProducts(all);
      StorageService.logAudit('تعریف محصول جدید', 'PRODUCT', newProd.id, null, newProd);
    }

    await StorageService.pushToHost();
    setIsSubmitting(false);
    setShowModal(false);
    loadProducts();
  };

  // Filter options
  const uniqueSizes = Array.from(new Set(products.map((p) => p.size).filter(Boolean))) as string[];
  const uniquePressures = Array.from(new Set(products.map((p) => p.pressure).filter(Boolean))) as string[];
  const uniqueTypes = Array.from(new Set(products.map((p) => p.type).filter(Boolean))) as string[];

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.size && p.size.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.pressure && p.pressure.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.type && p.type.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;
    if (sizeFilter !== 'all' && p.size !== sizeFilter) return false;
    if (pressureFilter !== 'all' && p.pressure !== pressureFilter) return false;
    if (typeFilter !== 'all' && p.type !== typeFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900">
            کاتالوگ محصولات لوله پلی‌اتیلن و اتصالات
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تعریف گریدها، سایزبندی‌ها، فشارهای کاری و کنترل مشخصات استاندارد کالا
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تعریف محصول جدید</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            placeholder="جستجو در کد، نام، سایز یا فشار کاری محصول..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">همه انواع (PE100 / PE80 / اتصالات)</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={pressureFilter}
            onChange={(e) => setPressureFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">همه فشارهای کاری</option>
            {uniquePressures.map((pr) => (
              <option key={pr} value={pr}>{pr}</option>
            ))}
          </select>

          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium focus:outline-none"
          >
            <option value="all">همه سایزها</option>
            {uniqueSizes.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Cards & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50">
                <th className="py-3 px-4">کد محصول</th>
                <th className="py-3 px-4">نام کالا</th>
                <th className="py-3 px-4">سایز (میلیمتر / اینچ)</th>
                <th className="py-3 px-4">فشار اسمی (Bar)</th>
                <th className="py-3 px-4">نوع / گرید مواد</th>
                <th className="py-3 px-4">واحد سنجش</th>
                <th className="py-3 px-4">توضیحات و کاربرد</th>
                <th className="py-3 px-4 text-center">وضعیت</th>
                <th className="py-3 px-4 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    محصولی با این مشخصات یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{p.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-4 font-medium text-blue-700">{p.size || '-'}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{p.pressure || '-'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                        {p.type || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.unit}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{p.description || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {p.is_active ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition"
                        title="ویرایش محصول"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingProduct ? 'ویرایش مشخصات محصول' : 'تعریف محصول جدید'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  نام محصول <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="پیش‌فرض: لوله پلی اتیلن (قابل تغییر به رینگ، فلنج و ...)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    سایز (قطر خارجی / اینچ)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 63 میلیمتر (۲ اینچ) یا 110mm"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    فشار اسمی کاری (Bar)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 10 بار، 16 بار، 6 بار"
                    value={formData.pressure}
                    onChange={(e) => setFormData({ ...formData, pressure: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    نوع / گرید مواد
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden font-medium"
                  >
                    <option value="PE100">PE100 (استاندارد گاز و آب پرفشار)</option>
                    <option value="PE80">PE80 (آبیاری و فشار متوسط)</option>
                    <option value="اتصالات">اتصالات و رینگ و فلنج</option>
                    <option value="سایر">سایر</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    واحد فروش
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  توضیحات و مشخصات کاربردی
                </label>
                <textarea
                  rows={2}
                  placeholder="موارد کاربرد، نوع کلاف یا شاخه ۱۲ متری..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="prodActive"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="prodActive" className="text-slate-700 font-bold cursor-pointer">
                  محصول فعال است و در سفارشات قابل انتخاب می‌باشد
                </label>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>در حال ذخیره و همگام‌سازی...</span>
                    </>
                  ) : (
                    <span>{editingProduct ? 'ذخیره تغییرات' : 'ثبت محصول'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
