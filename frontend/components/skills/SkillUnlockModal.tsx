"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { getRecommendedNextSkill, SKILL_MAP, SkillId } from "./skillsConfig";
import { LessonLanguage, SKILL_LESSONS } from "./skillLessons";

interface SkillUnlockModalProps {
  skills: SkillId[];
  unlockedIds: SkillId[];
  language: LessonLanguage;
  onClose: () => void;
}

export default function SkillUnlockModal({
  skills,
  unlockedIds,
  language,
  onClose,
}: SkillUnlockModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (skills.length === 0) return null;
  if (typeof document === "undefined") return null;

  const allUnlocked = Array.from(new Set([...unlockedIds, ...skills]));
  const nextSkill = getRecommendedNextSkill(skills, allUnlocked);
  const title = skills.length > 1 ? "Skills Unlocked" : "Skill Unlocked";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(3, 6, 12, 0.72)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "min(580px, 94vw)",
          maxHeight: "88vh",
          overflow: "hidden",
          background: "var(--space-mid)",
          border: "1px solid rgba(0,255,136,0.3)",
          borderRadius: "var(--radius-lg)",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,255,136,0.08)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 18px",
            flexShrink: 0,
            borderBottom: "1px solid var(--space-border)",
            background: "#0d121b",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "rgba(0,255,136,0.12)",
              border: "1px solid rgba(0,255,136,0.3)",
              fontSize: 18,
            }}
          >
            🧠
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--glow-green)",
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              New ability online. Here is how to use it.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close lesson"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              border: "1px solid var(--space-border)",
              borderRadius: "var(--radius-sm)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 18,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Lessons */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {skills.map((id) => {
            const node = SKILL_MAP[id];
            const lesson = SKILL_LESSONS[id];
            return (
              <section
                key={id}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--space-surface)",
                  border: "1px solid var(--space-border)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{node.icon}</span>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {node.name}
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--glow-green)",
                      border: "1px solid rgba(0,255,136,0.3)",
                      borderRadius: 10,
                      padding: "2px 7px",
                    }}
                  >
                    New
                  </span>
                </div>

                {lesson && (
                  <>
                    <p
                      style={{
                        margin: "8px 0 0",
                        fontSize: 11.5,
                        lineHeight: 1.55,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {lesson.summary}
                    </p>
                    <pre
                      style={{
                        margin: "10px 0 0",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "#000000",
                        border: "1px solid var(--space-border)",
                        color: "var(--text-code)",
                        fontFamily: "var(--font-code)",
                        fontSize: 11,
                        lineHeight: 1.6,
                        whiteSpace: "pre",
                        overflowX: "auto",
                      }}
                    >
                      {lesson.examples[language]}
                    </pre>
                  </>
                )}
              </section>
            );
          })}

          {nextSkill && (
            <section
              style={{
                padding: "12px 14px",
                borderRadius: "var(--radius-md)",
                background: "rgba(0,212,255,0.05)",
                border: "1px dashed rgba(0,212,255,0.35)",
              }}
            >
              <div
                style={{
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--glow-cyan)",
                  marginBottom: 8,
                }}
              >
                Next objective
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{nextSkill.icon}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                    }}
                  >
                    {nextSkill.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {nextSkill.hint}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🔒</span>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
            flexShrink: 0,
            borderTop: "1px solid var(--space-border)",
            background: "#0d121b",
          }}
        >
          <span style={{ flex: 1, fontSize: 10, color: "var(--text-muted)" }}>
            Open 🌿 Skills in the navbar to view the full tree.
          </span>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
