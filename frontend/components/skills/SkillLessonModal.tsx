"use client";

import { useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  getRecommendedNextSkill,
  MASTERY_TARGET,
  SKILL_MAP,
  SkillId,
  SkillNode,
} from "./skillsConfig";
import { SKILL_LESSONS, type LessonLanguage } from "./skillLessons";
import SkillVisualizer from "./SkillVisualizer";

interface SkillLessonModalProps {
  skillId: SkillId;
  unlockedIds: SkillId[];
  minerals: Partial<Record<SkillId, number>>;
  language: string;
  onClose: () => void;
}

export default function SkillLessonModal({
  skillId,
  unlockedIds,
  minerals,
  language,
  onClose,
}: SkillLessonModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const node = SKILL_MAP[skillId];
  const lesson = SKILL_LESSONS[skillId];
  const lessonLanguage: LessonLanguage =
    language === "java" || language === "cpp" ? language : "python";

  const isSkill = node.kind === "skill";
  const isUnlocked = unlockedIds.includes(skillId);
  const parentNode = node.parent ? SKILL_MAP[node.parent] : null;
  const parentLocked =
    !!parentNode &&
    parentNode.kind === "skill" &&
    !unlockedIds.includes(parentNode.id);

  const collected = Math.min(MASTERY_TARGET, minerals[skillId] ?? 0);
  const mastered = collected >= MASTERY_TARGET;
  const nextSkill = isSkill
    ? getRecommendedNextSkill([skillId], unlockedIds)
    : null;

  const path: SkillNode[] = [];
  let cursor: SkillNode | null = node;
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parent ? SKILL_MAP[cursor.parent] : null;
  }

  const statusLabel =
    node.kind === "root"
      ? "Core"
      : node.kind === "branch"
        ? "Branch"
        : isUnlocked
          ? "Unlocked"
          : "Locked";

  const statusColor =
    node.kind === "skill" && !isUnlocked
      ? "var(--text-muted)"
      : node.kind === "root"
        ? "var(--mars-orange)"
        : "var(--glow-green)";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${node.name} lesson`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2200,
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
          width: "min(880px, 95vw)",
          maxHeight: "90vh",
          overflow: "hidden",
          background: "var(--space-mid)",
          border: "1px solid var(--space-border-glow)",
          borderRadius: "var(--radius-lg)",
          boxShadow:
            "0 24px 80px rgba(0,0,0,0.75), 0 0 40px rgba(0,212,255,0.08)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 18px",
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
              width: 40,
              height: 40,
              flexShrink: 0,
              borderRadius: "50%",
              background: isUnlocked
                ? "rgba(0,255,136,0.12)"
                : "rgba(255,255,255,0.05)",
              border: `1px solid ${
                isUnlocked ? "rgba(0,255,136,0.3)" : "var(--space-border)"
              }`,
              fontSize: 19,
              filter: isSkill && !isUnlocked ? "grayscale(1)" : "none",
            }}
          >
            {node.icon}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                }}
              >
                {node.name}
              </span>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 10,
                  border: "1px solid",
                  color: statusColor,
                  borderColor: isUnlocked
                    ? "rgba(0,255,136,0.35)"
                    : "var(--space-border)",
                }}
              >
                {statusLabel}
              </span>
            </div>
            <div
              style={{
                marginTop: 2,
                fontSize: 10,
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {path.map((n) => n.name).join(" › ")}
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

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            <div style={{ flex: "1 1 320px", minWidth: 0 }}>
              <SectionLabel>What it teaches</SectionLabel>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                }}
              >
                {lesson?.summary ?? node.hint}
              </p>

              {isSkill && !isUnlocked && (
                <div style={{ marginTop: 12 }}>
                  <SectionLabel>How to unlock</SectionLabel>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: "var(--text-primary)",
                    }}
                  >
                    {node.hint}
                    {parentLocked && parentNode && (
                      <span style={{ color: "var(--text-secondary)" }}>
                        {" "}
                        First unlock{" "}
                        <strong style={{ color: "var(--glow-cyan)" }}>
                          {parentNode.name}
                        </strong>
                        .
                      </span>
                    )}
                  </p>
                </div>
              )}

              {lesson && (
                <div style={{ marginTop: 12 }}>
                  <SectionLabel>Syntax</SectionLabel>
                  <pre style={codeStyle}>
                    {lesson.examples[lessonLanguage]}
                  </pre>
                </div>
              )}
            </div>

            {isSkill && (
              <div
                style={{
                  flex: "1 1 280px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 10px 10px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid var(--space-border)",
                }}
              >
                <SectionLabel>Live preview</SectionLabel>
                <SkillVisualizer key={skillId} skillId={skillId} />
              </div>
            )}
          </div>

          {isSkill && (
            <>
              {/* Field training metric */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: mastered
                    ? "rgba(0,255,136,0.07)"
                    : "rgba(0,212,255,0.05)",
                  border: `1px solid ${
                    mastered
                      ? "rgba(0,255,136,0.3)"
                      : "rgba(0,212,255,0.25)"
                  }`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <SectionLabel>Field training</SectionLabel>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-code)",
                      color: mastered ? "var(--glow-green)" : "var(--text-secondary)",
                    }}
                  >
                    {collected} / {MASTERY_TARGET} minerals
                  </span>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  {mastered
                    ? "Skill mastered — next objective is ready."
                    : isUnlocked
                      ? `Collect ${MASTERY_TARGET - collected} more minerals to master this skill.`
                      : "Unlock this skill first to begin field training."}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    height: 7,
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(collected / MASTERY_TARGET) * 100}%`,
                      height: "100%",
                      borderRadius: 4,
                      background: mastered
                        ? "var(--glow-green)"
                        : "var(--glow-cyan)",
                      transition: "width 0.4s ease",
                      boxShadow: mastered
                        ? "0 0 10px rgba(0,255,136,0.5)"
                        : "0 0 10px rgba(0,212,255,0.4)",
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    lineHeight: 1.5,
                    color: "var(--text-muted)",
                  }}
                >
                  Drill minerals during successful runs. Progress counts toward
                  every unlocked skill, so keep exploring.
                </div>
              </div>

              {/* Next objective */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(0,212,255,0.04)",
                  border: "1px dashed rgba(0,212,255,0.3)",
                }}
              >
                <SectionLabel>
                  {mastered ? "Next skill" : "Next after mastery"}
                </SectionLabel>
                {nextSkill ? (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{nextSkill.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
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
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      🔒
                    </span>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 12,
                      color: "var(--glow-green)",
                    }}
                  >
                    All skills unlocked. You have mastered the skill tree.
                  </div>
                )}
              </div>
            </>
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
            Earn minerals by drilling during successful runs.
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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
      }}
    >
      {children}
    </div>
  );
}

const codeStyle: CSSProperties = {
  margin: "8px 0 0",
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
};
