"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectSkills,
  isSkillId,
  SKILL_MAP,
  SKILL_NODES,
  SkillId,
} from "./skillsConfig";

const STORAGE_KEY = "mars-rover-skills-v1";

export function useSkillTree() {
  const [unlocked, setUnlocked] = useState<SkillId[]>([]);
  const unlockedRef = useRef<SkillId[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(isSkillId);
      unlockedRef.current = valid;
      queueMicrotask(() => setUnlocked(valid));
    } catch {
      // Ignore corrupt or unavailable storage.
    }
  }, []);

  const unlockFromCode = useCallback((code: string): SkillId[] => {
    const matched = new Set(detectSkills(code));
    if (matched.size === 0) return [];

    const next = [...unlockedRef.current];
    const fresh: SkillId[] = [];

    // Unlock repeatedly so a single run can also open a child whose
    // parent skill was unlocked by the same run.
    let changed = true;
    while (changed) {
      changed = false;
      for (const node of SKILL_NODES) {
        if (node.kind !== "skill") continue;
        if (next.includes(node.id) || !matched.has(node.id)) continue;

        const parentNode = node.parent ? SKILL_MAP[node.parent] : null;
        const parentReady =
          !parentNode ||
          parentNode.kind !== "skill" ||
          next.includes(parentNode.id);

        if (parentReady) {
          next.push(node.id);
          fresh.push(node.id);
          changed = true;
        }
      }
    }

    if (fresh.length === 0) return [];

    unlockedRef.current = next;
    setUnlocked(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures; skills still unlock for this session.
    }
    return fresh;
  }, []);

  return { unlocked, unlockFromCode };
}
