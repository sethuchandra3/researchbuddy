import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap.js";
import { getMindmap } from "../lib/api.js";

const cache = new Map(); // paper.id -> concept map

// Radial concept map: central idea in the middle, satellite concepts placed
// around a circle with plain trigonometry — no graph library needed.
export default function MindMap({ paper }) {
  const ref = useRef(null);
  const [state, setState] = useState(() =>
    cache.has(paper.id)
      ? { status: "ok", map: cache.get(paper.id) }
      : { status: "loading" }
  );

  useEffect(() => {
    if (cache.has(paper.id)) {
      setState({ status: "ok", map: cache.get(paper.id) });
      return;
    }
    let alive = true;
    setState({ status: "loading" });
    getMindmap(paper)
      .then((map) => {
        cache.set(paper.id, map);
        if (alive) setState({ status: "ok", map });
      })
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, [paper.id]);

  useGSAP(
    () => {
      if (state.status === "ok") {
        gsap.from(".mm-line", { opacity: 0, duration: 0.7, delay: 0.2 });
        gsap.from(".mm-node", {
          scale: 0.55,
          opacity: 0,
          stagger: 0.09,
          duration: 0.5,
          ease: "back.out(1.6)",
        });
      }
    },
    { scope: ref, dependencies: [state] }
  );

  if (state.status === "loading") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="stream-caret text-sm text-ink-soft">
          Rodney is sketching the big picture
        </p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-sm leading-6 text-ink-soft">
          The mind map couldn't be generated for this one — try the chat view instead.
        </p>
      </div>
    );
  }

  const { map } = state;
  const CX = 200;
  const CY = 195;
  const R = 136;
  const pos = { central: { x: CX, y: CY } };
  map.nodes.forEach((node, i) => {
    const angle = ((-90 + (i * 360) / map.nodes.length) * Math.PI) / 180;
    pos[node.id] = { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });

  return (
    <div ref={ref} className="px-4 py-5">
      <div className="relative mx-auto aspect-square w-full max-w-[380px]">
        <svg viewBox="0 0 400 400" className="absolute inset-0 h-full w-full">
          {map.nodes.map((node) => {
            const from = pos[node.id];
            const to = pos[node.connects_to] || pos.central;
            return (
              <line
                key={node.id}
                className="mm-line"
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#e3d5c3"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>
        <div
          className="mm-node absolute max-w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-rodney px-4 py-2.5 text-center text-sm font-semibold leading-snug text-white shadow-lift"
          style={{ left: `${(CX / 400) * 100}%`, top: `${(CY / 400) * 100}%` }}
        >
          {map.central}
        </div>
        {map.nodes.map((node) => (
          <div
            key={node.id}
            className="mm-node absolute max-w-[122px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-white px-3 py-2 text-center text-xs leading-snug text-ink shadow-sm"
            style={{
              left: `${(pos[node.id].x / 400) * 100}%`,
              top: `${(pos[node.id].y / 400) * 100}%`,
            }}
          >
            {node.label}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-faint">
        Rodney sketched this from the paper's title and abstract
      </p>
    </div>
  );
}
