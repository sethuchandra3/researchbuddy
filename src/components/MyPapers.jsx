import { useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap.js";
import { getReadArticles } from "../lib/prefs.js";
import { getPaper, fetchArxiv } from "../lib/api.js";
import RodneyOwl from "./RodneyOwl.jsx";

// "My Papers": the reading history stored in this browser's localStorage.
// A lightweight, single-device stand-in for a real accounts + database
// dashboard — the natural next step after the hackathon.
export default function MyPapers({ onOpenPaper, onBack }) {
  const rootRef = useRef(null);
  const articles = getReadArticles();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  useGSAP(
    () => {
      gsap.from(".read-card", {
        y: 18,
        opacity: 0,
        stagger: 0.07,
        duration: 0.5,
        ease: "power2.out",
        clearProps: "all",
      });
    },
    { scope: rootRef }
  );

  async function readAgain(article) {
    if (busyId) return;
    setBusyId(article.id);
    setError("");
    try {
      // Preloaded papers come off the shelf; anything else is refetched from arXiv
      const paper = await getPaper(article.id).catch(() => fetchArxiv(article.id));
      onOpenPaper(paper);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div ref={rootRef} className="min-h-screen">
      <nav className="sticky top-0 z-30 border-b border-line bg-cream/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3">
          <button
            onClick={onBack}
            className="flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-rodney-soft hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            Library
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <div className="flex items-center gap-3">
          <RodneyOwl className="h-12 w-12" />
          <div>
            <h1 className="font-display text-3xl font-semibold">My Papers</h1>
            <p className="text-sm text-ink-soft">
              Everything you've read with Rodney — saved in this browser.
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-rodney/30 bg-rodney-wash px-4 py-3 text-sm text-ink-soft">
            {error}
          </p>
        )}

        {articles.length === 0 ? (
          <div className="mt-14 text-center">
            <p className="font-display text-xl text-ink-soft">
              No papers yet — your shelf is waiting.
            </p>
            <button
              onClick={onBack}
              className="mt-5 cursor-pointer rounded-full bg-rodney px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rodney-deep"
            >
              Browse the reading room
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {articles.map((a) => (
              <div
                key={a.id}
                className="read-card rounded-2xl border border-line bg-paper p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold leading-snug">
                    {a.title}
                  </h2>
                  <span className="text-xs text-ink-faint">
                    {new Date(a.dateRead).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {a.oneLineSummary && (
                  <p className="mt-2 text-sm leading-6 text-ink-soft">{a.oneLineSummary}</p>
                )}
                <div className="mt-3 flex items-center gap-4">
                  <button
                    onClick={() => readAgain(a)}
                    className="cursor-pointer rounded-full border border-rodney/40 px-4 py-1.5 text-sm font-semibold text-rodney transition-colors hover:bg-rodney hover:text-white"
                  >
                    {busyId === a.id ? "Opening…" : "Read again"}
                  </button>
                  <a
                    href={a.arxivUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-ink-faint transition-colors hover:text-rodney"
                  >
                    View on arXiv ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
