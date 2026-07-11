import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap.js";
import { streamLLM } from "../lib/api.js";
import { formatRodney } from "../lib/format.jsx";
import { getPrefs } from "../lib/prefs.js";
import RodneyOwl from "./RodneyOwl.jsx";

const truncate = (s, n) => (s && s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

// Slide-in side panel where Rodney streams explanations and takes follow-ups.
// `request`: {mode: 'explain'|'overview'|'question', selection?, question?,
//             sectionHeading, before, after, ts}
export default function RodneyPanel({ paper, request, onClose, onEditPrefs }) {
  const panelRef = useRef(null);
  const bodyRef = useRef(null);
  const abortRef = useRef(null);
  const lastRunRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState("");

  useGSAP(
    () => {
      gsap.fromTo(
        panelRef.current,
        { xPercent: 105 },
        { xPercent: 0, duration: 0.45, ease: "power3.out" }
      );
    },
    { scope: panelRef }
  );

  function close() {
    abortRef.current?.abort();
    gsap.to(panelRef.current, {
      xPercent: 105,
      duration: 0.3,
      ease: "power3.in",
      onComplete: onClose,
    });
  }

  const baseContext = () => ({
    paper: {
      title: paper.title,
      authors: paper.authors,
      abstract: paper.abstract,
      sectionHeadings: (paper.sections || []).map((s) => s.heading).filter(Boolean),
    },
    sectionHeading: request.sectionHeading,
    before: request.before,
    after: request.after,
    selection: request.selection,
    prefs: getPrefs() || undefined,
  });

  async function run(path, body, userBubble) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    lastRunRef.current = { path, body };
    setError("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      ...(userBubble ? [{ role: "user", content: userBubble }] : []),
      { role: "rodney", content: "" },
    ]);
    try {
      await streamLLM(path, body, {
        signal: ac.signal,
        onToken: (t) =>
          setMessages((m) => {
            const copy = m.slice();
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + t };
            return copy;
          }),
      });
    } catch (err) {
      if (!ac.signal.aborted) setError(err.message);
    } finally {
      if (abortRef.current === ac) setBusy(false);
    }
  }

  useEffect(() => {
    setMessages([]);
    if (request.mode === "overview") {
      run("/api/explain", { ...baseContext(), mode: "overview" }, "What's this paper about?");
    } else if (request.mode === "question") {
      run(
        "/api/chat",
        { ...baseContext(), history: [], question: request.question },
        request.question
      );
    } else {
      run(
        "/api/explain",
        { ...baseContext(), mode: "explain" },
        `“${truncate(request.selection, 200)}”`
      );
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  function explainSimpler() {
    const firstRodney = messages.find((m) => m.role === "rodney")?.content || "";
    run(
      "/api/explain",
      { ...baseContext(), mode: "simpler", previous: firstRodney },
      "Can you make it even simpler?"
    );
  }

  function retry() {
    if (lastRunRef.current) run(lastRunRef.current.path, lastRunRef.current.body, null);
  }

  function sendFollowUp(e) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    const history = messages
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content }));
    run("/api/chat", { ...baseContext(), history, question: q }, q);
  }

  const lastMessage = messages[messages.length - 1];
  const showSimpler =
    !busy &&
    !error &&
    request.mode === "explain" &&
    lastMessage?.role === "rodney" &&
    lastMessage.content;

  return (
    <aside
      ref={panelRef}
      className="fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-[94vw] flex-col border-l border-line bg-paper shadow-panel"
    >
      <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <RodneyOwl thinking={busy} className="h-12 w-12 shrink-0" />
        <div>
          <div className="font-display text-lg font-semibold leading-tight">Rodney</div>
          <div className="text-xs text-ink-faint">
            {busy ? "hmm, let me think…" : "your research buddy"}
          </div>
        </div>
        <button
          onClick={onEditPrefs}
          aria-label="Edit reading preferences"
          title="Edit reading preferences"
          className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-rodney-soft hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
            <path d="M2 4.5h6M11 4.5h3M2 11.5h3M8 11.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="9.5" cy="4.5" r="1.7" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="6.5" cy="11.5" r="1.7" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
        <button
          onClick={close}
          aria-label="Close panel"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-rodney-soft hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div ref={bodyRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl rounded-br-md bg-rodney-soft px-4 py-2.5 text-sm leading-6 text-ink">
                {m.content}
              </div>
            </div>
          ) : (
            <div
              key={i}
              className={`rodney-msg text-[15px] leading-7 ${
                busy && i === messages.length - 1 ? "stream-caret" : ""
              }`}
            >
              {formatRodney(m.content)}
            </div>
          )
        )}
        {error && (
          <div className="rounded-xl border border-rodney/30 bg-rodney-wash px-4 py-3 text-sm text-ink-soft">
            {error}{" "}
            <button
              onClick={retry}
              className="cursor-pointer font-semibold text-rodney hover:text-rodney-deep"
            >
              Try again
            </button>
          </div>
        )}
        {showSimpler && (
          <button
            onClick={explainSimpler}
            className="cursor-pointer rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:border-rodney hover:text-rodney"
          >
            ✨ Explain it simpler
          </button>
        )}
      </div>

      <form onSubmit={sendFollowUp} className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <input
            id="rodney-followup"
            name="followup"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Rodney a follow-up…"
            className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-ink-faint focus:border-rodney"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-rodney text-white transition-colors hover:bg-rodney-deep disabled:cursor-default disabled:opacity-40"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
              <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          Rodney can make mistakes — the real paper is right there ☝️
        </p>
      </form>
    </aside>
  );
}
