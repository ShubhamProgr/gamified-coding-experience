"use client";

type Props = {
  index: number;
  length: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: (delta: number) => void;
  onSeek: (index: number) => void;
};

export default function TemplePlaybackControls({
  index,
  length,
  playing,
  onPlay,
  onPause,
  onStep,
  onSeek,
}: Props) {
  if (!length) return null;

  return (
    <div className="temple-playback">
      <button type="button" onClick={() => onStep(-1)} aria-label="Previous event">
        {"\u2039"}
      </button>
      <button
        type="button"
        className="is-primary"
        onClick={playing ? onPause : onPlay}
        aria-label={playing ? "Pause playback" : "Play playback"}
      >
        {playing ? "\u2016" : "\u25b6"}
      </button>
      <button type="button" onClick={() => onStep(1)} aria-label="Next event">
        {"\u203a"}
      </button>
      <input
        type="range"
        min="0"
        max={Math.max(0, length - 1)}
        value={index}
        onChange={(event) => onSeek(Number(event.target.value))}
        aria-label="Timeline position"
      />
      <span className="temple-playback-count">
        {index + 1} / {length}
      </span>
    </div>
  );
}
