import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { Dashboard } from "../components/Dashboard";
import { fetchSubscriptions, type DetectedSubscription } from "../lib/api";

type LocationState = {
  subscriptions?: DetectedSubscription[];
  rowsInserted?: number;
};

export function ResultsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const location = useLocation();
  const seeded = (location.state as LocationState | null)?.subscriptions;
  const rowsInserted = (location.state as LocationState | null)?.rowsInserted;

  const [subscriptions, setSubscriptions] = useState<DetectedSubscription[] | null>(
    seeded ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId || seeded) return;

    let cancelled = false;
    void fetchSubscriptions(batchId)
      .then((data) => {
        if (!cancelled) setSubscriptions(data.subscriptions);
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load results");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [batchId, seeded]);

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-white">Results</h1>
          <p className="mt-2 font-mono text-xs text-mute">
            {rowsInserted != null ? `${rowsInserted} rows imported · ` : ""}
            batch {batchId}
          </p>
        </div>
        <Link
          to="/upload"
          className="rounded-md border border-line px-3 py-1.5 text-sm text-white hover:bg-white/5"
        >
          Upload another
        </Link>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {subscriptions ? (
        <Dashboard subscriptions={subscriptions} />
      ) : !error ? (
        <p className="font-mono text-xs text-mute">Loading detection results…</p>
      ) : null}
    </section>
  );
}
