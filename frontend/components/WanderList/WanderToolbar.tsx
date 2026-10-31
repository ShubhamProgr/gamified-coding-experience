"use client";

type Props = {
  level: number;
  title: string;
  stars: number;
  onLevelSelect: () => void;
  onReset: () => void;
  onRun: () => void;
  busy: boolean;
};

export default function WanderToolbar({ level, title, stars, onLevelSelect, onReset, onRun, busy }: Props) {
  return (
    <header className="wander-toolbar">
      <div className="wander-brand"><span>🧭</span><div><strong>WanderList</strong><small>THE LINKED JOURNEY</small></div></div>
      <button className="wander-level-button" type="button" onClick={onLevelSelect}>LEVEL {level} · {title} <span>⌄</span></button>
      <div className="wander-toolbar-actions">
        <span className="wander-stars" aria-label={`${stars} stars`}>{"★".repeat(stars)}<span>{"★".repeat(3 - stars)}</span></span>
        <button type="button" className="wander-button wander-button--ghost" onClick={onReset}>Reset</button>
        <button type="button" className="wander-button wander-button--run" onClick={onRun} disabled={busy}>{busy ? "Running…" : "▶ Run code"}</button>
      </div>
    </header>
  );
}
