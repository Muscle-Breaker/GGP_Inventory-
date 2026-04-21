'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Trash2, RefreshCw, ChevronDown,
  ArrowDown, ArrowUp, X, Package
} from 'lucide-react';
import type { InventoryTransaction, SalesChannel } from '@/lib/types';
import { TRANSACTION_LABELS, TRANSACTION_COLORS, type TransactionType } from '@/lib/types';

interface Product { id: number; name: string; sku: string; current_stock: number; }

const TX_TYPES: { value: TransactionType; label: string; color: string }[] = [
  { value: 'STOCK_IN', label: '입고', color: 'bg-green-50 border-green-200 text-green-700' },
  { value: 'SALE', label: '판매', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'RETURN', label: '반품', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: 'DISPOSAL', label: '폐기', color: 'bg-red-50 border-red-200 text-red-700' },
  { value: 'OTHER_OUT', label: '기타출고', color: 'bg-gray-50 border-gray-200 text-gray-700' },
];

export default function InventoryPage() {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    product_id: '', type: 'STOCK_IN' as TransactionType,
    quantity: '', sales_channel: '', note: '',
    transaction_date: new Date().toISOString().split('T')[0],
    created_by: '관리자',
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    const res = await fetch(`/api/inventory?${params}&limit=100`);
    const data = await res.json();
    setTransactions(data.transactions || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [search, typeFilter]);

  const fetchProducts = async () => {
    const res = await fetch('/api/products');
    setProducts(await res.json());
  };

  const fetchChannels = async () => {
    const res = await fetch('/api/channels');
    setChannels(await res.json());
  };

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
    fetchChannels();
  }, [fetchTransactions]);

  const selectedProduct = products.find(p => String(p.id) === form.product_id);

  const handleSave = async () => {
    if (!form.product_id || !form.quantity) {
      setError('상품과 수량을 입력해주세요');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, quantity: Number(form.quantity) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || '저장 실패'); return; }
      setShowModal(false);
      setForm(f => ({ ...f, product_id: '', quantity: '', note: '', sales_channel: '' }));
      fetchTransactions();
      fetchProducts();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
    setDeleteId(null);
    fetchTransactions();
    fetchProducts();
  };

  const openModal = (type?: TransactionType) => {
    setForm(f => ({
      ...f,
      type: type || 'STOCK_IN',
      product_id: '', quantity: '', note: '', sales_channel: '',
      transaction_date: new Date().toISOString().split('T')[0],
    }));
    setError('');
    setShowModal(true);
  };

  const activeChannels = channels.filter(c => c.is_active);

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">재고 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">총 {total}건 내역</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus size={16} /> 내역 등록
        </button>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        {TX_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => openModal(t.value)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border rounded-lg transition-all hover:shadow-sm ${t.color}`}
          >
            {(t.value === 'STOCK_IN' || t.value === 'RETURN')
              ? <ArrowDown size={14} />
              : <ArrowUp size={14} />
            }
            {t.label} 등록
          </button>
        ))}
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
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="form-input pr-8 appearance-none cursor-pointer"
            >
              <option value="">전체 유형</option>
              {TX_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
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
                <th>유형</th>
                <th>수량</th>
                <th>판매처</th>
                <th>비고</th>
                <th>처리일</th>
                <th>처리자</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12">
                  <RefreshCw size={18} className="animate-spin mx-auto text-gray-300" />
                </td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16">
                  <Package size={32} className="text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">내역이 없습니다</p>
                </td></tr>
              ) : (
                transactions.map(tx => (
                  <tr key={tx.id}>
                    <td>
                      <p className="font-medium text-gray-800 text-sm">{tx.product_name}</p>
                      <code className="text-xs text-gray-400">{tx.product_sku}</code>
                    </td>
                    <td>
                      <span className={`badge ${TRANSACTION_COLORS[tx.type]}`}>
                        {TRANSACTION_LABELS[tx.type]}
                      </span>
                    </td>
                    <td>
                      <span className={`font-semibold text-sm ${
                        tx.type === 'STOCK_IN' || tx.type === 'RETURN' ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {tx.type === 'STOCK_IN' || tx.type === 'RETURN' ? '+' : '-'}{tx.quantity}
                      </span>
                    </td>
                    <td className="text-gray-500 text-sm">{tx.sales_channel || '-'}</td>
                    <td className="text-gray-500 text-sm max-w-[150px] truncate">{tx.note || '-'}</td>
                    <td className="text-gray-500 text-sm whitespace-nowrap">{tx.transaction_date}</td>
                    <td className="text-gray-500 text-sm">{tx.created_by}</td>
                    <td>
                      <button onClick={() => setDeleteId(tx.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">재고 내역 등록</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg border border-red-100">{error}</div>}

              {/* Type Selector */}
              <div>
                <label className="form-label">유형 *</label>
                <div className="grid grid-cols-5 gap-2">
                  {TX_TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      className={`py-2 text-xs font-medium border rounded-lg transition-all ${
                        form.type === t.value ? t.color + ' ring-2 ring-offset-1 ring-current' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Select */}
              <div>
                <label className="form-label">상품 *</label>
                <div className="relative">
                  <select
                    value={form.product_id}
                    onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                    className="form-input pr-8 appearance-none"
                  >
                    <option value="">상품 선택...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — 현재재고: {p.current_stock}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {selectedProduct && (
                  <p className="text-xs text-gray-400 mt-1">현재 재고: <strong className="text-gray-700">{selectedProduct.current_stock}개</strong></p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">수량 *</label>
                  <input
                    type="number"
                    value={form.quantity}
                    onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))}
                    className="form-input"
                    placeholder="0"
                    min="1"
                  />
                </div>
                <div>
                  <label className="form-label">처리일</label>
                  <input
                    type="date"
                    value={form.transaction_date}
                    onChange={e => setForm(f => ({ ...f, transaction_date: e.target.value }))}
                    className="form-input"
                  />
                </div>
              </div>

              {form.type === 'SALE' && (
                <div>
                  <label className="form-label">판매처</label>
                  <div className="relative">
                    <select
                      value={form.sales_channel}
                      onChange={e => setForm(f => ({ ...f, sales_channel: e.target.value }))}
                      className="form-input pr-8 appearance-none"
                    >
                      <option value="">판매처 선택...</option>
                      {activeChannels.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">
                  {form.type === 'OTHER_OUT' ? '출고 사유 *' : '비고'}
                </label>
                <input
                  type="text"
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className="form-input"
                  placeholder={form.type === 'OTHER_OUT' ? '출고 사유를 입력하세요' : '메모 (선택사항)'}
                />
              </div>

              <div>
                <label className="form-label">처리자</label>
                <input
                  type="text"
                  value={form.created_by}
                  onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))}
                  className="form-input"
                  placeholder="관리자"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary">취소</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving && <RefreshCw size={14} className="animate-spin" />}
                등록하기
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
            <h3 className="font-bold text-gray-900 text-center mb-2">내역 삭제</h3>
            <p className="text-sm text-gray-500 text-center mb-5">삭제하면 재고 수량도 함께 원복됩니다.</p>
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
