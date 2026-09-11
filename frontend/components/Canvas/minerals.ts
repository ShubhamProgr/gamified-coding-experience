"use client";

// ── Mineral Types & Metadata ───────────────────────────────────────────────

export type MineralType = "lithium" | "xenocryst" | "titanium" | "hematite" | "regolith";

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
  lithium: {
    name: "Lithium Brine",
    shortName: "Lithium",
    symbol: "Li",
    icon: "⚡",
    color: "#00ffaa",
    glowColor: "rgba(0, 255, 170, 0.8)",
    bgRgba: "rgba(0, 255, 170, 0.12)",
    borderRgba: "rgba(0, 255, 170, 0.4)",
    rarity: "Uncommon",
    description: "High-density energy crystals for power cells",
    baseYield: 30,
  },
  xenocryst: {
    name: "Alien Xenocryst",
    shortName: "Xenocryst",
    symbol: "Xc",
    icon: "💎",
    color: "#d946ef",
    glowColor: "rgba(217, 70, 239, 0.85)",
    bgRgba: "rgba(217, 70, 239, 0.12)",
    borderRgba: "rgba(217, 70, 239, 0.4)",
    rarity: "Exotic",
    description: "Ultra-rare quantum resonant crystal spires",
    baseYield: 25,
  },
  titanium: {
    name: "Titanium Matrix",
    shortName: "Titanium",
    symbol: "Ti",
    icon: "🛡",
    color: "#38bdf8",
    glowColor: "rgba(56, 189, 248, 0.8)",
    bgRgba: "rgba(56, 189, 248, 0.12)",
    borderRgba: "rgba(56, 189, 248, 0.4)",
    rarity: "Rare",
    description: "Aerospace-grade structural alloy deposit",
    baseYield: 30,
  },
  hematite: {
    name: "Hematite Nodules",
    shortName: "Hematite",
    symbol: "Fe",
    icon: "🪐",
    color: "#f97316",
    glowColor: "rgba(249, 115, 22, 0.8)",
    bgRgba: "rgba(249, 115, 22, 0.12)",
    borderRgba: "rgba(249, 115, 22, 0.4)",
    rarity: "Common",
    description: "Magnetic Martian iron-rich spherules",
    baseYield: 35,
  },
  regolith: {
    name: "Surface Regolith",
    shortName: "Regolith",
    symbol: "Rg",
    icon: "🪨",
    color: "#c4956a",
    glowColor: "rgba(196, 149, 106, 0.6)",
    bgRgba: "rgba(196, 149, 106, 0.1)",
    borderRgba: "rgba(196, 149, 106, 0.3)",
    rarity: "Common",
    description: "Standard basaltic rock & silica crust",
    baseYield: 4,
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

// Fixed deposits across 3x3 map
// Start position is center: col 1, row 1.
// 1 step North (col 1, row 0) is Lithium Brine!
export const INITIAL_DEPOSIT_CONFIGS: Omit<MineralDeposit, "depleted">[] = [
  { id: "dep-1", col: 1, row: 0, type: "lithium",   totalAmount: 60, remainingAmount: 60, maxYieldPerDrill: 30 },
  { id: "dep-2", col: 2, row: 1, type: "titanium",  totalAmount: 60, remainingAmount: 60, maxYieldPerDrill: 30 },
  { id: "dep-3", col: 0, row: 1, type: "hematite",  totalAmount: 70, remainingAmount: 70, maxYieldPerDrill: 35 },
  { id: "dep-4", col: 2, row: 2, type: "xenocryst", totalAmount: 50, remainingAmount: 50, maxYieldPerDrill: 25 },
];

export function createInitialDepositsMap(): Record<string, MineralDeposit> {
  const map: Record<string, MineralDeposit> = {};
  for (const dep of INITIAL_DEPOSIT_CONFIGS) {
    map[getDepositKey(dep.col, dep.row)] = {
      ...dep,
      remainingAmount: dep.totalAmount,
      depleted: false,
    };
  }
  return map;
}
