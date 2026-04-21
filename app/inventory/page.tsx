'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, ChevronDown, ArrowLeftRight, AlertTriangle, Package, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import ImportExportPanel from '@/components/ImportExportPanel';

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (stockFilter === 'out') params.set('outOfStock', 'true');
    const res = await fetch(`/api/products?${params}`);
    const data: Product[] = await res.json();
    setProducts(data);
    const cats = [...new Set(data.map(p => p.category).filter(Boolean))] as string[];
    setCategories(cats);
    setLoading(false);
  }, [search, category, stockFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const filtered = stockFilter === 'low'
    ? products.filter(p => p.current_stock > 0 && p.current_stock <= 5)
    : products;

  const totalStock = products.reduce((s, p) => s + p.current_stock, 0);
  const outCount = products.filter(p => p.current_stock === 0).length;
  const lowCount = products.filter(p => p.current_stock > 0 && p.current_stock <= 5).length;

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">재고 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">상품별 현재 재고 현황</p>
        </div>
        <Link href="/transactions" className="btn-primary">
          <ArrowLeftRight size={16} /> 입출고 등록
        </Link>
      </div>

      {/* Import/Export */}
      <ImportExportPanel
        scope="inventory"
        importType="inventory"
        exportType="products"
        exportLabel="재고 현황"
        onImported={fetchProducts}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">전체 재고</p>
          <p className="text-2xl font-bold text-gray-900">{totalStock.toLocaleString()}</p>
        </div>
        <div className="card p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStockFilter(stockFilter === 'out' ? '' : 'out')}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">품절</p>
          <p className={`text-2xl font-bold ${outCount > 0 ? 'text-red-500' : 'text-gray-900'}`}>{outCount}</p>
        </div>
        <div className="card p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStockFilter(stockFilter === 'low' ? '' : 'low')}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">재고 부족 (5개↓)</p>
          <p className={`text-2xl font-bold ${lowCount > 0 ? 'text-amber-500' : 'text-gray-900'}`}>{lowCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="상품명, SKU 검색..." className="form-input pl-9" />
          </div>
          <div className="relative">
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="form-input pr-8 appearance-none cursor-pointer">
              <option value="">전체 카테고리</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value)}
              className="form-input pr-8 appearance-none cursor-pointer">
              <option value="">전체</option>
              <option value="out">품절만</option>
              <option value="low">재고 부족만</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>상품</th>
                <th>SKU</th>
                <th>카테고리</th>
                <th>색상</th>
                <th>사이즈</th>
                <th>판매가</th>
                <th>재고 상태</th>
                <th>입출고</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <RefreshCw size={18} className="animate-spin mx-auto text-gray-300" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16">
                  <Package size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">상품이 없습니다</p>
                </td></tr>
              ) : (
                filtered.map(p => (
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
                        <span className="font-medium text-gray-800 text-sm">{p.name}</span>
                      </div>
                    </td>
                    <td><code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{p.sku}</code></td>
                    <td>{p.category && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">{p.category}</span>}</td>
                    <td className="text-gray-500 text-sm">{p.color}</td>
                    <td className="text-gray-500 text-sm">{p.size}</td>
                    <td className="font-medium text-sm">₩{p.sale_price.toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${
                          p.current_stock === 0 ? 'bg-red-100 text-red-600' :
                          p.current_stock <= 5 ? 'bg-amber-100 text-amber-600' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {p.current_stock === 0 && <AlertTriangle size={12} />}
                          {p.current_stock === 0 ? '품절' : `${p.current_stock}개`}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Link href="/transactions"
                        className="text-xs text-blue-600 hover:underline font-medium">
                        입출고 →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
