"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Placement = "center" | "bottom" | "right" | "top";

interface TourStep {
  title: string;
  badge: string;
  description: string;
  targetSelector: string | null;
  preferredPlacement: Placement;
  padding?: number;
}

interface FocusRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to Mars",
    badge: "MISSION BRIEFING 1/5",
    description: "Welcome to Mars Adventure, Commander. Program an autonomous rover deployed in the Chryse Planitia basin and solve real robotic exploration challenges in Python, Java, or C++.",
    targetSelector: null,
    preferredPlacement: "center",
  },
  {
    title: "Mission Objectives",
    badge: "MISSION OBJECTIVES 2/5",
    description: "Each round asks you to secure vital minerals. Watch the quota in Mission Control, and finish efficiently with high remaining power to earn three-star ratings.",
    targetSelector: '[data-tour="mission-objectives"]',
    preferredPlacement: "bottom",
    padding: 8,
  },
  {
    title: "Power and Charging",
    badge: "LIFE SUPPORT 3/5",
    description: "Driving, scanning, and drilling consume battery. Later rounds unlock Solar Charging Stations; move within range and execute rover.charge() to restore power.",
    targetSelector: '[data-tour="power-charging"]',
    preferredPlacement: "bottom",
    padding: 8,
  },
  {
    title: "Command IDE",
    badge: "ROVER PROGRAMMING 4/5",
    description: "Write rover.drive(), rover.drill(), rover.scan(), and rover.charge() commands in the IDE. Press Run or Ctrl + Enter to send your program to Mission Control.",
    targetSelector: '[data-tour="command-ide"]',
    preferredPlacement: "right",
    padding: 6,
  },
  {
    title: "Tactical Surface",
    badge: "SURFACE OPERATIONS 5/5",
    description: "Explore the isometric terrain, avoid radiation zones, find buried ore, and place infrastructure. Your mission progress is continuously saved.",
    targetSelector: '[data-tour="tactical-surface"]',
    preferredPlacement: "center",
    padding: 0,
  },
];

interface GameTourModalProps {
  onComplete: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export default function GameTourModal({ onComplete }: GameTourModalProps) {
  const [step, setStep] = useState(0);
  const [focusRect, setFocusRect] = useState<FocusRect | null>(null);
  const [cardPosition, setCardPosition] = useState({ top: 0, left: 0, transform: "translate(-50%, -50%)" });
  const cardRef = useRef<HTMLElement>(null);
  const last = step === TOUR_STEPS.length - 1;
  const currentStep = TOUR_STEPS[step];

  const measure = useCallback(() => {
    const target = currentStep.targetSelector ? document.querySelector<HTMLElement>(currentStep.targetSelector) : null;
    const padding = currentStep.padding ?? 0;
    const nextRect = target
      ? (() => {
          const rect = target.getBoundingClientRect();
          return {
            x: rect.left - padding,
            y: rect.top - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          };
        })()
      : null;
    setFocusRect(nextRect);

    const card = cardRef.current;
    if (!card || currentStep.preferredPlacement === "center" || !nextRect) {
      setCardPosition({ top: window.innerHeight / 2, left: window.innerWidth / 2, transform: "translate(-50%, -50%)" });
      return;
    }

    const gap = 16;
    const cardWidth = card.offsetWidth;
    const cardHeight = card.offsetHeight;
    let top = nextRect.y + nextRect.height + gap;
    let left = nextRect.x + nextRect.width / 2 - cardWidth / 2;
    const transform = "none";

    if (currentStep.preferredPlacement === "right") {
      top = nextRect.y + nextRect.height / 2 - cardHeight / 2;
      left = nextRect.x + nextRect.width + gap;
    } else if (currentStep.preferredPlacement === "top") {
      top = nextRect.y - cardHeight - gap;
    }

    setCardPosition({
      top: clamp(top, 16, window.innerHeight - cardHeight - 16),
      left: clamp(left, 16, window.innerWidth - cardWidth - 16),
      transform,
    });
  }, [currentStep]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(measure);
    const target = currentStep.targetSelector ? document.querySelector<HTMLElement>(currentStep.targetSelector) : null;
    const observer = target ? new ResizeObserver(measure) : null;
    if (observer && target) observer.observe(target);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [currentStep, measure]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onComplete();
      if (event.key === "ArrowRight") setStep((current) => Math.min(TOUR_STEPS.length - 1, current + 1));
      if (event.key === "ArrowLeft") setStep((current) => Math.max(0, current - 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onComplete]);

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-labelledby="mission-tour-title">
      <svg className="tour-overlay__mask" aria-hidden="true">
        <defs>
          <mask id="tour-spotlight-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
            <rect width="100%" height="100%" fill="white" />
            {focusRect && (
              <rect
                x={focusRect.x}
                y={focusRect.y}
                width={focusRect.width}
                height={focusRect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect className="tour-overlay__backdrop" width="100%" height="100%" mask="url(#tour-spotlight-mask)" />
      </svg>

      {focusRect && (
        <div
          className="tour-focus-frame"
          aria-hidden="true"
          style={{
            left: focusRect.x,
            top: focusRect.y,
            width: focusRect.width,
            height: focusRect.height,
          }}
        />
      )}

      <section
        ref={cardRef}
        className="glass-panel glass-panel--glow tour-card"
        style={{ top: cardPosition.top, left: cardPosition.left, transform: cardPosition.transform }}
      >
        <div className="tour-card__badge">{currentStep.badge}</div>
        <h2 id="mission-tour-title">{currentStep.title}</h2>
        <p>{currentStep.description}</p>
        <div className="tour-card__progress" aria-label={`Step ${step + 1} of ${TOUR_STEPS.length}`}>
          {TOUR_STEPS.map((tourStep, index) => (
            <span key={tourStep.title} className={index === step ? "is-active" : ""} />
          ))}
        </div>
        <div className="tour-card__actions">
          <button type="button" className="btn btn--ghost" onClick={onComplete}>Skip</button>
          <div>
            <button type="button" className="btn btn--ghost" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>← Back</button>
            <button type="button" className="btn btn--primary" onClick={last ? onComplete : () => setStep((current) => current + 1)}>{last ? "Launch Mission" : "Next →"}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
