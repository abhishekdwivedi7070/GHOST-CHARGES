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
