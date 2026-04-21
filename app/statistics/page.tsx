'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, Package, BarChart3, Trophy, AlertTriangle } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

interface Stats {
  topSellers: { id: number; name: string; sku: string; category: string; sale_price: number; current_stock: number; total_sold: number; total_revenue: number }[];
  highStock: { id: number; name: string; sku: string; category: string; current_stock: number }[];
  lowTurnover: { id: number; name: string; sku: string; category: string; current_stock: number; total_sold: number }[];
  monthlySales: { month: string; total_qty: number; total_revenue: number }[];
  categoryStats: { category: string; product_count: number; total_stock: number; total_sold: number }[];
  channelStats: { sales_channel: string; total_qty: number; total_revenue: number; transaction_count: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

const formatWon = (v: number) => v >= 1000000 ? `₩${(v / 1000000).toFixed(1)}M` : `₩${v.toLocaleString()}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TooltipFormatter = (value: any, name: any) => [string, string];

export default function StatisticsPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch('/api/statistics');
    setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-400">
          <RefreshCw size={18} className="animate-spin" /> <span className="text-sm">로딩 중...</span>
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
          <h1 className="text-xl font-bold text-gray-900">통계</h1>
          <p className="text-sm text-gray-500 mt-0.5">판매 및 재고 분석</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-white">
          <RefreshCw size={14} /> 새로고침
        </button>
      </div>

      {/* Monthly Sales Chart */}
      {data.monthlySales.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-800">월별 판매 추이 (최근 6개월)</h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.monthlySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={formatWon} />
              <Tooltip
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any, name: any) => [
                  name === 'total_revenue' ? formatWon(Number(value)) : `${value}개`,
                  name === 'total_revenue' ? '매출' : '판매수량'
                ] as [string, string]}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Legend formatter={(value) => value === 'total_qty' ? '판매수량' : '매출'} />
              <Line yAxisId="left" type="monotone" dataKey="total_qty" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="total_revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Stats Pie */}
        {data.categoryStats.filter(c => c.category).length > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-purple-600" />
              <h2 className="font-semibold text-gray-800">카테고리별 판매</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.categoryStats.filter(c => c.category && c.total_sold > 0)}
                  dataKey="total_sold"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.categoryStats.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={((v: number) => [`${v}개`, '판매수량']) as TooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Channel Stats */}
        {data.channelStats.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-green-600" />
              <h2 className="font-semibold text-gray-800">판매처별 매출</h2>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.channelStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} tickFormatter={formatWon} />
                <YAxis type="category" dataKey="sales_channel" tick={{ fontSize: 12, fill: '#6b7280' }} width={60} />
                <Tooltip formatter={((v: number) => [formatWon(v), '매출']) as TooltipFormatter} />
                <Bar dataKey="total_revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top 10 Sellers */}
      <div className="card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
          <Trophy size={16} className="text-amber-500" />
          <h2 className="font-semibold text-gray-800">많이 팔린 상품 TOP 10</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>상품명</th>
                <th>SKU</th>
                <th>카테고리</th>
                <th>판매수량</th>
                <th>총매출</th>
                <th>현재재고</th>
              </tr>
            </thead>
            <tbody>
              {data.topSellers.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>{i + 1}</span>
                  </td>
                  <td className="font-medium text-gray-800">{p.name}</td>
                  <td><code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{p.sku}</code></td>
                  <td>{p.category && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{p.category}</span>}</td>
                  <td><span className="font-semibold text-blue-600">{p.total_sold.toLocaleString()}개</span></td>
                  <td><span className="font-semibold text-green-600">₩{p.total_revenue.toLocaleString()}</span></td>
                  <td>
                    <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                      p.current_stock === 0 ? 'bg-red-100 text-red-600' :
                      p.current_stock <= 5 ? 'bg-amber-100 text-amber-600' :
                      'text-gray-600'
                    }`}>{p.current_stock === 0 ? '품절' : `${p.current_stock}개`}</span>
                  </td>
                </tr>
              ))}
              {data.topSellers.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">판매 데이터가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Stock */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <Package size={16} className="text-blue-500" />
            <h2 className="font-semibold text-gray-800">재고 많은 상품 TOP 10</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.highStock.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-600 shrink-0 ml-2">{p.current_stock.toLocaleString()}개</span>
              </div>
            ))}
            {data.highStock.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">데이터 없음</div>
            )}
          </div>
        </div>

        {/* Low Turnover */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-50">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">회전율 낮은 상품</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {data.lowTurnover.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-xs text-gray-400">재고 {p.current_stock} / 판매 {p.total_sold}</p>
                  <p className="text-xs font-semibold text-amber-600">
                    회전율 {p.current_stock > 0 ? ((p.total_sold / p.current_stock) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            ))}
            {data.lowTurnover.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">데이터 없음</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
