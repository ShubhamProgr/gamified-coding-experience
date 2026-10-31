"use client";

import { useEffect, useState } from "react";

const STEPS = [
  ["Welcome to Mars", "Welcome to Mars Adventure, Commander. Program an autonomous rover deployed in the Chryse Planitia basin and solve real robotic exploration challenges in Python, Java, or C++."],
  ["Mission objectives", "Each round asks you to secure vital minerals. Watch the quota in Mission Control, and finish efficiently with high remaining power to earn three-star ratings."],
  ["Power and charging", "Driving, scanning, and drilling consume battery. Later rounds unlock Solar Charging Stations; move within range and execute rover.charge() to restore power."],
  ["Command IDE", "Write rover.drive(), rover.drill(), rover.scan(), and rover.charge() commands in the IDE. Press Run or Ctrl + Enter to send your program to Mission Control."],
  ["Tactical surface", "Explore the isometric terrain, avoid radiation zones, find buried ore, and place infrastructure. Your mission progress is continuously saved."],
] as const;

interface GameTourModalProps {
  onComplete: () => void;
}

export default function GameTourModal({ onComplete }: GameTourModalProps) {
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onComplete();
      if (event.key === "ArrowRight") setStep((current) => Math.min(STEPS.length - 1, current + 1));
      if (event.key === "ArrowLeft") setStep((current) => Math.max(0, current - 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onComplete]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="mission-tour-title" style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", background: "rgba(0,0,0,.72)", padding: 20 }}>
      <section className="glass-panel glass-panel--glow animate-modal-in" style={{ width: "min(560px, 100%)", padding: 28, borderColor: "var(--glow-cyan)" }}>
        <div style={{ color: "var(--glow-cyan)", fontFamily: "var(--font-code)", fontSize: 11, letterSpacing: ".12em" }}>MISSION BRIEFING {step + 1}/{STEPS.length}</div>
        <h2 id="mission-tour-title" style={{ margin: "12px 0", color: "var(--text-primary)", fontSize: 24 }}>{STEPS[step][0]}</h2>
        <p style={{ minHeight: 90, color: "var(--text-secondary)", lineHeight: 1.7 }}>{STEPS[step][1]}</p>
        <div style={{ display: "flex", gap: 6, margin: "18px 0" }}>
          {STEPS.map((_, index) => <span key={index} aria-label={`Step ${index + 1}`} style={{ width: 8, height: 8, borderRadius: "50%", background: index === step ? "var(--glow-cyan)" : "var(--space-border-glow)" }} />)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button type="button" className="btn btn--ghost" onClick={onComplete}>Skip</button>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>← Back</button>
            <button type="button" className="btn btn--primary" onClick={last ? onComplete : () => setStep((current) => current + 1)}>{last ? "Launch Mission" : "Next →"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
