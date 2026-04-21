export interface Product {
  id: number;
  name: string;
  sku: string;
  category: string;
  color: string;
  size: string;
  sale_price: number;
  cost_price: number;
  current_stock: number;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  type: 'STOCK_IN' | 'SALE' | 'RETURN' | 'DISPOSAL' | 'OTHER_OUT';
  quantity: number;
  sales_channel: string;
  note: string;
  transaction_date: string;
  created_by: string;
  created_at: string;
}

export interface SalesChannel {
  id: number;
  name: string;
  is_active: number;
  created_at: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalStock: number;
  outOfStockCount: number;
  lowStockCount: number;
  monthlySales: number;
  monthlyRevenue: number;
  recentTransactions: InventoryTransaction[];
  lowStockProducts: Product[];
}

export type TransactionType = 'STOCK_IN' | 'SALE' | 'RETURN' | 'DISPOSAL' | 'OTHER_OUT';

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  STOCK_IN: '입고',
  SALE: '판매',
  RETURN: '반품',
  DISPOSAL: '폐기',
  OTHER_OUT: '기타출고',
};

export const TRANSACTION_COLORS: Record<TransactionType, string> = {
  STOCK_IN: 'bg-green-100 text-green-700',
  SALE: 'bg-blue-100 text-blue-700',
  RETURN: 'bg-yellow-100 text-yellow-700',
  DISPOSAL: 'bg-red-100 text-red-700',
  OTHER_OUT: 'bg-gray-100 text-gray-700',
};
