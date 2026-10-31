"use client";

import { LANDMARKS } from "../config/landmarksConfig";

export default function PointerGraphCanvas({ circular = false, doubly = false }: { circular?: boolean; doubly?: boolean }) {
  return (
    <section className="wander-graph">
      <div className="wander-city-header"><span>🔗 POINTER GRAPH</span><small>{doubly ? "DOUBLY LINKED" : circular ? "CIRCULAR ROUTE" : "SINGLY LINKED"}</small></div>
      <div className="wander-nodes">
        {LANDMARKS.map((landmark, index) => (
          <div className="wander-node-wrap" key={landmark.name}>
            {index > 0 && <div className="wander-pointer wander-pointer--next">➜ <small>next</small></div>}
            <article className="wander-node" style={{ ["--landmark-color" as string]: landmark.color }}>
              {doubly && <small className="wander-node-pointer">← prev</small>}
              <strong>{landmark.icon} {landmark.name}</strong>
              <small>data: stop_{index + 1}</small>
              <small className="wander-node-pointer">next →</small>
            </article>
          </div>
        ))}
      </div>
      <div className="wander-null-sign">{circular ? "↻ roundabout" : "🪧 End of road / None"}</div>
    </section>
  );
}
