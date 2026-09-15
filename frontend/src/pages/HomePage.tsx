import { useEffect, useState } from "react";
import { fetchHealth, type HealthResponse } from "../lib/api";

type LoadState =
  | { status: "loading" }
  | { status: "ok"; data: HealthResponse }
  | { status: "error"; message: string };

function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-line px-5 py-4 last:border-b-0">
      <div>
        <p className="text-sm text-white">{label}</p>
        <p className="mt-1 font-mono text-xs text-mute">{detail}</p>
      </div>
      <span
        className={[
          "rounded-full px-2.5 py-0.5 font-mono text-xs",
          ok ? "bg-charge/15 text-charge" : "bg-red-500/15 text-red-300",
        ].join(" ")}
      >
        {ok ? "ok" : "down"}
      </span>
    </div>
  );
}

export function HomePage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await fetchHealth();
        if (!cancelled) setState({ status: "ok", data });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not reach API",
          });
        }
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const apiOk = state.status === "ok" && state.data.ok;
  const dbOk = state.status === "ok" && state.data.db === "connected";
  const ruleCount = state.status === "ok" ? (state.data.categoryRules ?? 0) : 0;

  return (
    <section className="space-y-8">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-charge uppercase">
          Phase 1
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-white">
          Scaffold is live
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-mute">
          Backend, frontend, and Postgres should talk to each other here. Use
          Upload to import a bank CSV — SQL detection runs automatically.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <StatusRow
          label="API"
          ok={apiOk}
          detail={
            state.status === "error"
              ? state.message
              : state.status === "loading"
                ? "Checking http://localhost:3001/health"
                : `${state.data.service} · ${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}`
          }
        />
        <StatusRow
          label="Postgres"
          ok={dbOk}
          detail={
            state.status === "ok"
              ? state.data.error ?? "SELECT 1 succeeded"
              : "Waiting for API"
          }
        />
        <StatusRow
          label="Category rules"
          ok={dbOk && ruleCount > 0}
          detail={
            dbOk
              ? `${ruleCount} keyword rows seeded`
              : "Seed runs after migrations"
          }
        />
      </div>
    </section>
  );
}
