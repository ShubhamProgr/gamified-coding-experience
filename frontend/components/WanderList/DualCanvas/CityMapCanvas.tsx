"use client";

import { LANDMARKS } from "../config/landmarksConfig";
import TravelerAvatar from "./TravelerAvatar";

export default function CityMapCanvas({
  activeNode = 0,
  direction = "forward",
}: {
  activeNode?: number;
  direction?: "forward" | "backward";
}) {
  return (
    <section className="wander-city">
      <div className="wander-city__sun" aria-hidden="true">☀</div>
      <div className="wander-cloud wander-cloud--one">☁️</div>
      <div className="wander-cloud wander-cloud--two">☁️</div>
      <div className="wander-city-header"><span>☀️ CITY MAP</span><small>DAYLIGHT DISTRICT · 24°C</small></div>
      <div className="wander-city__horizon" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </div>
      <div className="wander-road wander-road--horizontal" />
      <div className="wander-road wander-road--vertical" />
      <div className="wander-road wander-road--diagonal" />
      <div className="wander-route" aria-label="Itinerary route">
        {LANDMARKS.map((landmark, index) => (
          <div className={`wander-landmark ${index === activeNode ? "is-active" : ""}`} key={landmark.name} style={{ ["--landmark-color" as string]: landmark.color }}>
            <div className="wander-landmark-building">
              <span className="wander-landmark-roof" />
              <div className="wander-landmark-icon">{landmark.icon}</div>
              <span className="wander-landmark-door" />
            </div>
            <span>{landmark.name}</span>
          </div>
        ))}
        <TravelerAvatar direction={direction} position={activeNode} />
      </div>
      <div className="wander-city-footer">✿ A cheerful route is waiting for your pointers ✿</div>
    </section>
  );
}
