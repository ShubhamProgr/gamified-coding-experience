"use client";

import type { TempleEvent } from "./HanoiSpireCanvas";

type Props = {
  timeline: Array<Record<string, unknown>>;
  index: number;
  disks: number;
};

export default function CallStackPanel({ timeline, index, disks }: Props) {
  const events = timeline as TempleEvent[];
  const limit = Math.min(index, events.length - 1);
  let lastMove: TempleEvent | null = null;
  for (let i = 0; i <= limit; i += 1) {
    if (events[i]?.action === "MOVE_DISK") {
      lastMove = events[i];
    }
  }

  const totalMoves = events.filter((event) => event.action === "MOVE_DISK").length;
  const moveNumber = typeof lastMove?.move_number === "number" ? lastMove.move_number : 0;
  const remaining = Math.max(1, totalMoves - moveNumber + 1);
  const depth = events.length === 0
    ? 0
    : Math.min(disks, Math.max(1, Math.floor(Math.log2(remaining)) + 1));
  const frames = Array.from({ length: depth }, (_, i) => disks - i);

  return (
    <section className="temple-callstack">
      <div className="temple-callstack-head">
        <strong>Call stack</strong>
        <small>
          depth {depth}/{disks}
        </small>
      </div>
      <div className="temple-callstack-frames">
        {frames.map((n, i) => {
          const isActive = i === depth - 1;
          return (
            <div key={`${n}-${i}`} className={`temple-frame${isActive ? " is-active" : ""}`}>
              <span className="temple-frame-depth">{i + 1}</span>
              <strong>hanoi(n = {n})</strong>
              <small>{isActive ? "executing" : "waiting"}</small>
            </div>
          );
        })}
        {frames.length === 0 && (
          <p className="temple-callstack-empty">Run your solution to watch the stack grow.</p>
        )}
      </div>
    </section>
  );
}
