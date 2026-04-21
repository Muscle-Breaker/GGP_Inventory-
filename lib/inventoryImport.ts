import { getDb } from '@/lib/db';
import type { TransactionType } from '@/lib/types';

interface ExistingTransactionRow {
  id: number;
  product_id: number;
  type: TransactionType;
  quantity: number;
}

interface ImportInventoryInput {
  txNumber?: string;
  productId: number;
  type: TransactionType;
  quantity: number;
  salesChannel: string;
  note: string;
  transactionDate: string;
  createdBy: string;
}

interface UpsertInventoryResult {
  action: 'inserted' | 'updated';
  id: number;
}

export async function upsertInventoryTransaction(input: ImportInventoryInput): Promise<UpsertInventoryResult> {
  const db = await getDb();
  const tx = await db.transaction('write');

  try {
    const existing = input.txNumber
      ? await selectExistingTransaction(tx, input.txNumber)
      : undefined;

    if (!existing) {
      const result = await tx.execute({
        sql: `INSERT INTO inventory_transactions (tx_number, product_id, type, quantity, sales_channel, note, transaction_date, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          input.txNumber || null,
          input.productId,
          input.type,
          input.quantity,
          input.salesChannel,
          input.note,
          input.transactionDate,
          input.createdBy,
        ],
      });

      await tx.execute({
        sql: 'UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [stockDelta(input.type, input.quantity), input.productId],
      });

      await tx.commit();
      return {
        action: 'inserted',
        id: result.lastInsertRowid ? Number(result.lastInsertRowid) : 0,
      };
    }

    const oldDelta = stockDelta(existing.type, existing.quantity);
    const newDelta = stockDelta(input.type, input.quantity);

    if (existing.product_id === input.productId) {
      const product = await selectProductStock(tx, input.productId);
      if (!product) throw new Error('상품을 찾을 수 없습니다');

      const nextStock = product.current_stock - oldDelta + newDelta;
      if (nextStock < 0) throw new Error('재고가 부족하여 입출고 내역을 동기화할 수 없습니다');

      await tx.execute({
        sql: `UPDATE inventory_transactions
              SET product_id = ?, type = ?, quantity = ?, sales_channel = ?, note = ?, transaction_date = ?, created_by = ?
              WHERE id = ?`,
        args: [
          input.productId,
          input.type,
          input.quantity,
          input.salesChannel,
          input.note,
          input.transactionDate,
          input.createdBy,
          existing.id,
        ],
      });
      await tx.execute({
        sql: 'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [nextStock, input.productId],
      });
    } else {
      const oldProduct = await selectProductStock(tx, existing.product_id);
      const newProduct = await selectProductStock(tx, input.productId);
      if (!oldProduct || !newProduct) throw new Error('상품을 찾을 수 없습니다');

      const revertedOldStock = oldProduct.current_stock - oldDelta;
      const appliedNewStock = newProduct.current_stock + newDelta;
      if (appliedNewStock < 0) throw new Error('재고가 부족하여 입출고 내역을 동기화할 수 없습니다');

      await tx.execute({
        sql: `UPDATE inventory_transactions
              SET product_id = ?, type = ?, quantity = ?, sales_channel = ?, note = ?, transaction_date = ?, created_by = ?
              WHERE id = ?`,
        args: [
          input.productId,
          input.type,
          input.quantity,
          input.salesChannel,
          input.note,
          input.transactionDate,
          input.createdBy,
          existing.id,
        ],
      });
      await tx.execute({
        sql: 'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [revertedOldStock, existing.product_id],
      });
      await tx.execute({
        sql: 'UPDATE products SET current_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        args: [appliedNewStock, input.productId],
      });
    }

    await tx.commit();
    return {
      action: 'updated',
      id: existing.id,
    };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

function stockDelta(type: TransactionType, quantity: number): number {
  return type === 'STOCK_IN' || type === 'RETURN' ? quantity : -quantity;
}

async function selectExistingTransaction(tx: any, txNumber: string) {
  const result = await tx.execute({
    sql: 'SELECT id, product_id, type, quantity FROM inventory_transactions WHERE tx_number = ? LIMIT 1',
    args: [txNumber],
  });
  const row = result.rows[0];
  if (!row) return undefined;

  return {
    id: Number(row.id),
    product_id: Number(row.product_id),
    type: String(row.type) as TransactionType,
    quantity: Number(row.quantity),
  } satisfies ExistingTransactionRow;
}

async function selectProductStock(tx: any, productId: number) {
  const result = await tx.execute({
    sql: 'SELECT id, current_stock FROM products WHERE id = ? LIMIT 1',
    args: [productId],
  });
  const row = result.rows[0];
  if (!row) return undefined;

  return {
    id: Number(row.id),
    current_stock: Number(row.current_stock),
  };
}
