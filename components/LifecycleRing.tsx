"use client";

import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useEffect, useRef, useState } from "react";
import PhoneFrame from "@/components/PhoneFrame";
import StageScreen from "@/components/StageScreen";
import { lifecycleStages } from "@/lib/content";

const STAGE_MS = 3600;
const RADIUS = 42;

/**
 * Node centres as percentages of the square wrapper, placed on the diagonals
 * rather than at 12/3/6/9 so the tall phone in the middle never collides with
 * the top and bottom markers. `label` is the extra px offset that pushes the
 * desktop caption further out along the same diagonal.
 */
const NODES = [
  { x: 79.7, y: 20.3, label: { x: 66, y: -42 } },
  { x: 79.7, y: 79.7, label: { x: 66, y: 42 } },
  { x: 20.3, y: 79.7, label: { x: -66, y: 42 } },
  { x: 20.3, y: 20.3, label: { x: -66, y: -42 } },
];

export default function LifecycleRing() {
  const reduceMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const arcRef = useRef<SVGCircleElement>(null);

  // Snap the arc into place without a tween on first paint, on every wrap back
  // to stage one, and whenever someone jumps straight to a stage — otherwise
  // the sweep animates backwards to get there.
  const snapRef = useRef(true);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const id = setTimeout(
      () => setIndex((current) => (current + 1) % lifecycleStages.length),
      STAGE_MS,
    );
    return () => clearTimeout(id);
  }, [index, paused, reduceMotion]);

  useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;

    const target = 100 - (index + 1) * 25;

    if (reduceMotion) {
      arc.style.transition = "none";
      arc.style.strokeDashoffset = String(target);
      return;
    }

    if (snapRef.current || index === 0) {
      arc.style.transition = "none";
      arc.style.strokeDashoffset = String(100 - index * 25);
      void arc.getBoundingClientRect();
      snapRef.current = false;
    }

    arc.style.transition = `stroke-dashoffset ${STAGE_MS}ms linear`;
    arc.style.strokeDashoffset = String(target);
  }, [index, reduceMotion]);

  const jumpTo = (next: number) => {
    snapRef.current = true;
    setIndex(next);
  };

  const active = lifecycleStages[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative mx-auto h-[280px] w-[280px] sm:h-[340px] sm:w-[340px] lg:h-[360px] lg:w-[360px]">
        <svg
          viewBox="0 0 100 100"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
        >
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="0.4"
          />
          <circle
            ref={arcRef}
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="0.4"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100 100"
            strokeDashoffset={100}
            transform="rotate(-45 50 50)"
          />
        </svg>

        {lifecycleStages.map((stage, i) => {
          const node = NODES[i];
          const isActive = i === index;

          return (
            <div key={stage.number}>
              {/*
                The button is a 44px touch target; the marker inside it stays
                small. Sizing the button to the dot would meet the letter of the
                design and leave a 24px tap area on the ring — the main way the
                product explains itself on a phone, aimed at people using one
                outdoors, one-handed, often in gloves.
              */}
              <button
                type="button"
                onClick={() => jumpTo(i)}
                aria-label={`${stage.title} — ${stage.text}`}
                aria-current={isActive ? "step" : undefined}
                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                className="absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-[9px] transition-colors duration-300 lg:h-7 lg:w-7 lg:text-[10px] ${
                    isActive
                      ? "border-white bg-white text-black"
                      : "border-white/25 bg-black text-zinc-400 hover:border-white/50 hover:text-white"
                  }`}
                >
                  {stage.number}
                </span>
              </button>

              <span
                aria-hidden="true"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  transform: `translate(calc(-50% + ${node.label.x}px), calc(-50% + ${node.label.y}px))`,
                }}
                className={`absolute hidden w-[120px] text-center text-xs transition-colors duration-300 lg:block ${
                  isActive ? "text-white" : "text-zinc-400"
                }`}
              >
                {stage.title}
              </span>
            </div>
          );
        })}

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          {/*
              No status bar on this one. At 118px wide the time and battery
              would be cramped decoration, and this screen is showing a stage of
              a call rather than pretending to be a messages app.
            */}
            <PhoneFrame
              chrome={false}
              className="h-[230px] w-[118px] sm:h-[272px] sm:w-[140px] lg:h-[282px] lg:w-[146px]"
            >
            {/*
              Keyed so each stage remounts and replays the fade. See globals.css
              for why this is a CSS animation and not a JS-driven one.
            */}
            <div key={index} className="fp-fade-in">
              <StageScreen stage={index} />
            </div>
          </PhoneFrame>
        </div>
      </div>

      <div aria-live="polite" className="mt-5 text-center lg:hidden">
        <p className="text-sm font-semibold text-white">{active.title}</p>
        <p className="mt-1 text-xs text-zinc-400">{active.text}</p>
      </div>
    </div>
  );
}
