import { useRef } from "react";
import { gsap, useGSAP } from "../lib/gsap.js";

// Floating "Ask Rodney" pill, absolutely positioned above the selection.
export default function SelectionPopover({ top, left, onAsk }) {
  const ref = useRef(null);

  useGSAP(
    () => {
      gsap.fromTo(
        ref.current,
        { scale: 0.7, opacity: 0, y: 6 },
        { scale: 1, opacity: 1, y: 0, duration: 0.22, ease: "back.out(2)" }
      );
    },
    { scope: ref }
  );

  return (
    <div
      ref={ref}
      className="absolute z-40 -translate-x-1/2"
      style={{ top, left }}
    >
      <button
        onMouseDown={(e) => e.preventDefault() /* keep the text selected */}
        onClick={onAsk}
        className="flex cursor-pointer items-center gap-2 rounded-full bg-rodney px-4 py-2 text-sm font-semibold text-white shadow-lift transition-colors hover:bg-rodney-deep"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden="true">
          <circle cx="8.5" cy="10" r="4.2" stroke="white" strokeWidth="1.8" />
          <circle cx="15.5" cy="10" r="4.2" stroke="white" strokeWidth="1.8" />
          <circle cx="9" cy="10.5" r="1.4" fill="white" />
          <circle cx="16" cy="10.5" r="1.4" fill="white" />
          <path d="M10.5 16.5 L12 18.5 L13.5 16.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Ask Rodney
      </button>
    </div>
  );
}
