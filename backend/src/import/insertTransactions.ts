import { randomUUID } from "node:crypto";
import { runDetection, type DetectedSubscription } from "../detect/detectSubscriptions.js";
import { pool } from "../db.js";
import { matchCategory, type CategoryRule } from "./categorize.js";
import type { ParsedTransaction } from "./parseCsv.js";

export type InsertedPreview = {
  merchantRaw: string;
  merchantNorm: string;
  category: string | null;
  count: number;
};

export type InsertResult = {
  importBatchId: string;
  rowsInserted: number;
  preview: InsertedPreview[];
  subscriptions: DetectedSubscription[];
};

const CHUNK = 400;

export async function insertTransactions(rows: ParsedTransaction[]): Promise<InsertResult> {
  const importBatchId = randomUUID();
  const client = await pool.connect();

  try {
    const rulesResult = await client.query<CategoryRule>(
      `SELECT keyword, category
       FROM category_rules
       ORDER BY LENGTH(keyword) DESC, keyword ASC`,
    );
    const rules = rulesResult.rows;

    const prepared = rows.map((row) => {
      const category =
        row.categoryFromCsv ?? matchCategory(row.merchantNorm, row.merchantRaw, rules);
      return { ...row, category };
    });

    await client.query("BEGIN");

    for (let start = 0; start < prepared.length; start += CHUNK) {
      const chunk = prepared.slice(start, start + CHUNK);
      const values: unknown[] = [];
      const placeholders = chunk.map((row, index) => {
        const offset = index * 6;
        values.push(
          importBatchId,
          row.txnDate,
          row.merchantRaw,
          row.merchantNorm,
          row.amount,
          row.category,
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
      });

      await client.query(
        `INSERT INTO transactions
          (import_batch_id, txn_date, merchant_raw, merchant_norm, amount, category)
         VALUES ${placeholders.join(", ")}`,
        values,
      );
    }

    const counts = new Map<string, InsertedPreview>();
    for (const row of prepared) {
      const key = row.merchantNorm;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, {
          merchantRaw: row.merchantRaw,
          merchantNorm: row.merchantNorm,
          category: row.category,
          count: 1,
        });
      }
    }

    const preview = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 12);
    const subscriptions = await runDetection(importBatchId, client);

    await client.query("COMMIT");

    return {
      importBatchId,
      rowsInserted: prepared.length,
      preview,
      subscriptions,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
