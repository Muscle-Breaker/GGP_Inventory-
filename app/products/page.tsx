'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Plus, Search, Filter, Edit2, Trash2, Package,
  X, Upload, RefreshCw, ChevronDown, Image as ImageIcon
} from 'lucide-react';
import type { Product } from '@/lib/types';

const EMPTY_FORM = {
  name: '', sku: '', category: '', color: '', size: '',
  sale_price: '', cost_price: '', current_stock: '', image_url: ''
};

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [outOfStock, setOutOfStock] = useState(searchParams.get('outOfStock') === 'true');
  const [categories, setCategories] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (outOfStock) params.set('outOfStock', 'true');
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    setProducts(data);
    setLoading(false);

    const cats = [...new Set(data.map((p: Product) => p.category).filter(Boolean))] as string[];
    setCategories(cats);
  }, [search, category, outOfStock]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openAdd = () => {
    setEditProduct(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, sku: p.sku, category: p.category || '', color: p.color || '',
      size: p.size || '', sale_price: String(p.sale_price), cost_price: String(p.cost_price),
      current_stock: String(p.current_stock), image_url: p.image_url || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.sku.trim()) {
      setError('상품명과 SKU는 필수입니다');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        ...form,
        sale_price: Number(form.sale_price) || 0,
        cost_price: Number(form.cost_price) || 0,
        current_stock: Number(form.current_stock) || 0,
      };
      const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products';
      const method = editProduct ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '저장 실패'); return; }
      setShowModal(false);
      fetchProducts();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    fetchProducts();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.url) setForm(f => ({ ...f, image_url: data.url }));
    setImgUploading(false);
  };

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">상품 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">총 {products.length}개 상품</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> 상품 등록
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="상품명, SKU 검색..."
              className="form-input pl-9"
            />
          </div>
          <div className="relative">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="form-input pr-8 appearance-none cursor-pointer"
            >
              <option value="">전체 카테고리</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              checked={outOfStock}
              onChange={e => setOutOfStock(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600">품절만 보기</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>상품명</th>
                <th>SKU</th>
                <th>카테고리</th>
                <th>색상</th>
                <th>사이즈</th>
                <th>판매가</th>
                <th>원가</th>
                <th>재고</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
                </td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-16">
                  <Package size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">상품이 없습니다</p>
                  <button onClick={openAdd} className="mt-3 text-sm text-blue-600 hover:underline">상품 등록하기</button>
                </td></tr>
              ) : (
                products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-gray-100" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ImageIcon size={14} className="text-gray-400" />
                          </div>
                        )}
                        <span className="font-medium text-gray-800">{p.name}</span>
                      </div>
                    </td>
                    <td><code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{p.sku}</code></td>
                    <td>{p.category && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{p.category}</span>}</td>
                    <td className="text-gray-600">{p.color}</td>
                    <td className="text-gray-600">{p.size}</td>
                    <td className="font-medium">₩{p.sale_price.toLocaleString()}</td>
                    <td className="text-gray-500">₩{p.cost_price.toLocaleString()}</td>
                    <td>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${
                        p.current_stock === 0 ? 'bg-red-100 text-red-600' :
                        p.current_stock <= 5 ? 'bg-amber-100 text-amber-600' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {p.current_stock === 0 ? '품절' : p.current_stock}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteId(p.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">{editProduct ? '상품 수정' : '상품 등록'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-100">{error}</div>}

              {/* Image Upload */}
              <div>
                <label className="form-label">상품 이미지</label>
                <div className="flex items-center gap-3">
                  {form.image_url ? (
                    <div className="relative">
                      <img src={form.image_url} alt="상품" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                      <button onClick={() => setForm(f => ({ ...f, image_url: '' }))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200">
                      <ImageIcon size={20} className="text-gray-300" />
                    </div>
                  )}
                  <label className="btn-secondary cursor-pointer text-sm">
                    {imgUploading ? '업로드 중...' : <><Upload size={14} /> 이미지 업로드</>}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">상품명 *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="form-input" placeholder="예) 오버핏 반팔 티셔츠" />
                </div>
                <div>
                  <label className="form-label">SKU 코드 *</label>
                  <input type="text" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="form-input" placeholder="예) TS-001-WHT-M" />
                </div>
                <div>
                  <label className="form-label">카테고리</label>
                  <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="form-input" placeholder="예) 상의" list="categories-list" />
                  <datalist id="categories-list">
                    {['상의', '하의', '아우터', '원피스/스커트', '신발', '가방', '액세서리'].map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="form-label">색상</label>
                  <input type="text" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="form-input" placeholder="예) 화이트" />
                </div>
                <div>
                  <label className="form-label">사이즈</label>
                  <input type="text" value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))} className="form-input" placeholder="예) M, L, XL" />
                </div>
                <div>
                  <label className="form-label">판매가</label>
                  <input type="number" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} className="form-input" placeholder="0" min="0" />
                </div>
                <div>
                  <label className="form-label">원가</label>
                  <input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} className="form-input" placeholder="0" min="0" />
                </div>
                {!editProduct && (
                  <div>
                    <label className="form-label">초기 재고</label>
                    <input type="number" value={form.current_stock} onChange={e => setForm(f => ({ ...f, current_stock: e.target.value }))} className="form-input" placeholder="0" min="0" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary">취소</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <RefreshCw size={14} className="animate-spin" /> : null}
                {editProduct ? '수정 완료' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId !== null && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-center mb-2">상품 삭제</h3>
            <p className="text-sm text-gray-500 text-center mb-5">이 상품을 삭제하면 관련 재고 내역도 함께 삭제됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 justify-center">취소</button>
              <button onClick={() => handleDelete(deleteId)} className="btn-danger flex-1 justify-center">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400 text-sm">로딩 중...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
