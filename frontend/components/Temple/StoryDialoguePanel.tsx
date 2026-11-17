"use client";

import type { TempleLevel } from "./config/levelsConfig";

type Props = {
  level: TempleLevel;
  onStart: () => void;
};

export default function StoryDialoguePanel({ level, onStart }: Props) {
  return (
    <div className="temple-story-overlay" role="dialog" aria-modal="true" aria-label={level.title}>
      <div className="temple-story-panel">
        <div className="temple-story-badges">
          <span className="temple-chapter-badge">
            {level.chapter} / Level {level.id}
          </span>
          <span className="temple-concept-badge">{level.concept}</span>
        </div>
        <h2>{level.title}</h2>
        <p className="temple-story-text">{level.story}</p>
        <div className="temple-task-box">
          <strong>Your task</strong>
          <span>{level.task}</span>
        </div>
        <div className="temple-spire-preview">
          <span>
            <b>{level.disks}</b> {level.disks === 1 ? "disc" : "discs"}
          </span>
          <span>
            <b>{level.pegs}</b> spires
          </span>
          <span>
            <b>{level.id}/12</b> chamber
          </span>
        </div>
        <button type="button" className="temple-story-button" onClick={onStart}>
          Enter the Temple <span>{"\u2192"}</span>
        </button>
      </div>
    </div>
  );
}
