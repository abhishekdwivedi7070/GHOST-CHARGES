const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export type HealthResponse = {
  ok: boolean;
  service: string;
  db: "connected" | "disconnected";
  categoryRules?: number;
  error?: string;
};

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`);
  const data = (await response.json()) as HealthResponse;

  if (!response.ok && !data.service) {
    throw new Error(`Health check failed (${response.status})`);
  }

  return data;
}

export type UploadPreview = {
  merchantRaw: string;
  merchantNorm: string;
  category: string | null;
  count: number;
};

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

export type UploadResponse = {
  importBatchId: string;
  rowsReceived: number;
  rowsInserted: number;
  rowsSkipped: number;
  skipped: { line: number; reason: string }[];
  preview: UploadPreview[];
  subscriptions: DetectedSubscription[];
};

export type SubscriptionsResponse = {
  importBatchId: string;
  count: number;
  subscriptions: DetectedSubscription[];
};

export const SAMPLE_CSV_URL = `${API_URL}/sample.csv`;

export async function fetchSubscriptions(batchId: string): Promise<SubscriptionsResponse> {
  const response = await fetch(`${API_URL}/subscriptions/${batchId}`);
  const data = (await response.json()) as SubscriptionsResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Could not load batch (${response.status})`);
  }
  return data;
}

export async function uploadCsv(file: File): Promise<UploadResponse> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body,
  });

  const data = (await response.json()) as UploadResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? `Upload failed (${response.status})`);
  }

  return data;
}
