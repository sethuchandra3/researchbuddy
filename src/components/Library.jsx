import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, SplitText } from "../lib/gsap.js";
import { getLibrary, getPaper } from "../lib/api.js";
import RodneyOwl from "./RodneyOwl.jsx";
import PaperCard from "./PaperCard.jsx";
import ArxivInput from "./ArxivInput.jsx";
import PickedForYou from "./PickedForYou.jsx";

export default function Library({ onOpenPaper, onShowPapers, onEditPrefs, prefsVersion }) {
  const rootRef = useRef(null);
  const [manifest, setManifest] = useState(null);
  const [error, setError] = useState("");
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    getLibrary().then(setManifest).catch((e) => setError(e.message));
  }, []);

  useGSAP(
    (context, contextSafe) => {
      gsap.from(".hero-owl", { y: 24, opacity: 0, scale: 0.88, duration: 0.7, ease: "back.out(1.6)" });
      gsap.from(".hero-sub", { opacity: 0, y: 14, duration: 0.6, delay: 0.4 });
      document.fonts.ready.then(
        contextSafe(() => {
          try {
            const split = SplitText.create(".hero-tagline", { type: "words" });
            gsap.from(split.words, {
              y: 28,
              opacity: 0,
              stagger: 0.05,
              duration: 0.65,
              ease: "back.out(1.5)",
            });
          } catch {
            /* fonts or SplitText hiccup → tagline simply shows statically */
          }
        })
      );
    },
    { scope: rootRef }
  );

  useGSAP(
    () => {
      if (manifest?.length) {
        gsap.from(".paper-card", {
          y: 22,
          opacity: 0,
          stagger: 0.09,
          duration: 0.55,
          ease: "power2.out",
          clearProps: "all",
        });
      }
    },
    { scope: rootRef, dependencies: [manifest] }
  );

  async function open(id) {
    if (openingId) return;
    setOpeningId(id);
    setError("");
    try {
      onOpenPaper(await getPaper(id));
    } catch (e) {
      setError(e.message);
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div ref={rootRef} className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center gap-2 px-5 pt-6">
        <RodneyOwl className="h-9 w-9" />
        <span className="font-display text-lg font-semibold">Rodney</span>
        <span className="mt-0.5 text-xs text-ink-faint">your research buddy</span>
        <nav className="ml-auto flex items-center gap-1">
          <button
            onClick={onShowPapers}
            className="cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-rodney-soft hover:text-ink"
          >
            My Papers
          </button>
          <button
            onClick={onEditPrefs}
            className="cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-rodney-soft hover:text-ink"
          >
            Preferences
          </button>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-5 pt-16 text-center sm:pt-20">
        <RodneyOwl className="hero-owl mx-auto h-32 w-32 sm:h-36 sm:w-36" />
        <h1 className="hero-tagline mt-6 font-display text-4xl font-semibold leading-tight sm:text-[3.4rem] sm:leading-[1.15]">
          Don't just ask AI.
          <br />
          Read the real research.
        </h1>
        <p className="hero-sub mx-auto mt-5 max-w-xl text-lg leading-8 text-ink-soft">
          Rodney sits beside you while you read actual scientific papers — and explains
          the dense parts in plain language whenever you ask. You build the skill.
          He brings the patience.
        </p>
      </section>

      <PickedForYou onOpenPaper={onOpenPaper} prefsVersion={prefsVersion} />

      <section className="mx-auto max-w-5xl px-5 pt-16">
        <div className="mb-5 flex items-baseline gap-3">
          <h2 className="font-display text-2xl font-semibold">The reading room</h2>
          <span className="text-sm text-ink-faint">pick a paper, Rodney's ready</span>
        </div>
        {error && (
          <p className="mb-4 rounded-xl border border-rodney/30 bg-rodney-wash px-4 py-3 text-sm text-ink-soft">
            {error}
          </p>
        )}
        <div className="grid gap-5 md:grid-cols-3">
          {(manifest || []).map((p) => (
            <PaperCard
              key={p.id}
              paper={p}
              opening={openingId === p.id}
              onOpen={() => open(p.id)}
            />
          ))}
          {!manifest && !error && (
            <p className="text-sm text-ink-faint">Opening the library…</p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <ArxivInput onOpenPaper={onOpenPaper} />
      </section>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-faint">
        Rodney explains. You understand. · Powered by DigitalOcean Inference
      </footer>
    </div>
  );
}
