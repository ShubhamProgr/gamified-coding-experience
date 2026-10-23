"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  MASTERY_TARGET,
  SKILL_MAP,
  SKILL_NODES,
  SkillId,
  SkillNode,
  UNLOCKABLE_SKILLS,
} from "./skillsConfig";
import SkillLessonModal from "./SkillLessonModal";

const CANVAS_WIDTH = 1210;
const CANVAS_HEIGHT = 870;

const NODE_SIZES: Record<SkillNode["kind"], { w: number; h: number }> = {
  root: { w: 180, h: 76 },
  branch: { w: 170, h: 64 },
  skill: { w: 190, h: 76 },
};

function rightCenter(node: SkillNode) {
  const { w, h } = NODE_SIZES[node.kind];
  return { x: node.x + w, y: node.y + h / 2 };
}

function leftCenter(node: SkillNode) {
  const { h } = NODE_SIZES[node.kind];
  return { x: node.x, y: node.y + h / 2 };
}

function isDescendantOf(childId: SkillId, ancestorId: SkillId): boolean {
  let current = SKILL_MAP[childId]?.parent ?? null;
  while (current) {
    if (current === ancestorId) return true;
    current = SKILL_MAP[current]?.parent ?? null;
  }
  return false;
}

interface SkillTreeProps {
  unlockedIds: SkillId[];
  skillMinerals: Partial<Record<SkillId, number>>;
  language: string;
}

export default function SkillTree({
  unlockedIds,
  skillMinerals,
  language,
}: SkillTreeProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<SkillId | null>(null);

  useEffect(() => {
    if (!open || selectedId) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, selectedId]);

  const unlockedCount = UNLOCKABLE_SKILLS.filter((s) =>
    unlockedIds.includes(s.id)
  ).length;

  const isNodeActive = (node: SkillNode): boolean => {
    if (node.kind === "root") return true;
    if (node.kind === "branch") {
      return unlockedIds.some((id) => isDescendantOf(id, node.id));
    }
    return unlockedIds.includes(node.id);
  };

  const closeTree = () => {
    setOpen(false);
    setSelectedId(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSelectedId(null);
          setOpen(true);
        }}
        title="Open Skill Tree"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          borderRadius: "var(--radius-md)",
          background: "rgba(0,212,255,0.06)",
          border: "1px solid rgba(0,212,255,0.18)",
          color: "var(--glow-cyan)",
          fontFamily: "var(--font-ui)",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <span style={{ fontSize: 12 }}>🌿</span>
        <span>Skills</span>
        <span
          style={{
            fontFamily: "var(--font-code)",
            fontSize: 10,
            color: "var(--text-muted)",
          }}
        >
          {unlockedCount}/{UNLOCKABLE_SKILLS.length}
        </span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Skill tree"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeTree();
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2000,
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
                width: "min(1240px, 96vw)",
                height: "min(900px, 92vh)",
                overflow: "hidden",
                background: "var(--space-mid)",
                border: "1px solid var(--space-border-glow)",
                borderRadius: "var(--radius-lg)",
                boxShadow:
                  "0 24px 80px rgba(0,0,0,0.7), 0 0 40px rgba(0,212,255,0.08)",
              }}
            >
              {/* Window header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "0 16px",
                  height: 56,
                  flexShrink: 0,
                  borderBottom: "1px solid var(--space-border)",
                  background: "#0d121b",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <button
                    type="button"
                    onClick={closeTree}
                    aria-label="Close skill tree"
                    title="Close"
                    className="window-btn window-btn--red"
                    style={{ width: 10, height: 10, padding: 0 }}
                  />
                  <span className="window-btn window-btn--yellow" style={{ width: 10, height: 10 }} />
                  <span className="window-btn window-btn--green" style={{ width: 10, height: 10 }} />
                </span>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Skill Tree
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    Unlock skills by running code. Click any node for a lesson.
                  </div>
                </div>

                <div style={{ flex: 1 }} />

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    width: 150,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      fontFamily: "var(--font-code)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <span>Progress</span>
                    <span style={{ color: "var(--glow-green)" }}>
                      {unlockedCount}/{UNLOCKABLE_SKILLS.length}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: "var(--space-border)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(unlockedCount / UNLOCKABLE_SKILLS.length) * 100}%`,
                        background: "var(--glow-green)",
                        borderRadius: 2,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tree canvas */}
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  background:
                    "radial-gradient(circle at 18% 42%, rgba(0,212,255,0.06), transparent 42%), radial-gradient(circle at 80% 55%, rgba(0,255,136,0.04), transparent 40%), var(--space-bg)",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    margin: "0 auto",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                  >
                    {SKILL_NODES.filter((node) => node.parent).map((node) => {
                      const parent = SKILL_MAP[node.parent as SkillId];
                      const from = rightCenter(parent);
                      const to = leftCenter(node);
                      const midX = (from.x + to.x) / 2;
                      const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;
                      const active = isNodeActive(node);

                      return (
                        <g key={`edge-${node.id}`}>
                          {active && (
                            <path
                              d={d}
                              fill="none"
                              stroke="rgba(0,255,136,0.14)"
                              strokeWidth={7}
                              strokeLinecap="round"
                            />
                          )}
                          <path
                            d={d}
                            fill="none"
                            stroke={
                              active
                                ? "rgba(0,255,136,0.55)"
                                : "rgba(120,150,180,0.18)"
                            }
                            strokeWidth={1.5}
                            strokeLinecap="round"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {SKILL_NODES.map((node) => {
                    const { w, h } = NODE_SIZES[node.kind];
                    const active = isNodeActive(node);
                    const unlocked =
                      node.kind === "skill" && unlockedIds.includes(node.id);

                    const isRoot = node.kind === "root";
                    const isBranch = node.kind === "branch";

                    const background = isRoot
                      ? "linear-gradient(135deg, rgba(232,99,26,0.22), rgba(193,68,14,0.1))"
                      : unlocked
                        ? "rgba(0,255,136,0.08)"
                        : active
                          ? "rgba(0,212,255,0.07)"
                          : "var(--space-surface)";

                    const borderColor = isRoot
                      ? "rgba(232,99,26,0.55)"
                      : unlocked
                        ? "rgba(0,255,136,0.4)"
                        : active
                          ? "rgba(0,212,255,0.32)"
                          : "var(--space-border)";

                    const shadow = unlocked
                      ? "0 0 18px rgba(0,255,136,0.1)"
                      : isRoot
                        ? "0 0 18px rgba(232,99,26,0.15)"
                        : "none";

                    const selected = selectedId === node.id;
                    const progress = node.kind === "skill"
                      ? skillMinerals[node.id] ?? 0
                      : 0;
                    const mastered =
                      node.kind === "skill" && progress >= MASTERY_TARGET;

                    return (
                      <button
                        key={node.id}
                        type="button"
                        title={node.hint}
                        onClick={() => setSelectedId(node.id)}
                        style={{
                          position: "absolute",
                          left: node.x,
                          top: node.y,
                          width: w,
                          height: h,
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "10px 12px",
                          textAlign: "left",
                          fontFamily: "inherit",
                          cursor: "pointer",
                          borderRadius: "var(--radius-md)",
                          background,
                          border: `1px solid ${
                            selected ? "var(--glow-cyan)" : borderColor
                          }`,
                          boxShadow: selected
                            ? "0 0 0 1px rgba(0,212,255,0.45), 0 0 18px rgba(0,212,255,0.16)"
                            : shadow,
                          opacity: node.kind === "skill" && !unlocked ? 0.62 : 1,
                          transition: "border-color 0.2s, box-shadow 0.2s",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 32,
                            height: 32,
                            flexShrink: 0,
                            borderRadius: "50%",
                            background: isRoot
                              ? "rgba(232,99,26,0.2)"
                              : unlocked
                                ? "rgba(0,255,136,0.12)"
                                : "rgba(255,255,255,0.05)",
                            fontSize: 15,
                            filter:
                              node.kind === "skill" && !unlocked
                                ? "grayscale(1)"
                                : "none",
                          }}
                        >
                          {node.icon}
                        </span>

                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: isBranch ? 11 : 12,
                              fontWeight: 700,
                              letterSpacing: isBranch ? "0.06em" : 0,
                              textTransform: isBranch ? "uppercase" : "none",
                              color: isRoot
                                ? "var(--mars-orange)"
                                : unlocked
                                  ? "var(--text-primary)"
                                  : "var(--text-secondary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {node.name}
                          </div>
                          <div
                            style={{
                              fontSize: 9.5,
                              color: mastered
                                ? "var(--glow-green)"
                                : unlocked
                                  ? "var(--text-secondary)"
                                  : "var(--text-muted)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {isRoot
                              ? "Core online"
                              : isBranch
                                ? active
                                  ? "Branch active"
                                  : "Branch"
                                : unlocked
                                  ? mastered
                                    ? "Mastered ✓"
                                    : `${progress}/${MASTERY_TARGET} minerals`
                                  : node.hint}
                          </div>
                        </div>

                        {node.kind === "skill" && (
                          <span
                            style={{
                              flexShrink: 0,
                              fontSize: 12,
                              color: unlocked
                                ? "var(--glow-green)"
                                : "var(--text-muted)",
                            }}
                          >
                            {unlocked ? "✓" : "🔒"}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>,
          document.body
        )}

      {selectedId && (
        <SkillLessonModal
          skillId={selectedId}
          unlockedIds={unlockedIds}
          minerals={skillMinerals}
          language={language}
          onClose={() => setSelectedId(null)}
        />
      )}
    </>
  );
}
