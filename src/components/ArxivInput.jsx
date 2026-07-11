import { useState } from "react";
import { fetchArxiv } from "../lib/api.js";

export default function ArxivInput({ onOpenPaper }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    const v = value.trim();
    if (!v || busy) return;
    setBusy(true);
    setError("");
    try {
      onOpenPaper(await fetchArxiv(v));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-rodney-wash p-7 sm:p-9">
      <div className="mx-auto max-w-xl text-center">
        <h2 className="font-display text-2xl font-semibold">Bring your own paper</h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Paste any arXiv link or ID and Rodney will fetch the real thing and read it
          with you.
        </p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            id="arxiv-input"
            name="arxiv"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://arxiv.org/abs/1706.03762"
            className="min-w-0 flex-1 rounded-full border border-line bg-white px-5 py-3 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-rodney"
          />
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="cursor-pointer rounded-full bg-rodney px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rodney-deep disabled:cursor-default disabled:opacity-40"
          >
            {busy ? "Fetching…" : "Fetch it"}
          </button>
        </form>
        {busy && (
          <p className="mt-3 text-sm text-ink-faint">
            Rodney is flying over to arXiv — a few seconds…
          </p>
        )}
        {error && <p className="mt-3 text-sm font-medium text-rodney-deep">{error}</p>}
      </div>
    </div>
  );
}
