"use client";

import { useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";

export function useScrollAnimation() {
  const animationRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: animationRef,
    offset: ["start 80%", "end 20%"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 24,
    mass: 0.45,
  });

  return {
    animationRef,
    orbScale: useTransform(
      progress,
      [0, 0.25, 0.5, 0.75, 1],
      [0.96, 1, 0.98, 1.02, 1],
    ),
    orbRotate: useTransform(progress, [0, 1], [0, 45]),
    orbGlow: useTransform(
      progress,
      [0, 0.25, 0.5, 0.75, 1],
      [0.4, 0.68, 0.5, 0.72, 0.55],
    ),
    callOpacity: useTransform(progress, [0, 0.2, 0.26], [1, 1, 0]),
    callY: useTransform(progress, [0, 0.2, 0.26], [0, 0, 8]),
    callScale: useTransform(
      progress,
      [0, 0.2, 0.26],
      [1, 1, 0.98],
    ),
    callIncomingOpacity: useTransform(progress, [0, 0.08, 0.12], [1, 1, 0]),
    callMissedOpacity: useTransform(progress, [0.08, 0.12, 0.26], [0, 1, 1]),
    messageOpacity: useTransform(
      progress,
      [0.2, 0.26, 0.44, 0.5],
      [0, 1, 1, 0],
    ),
    messageX: useTransform(
      progress,
      [0.2, 0.26, 0.44, 0.5],
      [-10, 0, 0, 10],
    ),
    messageScale: useTransform(
      progress,
      [0.2, 0.26, 0.44, 0.5],
      [0.97, 1, 1, 0.98],
    ),
    leadOpacity: useTransform(
      progress,
      [0.38, 0.44, 0.54, 0.6],
      [0, 1, 1, 0],
    ),
    leadX: useTransform(
      progress,
      [0.38, 0.44, 0.54, 0.6],
      [10, 0, 0, -10],
    ),
    leadScale: useTransform(
      progress,
      [0.38, 0.44, 0.54, 0.6],
      [0.97, 1, 1, 0.98],
    ),
    bookedOpacity: useTransform(
      progress,
      [0.42, 0.48, 0.92, 1],
      [0, 1, 1, 1],
    ),
    bookedY: useTransform(
      progress,
      [0.42, 0.48, 1],
      [8, 0, 0],
    ),
    bookedScale: useTransform(
      progress,
      [0.42, 0.48, 1],
      [0.97, 1, 1],
    ),
  };
}
