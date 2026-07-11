import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap.js";
import { getSuggestions } from "../lib/api.js";
import SelectionPopover from "./SelectionPopover.jsx";
import RodneyPanel from "./RodneyPanel.jsx";
import RodneyOwl from "./RodneyOwl.jsx";

const STATIC_QUESTIONS = [
  "What's the main finding here?",
  "Why should a regular person care?",
  "What would skeptics say about this?",
];

export default function Reader({ paper, onBack, onEditPrefs }) {
  const rootRef = useRef(null);
  const articleRef = useRef(null);
  const [popover, setPopover] = useState(null);
  const [request, setRequest] = useState(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  // AI-generated, paper-specific question chips; static fallback if the
  // call fails so the demo never breaks.
  useEffect(() => {
    let alive = true;
    setSuggestions(null);
    getSuggestions(paper)
      .then((qs) => alive && setSuggestions(qs))
      .catch(() => alive && setSuggestions(STATIC_QUESTIONS));
    return () => {
      alive = false;
    };
  }, [paper]);

  useGSAP(
    () => {
      gsap.from(articleRef.current, { opacity: 0, y: 14, duration: 0.5, ease: "power2.out" });
    },
    { scope: rootRef }
  );

  useGSAP(
    () => {
      if (suggestions) {
        gsap.from(".suggest-chip", {
          y: 10,
          opacity: 0,
          stagger: 0.06,
          duration: 0.4,
          ease: "power2.out",
          clearProps: "all",
        });
      }
    },
    { scope: rootRef, dependencies: [suggestions] }
  );

  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return;
    const text = sel.toString().trim();
    if (text.length < 3 || text.length > 4000) return setPopover(null);
    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const el = node.nodeType === 1 ? node : node.parentElement;
    if (!articleRef.current?.contains(el)) return;

    // Locate the block the selection starts in for surrounding context
    const startEl =
      range.startContainer.nodeType === 1
        ? range.startContainer
        : range.startContainer.parentElement;
    const blockEl = startEl?.closest("[data-key]");
    let sectionHeading = startEl?.closest("[data-abstract]") ? "Abstract" : "";
    let before = "";
    let after = "";
    if (blockEl) {
      const [si, bi] = blockEl.dataset.key.split("-").map(Number);
      const section = paper.sections[si];
      sectionHeading = section?.heading || sectionHeading;
      const texts = (section?.blocks || []).map((b) => b.text);
      before = texts.slice(Math.max(0, bi - 2), bi).join(" ");
      after = texts.slice(bi + 1, bi + 3).join(" ");
    }

    const rect = range.getBoundingClientRect();
    const rootRect = rootRef.current.getBoundingClientRect();
    setPopover({
      top: rect.top - rootRect.top - 52,
      left: rect.left - rootRect.left + rect.width / 2,
      selection: text,
      sectionHeading,
      before,
      after,
    });
  }, [paper]);

  useEffect(() => {
    // setTimeout lets the browser finalize the selection before we read it
    const onMouseUp = () => setTimeout(captureSelection, 0);
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setPopover(null);
    };
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [captureSelection]);

  function askRodney() {
    setRequest({ mode: "explain", ...popover, ts: Date.now() });
    setPopover(null);
    setHintDismissed(true);
  }

  function askOverview() {
    setRequest({ mode: "overview", ts: Date.now() });
    setHintDismissed(true);
  }

  function askQuestion(question) {
    setRequest({ mode: "question", question, ts: Date.now() });
    setHintDismissed(true);
  }

  return (
    <div ref={rootRef} className="relative min-h-screen">
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
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={askOverview}
              className="cursor-pointer rounded-full border border-rodney/40 px-4 py-1.5 text-sm font-semibold text-rodney transition-colors hover:bg-rodney hover:text-white"
            >
              What's this paper about?
            </button>
          </div>
        </div>
      </nav>

      <div className={`transition-[padding] duration-300 ${request ? "lg:pr-[440px]" : ""}`}>
      <article ref={articleRef} className="mx-auto max-w-2xl px-5 pb-32 pt-12">
        <header>
          <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
            {paper.title}
          </h1>
          <p className="mt-3 text-[15px] text-ink-soft">{(paper.authors || []).join(" · ")}</p>
          <p className="mt-1 text-xs text-ink-faint">
            arXiv:{paper.id} — original paper, as published
          </p>
          {paper.source === "abstract-only" && (
            <p className="mt-4 rounded-xl border border-rodney/30 bg-rodney-wash px-4 py-3 text-sm text-ink-soft">
              Rodney could only fetch the abstract for this one — he can still explain it,
              and the full paper lives on arXiv.
            </p>
          )}
        </header>

        {paper.abstract && (
          <div
            data-abstract
            className="mt-8 rounded-2xl border border-line bg-paper p-6 shadow-sm"
          >
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-rodney">
              Abstract
            </div>
            <div className="prose-paper text-[16px]">
              {paper.abstract.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}

        {suggestions && (
          <div className="mt-6">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
              Curious? Ask Rodney
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => askQuestion(q)}
                  className="suggest-chip cursor-pointer rounded-full border border-line bg-white px-4 py-2 text-left text-sm text-ink-soft shadow-sm transition-colors hover:border-rodney hover:text-rodney"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="prose-paper mt-10">
          {(paper.sections || []).map((section, si) => (
            <section key={section.id || si}>
              {section.heading && <h2>{section.heading}</h2>}
              {section.blocks.map((block, bi) => {
                const key = `${si}-${bi}`;
                if (block.type === "h3") return <h3 key={key} data-key={key}>{block.text}</h3>;
                if (block.type === "math")
                  return (
                    <div key={key} data-key={key} className="math-block">
                      {block.text}
                    </div>
                  );
                if (block.type === "caption")
                  return (
                    <div key={key} data-key={key} className="caption-block">
                      {block.text}
                    </div>
                  );
                return <p key={key} data-key={key}>{block.text}</p>;
              })}
            </section>
          ))}
        </div>
      </article>
      </div>

      {!hintDismissed && !request && (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2">
          <div className="flex items-center gap-2.5 rounded-full bg-ink px-5 py-2.5 text-sm text-cream shadow-lift">
            <RodneyOwl className="h-6 w-6" />
            Highlight any passage and Rodney will explain it in plain language
          </div>
        </div>
      )}

      {popover && <SelectionPopover top={popover.top} left={popover.left} onAsk={askRodney} />}

      {request && (
        <RodneyPanel
          paper={paper}
          request={request}
          onClose={() => setRequest(null)}
          onEditPrefs={onEditPrefs}
        />
      )}
    </div>
  );
}
