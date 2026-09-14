import { parse } from "csv-parse/sync";
import { HttpError } from "../http.js";
import { normalizeMerchant } from "./normalizeMerchant.js";

const DATE_KEYS = ["date", "txn_date", "transaction_date"];
const DESC_KEYS = ["description", "merchant", "merchant_raw"];
const AMOUNT_KEYS = ["amount"];
const CATEGORY_KEYS = ["category"];
const MAX_ROWS = 20_000;

export type ParsedTransaction = {
  txnDate: string;
  merchantRaw: string;
  merchantNorm: string;
  amount: string;
  categoryFromCsv: string | null;
};

export type SkippedRow = {
  line: number;
  reason: string;
};

export type ParseResult = {
  rows: ParsedTransaction[];
  skipped: SkippedRow[];
};

function pick(record: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

function isValidIsoDate(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parseDate(raw: string): string | null {
  const value = raw.trim();
  if (isValidIsoDate(value)) {
    return value;
  }

  const mdy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!mdy) {
    return null;
  }

  const iso = `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  return isValidIsoDate(iso) ? iso : null;
}

function parseAmount(raw: string): string | null {
  let value = raw.trim().replace(/[$,\s]/g, "");
  if (!value) return null;

  const wrapped = /^\((.+)\)$/.exec(value);
  if (wrapped) {
    value = `-${wrapped[1]}`;
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) {
    return null;
  }

  return Math.abs(amount).toFixed(2);
}

export function parseBankCsv(buffer: Buffer): ParseResult {
  let records: Record<string, string>[];

  try {
    records = parse(buffer, {
      columns: (header: string[]) => header.map((column) => column.trim().toLowerCase()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
    }) as Record<string, string>[];
  } catch {
    throw new HttpError(400, "Could not parse that CSV. Check the file is valid text.");
  }

  if (records.length === 0) {
    throw new HttpError(400, "CSV has a header but no data rows.");
  }

  if (records.length > MAX_ROWS) {
    throw new HttpError(400, `CSV is too large. Max ${MAX_ROWS} data rows.`);
  }

  const sample = records[0];
  const hasDate = DATE_KEYS.some((key) => key in sample);
  const hasDesc = DESC_KEYS.some((key) => key in sample);
  const hasAmount = AMOUNT_KEYS.some((key) => key in sample);

  if (!hasDate || !hasDesc || !hasAmount) {
    throw new HttpError(
      400,
      "Expected columns: date, description, amount. Optional: category.",
    );
  }

  const rows: ParsedTransaction[] = [];
  const skipped: SkippedRow[] = [];

  records.forEach((record, index) => {
    const line = index + 2;
    const rawDate = pick(record, DATE_KEYS);
    const merchantRaw = pick(record, DESC_KEYS);
    const rawAmount = pick(record, AMOUNT_KEYS);
    const categoryFromCsv = pick(record, CATEGORY_KEYS) || null;

    if (!rawDate && !merchantRaw && !rawAmount) {
      skipped.push({ line, reason: "empty row" });
      return;
    }

    const txnDate = parseDate(rawDate);
    if (!txnDate) {
      skipped.push({ line, reason: `invalid date "${rawDate}"` });
      return;
    }

    if (!merchantRaw) {
      skipped.push({ line, reason: "missing description" });
      return;
    }

    const amount = parseAmount(rawAmount);
    if (!amount) {
      skipped.push({ line, reason: `invalid amount "${rawAmount}"` });
      return;
    }

    rows.push({
      txnDate,
      merchantRaw,
      merchantNorm: normalizeMerchant(merchantRaw),
      amount,
      categoryFromCsv,
    });
  });

  if (rows.length === 0) {
    throw new HttpError(400, "No valid transactions found in that CSV.");
  }

  return { rows, skipped };
}
