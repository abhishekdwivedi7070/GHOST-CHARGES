import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <section className="space-y-14">
      <div className="max-w-2xl space-y-6">
        <p className="font-mono text-xs tracking-[0.2em] text-charge uppercase">
          Recurring-charge detector
        </p>
        <h1 className="text-4xl font-medium tracking-tight text-white sm:text-5xl sm:leading-tight">
          Find the charges haunting your account.
        </h1>
        <p className="max-w-xl text-base leading-7 text-mute">
          Upload a bank CSV. SQL — window functions, LAG, CTEs — finds subscriptions,
          flags price creep, and projects what they cost per year. No AI in the
          detection.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/upload"
            className="rounded-md bg-charge px-4 py-2.5 text-sm font-medium text-ink"
          >
            Upload a statement
          </Link>
          <Link
            to="/demo"
            className="rounded-md border border-line px-4 py-2.5 text-sm text-white hover:bg-white/5"
          >
            Try the demo
          </Link>
        </div>
      </div>

      <dl className="grid gap-6 border-t border-line pt-10 sm:grid-cols-3">
        <div>
          <dt className="font-mono text-xs text-charge">01</dt>
          <dd className="mt-2 text-sm leading-6 text-mute">
            <span className="text-white">Import.</span> One CSV format: date,
            description, amount. Merchants are cleaned with rules.
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-charge">02</dt>
          <dd className="mt-2 text-sm leading-6 text-mute">
            <span className="text-white">Detect.</span> Regular intervals become
            subscriptions. Amount jumps get a price-creep flag.
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs text-charge">03</dt>
          <dd className="mt-2 text-sm leading-6 text-mute">
            <span className="text-white">Project.</span> See annual cost by
            merchant and category before you forget another bill.
          </dd>
        </div>
      </dl>
    </section>
  );
}
