"use client";

import Link from "next/link";

import {
  TEMPLE_CHAPTERS,
  TEMPLE_LEVELS,
  type TempleChapter,
} from "./config/levelsConfig";

type Props = {
  level: number;
  unlocked: number;
  stars: Record<string, number>;
  totalStars: number;
  maxStars: number;
  open: boolean;
  onSelect: (id: number) => void;
  onClose: () => void;
};

export default function TempleRail({
  level,
  unlocked,
  stars,
  totalStars,
  maxStars,
  open,
  onSelect,
  onClose,
}: Props) {
  const chapters = Object.keys(TEMPLE_CHAPTERS) as TempleChapter[];
  const progress = Math.min(100, Math.round((totalStars / maxStars) * 100));

  return (
    <>
      <div
        className={`temple-rail-backdrop${open ? " is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`temple-rail${open ? " is-open" : ""}`} aria-label="Temple levels">
        <div className="temple-rail-brand">
          <Link href="/" className="temple-brand-mark" aria-label="Back to game hub">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2.5 2.5 7h19L12 2.5ZM5 10v8M10 10v8M14 10v8M19 10v8M3 21h18"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <div className="temple-rail-brand-text">
            <strong>Temple of Echoes</strong>
            <span>Recursive descent</span>
          </div>
        </div>

        <section className="temple-rail-progress" aria-label="Overall progress">
          <div className="temple-rail-progress-row">
            <span>Journey</span>
            <b>
              {totalStars}
              <small>/{maxStars}</small>
            </b>
          </div>
          <div className="temple-progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </section>

        <nav className="temple-rail-levels">
          {chapters.map((chapter) => (
            <div className="temple-rail-chapter" key={chapter}>
              <p>{chapter}</p>
              {TEMPLE_CHAPTERS[chapter].map((id) => {
                const item = TEMPLE_LEVELS[id - 1];
                const locked = id > unlocked;
                const earned = stars[String(id)] || 0;
                return (
                  <button
                    type="button"
                    key={id}
                    disabled={locked}
                    onClick={() => onSelect(id)}
                    className={`temple-rail-level${id === level ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                    aria-current={id === level ? "step" : undefined}
                  >
                    <span className="temple-rail-index">{id}</span>
                    <span className="temple-rail-title">{item.title}</span>
                    <span className="temple-rail-stars" aria-label={`${earned} of 3 stars`}>
                      {locked ? "" : earned ? "\u2605".repeat(earned) : "\u00b7\u00b7\u00b7"}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="temple-rail-foot">
          <Link href="/">{"\u2190"} Game hub</Link>
          <span>{unlocked}/{TEMPLE_LEVELS.length} open</span>
        </div>
      </aside>
    </>
  );
}
