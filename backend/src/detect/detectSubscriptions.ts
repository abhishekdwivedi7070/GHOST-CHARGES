import type { PoolClient } from "pg";
import { pool } from "../db.js";

/**
 * Recurring-charge detection — 100% SQL.
 *
 * 1. LAG(txn_date) per merchant → gap days between charges
 * 2. Consistent gaps (STDDEV < 5) and at least 3 charges (2 gaps)
 * 3. Price creep: any consecutive amount increase (Postgres CTE, not QUALIFY)
 * 4. Projected annual: avg_amount * (365 / interval_days)
 *
 * Amount coefficient of variation < 0.20 keeps grocery-style noise out
 * while still allowing Netflix/Adobe-style price bumps.
 */
export const DETECT_SUBSCRIPTIONS_SQL = `
WITH ordered AS (
  SELECT
    merchant_norm,
    amount,
    txn_date,
    LAG(txn_date) OVER (
      PARTITION BY merchant_norm
      ORDER BY txn_date, id
    ) AS prev_date,
    LAG(amount) OVER (
      PARTITION BY merchant_norm
      ORDER BY txn_date, id
    ) AS prev_amount
  FROM transactions
  WHERE import_batch_id = $1::uuid
),
merchant_stats AS (
  SELECT
    merchant_norm,
    COUNT(*)::int AS occurrences,
    MIN(txn_date) AS first_seen,
    MAX(txn_date) AS last_seen,
    ROUND(AVG(amount), 2) AS avg_amount,
    STDDEV(amount) AS amount_stddev
  FROM ordered
  GROUP BY merchant_norm
),
gaps AS (
  SELECT
    merchant_norm,
    (txn_date - prev_date)::int AS gap_days,
    (amount > prev_amount) AS increased
  FROM ordered
  WHERE prev_date IS NOT NULL
),
gap_stats AS (
  SELECT
    merchant_norm,
    ROUND(AVG(gap_days))::int AS interval_days,
    BOOL_OR(increased) AS price_increased
  FROM gaps
  GROUP BY merchant_norm
  HAVING COUNT(*) >= 2
     AND STDDEV(gap_days) < 5
)
SELECT
  $1::uuid AS import_batch_id,
  m.merchant_norm,
  m.avg_amount,
  g.interval_days,
  m.occurrences,
  m.first_seen,
  m.last_seen,
  COALESCE(g.price_increased, FALSE) AS price_increased,
  ROUND(m.avg_amount * (365.0 / NULLIF(g.interval_days, 0)), 2) AS projected_annual
FROM merchant_stats m
INNER JOIN gap_stats g ON g.merchant_norm = m.merchant_norm
WHERE g.interval_days BETWEEN 5 AND 400
  AND (
    m.avg_amount = 0
    OR COALESCE(m.amount_stddev, 0) / NULLIF(m.avg_amount, 0) < 0.20
  )
ORDER BY projected_annual DESC
`;

export type DetectedSubscription = {
  merchantNorm: string;
  avgAmount: number;
  intervalDays: number;
  occurrences: number;
  firstSeen: string;
  lastSeen: string;
  priceIncreased: boolean;
  projectedAnnual: number;
};

type DetectionRow = {
  merchant_norm: string;
  avg_amount: string | number;
  interval_days: number;
  occurrences: number;
  first_seen: Date | string;
  last_seen: Date | string;
  price_increased: boolean;
  projected_annual: string | number;
};

type Queryable = Pick<PoolClient, "query">;

function asIsoDate(value: Date | string): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function asNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapRow(row: DetectionRow): DetectedSubscription {
  return {
    merchantNorm: row.merchant_norm,
    avgAmount: asNumber(row.avg_amount),
    intervalDays: row.interval_days,
    occurrences: row.occurrences,
    firstSeen: asIsoDate(row.first_seen),
    lastSeen: asIsoDate(row.last_seen),
    priceIncreased: row.price_increased,
    projectedAnnual: asNumber(row.projected_annual),
  };
}

export async function listDetectedSubscriptions(
  importBatchId: string,
  db: Queryable = pool,
): Promise<DetectedSubscription[]> {
  const result = await db.query<DetectionRow>(
    `SELECT
       merchant_norm,
       avg_amount,
       interval_days,
       occurrences,
       first_seen,
       last_seen,
       price_increased,
       projected_annual
     FROM detected_subscriptions
     WHERE import_batch_id = $1::uuid
     ORDER BY projected_annual DESC NULLS LAST`,
    [importBatchId],
  );

  return result.rows.map(mapRow);
}

export async function runDetection(
  importBatchId: string,
  db: Queryable = pool,
): Promise<DetectedSubscription[]> {
  await db.query(`DELETE FROM detected_subscriptions WHERE import_batch_id = $1::uuid`, [
    importBatchId,
  ]);

  await db.query(
    `INSERT INTO detected_subscriptions (
       import_batch_id,
       merchant_norm,
       avg_amount,
       interval_days,
       occurrences,
       first_seen,
       last_seen,
       price_increased,
       projected_annual
     )
     ${DETECT_SUBSCRIPTIONS_SQL}`,
    [importBatchId],
  );

  return listDetectedSubscriptions(importBatchId, db);
}

export async function batchHasTransactions(
  importBatchId: string,
  db: Queryable = pool,
): Promise<boolean> {
  const result = await db.query<{ present: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM transactions WHERE import_batch_id = $1::uuid
     ) AS present`,
    [importBatchId],
  );

  return Boolean(result.rows[0]?.present);
}
