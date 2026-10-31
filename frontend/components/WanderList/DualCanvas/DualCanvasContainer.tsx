"use client";

import CityMapCanvas from "./CityMapCanvas";
import PointerGraphCanvas from "./PointerGraphCanvas";

export default function DualCanvasContainer({
  level,
  activeNode,
  direction,
}: {
  level: number;
  activeNode: number;
  direction: "forward" | "backward";
}) {
  return <div className="wander-dual-canvas">
    <CityMapCanvas activeNode={activeNode} direction={direction} />
    <PointerGraphCanvas circular={level >= 9 && level <= 12} doubly={level >= 13} />
  </div>;
}
