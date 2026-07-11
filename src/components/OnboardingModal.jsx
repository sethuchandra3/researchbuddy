import { useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap.js";
import {
  FAMILIARITY_OPTIONS,
  INTEREST_OPTIONS,
  getPrefs,
  savePrefs,
} from "../lib/prefs.js";
import RodneyOwl from "./RodneyOwl.jsx";

function OptionRow({ options, value, onPick }) {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onPick(o.value)}
          className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            value === o.value
              ? "border-rodney bg-rodney text-white"
              : "border-line bg-white text-ink-soft hover:border-rodney hover:text-rodney"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Two-question, skippable onboarding. Answers live in localStorage only.
export default function OnboardingModal({ onDone }) {
  const ref = useRef(null);
  const existing = getPrefs() || {};
  const [familiarity, setFamiliarity] = useState(existing.familiarity || null);
  const [interest, setInterest] = useState(existing.interest || null);

  useGSAP(
    () => {
      gsap.from(".onboard-card", {
        y: 24,
        opacity: 0,
        scale: 0.96,
        duration: 0.45,
        ease: "back.out(1.4)",
      });
    },
    { scope: ref }
  );

  function save() {
    savePrefs({ familiarity, interest });
    onDone();
  }

  function skip() {
    // Remember that onboarding happened so it doesn't nag on every visit
    savePrefs(getPrefs() || {});
    onDone();
  }

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/30 p-4 backdrop-blur-sm"
    >
      <div className="onboard-card w-full max-w-md rounded-3xl border border-line bg-paper p-8 text-center shadow-lift">
        <RodneyOwl className="mx-auto h-20 w-20" />
        <h2 className="mt-3 font-display text-2xl font-semibold">
          Hoo! Before we start reading…
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Two quick questions so Rodney can pitch his explanations just right.
        </p>

        <div className="mt-6">
          <div className="text-sm font-semibold">
            How familiar are you with research papers?
          </div>
          <OptionRow
            options={FAMILIARITY_OPTIONS}
            value={familiarity}
            onPick={setFamiliarity}
          />
        </div>

        <div className="mt-6">
          <div className="text-sm font-semibold">What are you most interested in?</div>
          <OptionRow options={INTEREST_OPTIONS} value={interest} onPick={setInterest} />
        </div>

        <button
          onClick={save}
          disabled={!familiarity && !interest}
          className="mt-7 w-full cursor-pointer rounded-full bg-rodney px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-rodney-deep disabled:cursor-default disabled:opacity-40"
        >
          Let's read
        </button>
        <button
          onClick={skip}
          className="mt-3 cursor-pointer text-sm text-ink-faint transition-colors hover:text-ink-soft"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
