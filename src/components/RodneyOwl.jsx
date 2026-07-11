import { useId, useRef } from "react";
import { gsap, useGSAP } from "../lib/gsap.js";

// Rodney: a round orange owl with big round glasses.
// `thinking` shifts his pupils up and pulses thought-dots while the AI streams.
export default function RodneyOwl({ thinking = false, className = "" }) {
  const ref = useRef(null);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  useGSAP(
    () => {
      gsap.to(".owl-float", {
        y: 3.5,
        duration: 2.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      const lids = ref.current.querySelectorAll(".owl-lid");
      gsap.set(lids, { scaleY: 0, transformOrigin: "center top" });
      const blink = () => {
        gsap.to(lids, {
          scaleY: 1,
          duration: 0.08,
          yoyo: true,
          repeat: 1,
          onComplete: () => gsap.delayedCall(gsap.utils.random(2.2, 4.8), blink),
        });
      };
      gsap.delayedCall(1.4, blink);
    },
    { scope: ref }
  );

  useGSAP(
    () => {
      const pupils = ref.current.querySelectorAll(".owl-pupil");
      const dots = ref.current.querySelectorAll(".owl-think-dot");
      if (thinking) {
        gsap.to(pupils, { x: -2.5, y: -3, duration: 0.3, ease: "power2.out" });
        gsap.to(dots, {
          opacity: 1,
          y: -3,
          duration: 0.4,
          stagger: 0.16,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      } else {
        gsap.killTweensOf(dots);
        gsap.to(dots, { opacity: 0, y: 0, duration: 0.2 });
        gsap.to(pupils, { x: 0, y: 0, duration: 0.3, ease: "power2.out" });
      }
    },
    { scope: ref, dependencies: [thinking] }
  );

  return (
    <svg ref={ref} viewBox="0 0 120 130" className={className} aria-hidden="true">
      <defs>
        <clipPath id={`lensL${uid}`}>
          <circle cx="44" cy="54" r="13" />
        </clipPath>
        <clipPath id={`lensR${uid}`}>
          <circle cx="76" cy="54" r="13" />
        </clipPath>
      </defs>
      <g className="owl-float">
        {/* thought dots */}
        <circle className="owl-think-dot" cx="92" cy="22" r="2.6" fill="#f26b1f" opacity="0" />
        <circle className="owl-think-dot" cx="101" cy="15" r="3.6" fill="#f26b1f" opacity="0" />
        <circle className="owl-think-dot" cx="112" cy="6" r="4.6" fill="#f26b1f" opacity="0" />
        {/* ear tufts */}
        <path d="M28 36 Q24 16 42 25 Q34 30 37 40 Z" fill="#cf5314" />
        <path d="M92 36 Q96 16 78 25 Q86 30 83 40 Z" fill="#cf5314" />
        {/* body */}
        <ellipse cx="60" cy="76" rx="40" ry="46" fill="#f26b1f" />
        {/* wings */}
        <path d="M23 66 Q12 92 30 110 Q36 92 33 70 Z" fill="#cf5314" />
        <path d="M97 66 Q108 92 90 110 Q84 92 87 70 Z" fill="#cf5314" />
        {/* belly */}
        <ellipse cx="60" cy="94" rx="26" ry="24" fill="#fbe3c9" />
        <path
          d="M48 90 q6 6 12 0 q6 6 12 0"
          stroke="#efb488"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M48 100 q6 6 12 0 q6 6 12 0"
          stroke="#efb488"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
        {/* glasses */}
        <circle cx="44" cy="54" r="15" fill="#fffdf8" stroke="#2b2420" strokeWidth="3.5" />
        <circle cx="76" cy="54" r="15" fill="#fffdf8" stroke="#2b2420" strokeWidth="3.5" />
        <path d="M58 53 Q60 51 62 53" stroke="#2b2420" strokeWidth="3" fill="none" />
        <line x1="29.5" y1="51" x2="22" y2="47" stroke="#2b2420" strokeWidth="3" strokeLinecap="round" />
        <line x1="90.5" y1="51" x2="98" y2="47" stroke="#2b2420" strokeWidth="3" strokeLinecap="round" />
        {/* pupils */}
        <g className="owl-pupil">
          <circle cx="46" cy="56" r="5.5" fill="#2b2420" />
          <circle cx="48" cy="54" r="1.8" fill="#fff" />
        </g>
        <g className="owl-pupil">
          <circle cx="78" cy="56" r="5.5" fill="#2b2420" />
          <circle cx="80" cy="54" r="1.8" fill="#fff" />
        </g>
        {/* eyelids (blink) */}
        <g clipPath={`url(#lensL${uid})`}>
          <rect className="owl-lid" x="29" y="41" width="30" height="27" fill="#f0975c" />
        </g>
        <g clipPath={`url(#lensR${uid})`}>
          <rect className="owl-lid" x="61" y="41" width="30" height="27" fill="#f0975c" />
        </g>
        {/* beak */}
        <path d="M60 65 L53 71 Q60 81 67 71 Z" fill="#e8a13c" />
        {/* feet */}
        <ellipse cx="48" cy="121" rx="7.5" ry="4.5" fill="#e8a13c" />
        <ellipse cx="72" cy="121" rx="7.5" ry="4.5" fill="#e8a13c" />
      </g>
    </svg>
  );
}
