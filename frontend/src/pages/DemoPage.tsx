import { Link } from "react-router-dom";
import { Dashboard } from "../components/Dashboard";
import { DEMO_NARRATIVE, DEMO_SUBSCRIPTIONS } from "../lib/demoData";

export function DemoPage() {
  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-white">Demo</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-mute">
            Frozen sample results from the bundled statement. Nothing is uploaded.
          </p>
        </div>
        <Link
          to="/upload"
          className="rounded-md bg-charge px-3 py-1.5 text-sm font-medium text-ink"
        >
          Use your own CSV
        </Link>
      </div>
      <Dashboard subscriptions={DEMO_SUBSCRIPTIONS} narrative={DEMO_NARRATIVE} isDemo />
    </section>
  );
}
