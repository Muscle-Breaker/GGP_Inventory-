'use client';

import { useEffect, useState } from 'react';
import {
  Package, ShoppingCart, AlertTriangle, TrendingUp,
  ArrowUp, ArrowDown, RefreshCw, Clock, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { TRANSACTION_LABELS, TRANSACTION_COLORS, type TransactionType } from '@/lib/types';

interface DashboardData {
  totalProducts: number;
  totalStock: number;
  outOfStockCount: number;
  lowStockCount: number;
  monthlySales: number;
  monthlyRevenue: number;
  recentTransactions: {
    id: number; product_name: string; product_sku: string;
    type: TransactionType; quantity: number; sales_channel: string;
    note: string; transaction_date: string; created_by: string; created_at: string;
  }[];
  lowStockProducts: {
    id: number; name: string; sku: string; category: string;
    color: string; size: string; current_stock: number;
  }[];
}

function StatCard({
  icon: Icon, label, value, sub, color, href
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; href?: string;
}) {
  const content = (
    <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const now = new Date();
  const monthLabel = `${now.getMonth() + 1}월`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw size={18} className="animate-spin" />
          <span className="text-sm">로딩 중...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {now.getFullYear()}년 {monthLabel} 현황
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-white hover:shadow-sm transition-all"
        >
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Package}
          label="총 상품 수"
          value={data.totalProducts.toLocaleString()}
          sub="등록된 상품"
          color="bg-blue-50 text-blue-600"
          href="/products"
        />
        <StatCard
          icon={ShoppingCart}
          label="총 재고"
          value={data.totalStock.toLocaleString()}
          sub="전체 수량"
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={AlertTriangle}
          label="품절 상품"
          value={data.outOfStockCount.toLocaleString()}
          sub={`재고 부족 ${data.lowStockCount}개 포함`}
          color="bg-red-50 text-red-500"
          href="/products?outOfStock=true"
        />
        <StatCard
          icon={TrendingUp}
          label={`${monthLabel} 판매`}
          value={data.monthlySales.toLocaleString()}
          sub={`₩${data.monthlyRevenue.toLocaleString()} 매출`}
          color="bg-purple-50 text-purple-600"
          href="/statistics"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-gray-400" />
              <h2 className="font-semibold text-gray-800 text-sm">최근 입출고 내역</h2>
            </div>
            <Link href="/transactions" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              전체보기 <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.recentTransactions.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">내역이 없습니다</div>
            ) : (
              data.recentTransactions.slice(0, 8).map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'STOCK_IN' ? 'bg-green-100' :
                      tx.type === 'SALE' ? 'bg-blue-100' :
                      tx.type === 'RETURN' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      {tx.type === 'STOCK_IN' || tx.type === 'RETURN'
                        ? <ArrowDown size={12} className={tx.type === 'STOCK_IN' ? 'text-green-600' : 'text-yellow-600'} />
                        : <ArrowUp size={12} className={tx.type === 'SALE' ? 'text-blue-600' : 'text-red-600'} />
                      }
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{tx.product_name}</p>
                      <p className="text-xs text-gray-400">{tx.product_sku}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`badge ${TRANSACTION_COLORS[tx.type]}`}>
                      {TRANSACTION_LABELS[tx.type]}
                    </span>
                    <span className="text-sm font-semibold text-gray-700 w-10 text-right">
                      {tx.type === 'STOCK_IN' || tx.type === 'RETURN' ? '+' : '-'}{tx.quantity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="font-semibold text-gray-800 text-sm">재고 부족 알림</h2>
            </div>
            <Link href="/products?outOfStock=true" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              전체보기 <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.lowStockProducts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <TrendingUp size={20} className="text-green-500" />
                </div>
                <p className="text-sm text-gray-400">재고 부족 상품이 없습니다</p>
              </div>
            ) : (
              data.lowStockProducts.slice(0, 8).map(product => (
                <div key={product.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{product.sku}</span>
                      {product.category && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{product.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold px-2 py-1 rounded-lg ${
                      product.current_stock === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                    }`}>
                      {product.current_stock === 0 ? '품절' : `${product.current_stock}개`}
                    </span>
                    <Link href="/transactions" className="text-xs text-blue-600 hover:underline">입고</Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
