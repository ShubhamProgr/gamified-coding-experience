"use client";

type Props = {
  level: number;
  title: string;
  chapter: string;
  concept: string;
  task: string;
  stars: number;
  busy: boolean;
  onOpenLevels: () => void;
  onShowStory: () => void;
  onReset: () => void;
  onRun: () => void;
};

export default function TempleToolbar({
  level,
  title,
  chapter,
  concept,
  task,
  stars,
  busy,
  onOpenLevels,
  onShowStory,
  onReset,
  onRun,
}: Props) {
  return (
    <header className="temple-topbar">
      <button
        type="button"
        className="temple-rail-toggle"
        onClick={onOpenLevels}
        aria-label="Open level list"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="temple-topbar-heading">
        <div className="temple-kicker">
          <span>{chapter}</span>
          <i />
          <span>Level {level}</span>
          <em className="temple-concept-pill">{concept}</em>
        </div>
        <h1>{title}</h1>
        <p>{task}</p>
      </div>

      <div className="temple-topbar-actions">
        <span className="temple-stars" aria-label={`${stars} of 3 stars`}>
          {"\u2605".repeat(stars)}
          <span>{"\u2605".repeat(3 - stars)}</span>
        </span>
        <button type="button" className="temple-button temple-button--ghost" onClick={onShowStory}>
          Story
        </button>
        <button type="button" className="temple-button temple-button--ghost" onClick={onReset}>
          Reset
        </button>
        <button
          type="button"
          className="temple-button temple-button--run"
          onClick={onRun}
          disabled={busy}
        >
          {busy ? "Running" : "Run code"}
          <span className="temple-run-hint">{"\u2318\u21b5"}</span>
        </button>
      </div>
    </header>
  );
}
