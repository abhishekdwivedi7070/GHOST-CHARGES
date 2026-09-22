import { useState, type DragEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SAMPLE_CSV_URL, uploadCsv } from "../lib/api";

export function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function takeFile(next: File | null) {
    setFile(next);
    setError(null);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragOver(false);
    const next = event.dataTransfer.files[0];
    if (next && !next.name.toLowerCase().endsWith(".csv")) {
      setError("Please drop a .csv file.");
      return;
    }
    takeFile(next ?? null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const result = await uploadCsv(file);
      navigate(`/results/${result.importBatchId}`, {
        state: { subscriptions: result.subscriptions, rowsInserted: result.rowsInserted },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-3xl font-medium tracking-tight text-white">Upload a statement</h1>
        <p className="mt-3 text-sm leading-6 text-mute">
          Columns: <code className="text-white/80">date</code>,{" "}
          <code className="text-white/80">description</code>,{" "}
          <code className="text-white/80">amount</code>. Detection runs in
          Postgres after import.
        </p>
      </div>

      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <label
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={[
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center transition-colors",
            dragOver ? "border-charge bg-charge/10" : "border-line bg-panel hover:border-white/20",
          ].join(" ")}
        >
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => takeFile(event.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-white">
            {file ? file.name : "Drop a CSV here, or click to browse"}
          </p>
          <p className="mt-1 text-xs text-mute">Max 5MB · one file</p>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-charge px-4 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
          >
            {busy ? "Analyzing…" : "Find subscriptions"}
          </button>
          <a
            href={SAMPLE_CSV_URL}
            className="text-sm text-mute underline-offset-4 hover:text-charge hover:underline"
          >
            Download sample CSV
          </a>
          <Link to="/demo" className="text-sm text-mute underline-offset-4 hover:text-white hover:underline">
            See demo first
          </Link>
        </div>
      </form>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {busy ? (
        <p className="font-mono text-xs text-mute">Parsing, inserting, running detection…</p>
      ) : null}
    </section>
  );
}
