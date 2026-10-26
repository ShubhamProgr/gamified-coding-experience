"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type Game = {
  id: string;
  title: string;
  description: string;
  href: string;
  tags: string[];
  image: string;
  placeholder?: boolean;
};

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

// Paste either the public ID or the full Cloudinary URL here.
const THUMBNAIL_PUBLIC_IDS = {
  roverAdventure:
    "https://res.cloudinary.com/ikjuljmm/image/upload/v1793025165/marsRoverThumbnail.png",
  slot1: "",
  slot2: "",
};

function cloudinaryThumbnail(source: string, width = 1024) {
  if (!source) return "";

  if (/^https?:\/\//i.test(source)) {
    return source.replace(
      /\/image\/upload\/(?=v\d+\/)/,
      `/image/upload/f_auto,q_auto,w_${width}/`
    );
  }

  if (!CLOUDINARY_CLOUD_NAME) return "";
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_${width}/${source}`;
}

const TITLE_LINES = [
  ["CODE,", "LEARN."],
  ["PLAY,", "SLAY."],
];
const TITLE_WORDS = TITLE_LINES.flat();
const TITLE_LETTER_COUNT = TITLE_WORDS.join("").length;

const SEARCH_PLACEHOLDERS = [
  "Search games…",
  "Try “rover”…",
  "Try “mars”…",
  "Try “missions”…",
];

const GAMES: Game[] = [
  {
    id: "rover-adventure",
    title: "Rover Adventure",
    description:
      "Program a Mars rover with code. Navigate the red planet, drill for minerals, and complete missions.",
    href: "/rover-adventure",
    tags: ["Python", "Java", "C++", "Mars", "Robotics", "Missions"],
    image:
      cloudinaryThumbnail(THUMBNAIL_PUBLIC_IDS.roverAdventure) ||
      "/rover-adventure.png",
  },
  {
    id: "placeholder-1",
    title: "Coming Soon",
    description: "",
    href: "#",
    tags: [],
    image: cloudinaryThumbnail(THUMBNAIL_PUBLIC_IDS.slot1),
    placeholder: true,
  },
  {
    id: "placeholder-2",
    title: "Coming Soon",
    description: "",
    href: "#",
    tags: [],
    image: cloudinaryThumbnail(THUMBNAIL_PUBLIC_IDS.slot2),
    placeholder: true,
  },
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [typedLetters, setTypedLetters] = useState(0);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const shellRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedMotionTimer = window.setTimeout(
        () => setTypedLetters(TITLE_LETTER_COUNT),
        0
      );
      return () => window.clearTimeout(reducedMotionTimer);
    }

    let cancelled = false;
    let timer = 0;
    let count = 0;
    const letters = TITLE_WORDS.join("");

    const schedule = (fn: () => void, ms: number) => {
      timer = window.setTimeout(fn, ms);
    };

    const typeNext = () => {
      if (cancelled) return;
      count += 1;
      setTypedLetters(count);

      if (count >= TITLE_LETTER_COUNT) {
        schedule(eraseNext, 2400);
        return;
      }

      const char = letters[count - 1];
      schedule(typeNext, char === "." ? 230 : 55 + Math.random() * 55);
    };

    const eraseNext = () => {
      if (cancelled) return;
      count -= 1;
      setTypedLetters(Math.max(0, count));

      if (count <= 0) {
        schedule(typeNext, 1400);
        return;
      }

      schedule(eraseNext, 30);
    };

    timer = window.setTimeout(typeNext, 800);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (query) return;
    const id = setInterval(
      () => setPlaceholderIndex((i) => (i + 1) % SEARCH_PLACEHOLDERS.length),
      2800
    );
    return () => clearInterval(id);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const isShortcut =
        e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k");

      if (isShortcut) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const max = el.scrollHeight - el.clientHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      el.style.setProperty("--scroll-progress", progress.toFixed(4));
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GAMES;
    return GAMES.filter((game) =>
      [game.title, game.description, ...game.tags]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query]);

  return (
    <main className="home-shell" ref={shellRef}>
      <div className="home-scene" aria-hidden="true">
        <div className="home-space" />
        <div className="home-desert" />
        <div className="home-stars">
          <span className="shooting-star shooting-star--1" />
          <span className="shooting-star shooting-star--2" />
          <span className="shooting-star shooting-star--3" />
        </div>
        <div className="home-dunes" />
      </div>
      <div className="home-grid" aria-hidden="true" />

      <header className="home-nav">
        <Link href="/" className="home-brand">
          <span className="home-brand-mark" aria-hidden="true" />
          ROVER LAB
        </Link>
      </header>

      <section className="home-hero">
        <div className="home-hero-center">
          <h1
            className="home-title"
            aria-label="CODE, LEARN. PLAY, SLAY."
          >
            {(() => {
              let letterIndex = 0;
              return TITLE_LINES.map((line, lineIndex) => (
                <span
                  key={`line-${lineIndex}`}
                  className="home-title-line"
                  aria-hidden="true"
                >
                  {line.map((word) => (
                    <span key={word} className="home-title-word">
                      {Array.from(word).map((char) => {
                        const isVisible = letterIndex < typedLetters;
                        const isFresh = letterIndex === typedLetters - 1;
                        const isCaret =
                          isFresh && typedLetters < TITLE_LETTER_COUNT;
                        letterIndex += 1;
                        return (
                          <span
                            key={`${word}-${letterIndex}`}
                            className={`home-title-letter${
                              isVisible ? "" : " home-title-letter--hidden"
                            }${isFresh ? " home-title-letter--fresh" : ""}${
                              isCaret ? " home-title-letter--typing" : ""
                            }`}
                          >
                            {char}
                          </span>
                        );
                      })}
                    </span>
                  ))}
                </span>
              ));
            })()}
          </h1>

          <form
            className="home-search"
            role="search"
            onSubmit={(e) => e.preventDefault()}
          >
            <span className="home-search-icon-wrap" aria-hidden="true">
              <svg
                className="home-search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>

            <label htmlFor="game-search" className="sr-only">
              Search games
            </label>
            <input
              id="game-search"
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder=""
              autoComplete="off"
            />

            {!query && (
              <span
                className="home-search-placeholder"
                key={placeholderIndex}
                aria-hidden="true"
              >
                {SEARCH_PLACEHOLDERS[placeholderIndex]}
              </span>
            )}

            {query && (
              <button
                type="button"
                className="home-search-clear"
                onClick={() => setQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}

            <span className="home-search-sheen" aria-hidden="true" />
          </form>

          {query.trim() && (
            <p className="home-result-count" aria-live="polite">
              {results.length === 0
                ? "No matches"
                : `${results.length} result${results.length === 1 ? "" : "s"}`}{" "}
              for “{query.trim()}”
            </p>
          )}
        </div>

        <div className="home-games">
          {results.length === 0 ? (
            <p className="home-empty">
              No games match “{query.trim()}”. Try “rover”, “python”, or “mars”.
            </p>
          ) : (
            results.map((game) =>
              game.placeholder ? (
                <div
                  key={game.id}
                  className={`game-card${
                    game.image && !failedImages[game.id]
                      ? ""
                      : " game-card--placeholder"
                  }`}
                  aria-hidden="true"
                >
                  <div className="game-card-media">
                    {game.image && !failedImages[game.id] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={game.image}
                          alt=""
                          className="game-card-img"
                          onError={() =>
                            setFailedImages((prev) => ({
                              ...prev,
                              [game.id]: true,
                            }))
                          }
                        />
                        <span className="game-card-shade" aria-hidden="true" />
                      </>
                    ) : (
                      <div className="game-card-placeholder">
                        <span className="game-card-placeholder-plus">+</span>
                        <span className="game-card-placeholder-label">
                          Thumbnail coming soon
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Link key={game.id} href={game.href} className="game-card">
                  <div className="game-card-media">
                    <div className="game-card-art" aria-hidden="true">
                      <span className="game-card-planet" />
                      <span className="game-card-terrain" />
                      <span className="game-card-rover" />
                    </div>
                    {!failedImages[game.id] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={game.image}
                        alt=""
                        className="game-card-img"
                        onError={() =>
                          setFailedImages((prev) => ({
                            ...prev,
                            [game.id]: true,
                          }))
                        }
                      />
                    )}
                    <span className="game-card-shade" aria-hidden="true" />
                    <h2 className="game-card-title game-card-title--overlay">
                      {game.title}
                    </h2>
                  </div>
                </Link>
              )
            )
          )}
        </div>
      </section>

      <div className="home-scroll-content">
        <section className="home-section">
          <p className="home-eyebrow">MISSION BRIEF</p>
          <h2 className="home-section-title">Launch with code. Land with skills.</h2>
          <p className="home-section-lede">
            Rover Adventure turns real programming into a mission across the
            Martian surface. Write commands, watch them play out, and unlock new
            abilities as you go.
          </p>

          <div className="home-features">
            <article className="home-feature">
              <span className="home-feature-index">01</span>
              <h3>Write real code</h3>
              <p>Python, Java, and C++ — the same languages used in the field.</p>
            </article>
            <article className="home-feature">
              <span className="home-feature-index">02</span>
              <h3>Explore the terrain</h3>
              <p>Navigate dunes, radiation zones, and mineral deposits.</p>
            </article>
            <article className="home-feature">
              <span className="home-feature-index">03</span>
              <h3>Earn your stars</h3>
              <p>Complete missions, unlock skills, and build your base.</p>
            </article>
          </div>
        </section>

        <section className="home-cta-band">
          <div>
            <h2 className="home-cta-title">Ready to explore?</h2>
            <p className="home-cta-copy">
              Your rover is fuelled and waiting on the launchpad.
            </p>
          </div>
          <Link href="/rover-adventure" className="home-cta-button">
            Play Rover Adventure <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
