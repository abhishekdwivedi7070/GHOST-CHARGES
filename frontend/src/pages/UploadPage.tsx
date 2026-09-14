import { useState, type FormEvent } from "react";
import {
  SAMPLE_CSV_URL,
  uploadCsv,
  type UploadResponse,
} from "../lib/api";

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      setResult(await uploadCsv(file));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="font-mono text-xs tracking-[0.18em] text-charge uppercase">
          Phase 2
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-white">
          Upload a statement
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-mute">
          One format for now: <code className="text-white/80">date</code>,{" "}
          <code className="text-white/80">description</code>,{" "}
          <code className="text-white/80">amount</code>. Merchants are cleaned
          with rules, then stored. Detection SQL comes in Phase 3.
        </p>
      </div>

      <form
        onSubmit={(event) => void onSubmit(event)}
        className="space-y-4 rounded-xl border border-line bg-panel p-5"
      >
        <label className="block">
          <span className="text-sm text-white">CSV file</span>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
              setError(null);
            }}
            className="mt-2 block w-full text-sm text-mute file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-white"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-charge px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
          <a
            href={SAMPLE_CSV_URL}
            className="text-sm text-charge underline-offset-4 hover:underline"
          >
            Download sample CSV
          </a>
        </div>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="overflow-hidden rounded-xl border border-line bg-panel">
          <div className="border-b border-line px-5 py-4">
            <p className="text-sm text-white">
              Inserted {result.rowsInserted} rows
              {result.rowsSkipped > 0 ? ` · skipped ${result.rowsSkipped}` : ""}
            </p>
            <p className="mt-1 font-mono text-xs text-mute">
              batch {result.importBatchId}
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="font-mono text-xs text-mute">
              <tr>
                <th className="px-5 py-3 font-normal">Raw</th>
                <th className="px-5 py-3 font-normal">Normalized</th>
                <th className="px-5 py-3 font-normal">Category</th>
                <th className="px-5 py-3 font-normal">Rows</th>
              </tr>
            </thead>
            <tbody>
              {result.preview.map((row) => (
                <tr key={row.merchantNorm} className="border-t border-line">
                  <td className="px-5 py-3 text-mute">{row.merchantRaw}</td>
                  <td className="px-5 py-3 text-white">{row.merchantNorm}</td>
                  <td className="px-5 py-3 text-mute">{row.category ?? "—"}</td>
                  <td className="px-5 py-3 font-mono text-mute">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
