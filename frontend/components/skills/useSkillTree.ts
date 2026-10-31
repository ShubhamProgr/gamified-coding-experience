"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  detectSkills,
  isSkillId,
  MASTERY_TARGET,
  SKILL_MAP,
  SKILL_NODES,
  SkillId,
} from "./skillsConfig";

const STORAGE_KEY = "mars-rover-skills-v1";
const MINERALS_KEY = "mars-rover-skill-minerals-v1";

export type SkillMinerals = Partial<Record<SkillId, number>>;

export function useSkillTree() {
  const [unlocked, setUnlocked] = useState<SkillId[]>([]);
  const [minerals, setMinerals] = useState<SkillMinerals>({});
  const unlockedRef = useRef<SkillId[]>([]);
  const mineralsRef = useRef<SkillMinerals>({});

  useEffect(() => {
    try {
      const rawSkills = localStorage.getItem(STORAGE_KEY);
      if (rawSkills) {
        const parsedSkills: unknown = JSON.parse(rawSkills);
        if (Array.isArray(parsedSkills)) {
          const valid = parsedSkills.filter(isSkillId);
          unlockedRef.current = valid;
          queueMicrotask(() => setUnlocked(valid));
        }
      }

      const rawMinerals = localStorage.getItem(MINERALS_KEY);
      if (rawMinerals) {
        const parsedMinerals: unknown = JSON.parse(rawMinerals);
        if (
          parsedMinerals &&
          typeof parsedMinerals === "object" &&
          !Array.isArray(parsedMinerals)
        ) {
          const valid: SkillMinerals = {};
          for (const [key, value] of Object.entries(
            parsedMinerals as Record<string, unknown>
          )) {
            if (
              isSkillId(key) &&
              typeof value === "number" &&
              Number.isFinite(value)
            ) {
              valid[key] = Math.max(
                0,
                Math.min(MASTERY_TARGET, Math.floor(value))
              );
            }
          }
          mineralsRef.current = valid;
          queueMicrotask(() => setMinerals(valid));
        }
      }
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

  const addMinerals = useCallback((amount: number) => {
    const gained = Math.floor(amount);
    if (!Number.isFinite(gained) || gained <= 0) return;

    const unlockedNow = unlockedRef.current;
    if (unlockedNow.length === 0) return;

    const next = { ...mineralsRef.current };
    let changed = false;

    for (const id of unlockedNow) {
      if (!isSkillId(id)) continue;
      const before = next[id] ?? 0;
      const after = Math.min(MASTERY_TARGET, before + gained);
      if (after !== before) {
        next[id] = after;
        changed = true;
      }
    }

    if (!changed) return;

    mineralsRef.current = next;
    setMinerals(next);
    try {
      localStorage.setItem(MINERALS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures; progress still updates for this session.
    }
  }, []);

  const hydrate = useCallback((savedUnlocked: string[] = [], savedMinerals: SkillMinerals = {}) => {
    const nextUnlocked = savedUnlocked.filter(isSkillId);
    const nextMinerals: SkillMinerals = {};
    for (const [key, value] of Object.entries(savedMinerals)) {
      if (isSkillId(key) && Number.isFinite(value)) {
        nextMinerals[key] = Math.max(0, Math.min(MASTERY_TARGET, Math.floor(value)));
      }
    }
    unlockedRef.current = nextUnlocked;
    mineralsRef.current = nextMinerals;
    setUnlocked(nextUnlocked);
    setMinerals(nextMinerals);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUnlocked));
      localStorage.setItem(MINERALS_KEY, JSON.stringify(nextMinerals));
    } catch {
      // Keep hydrated state in memory when storage is unavailable.
    }
  }, []);

  return { unlocked, minerals, unlockFromCode, addMinerals, hydrate };
}
