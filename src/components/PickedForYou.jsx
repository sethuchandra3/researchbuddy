import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap.js";
import { fetchArxiv, getRecommendations } from "../lib/api.js";
import { getPrefs, INTEREST_OPTIONS } from "../lib/prefs.js";

// Fresh arXiv papers matching the reader's stated interest.
// Their familiarity level intentionally plays no part here — arXiv has no
// reliable difficulty field, so competency only shapes Rodney's explanations.
export default function PickedForYou({ onOpenPaper, prefsVersion }) {
  const rootRef = useRef(null);
  const [papers, setPapers] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const prefs = getPrefs();

  useEffect(() => {
    let alive = true;
    setPapers(null);
    const p = getPrefs();
    if (!p || !p.interest) return; // no stated interest → no section
    getRecommendations(p.interest)
      .then((papers) => alive && setPapers(papers))
      .catch(() => alive && setPapers(null)); // quiet failure: section just hides
    return () => {
      alive = false;
    };
  }, [prefsVersion]);

  useGSAP(
    () => {
      if (papers?.length) {
        gsap.from(".picked-card", {
          y: 18,
          opacity: 0,
          stagger: 0.08,
          duration: 0.5,
          ease: "power2.out",
          clearProps: "all",
        });
      }
    },
    { scope: rootRef, dependencies: [papers] }
  );

  if (!prefs?.interest || !papers?.length) return null;

  const interestLabel =
    INTEREST_OPTIONS.find((o) => o.value === prefs.interest)?.label || "";

  async function open(p) {
    if (busyId) return;
    setBusyId(p.id);
    setError("");
    try {
      onOpenPaper(await fetchArxiv(p.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section ref={rootRef} className="mx-auto max-w-5xl px-5 pt-16">
      <div className="mb-5 flex items-baseline gap-3">
        <h2 className="font-display text-2xl font-semibold">Picked for you</h2>
        <span className="text-sm text-ink-faint">
          {prefs.interest === "none"
            ? "fresh on arXiv — a rotating mix while you explore"
            : `fresh on arXiv, because you're into ${interestLabel.toLowerCase()}`}
        </span>
      </div>
      {error && (
        <p className="mb-4 rounded-xl border border-rodney/30 bg-rodney-wash px-4 py-3 text-sm text-ink-soft">
          {error}
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {papers.map((p) => (
          <div
            key={p.id}
            className="picked-card flex h-full flex-col rounded-2xl border border-rodney/25 bg-rodney-wash p-5"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rodney">
              New this week
            </div>
            <h3 className="mt-2 font-display text-[1.05rem] font-semibold leading-snug">
              {p.title}
            </h3>
            <p className="mt-2 flex-1 text-[13px] leading-6 text-ink-soft">{p.blurb}</p>
            <button
              onClick={() => open(p)}
              className="mt-3 cursor-pointer self-start rounded-full border border-rodney/40 px-4 py-1.5 text-sm font-semibold text-rodney transition-colors hover:bg-rodney hover:text-white"
            >
              {busyId === p.id ? "Opening…" : "Read with Rodney →"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
