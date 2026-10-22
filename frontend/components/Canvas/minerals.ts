"use client";

// ── Mineral Types & Metadata ───────────────────────────────────────────────

export type MineralType = "cuprion" | "pythorium" | "javium";

export interface MineralMeta {
  name: string;
  shortName: string;
  symbol: string;
  icon: string;
  color: string;
  glowColor: string;
  bgRgba: string;
  borderRgba: string;
  rarity: "Common" | "Uncommon" | "Rare" | "Exotic";
  description: string;
  baseYield: number;
}

export const MINERAL_METAS: Record<MineralType, MineralMeta> = {
  cuprion: {
    name: "Cuprion",
    shortName: "Cuprion",
    symbol: "Cu",
    icon: "🪙",
    color: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.8)",
    bgRgba: "rgba(249, 115, 22, 0.12)",
    borderRgba: "rgba(249, 115, 22, 0.4)",
    rarity: "Common",
    description: "Conductive copper-rich ore used in rover circuitry",
    baseYield: 35,
  },
  pythorium: {
    name: "Pythorium",
    shortName: "Pythorium",
    symbol: "Py",
    icon: "🐍",
    color: "#00ffaa",
    glowColor: "rgba(0, 255, 170, 0.8)",
    bgRgba: "rgba(0, 255, 170, 0.12)",
    borderRgba: "rgba(0, 255, 170, 0.4)",
    rarity: "Uncommon",
    description: "Adaptive green crystal that powers autonomous routines",
    baseYield: 30,
  },
  javium: {
    name: "Javium",
    shortName: "Javium",
    symbol: "Jv",
    icon: "☕",
    color: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.8)",
    bgRgba: "rgba(56, 189, 248, 0.12)",
    borderRgba: "rgba(56, 189, 248, 0.4)",
    rarity: "Rare",
    description: "Dense blue alloy with exceptional thermal stability",
    baseYield: 25,
  },
};

export interface MineralDeposit {
  id: string;
  col: number;
  row: number;
  type: MineralType;
  totalAmount: number;
  remainingAmount: number;
  maxYieldPerDrill: number;
  depleted: boolean;
}

export function getDepositKey(col: number, row: number): string {
  return `${col},${row}`;
}

// Fixed deposits across the starting sector.
// Start position is the central Base Station.
// Each tile holds one of the three discoverable metals.
export const INITIAL_DEPOSIT_CONFIGS: (Omit<MineralDeposit, "depleted"> & { remainingAmount: number })[] = [
  // ── Central Survey Quadrant (near the base station) ──
  { id: "dep-1",  col: 7, row: 6, type: "cuprion",   totalAmount: 60,  remainingAmount: 60,  maxYieldPerDrill: 30 },
  { id: "dep-2",  col: 8, row: 7, type: "pythorium",  totalAmount: 60,  remainingAmount: 60,  maxYieldPerDrill: 30 },
  { id: "dep-3",  col: 6, row: 7, type: "javium",  totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  { id: "dep-4",  col: 8, row: 8, type: "cuprion", totalAmount: 50,  remainingAmount: 50,  maxYieldPerDrill: 25 },
  { id: "dep-5",  col: 6, row: 6, type: "pythorium", totalAmount: 50,  remainingAmount: 50,  maxYieldPerDrill: 25 },
  { id: "dep-6",  col: 7, row: 8, type: "javium",  totalAmount: 60,  remainingAmount: 60,  maxYieldPerDrill: 30 },

  // ── North Sector ──
  { id: "dep-7",  col: 5, row: 4, type: "cuprion",   totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "dep-8",  col: 9, row: 4, type: "pythorium",  totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  { id: "dep-9",  col: 7, row: 4, type: "javium", totalAmount: 60,  remainingAmount: 60,  maxYieldPerDrill: 30 },

  // ── East Sector ──
  { id: "dep-10", col: 9, row: 6, type: "cuprion",  totalAmount: 75,  remainingAmount: 75,  maxYieldPerDrill: 35 },
  { id: "dep-11", col: 11, row: 7, type: "pythorium",  totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "dep-12", col: 10, row: 9, type: "javium", totalAmount: 60,  remainingAmount: 60,  maxYieldPerDrill: 30 },

  // ── South Sector ──
  { id: "dep-13", col: 7, row: 10, type: "cuprion",   totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "dep-14", col: 4, row: 10, type: "pythorium",  totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },
  { id: "dep-15", col: 9, row: 10, type: "javium",  totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },

  // ── West Sector ──
  { id: "dep-16", col: 5, row: 6, type: "cuprion", totalAmount: 65,  remainingAmount: 65,  maxYieldPerDrill: 30 },
  { id: "dep-17", col: 3, row: 7, type: "pythorium",  totalAmount: 85,  remainingAmount: 85,  maxYieldPerDrill: 40 },
  { id: "dep-18", col: 5, row: 8, type: "javium",   totalAmount: 70,  remainingAmount: 70,  maxYieldPerDrill: 35 },

  // ── Corner Outposts ──
  { id: "dep-19", col: 4, row: 4, type: "cuprion",  totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "dep-20", col: 10, row: 4, type: "pythorium", totalAmount: 80,  remainingAmount: 80,  maxYieldPerDrill: 40 },
  { id: "dep-21", col: 4, row: 10, type: "javium",   totalAmount: 90,  remainingAmount: 90,  maxYieldPerDrill: 45 },
  { id: "dep-22", col: 10, row: 10, type: "cuprion", totalAmount: 95,  remainingAmount: 95,  maxYieldPerDrill: 45 },
];

export function createInitialDepositsMap(
  customDeposits?: (Omit<MineralDeposit, "depleted"> & { remainingAmount: number })[]
): Record<string, MineralDeposit> {
  const source = customDeposits ?? INITIAL_DEPOSIT_CONFIGS;
  const map: Record<string, MineralDeposit> = {};
  for (const dep of source) {
    map[getDepositKey(dep.col, dep.row)] = {
      ...dep,
      remainingAmount: dep.totalAmount,
      depleted: false,
    };
  }
  return map;
}
