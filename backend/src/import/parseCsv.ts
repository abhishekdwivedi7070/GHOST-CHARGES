import { parse } from "csv-parse/sync";
import { HttpError } from "../http.js";
import { normalizeMerchant } from "./normalizeMerchant.js";

const DATE_HEADERS = [
  "date",
  "txn date",
  "transaction date",
  "tran date",
  "trans date",
  "posting date",
  "value date",
  "value dt",
];
const DESC_HEADERS = [
  "description",
  "narration",
  "particulars",
  "transaction remarks",
  "remarks",
  "details",
  "narrative",
  "merchant",
  "merchant raw",
  "transaction details",
];
const AMOUNT_HEADERS = ["amount", "transaction amount", "txn amount"];
const DEBIT_HEADERS = [
  "withdrawal amt",
  "withdrawal amount",
  "withdrawal",
  "debit amount",
  "debit",
  "dr",
];
const CATEGORY_HEADERS = ["category"];
const MAX_ROWS = 20_000;

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

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

const TYPE_HEADERS = ["dr cr", "txn type", "transaction type", "type"];

type ColumnMap = {
  date: number;
  description: number;
  amount: number | null;
  debit: number | null;
  type: number | null;
  category: number | null;
  dateOrder: "dmy" | "mdy";
};

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findHeaderIndex(headers: string[], candidates: string[]): number | null {
  for (const candidate of candidates) {
    const index = headers.findIndex(
      (header) => header === candidate || header.startsWith(`${candidate} `),
    );
    if (index >= 0) {
      return index;
    }
  }
  return null;
}

function mapColumns(cells: string[]): ColumnMap | null {
  const headers = cells.map(normalizeHeader);
  const date = findHeaderIndex(headers, DATE_HEADERS);
  const description = findHeaderIndex(headers, DESC_HEADERS);
  const amount = findHeaderIndex(headers, AMOUNT_HEADERS);
  const debit = findHeaderIndex(headers, DEBIT_HEADERS);
  const type = findHeaderIndex(headers, TYPE_HEADERS);
  const category = findHeaderIndex(headers, CATEGORY_HEADERS);

  if (date === null || description === null || (amount === null && debit === null)) {
    return null;
  }

  const indianLayout =
    debit !== null ||
    type !== null ||
    headers.some((header) => header.includes("narration")) ||
    (headers.includes("transaction date") && headers.includes("value date"));

  return {
    date,
    description,
    amount,
    debit,
    type,
    category,
    dateOrder: indianLayout ? "dmy" : "mdy",
  };
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

function expandYear(year: string): string {
  if (year.length === 4) return year;
  const n = Number(year);
  return String(n >= 80 ? 1900 + n : 2000 + n);
}

function parseDate(raw: string, order: "dmy" | "mdy"): string | null {
  const value = raw
    .trim()
    .replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?.*$/, "")
    .trim();
  if (isValidIsoDate(value)) {
    return value;
  }

  const named = /^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2}|\d{4})$/.exec(value);
  if (named) {
    const month = MONTHS[named[2].toLowerCase()];
    if (!month) return null;
    const iso = `${expandYear(named[3])}-${month}-${named[1].padStart(2, "0")}`;
    return isValidIsoDate(iso) ? iso : null;
  }

  const numeric = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(value);
  if (!numeric) {
    return null;
  }

  const first = Number(numeric[1]);
  const second = Number(numeric[2]);
  let day: number;
  let month: number;

  if (first > 12 && second <= 12) {
    day = first;
    month = second;
  } else if (second > 12 && first <= 12) {
    month = first;
    day = second;
  } else if (order === "dmy") {
    day = first;
    month = second;
  } else {
    month = first;
    day = second;
  }

  const iso = `${expandYear(numeric[3])}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidIsoDate(iso) ? iso : null;
}

function parseAmount(raw: string): string | null {
  let value = raw.trim().replace(/[₹$,\s]/g, "");
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

function cell(row: string[], index: number | null): string {
  if (index === null) return "";
  return (row[index] ?? "").trim();
}

export function parseBankCsv(buffer: Buffer): ParseResult {
  let table: string[][];

  try {
    table = parse(buffer, {
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: true,
      relax_quotes: true,
    }) as string[][];
  } catch {
    throw new HttpError(400, "Could not parse that CSV. Check the file is valid text.");
  }

  let headerIndex = -1;
  let columns: ColumnMap | null = null;

  for (let i = 0; i < Math.min(table.length, 40); i += 1) {
    const mapped = mapColumns(table[i] ?? []);
    if (mapped) {
      headerIndex = i;
      columns = mapped;
      break;
    }
  }

  if (headerIndex < 0 || !columns) {
    throw new HttpError(
      400,
      "Could not find a transaction table. Need a date column, a description/narration column, and an amount or withdrawal/debit column.",
    );
  }

  const records = table.slice(headerIndex + 1);

  if (records.length === 0) {
    throw new HttpError(400, "CSV has a header but no data rows.");
  }

  if (records.length > MAX_ROWS) {
    throw new HttpError(400, `CSV is too large. Max ${MAX_ROWS} data rows.`);
  }

  const rows: ParsedTransaction[] = [];
  const skipped: SkippedRow[] = [];

  records.forEach((record, index) => {
    const line = headerIndex + index + 2;
    const rawDate = cell(record, columns.date);
    const merchantRaw = cell(record, columns.description);
    const debitCredit = cell(record, columns.type).toUpperCase();
    const rawAmount = cell(record, columns.amount) || cell(record, columns.debit);
    const categoryFromCsv = cell(record, columns.category) || null;

    if (!rawDate && !merchantRaw && !rawAmount) {
      skipped.push({ line, reason: "empty row" });
      return;
    }

    if (debitCredit === "CR" || debitCredit === "CREDIT") {
      skipped.push({ line, reason: "credit (not a charge)" });
      return;
    }

    const txnDate = parseDate(rawDate, columns.dateOrder);
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
      skipped.push({ line, reason: "no withdrawal/debit amount" });
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
