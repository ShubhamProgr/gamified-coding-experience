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

export default function PlaybackControls({ index, length, playing, onPlay, onPause, onStep, onSeek }: Props) {
  if (!length) return null;
  return <div className="wander-playback">
    <button type="button" onClick={() => onStep(-1)} aria-label="Previous event">‹</button>
    <button type="button" onClick={playing ? onPause : onPlay} aria-label={playing ? "Pause playback" : "Play playback"}>{playing ? "Ⅱ" : "▶"}</button>
    <button type="button" onClick={() => onStep(1)} aria-label="Next event">›</button>
    <input type="range" min="0" max={Math.max(0, length - 1)} value={index} onChange={(event) => onSeek(Number(event.target.value))} aria-label="Timeline position" />
    <small>{index + 1}/{length}</small>
  </div>;
}
