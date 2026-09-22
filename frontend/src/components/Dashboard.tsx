import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DetectedSubscription } from "../lib/api";
import { formatInterval, inferCategory, money } from "../lib/format";

export type DashboardProps = {
  subscriptions: DetectedSubscription[];
  narrative?: string;
  isDemo?: boolean;
};

function buildCategorySpend(rows: DetectedSubscription[]) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const category = inferCategory(row.merchantNorm);
    totals.set(category, (totals.get(category) ?? 0) + row.projectedAnnual);
  }
  return [...totals.entries()]
    .map(([category, annual]) => ({ category, annual: Number(annual.toFixed(2)) }))
    .sort((a, b) => b.annual - a.annual);
}

export function Dashboard({ subscriptions, narrative, isDemo }: DashboardProps) {
  const annual = subscriptions.reduce((sum, row) => sum + row.projectedAnnual, 0);
  const increases = subscriptions.filter((row) => row.priceIncreased).length;
  const categories = buildCategorySpend(subscriptions);

  return (
    <div className="space-y-6">
      {isDemo ? (
        <p className="rounded-lg border border-charge/20 bg-charge/10 px-4 py-3 text-sm text-charge">
          Sample data — no file uploaded, no live AI call.
        </p>
      ) : null}

      {narrative ? (
        <p className="max-w-3xl text-base leading-7 text-white/85">{narrative}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Projected annual" value={money.format(annual)} hint="If these keep billing" />
        <Stat
          label="Recurring merchants"
          value={String(subscriptions.length)}
          hint="Stable interval in SQL"
        />
        <Stat
          label="Price increases"
          value={String(increases)}
          hint="Later charge higher than previous"
          warn={increases > 0}
        />
      </div>

      {subscriptions.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel px-5 py-8 text-sm text-mute">
          No recurring subscriptions detected. One-offs and irregular charges stay out of this list.
        </p>
      ) : (
        <>
          <section className="rounded-xl border border-line bg-panel p-5">
            <div className="mb-4">
              <h2 className="text-sm text-white">Annual spend by category</h2>
              <p className="mt-1 font-mono text-xs text-mute">From detected recurring charges</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} layout="vertical" margin={{ left: 8, right: 12 }}>
                  <XAxis
                    type="number"
                    stroke="#8b949e"
                    tick={{ fill: "#8b949e", fontSize: 11 }}
                    tickFormatter={(value: number) => `$${Math.round(value)}`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    stroke="#8b949e"
                    tick={{ fill: "#e8edf2", fontSize: 12 }}
                    width={88}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "#14181d",
                      border: "1px solid #2a3138",
                      borderRadius: 8,
                      color: "#e8edf2",
                    }}
                    formatter={(value) => [money.format(Number(value ?? 0)), "Annual"]}
                  />
                  <Bar dataKey="annual" fill="#7dffa8" radius={[0, 4, 4, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-line bg-panel">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-sm text-white">Subscriptions</h2>
              <p className="mt-1 font-mono text-xs text-mute">
                Window functions · LAG · CTEs — detection is SQL, not a model
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="font-mono text-xs text-mute">
                  <tr>
                    <th className="px-5 py-3 font-normal">Merchant</th>
                    <th className="px-5 py-3 font-normal">Category</th>
                    <th className="px-5 py-3 font-normal">Avg</th>
                    <th className="px-5 py-3 font-normal">Cadence</th>
                    <th className="px-5 py-3 font-normal">Times</th>
                    <th className="px-5 py-3 font-normal">Seen</th>
                    <th className="px-5 py-3 font-normal">Annual</th>
                    <th className="px-5 py-3 font-normal">Creep</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((row) => (
                    <tr key={row.merchantNorm} className="border-t border-line">
                      <td className="px-5 py-3 font-medium text-white">{row.merchantNorm}</td>
                      <td className="px-5 py-3 text-mute">{inferCategory(row.merchantNorm)}</td>
                      <td className="px-5 py-3 font-mono text-mute">{money.format(row.avgAmount)}</td>
                      <td className="px-5 py-3 text-mute">{formatInterval(row.intervalDays)}</td>
                      <td className="px-5 py-3 font-mono text-mute">{row.occurrences}</td>
                      <td className="px-5 py-3 font-mono text-xs text-mute">
                        {row.firstSeen} → {row.lastSeen}
                      </td>
                      <td className="px-5 py-3 font-mono text-white">
                        {money.format(row.projectedAnnual)}
                      </td>
                      <td className="px-5 py-3">
                        {row.priceIncreased ? (
                          <span className="rounded-full bg-red-500/15 px-2 py-0.5 font-mono text-xs text-red-300">
                            up
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-mute">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-panel px-5 py-4">
      <p className="font-mono text-xs tracking-wide text-mute uppercase">{label}</p>
      <p className={["mt-2 text-2xl tracking-tight", warn ? "text-red-300" : "text-white"].join(" ")}>
        {value}
      </p>
      <p className="mt-1 text-xs text-mute">{hint}</p>
    </div>
  );
}
