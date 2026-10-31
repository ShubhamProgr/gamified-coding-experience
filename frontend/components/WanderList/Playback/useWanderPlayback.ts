"use client";

import { useEffect, useState } from "react";

export function useWanderPlayback(length: number) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setIndex(0);
      setPlaying(false);
    }, 0);
    return () => window.clearTimeout(resetTimer);
  }, [length]);

  useEffect(() => {
    if (!playing || length === 0) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= length - 1) {
          setPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, 350);
    return () => window.clearInterval(timer);
  }, [length, playing]);

  return {
    index,
    playing,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    step: (delta: number) => setIndex((current) => Math.min(Math.max(0, current + delta), Math.max(0, length - 1))),
    seek: (next: number) => setIndex(Math.min(Math.max(0, next), Math.max(0, length - 1))),
  };
}
